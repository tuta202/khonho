from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class WarehouseCreate(BaseModel):
    name: str
    location: Optional[str] = None


class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None


class WarehouseResponse(BaseModel):
    id: int
    name: str
    location: Optional[str]
    is_active: bool

    model_config = {"from_attributes": True}


class InventoryItemResponse(BaseModel):
    product_id: int
    product_name: str
    variant_id: int
    color: Optional[str]
    size: Optional[str]
    quantity: int
    cost_price: Decimal
    low_stock_threshold: int
    is_low_stock: bool


class WarehouseInventoryResponse(BaseModel):
    warehouse: WarehouseResponse
    items: list[InventoryItemResponse]
    total_items: int
    low_stock_count: int


class SummaryItemResponse(BaseModel):
    product_id: int
    product_name: str
    sku: Optional[str]
    category: Optional[str]
    variant_id: int
    color: Optional[str]
    size: Optional[str]
    sku_variant: Optional[str]
    total_quantity: int
    selling_price: Decimal
    cost_price: Decimal
    low_stock_threshold: int
    is_low_stock: bool


class InventorySummaryResponse(BaseModel):
    items: list[SummaryItemResponse]
    total_variants: int
    low_stock_count: int
