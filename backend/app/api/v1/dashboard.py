from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.dependencies import get_current_user, get_db
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.transaction import Transaction
from app.models.variant import Variant
from app.models.warehouse import Warehouse
from app.schemas.dashboard import (
    DashboardAlertsResponse,
    DashboardRecentResponse,
    DashboardStats,
    LowStockAlert,
)
from app.schemas.transaction import TransactionResponse, VariantSimple

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    total_products = db.query(func.count(Product.id)).filter(
        Product.is_active == True  # noqa: E712
    ).scalar()

    total_variants = db.query(func.count(Variant.id)).filter(
        Variant.is_active == True  # noqa: E712
    ).scalar()

    total_warehouses = db.query(func.count(Warehouse.id)).filter(
        Warehouse.is_active == True  # noqa: E712
    ).scalar()

    # low_stock_count: inventory records where quantity <= product.low_stock_threshold
    low_stock_count = (
        db.query(func.count(Inventory.id))
        .join(Variant, Inventory.variant_id == Variant.id)
        .join(Product, Variant.product_id == Product.id)
        .filter(
            Variant.is_active == True,   # noqa: E712
            Product.is_active == True,   # noqa: E712
            Inventory.quantity <= Product.low_stock_threshold,
        )
        .scalar()
    )

    # transactions today (UTC)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    transactions_today = db.query(func.count(Transaction.id)).filter(
        Transaction.created_at >= today_start
    ).scalar()

    # total_inventory_value — only for owner, skip for staff (performance)
    total_inventory_value = None
    if current_user.role == "owner":
        # SUM(qty * effective_cost_price) per inventory row
        # effective cost = COALESCE(variant.cost_price_override, product.cost_price)
        effective_cost = func.coalesce(Variant.cost_price_override, Product.cost_price)
        result = (
            db.query(func.sum(Inventory.quantity * effective_cost))
            .join(Variant, Inventory.variant_id == Variant.id)
            .join(Product, Variant.product_id == Product.id)
            .filter(
                Variant.is_active == True,   # noqa: E712
                Product.is_active == True,   # noqa: E712
            )
            .scalar()
        )
        total_inventory_value = Decimal(str(result or 0))

    return DashboardStats(
        total_products=total_products or 0,
        total_variants=total_variants or 0,
        total_warehouses=total_warehouses or 0,
        total_inventory_value=total_inventory_value,
        low_stock_count=low_stock_count or 0,
        transactions_today=transactions_today or 0,
    )


@router.get("/alerts", response_model=DashboardAlertsResponse)
def get_alerts(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = (
        db.query(Inventory, Variant, Product, Warehouse)
        .join(Variant, Inventory.variant_id == Variant.id)
        .join(Product, Variant.product_id == Product.id)
        .join(Warehouse, Inventory.warehouse_id == Warehouse.id)
        .filter(
            Variant.is_active == True,    # noqa: E712
            Product.is_active == True,    # noqa: E712
            Warehouse.is_active == True,  # noqa: E712
            Inventory.quantity <= Product.low_stock_threshold,
        )
        .order_by(Inventory.quantity.asc())
        .all()
    )

    alerts = []
    for inv, variant, product, warehouse in rows:
        parts = [p for p in [variant.color, variant.size] if p]
        variant_label = " - ".join(parts) if parts else "Mặc định"
        alerts.append(
            LowStockAlert(
                product_name=product.name,
                variant=variant_label,
                warehouse_name=warehouse.name,
                quantity=inv.quantity,
                threshold=product.low_stock_threshold,
            )
        )

    return DashboardAlertsResponse(alerts=alerts)


@router.get("/recent", response_model=DashboardRecentResponse)
def get_recent(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    txs = (
        db.query(Transaction)
        .options(
            selectinload(Transaction.variant).selectinload(Variant.product),
            selectinload(Transaction.from_warehouse),
            selectinload(Transaction.to_warehouse),
            selectinload(Transaction.user),
        )
        .order_by(Transaction.created_at.desc())
        .limit(10)
        .all()
    )

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

    return DashboardRecentResponse(transactions=items)
