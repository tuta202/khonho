import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from app.dependencies import get_current_user, get_db
from app.models.inventory import Inventory
from app.models.transaction import Transaction
from app.models.variant import Variant
from app.models.warehouse import Warehouse
from app.schemas.transaction import (
    ExportRequest,
    ImportRequest,
    TransactionListResponse,
    TransactionResponse,
    TransferRequest,
    VariantSimple,
)

router = APIRouter()

_EXPORT_TYPE_MAP = {
    "sale": "export_sale",
    "damage": "export_damage",
    "adjust": "adjust",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_inventory(db: Session, variant_id: int, warehouse_id: int) -> Optional[Inventory]:
    return db.query(Inventory).filter(
        Inventory.variant_id == variant_id,
        Inventory.warehouse_id == warehouse_id,
    ).with_for_update().first()


def _upsert_inventory(db: Session, variant_id: int, warehouse_id: int, delta: int) -> Inventory:
    """Add delta (positive or negative) to inventory, creating record if missing."""
    inv = _get_inventory(db, variant_id, warehouse_id)
    if inv is None:
        inv = Inventory(variant_id=variant_id, warehouse_id=warehouse_id, quantity=0)
        db.add(inv)
        db.flush()
    inv.quantity += delta
    return inv


def _get_warehouse_or_400(warehouse_id: int, db: Session) -> Warehouse:
    wh = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.is_active == True,  # noqa: E712
    ).first()
    if not wh:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kho id={warehouse_id} không tồn tại hoặc đã bị vô hiệu hoá",
        )
    return wh


def _get_variant_or_400(variant_id: int, db: Session) -> Variant:
    v = db.query(Variant).filter(
        Variant.id == variant_id,
        Variant.is_active == True,  # noqa: E712
    ).first()
    if not v:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Biến thể id={variant_id} không tồn tại hoặc đã bị vô hiệu hoá",
        )
    return v


def _build_response(tx: Transaction, db: Session) -> TransactionResponse:
    # Re-load with relationships if not already loaded
    tx = db.query(Transaction).options(
        selectinload(Transaction.variant).selectinload(Variant.product),
        selectinload(Transaction.from_warehouse),
        selectinload(Transaction.to_warehouse),
        selectinload(Transaction.user),
    ).filter(Transaction.id == tx.id).first()

    variant_data = VariantSimple(
        id=tx.variant.id,
        color=tx.variant.color,
        size=tx.variant.size,
        sku_variant=tx.variant.sku_variant,
        product_name=tx.variant.product.name if tx.variant.product else None,
    )

    return TransactionResponse(
        id=tx.id,
        type=tx.type,
        variant_id=tx.variant_id,
        variant=variant_data,
        from_warehouse=tx.from_warehouse,
        to_warehouse=tx.to_warehouse,
        quantity=tx.quantity,
        note=tx.note,
        user=tx.user,
        created_at=tx.created_at,
    )


# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------

@router.post("/import", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def import_goods(
    body: ImportRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _get_variant_or_400(body.variant_id, db)
    _get_warehouse_or_400(body.to_warehouse_id, db)

    try:
        _upsert_inventory(db, body.variant_id, body.to_warehouse_id, body.quantity)

        tx = Transaction(
            type="import",
            variant_id=body.variant_id,
            from_warehouse_id=None,
            to_warehouse_id=body.to_warehouse_id,
            quantity=body.quantity,
            note=body.note,
            user_id=current_user.id,
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)
    except Exception:
        db.rollback()
        raise

    return _build_response(tx, db)


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

@router.post("/export", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def export_goods(
    body: ExportRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _get_variant_or_400(body.variant_id, db)
    _get_warehouse_or_400(body.from_warehouse_id, db)

    inv = _get_inventory(db, body.variant_id, body.from_warehouse_id)
    current_qty = inv.quantity if inv else 0
    if current_qty < body.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không đủ hàng tồn kho (hiện có: {current_qty}, yêu cầu: {body.quantity})",
        )

    try:
        _upsert_inventory(db, body.variant_id, body.from_warehouse_id, -body.quantity)

        tx_type = _EXPORT_TYPE_MAP.get(body.export_type, "export_sale")
        tx = Transaction(
            type=tx_type,
            variant_id=body.variant_id,
            from_warehouse_id=body.from_warehouse_id,
            to_warehouse_id=None,
            quantity=body.quantity,
            note=body.note,
            user_id=current_user.id,
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise

    return _build_response(tx, db)


# ---------------------------------------------------------------------------
# Transfer
# ---------------------------------------------------------------------------

@router.post("/transfer", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def transfer_goods(
    body: TransferRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _get_variant_or_400(body.variant_id, db)
    _get_warehouse_or_400(body.from_warehouse_id, db)
    _get_warehouse_or_400(body.to_warehouse_id, db)

    inv = _get_inventory(db, body.variant_id, body.from_warehouse_id)
    current_qty = inv.quantity if inv else 0
    if current_qty < body.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không đủ hàng tồn kho tại kho nguồn (hiện có: {current_qty}, yêu cầu: {body.quantity})",
        )

    try:
        _upsert_inventory(db, body.variant_id, body.from_warehouse_id, -body.quantity)
        _upsert_inventory(db, body.variant_id, body.to_warehouse_id, body.quantity)

        tx = Transaction(
            type="transfer",
            variant_id=body.variant_id,
            from_warehouse_id=body.from_warehouse_id,
            to_warehouse_id=body.to_warehouse_id,
            quantity=body.quantity,
            note=body.note,
            user_id=current_user.id,
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise

    return _build_response(tx, db)


# ---------------------------------------------------------------------------
# List & Detail
# ---------------------------------------------------------------------------

@router.get("", response_model=TransactionListResponse)
def list_transactions(
    type: Optional[str] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    variant_id: Optional[int] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(Transaction).options(
        selectinload(Transaction.variant).selectinload(Variant.product),
        selectinload(Transaction.from_warehouse),
        selectinload(Transaction.to_warehouse),
        selectinload(Transaction.user),
    )

    if type:
        query = query.filter(Transaction.type == type)
    if warehouse_id:
        query = query.filter(
            (Transaction.from_warehouse_id == warehouse_id)
            | (Transaction.to_warehouse_id == warehouse_id)
        )
    if variant_id:
        query = query.filter(Transaction.variant_id == variant_id)
    if date_from:
        query = query.filter(Transaction.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Transaction.created_at <= datetime.fromisoformat(date_to))

    query = query.order_by(Transaction.created_at.desc())
    total = query.count()
    txs = query.offset((page - 1) * per_page).limit(per_page).all()

    items = []
    for tx in txs:
        variant_data = VariantSimple(
            id=tx.variant.id,
            color=tx.variant.color,
            size=tx.variant.size,
            sku_variant=tx.variant.sku_variant,
            product_name=tx.variant.product.name if tx.variant.product else None,
        )
        items.append(TransactionResponse(
            id=tx.id,
            type=tx.type,
            variant_id=tx.variant_id,
            variant=variant_data,
            from_warehouse=tx.from_warehouse,
            to_warehouse=tx.to_warehouse,
            quantity=tx.quantity,
            note=tx.note,
            user=tx.user,
            created_at=tx.created_at,
        ))

    return TransactionListResponse(
        items=items,
        meta={
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": math.ceil(total / per_page) if total else 0,
        },
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return _build_response(tx, db)
