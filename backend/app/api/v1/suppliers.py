import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db, require_owner
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.transaction import Transaction
from app.models.variant import Variant
from app.models.warehouse import Warehouse
from app.schemas.supplier import (
    SupplierCreate,
    SupplierHistoryItem,
    SupplierHistoryResponse,
    SupplierResponse,
    SupplierUpdate,
)

router = APIRouter()


def _get_supplier_or_404(supplier_id: int, db: Session) -> Supplier:
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhà cung cấp")
    return s


def _build_response(supplier: Supplier, db: Session) -> SupplierResponse:
    count = db.query(Product).filter(
        Product.supplier_id == supplier.id,
        Product.is_active == True,  # noqa: E712
    ).count()
    return SupplierResponse(
        id=supplier.id,
        name=supplier.name,
        phone=supplier.phone,
        email=supplier.email,
        address=supplier.address,
        note=supplier.note,
        is_active=supplier.is_active,
        product_count=count,
    )


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
    search: Optional[str] = Query(None),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(Supplier)
    if active_only:
        query = query.filter(Supplier.is_active == True)  # noqa: E712
    if search:
        term = f"%{search}%"
        query = query.filter(
            (Supplier.name.ilike(term))
            | (Supplier.phone.ilike(term))
            | (Supplier.email.ilike(term))
        )
    suppliers = query.order_by(Supplier.name).all()
    return [_build_response(s, db) for s in suppliers]


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    body: SupplierCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    existing = db.query(Supplier).filter(Supplier.name == body.name, Supplier.is_active == True).first()  # noqa: E712
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nhà cung cấp với tên này đã tồn tại",
        )
    supplier = Supplier(**body.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return _build_response(supplier, db)


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    supplier = _get_supplier_or_404(supplier_id, db)
    return _build_response(supplier, db)


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    body: SupplierUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    supplier = _get_supplier_or_404(supplier_id, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return _build_response(supplier, db)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_owner),
):
    supplier = _get_supplier_or_404(supplier_id, db)
    supplier.is_active = False
    db.commit()
    # NOTE: product.supplier_id is NOT nulled — no cascade per spec


# ---------------------------------------------------------------------------
# Import history for supplier
# ---------------------------------------------------------------------------

@router.get("/{supplier_id}/history", response_model=SupplierHistoryResponse)
def supplier_history(
    supplier_id: int,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    _get_supplier_or_404(supplier_id, db)

    # Join Transaction → Variant → Product → filter by supplier_id
    # Only import transactions are relevant for supplier history
    query = (
        db.query(Transaction, Variant, Product, Warehouse)
        .join(Variant, Transaction.variant_id == Variant.id)
        .join(Product, Variant.product_id == Product.id)
        .outerjoin(Warehouse, Transaction.to_warehouse_id == Warehouse.id)
        .filter(
            Product.supplier_id == supplier_id,
            Transaction.type == "import",
        )
    )

    if date_from:
        query = query.filter(Transaction.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Transaction.created_at <= datetime.fromisoformat(date_to))

    query = query.order_by(Transaction.created_at.desc())
    total = query.count()
    rows = query.offset((page - 1) * per_page).limit(per_page).all()

    items = [
        SupplierHistoryItem(
            transaction_id=tx.id,
            created_at=tx.created_at,
            product_name=product.name,
            variant_color=variant.color,
            variant_size=variant.size,
            sku_variant=variant.sku_variant,
            quantity=tx.quantity,
            warehouse_name=warehouse.name if warehouse else None,
            note=tx.note,
        )
        for tx, variant, product, warehouse in rows
    ]

    return SupplierHistoryResponse(
        items=items,
        meta={
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": math.ceil(total / per_page) if total else 0,
        },
    )
