import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.dependencies import get_current_user, get_db, require_owner
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.variant import Variant
from app.models.variant_attribute import VariantAttribute
from app.models.warehouse import Warehouse
from app.schemas.product import (
    PaginationMeta,
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
    VariantAttributeInput,
    VariantCreate,
    VariantResponse,
    VariantUpdate,
)

router = APIRouter()

_DEFAULT_WAREHOUSE_ID = 1  # "Kho chính" seeded in migration 0002


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_variant_display_name(attributes: list) -> str:
    if not attributes:
        return "Mặc định"
    return " / ".join(a.attr_value for a in attributes)


def _total_quantity_for_variant(db: Session, variant_id: int) -> int:
    result = db.execute(
        select(func.coalesce(func.sum(Inventory.quantity), 0)).where(
            Inventory.variant_id == variant_id
        )
    ).scalar()
    return int(result)


def _build_variant_response(v: Variant, db: Session) -> VariantResponse:
    return VariantResponse(
        id=v.id,
        product_id=v.product_id,
        sku_variant=v.sku_variant,
        cost_price_override=v.cost_price_override,
        is_active=v.is_active,
        total_quantity=_total_quantity_for_variant(db, v.id),
        attributes=[
            VariantAttributeInput(attr_name=a.attr_name, attr_value=a.attr_value)
            for a in v.attributes
        ],
        display_name=_get_variant_display_name(v.attributes),
    )


def _build_product_response(product: Product, db: Session, include_variants: bool = False) -> ProductResponse:
    variants = [v for v in product.variants if v.is_active]
    total_qty = sum(_total_quantity_for_variant(db, v.id) for v in variants)
    variant_responses = None
    if include_variants:
        variant_responses = [
            _build_variant_response(v, db)
            for v in product.variants
        ]
    return ProductResponse(
        id=product.id,
        name=product.name,
        sku=product.sku,
        category=product.category,
        cost_price=product.cost_price,
        selling_price=product.selling_price,
        low_stock_threshold=product.low_stock_threshold,
        supplier=product.supplier,
        total_quantity=total_qty,
        variants_count=len(variants),
        is_active=product.is_active,
        variants=variant_responses,
    )


def _get_product_or_404(product_id: int, db: Session) -> Product:
    product = db.query(Product).options(
        selectinload(Product.variants).selectinload(Variant.inventory_items),
        selectinload(Product.variants).selectinload(Variant.attributes),
        selectinload(Product.supplier),
    ).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sản phẩm")
    return product


def _ensure_inventory_for_variant(db: Session, variant_id: int) -> None:
    """Create inventory record in default warehouse if not exists."""
    exists = db.query(Inventory).filter(
        Inventory.variant_id == variant_id,
        Inventory.warehouse_id == _DEFAULT_WAREHOUSE_ID,
    ).first()
    if not exists:
        wh = db.query(Warehouse).filter(Warehouse.id == _DEFAULT_WAREHOUSE_ID).first()
        if wh:
            db.add(Inventory(variant_id=variant_id, warehouse_id=_DEFAULT_WAREHOUSE_ID, quantity=0))


