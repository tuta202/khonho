from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.schemas.transaction import TransactionResponse


class DashboardStats(BaseModel):
    total_products: int
    total_variants: int
    total_warehouses: int
    total_inventory_value: Optional[Decimal]  # None for staff
    low_stock_count: int
    transactions_today: int


class LowStockAlert(BaseModel):
    product_name: str
    variant: str
    warehouse_name: str
    quantity: int
    threshold: int


class DashboardAlertsResponse(BaseModel):
    alerts: list[LowStockAlert]


class DashboardRecentResponse(BaseModel):
    transactions: list[TransactionResponse]
