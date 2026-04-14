from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class WarehouseCreate(BaseModel):
    name: str = Field(..., max_length=100)
    location: Optional[str] = Field(None, max_length=200)

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Tên kho không được để trống")
        return v.strip()


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
    display_name: str
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
    display_name: str
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
