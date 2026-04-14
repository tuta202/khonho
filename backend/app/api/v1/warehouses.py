from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.dependencies import get_current_user, get_db, require_owner
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.variant import Variant
from app.models.warehouse import Warehouse
from app.schemas.warehouse import (
    InventoryItemResponse,
    InventorySummaryResponse,
    SummaryItemResponse,
    WarehouseCreate,
    WarehouseInventoryResponse,
    WarehouseResponse,
    WarehouseUpdate,
)

router = APIRouter()


def _fmt_display_name(attrs) -> str:
    if not attrs:
        return "Mặc định"
    return " / ".join(a.attr_value for a in attrs)


def _get_warehouse_or_404(warehouse_id: int, db: Session) -> Warehouse:
    wh = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy kho hàng")
    return wh


# ---------------------------------------------------------------------------
# Warehouse CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[WarehouseResponse])
def list_warehouses(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.query(Warehouse).filter(Warehouse.is_active == True).all()  # noqa: E712


@router.post("", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    body: WarehouseCreate,
    db: Session = Depends(get_db),
    _=Depends(require_owner),
):
    existing = db.query(Warehouse).filter(Warehouse.name == body.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên kho đã tồn tại",
        )
    wh = Warehouse(name=body.name, location=body.location)
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return wh


@router.put("/{warehouse_id}", response_model=WarehouseResponse)
def update_warehouse(
    warehouse_id: int,
    body: WarehouseUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_owner),
):
    wh = _get_warehouse_or_404(warehouse_id, db)
    data = body.model_dump(exclude_none=True)
    for field, value in data.items():
        setattr(wh, field, value)
    db.commit()
    db.refresh(wh)
    return wh


@router.delete("/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_owner),
):
    wh = _get_warehouse_or_404(warehouse_id, db)

    total_stock = db.execute(
        select(func.coalesce(func.sum(Inventory.quantity), 0)).where(
            Inventory.warehouse_id == warehouse_id
        )
    ).scalar()

    if total_stock > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa kho còn hàng tồn. Vui lòng chuyển hàng sang kho khác trước",
        )

    wh.is_active = False
    db.commit()


# ---------------------------------------------------------------------------
# Warehouse inventory detail
# ---------------------------------------------------------------------------

@router.get("/{warehouse_id}/inventory", response_model=WarehouseInventoryResponse)
def warehouse_inventory(
    warehouse_id: int,
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    wh = _get_warehouse_or_404(warehouse_id, db)

    query = (
        db.query(Inventory, Variant, Product)
        .join(Variant, Inventory.variant_id == Variant.id)
        .join(Product, Variant.product_id == Product.id)
        .options(selectinload(Variant.attributes))
        .filter(
            Inventory.warehouse_id == warehouse_id,
            Variant.is_active == True,   # noqa: E712
            Product.is_active == True,   # noqa: E712
        )
    )

    if search:
        term = f"%{search}%"
        query = query.filter(Product.name.ilike(term))
    if category:
        query = query.filter(Product.category == category)

    rows = query.all()

    items = []
    for inv, variant, product in rows:
        is_low = inv.quantity <= product.low_stock_threshold
        cost = variant.cost_price_override if variant.cost_price_override is not None else product.cost_price
        items.append(
            InventoryItemResponse(
                product_id=product.id,
                product_name=product.name,
                variant_id=variant.id,
                display_name=_fmt_display_name(variant.attributes),
                quantity=inv.quantity,
                cost_price=cost,
                low_stock_threshold=product.low_stock_threshold,
                is_low_stock=is_low,
            )
        )

    low_stock_count = sum(1 for i in items if i.is_low_stock)

    return WarehouseInventoryResponse(
        warehouse=WarehouseResponse.model_validate(wh),
        items=items,
        total_items=len(items),
        low_stock_count=low_stock_count,
    )


# ---------------------------------------------------------------------------
# Inventory summary — all warehouses
# ---------------------------------------------------------------------------

@router.get("/summary", response_model=InventorySummaryResponse)
def inventory_summary(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    qty_subq = (
        select(
            Inventory.variant_id,
            func.sum(Inventory.quantity).label("total_qty"),
        )
        .join(Warehouse, Inventory.warehouse_id == Warehouse.id)
        .where(Warehouse.is_active == True)  # noqa: E712
        .group_by(Inventory.variant_id)
        .subquery()
    )

    rows = (
        db.query(Variant, Product, qty_subq.c.total_qty)
        .join(Product, Variant.product_id == Product.id)
        .outerjoin(qty_subq, Variant.id == qty_subq.c.variant_id)
        .options(selectinload(Variant.attributes))
        .filter(
            Variant.is_active == True,   # noqa: E712
            Product.is_active == True,   # noqa: E712
        )
        .all()
    )

    items = []
    for variant, product, total_qty in rows:
        qty = int(total_qty or 0)
        is_low = qty <= product.low_stock_threshold
        cost = variant.cost_price_override if variant.cost_price_override is not None else product.cost_price
        items.append(
            SummaryItemResponse(
                product_id=product.id,
                product_name=product.name,
                sku=product.sku,
                category=product.category,
                variant_id=variant.id,
                display_name=_fmt_display_name(variant.attributes),
                sku_variant=variant.sku_variant,
                total_quantity=qty,
                selling_price=product.selling_price,
                cost_price=cost,
                low_stock_threshold=product.low_stock_threshold,
                is_low_stock=is_low,
            )
        )

    return InventorySummaryResponse(
        items=items,
        total_variants=len(items),
        low_stock_count=sum(1 for i in items if i.is_low_stock),
    )
