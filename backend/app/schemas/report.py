from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Inventory snapshot
# ---------------------------------------------------------------------------
class InventorySnapshotItem(BaseModel):
    product_id: int
    product_name: str
    sku: Optional[str]
    category: Optional[str]
    variant_id: int
    display_name: str
    sku_variant: Optional[str]
    warehouse_id: int
    warehouse_name: str
    quantity: int
    low_stock_threshold: int
    is_low_stock: bool


class InventorySnapshotResponse(BaseModel):
    items: list[InventorySnapshotItem]
    total_items: int
    low_stock_count: int


# ---------------------------------------------------------------------------
# Transactions summary
# ---------------------------------------------------------------------------
class TopProductItem(BaseModel):
    product_id: int
    product_name: str
    total_imported: int
    total_exported: int


class TransactionsSummaryResponse(BaseModel):
    period: dict
    total_imported: int
    total_exported: int
    by_type: dict
    top_products: list[TopProductItem]


# ---------------------------------------------------------------------------
# Inventory value
# ---------------------------------------------------------------------------
class WarehouseValueItem(BaseModel):
    warehouse_id: int
    warehouse_name: str
    total_value: Decimal
    total_quantity: int
    variant_count: int


class InventoryValueResponse(BaseModel):
    items: list[WarehouseValueItem]
    grand_total_value: Decimal
    grand_total_quantity: int