# ---------------------------------------------------------------------------
# Products endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=ProductListResponse)
def list_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    supplier_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    query = (
        db.query(Product)
        .options(
            selectinload(Product.variants).selectinload(Variant.inventory_items),
            selectinload(Product.supplier),
        )
        .filter(Product.is_active == True)  # noqa: E712
    )
    if search:
        term = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(term)) | (Product.sku.ilike(term))
        )
    if category:
        query = query.filter(Product.category == category)
    if supplier_id:
        query = query.filter(Product.supplier_id == supplier_id)

    total = query.count()
    products = query.offset((page - 1) * per_page).limit(per_page).all()

    return ProductListResponse(
        items=[_build_product_response(p, db) for p in products],
        meta=PaginationMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=math.ceil(total / per_page) if total else 0,
        ),
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    body: ProductCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    data = body.model_dump(exclude={"variants"})
    if current_user.role != "owner":
        data.pop("cost_price", None)

    if data.get("sku"):
        existing = db.query(Product).filter(Product.sku == data["sku"], Product.is_active == True).first()  # noqa: E712
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Mã SKU đã tồn tại, vui lòng dùng mã khác",
            )

    product = Product(**data)
    db.add(product)
    db.flush()

    variants_to_create = body.variants or [VariantCreate()]
    for vc in variants_to_create:
        v_data = vc.model_dump(exclude={"attributes"})
        if current_user.role != "owner":
            v_data.pop("cost_price_override", None)
        variant = Variant(product_id=product.id, **v_data)
        db.add(variant)
        db.flush()
        for attr in vc.attributes:
            db.add(VariantAttribute(
                variant_id=variant.id,
                attr_name=attr.attr_name,
                attr_value=attr.attr_value,
            ))
        _ensure_inventory_for_variant(db, variant.id)

    db.commit()
    product = _get_product_or_404(product.id, db)
    return _build_product_response(product, db, include_variants=True)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    product = _get_product_or_404(product_id, db)
    return _build_product_response(product, db, include_variants=True)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    body: ProductUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    product = _get_product_or_404(product_id, db)
    data = body.model_dump(exclude_none=True)
    if current_user.role != "owner":
        data.pop("cost_price", None)

    for field, value in data.items():
        setattr(product, field, value)

    db.commit()
    product = _get_product_or_404(product_id, db)
    return _build_product_response(product, db, include_variants=True)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_owner),
):
    product = _get_product_or_404(product_id, db)
    product.is_active = False
    db.commit()


# ---------------------------------------------------------------------------
# Variants endpoints
# ---------------------------------------------------------------------------

@router.get("/{product_id}/variants", response_model=list[VariantResponse])
def list_variants(
    product_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    _get_product_or_404(product_id, db)
    variants = db.query(Variant).options(
        selectinload(Variant.attributes)
    ).filter(
        Variant.product_id == product_id,
        Variant.is_active == True,  # noqa: E712
    ).all()
    return [_build_variant_response(v, db) for v in variants]


@router.post("/{product_id}/variants", response_model=VariantResponse, status_code=status.HTTP_201_CREATED)
def create_variant(
    product_id: int,
    body: VariantCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _get_product_or_404(product_id, db)
    v_data = body.model_dump(exclude={"attributes"})
    if current_user.role != "owner":
        v_data.pop("cost_price_override", None)

    variant = Variant(product_id=product_id, **v_data)
    db.add(variant)
    db.flush()
    for attr in body.attributes:
        db.add(VariantAttribute(
            variant_id=variant.id,
            attr_name=attr.attr_name,
            attr_value=attr.attr_value,
        ))
    _ensure_inventory_for_variant(db, variant.id)
    db.commit()

    variant = db.query(Variant).options(
        selectinload(Variant.attributes)
    ).filter(Variant.id == variant.id).first()
    return _build_variant_response(variant, db)


@router.put("/{product_id}/variants/{variant_id}", response_model=VariantResponse)
def update_variant(
    product_id: int,
    variant_id: int,
    body: VariantUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    variant = db.query(Variant).filter(
        Variant.id == variant_id,
        Variant.product_id == product_id,
    ).first()
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy biến thể")

    data = body.model_dump(exclude_none=True, exclude={"attributes"})
    if current_user.role != "owner":
        data.pop("cost_price_override", None)

    for field, value in data.items():
        setattr(variant, field, value)

    # Replace strategy for attributes
    if body.attributes is not None:
        db.query(VariantAttribute).filter(
            VariantAttribute.variant_id == variant_id
        ).delete()
        for attr in body.attributes:
            db.add(VariantAttribute(
                variant_id=variant_id,
                attr_name=attr.attr_name,
                attr_value=attr.attr_value,
            ))

    db.commit()

    variant = db.query(Variant).options(
        selectinload(Variant.attributes)
    ).filter(Variant.id == variant_id).first()
    return _build_variant_response(variant, db)


@router.delete("/{product_id}/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(
    product_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_owner),
):
    variant = db.query(Variant).filter(
        Variant.id == variant_id,
        Variant.product_id == product_id,
    ).first()
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy biến thể")
    variant.is_active = False
    db.commit()
