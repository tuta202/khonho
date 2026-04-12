from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db, require_owner
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.transaction import Transaction
from app.models.variant import Variant
from app.models.warehouse import Warehouse
from app.schemas.report import (
    InventorySnapshotItem,
    InventorySnapshotResponse,
    InventoryValueResponse,
    TopProductItem,
    TransactionsSummaryResponse,
    WarehouseValueItem,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Inventory snapshot
# ---------------------------------------------------------------------------

@router.get("/inventory-snapshot", response_model=InventorySnapshotResponse)
def inventory_snapshot(
    warehouse_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = (
        db.query(Inventory, Variant, Product, Warehouse)
        .join(Variant, Inventory.variant_id == Variant.id)
        .join(Product, Variant.product_id == Product.id)
        .join(Warehouse, Inventory.warehouse_id == Warehouse.id)
        .filter(
            Variant.is_active == True,    # noqa: E712
            Product.is_active == True,    # noqa: E712
            Warehouse.is_active == True,  # noqa: E712
        )
        .order_by(Product.name, Variant.id, Warehouse.name)
    )

    if warehouse_id:
        query = query.filter(Inventory.warehouse_id == warehouse_id)

    rows = query.all()

    items = []
    for inv, variant, product, warehouse in rows:
        is_low = inv.quantity <= product.low_stock_threshold
        items.append(
            InventorySnapshotItem(
                product_id=product.id,
                product_name=product.name,
                sku=product.sku,
                category=product.category,
                variant_id=variant.id,
                color=variant.color,
                size=variant.size,
                sku_variant=variant.sku_variant,
                warehouse_id=warehouse.id,
                warehouse_name=warehouse.name,
                quantity=inv.quantity,
                low_stock_threshold=product.low_stock_threshold,
                is_low_stock=is_low,
            )
        )

    return InventorySnapshotResponse(
        items=items,
        total_items=len(items),
        low_stock_count=sum(1 for i in items if i.is_low_stock),
    )


# ---------------------------------------------------------------------------
# Transactions summary
# ---------------------------------------------------------------------------

@router.get("/transactions-summary", response_model=TransactionsSummaryResponse)
def transactions_summary(
    date_from: str = Query(...),
    date_to: str = Query(...),
    warehouse_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    try:
        dt_from = datetime.fromisoformat(date_from)
        dt_to = datetime.fromisoformat(date_to)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from và date_to phải là ISO date string (YYYY-MM-DD)",
        )

    base = (
        db.query(Transaction)
        .filter(
            Transaction.created_at >= dt_from,
            Transaction.created_at <= dt_to,
        )
    )
    if warehouse_id:
        base = base.filter(
            (Transaction.from_warehouse_id == warehouse_id)
            | (Transaction.to_warehouse_id == warehouse_id)
        )

    txs = base.all()

    # Aggregate by type
    by_type: dict[str, int] = {}
    for tx in txs:
        by_type[tx.type] = by_type.get(tx.type, 0) + tx.quantity

    total_imported = by_type.get("import", 0)
    total_exported = (
        by_type.get("export_sale", 0)
        + by_type.get("export_damage", 0)
        + by_type.get("adjust", 0)
    )

    # Top products by total_imported desc
    product_totals: dict[int, dict] = {}
    for tx in txs:
        # Resolve product via variant
        variant = db.query(Variant).filter(Variant.id == tx.variant_id).first()
        if not variant:
            continue
        product = db.query(Product).filter(Product.id == variant.product_id).first()
        if not product:
            continue
        pid = product.id
        if pid not in product_totals:
            product_totals[pid] = {
                "product_id": pid,
                "product_name": product.name,
                "total_imported": 0,
                "total_exported": 0,
            }
        if tx.type == "import":
            product_totals[pid]["total_imported"] += tx.quantity
        elif tx.type in ("export_sale", "export_damage", "adjust"):
            product_totals[pid]["total_exported"] += tx.quantity

    top_products = sorted(
        product_totals.values(),
        key=lambda x: x["total_imported"],
        reverse=True,
    )[:10]

    return TransactionsSummaryResponse(
        period={"from": date_from, "to": date_to},
        total_imported=total_imported,
        total_exported=total_exported,
        by_type=by_type,
        top_products=[TopProductItem(**p) for p in top_products],
    )


# ---------------------------------------------------------------------------
# Inventory value — owner only
# ---------------------------------------------------------------------------

@router.get("/inventory-value", response_model=InventoryValueResponse)
def inventory_value(
    db: Session = Depends(get_db),
    _=Depends(require_owner),
):
    effective_cost = func.coalesce(Variant.cost_price_override, Product.cost_price)

    rows = (
        db.query(
            Warehouse.id,
            Warehouse.name,
            func.sum(Inventory.quantity * effective_cost).label("total_value"),
            func.sum(Inventory.quantity).label("total_quantity"),
            func.count(Inventory.id).label("variant_count"),
        )
        .join(Inventory, Warehouse.id == Inventory.warehouse_id)
        .join(Variant, Inventory.variant_id == Variant.id)
        .join(Product, Variant.product_id == Product.id)
        .filter(
            Warehouse.is_active == True,  # noqa: E712
            Variant.is_active == True,    # noqa: E712
            Product.is_active == True,    # noqa: E712
        )
        .group_by(Warehouse.id, Warehouse.name)
        .order_by(Warehouse.name)
        .all()
    )

    items = [
        WarehouseValueItem(
            warehouse_id=row.id,
            warehouse_name=row.name,
            total_value=Decimal(str(row.total_value or 0)),
            total_quantity=int(row.total_quantity or 0),
            variant_count=int(row.variant_count or 0),
        )
        for row in rows
    ]

    grand_total_value = sum((i.total_value for i in items), Decimal("0"))
    grand_total_quantity = sum(i.total_quantity for i in items)

    return InventoryValueResponse(
        items=items,
        grand_total_value=grand_total_value,
        grand_total_quantity=grand_total_quantity,
    )
