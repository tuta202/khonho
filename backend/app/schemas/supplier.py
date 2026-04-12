from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SupplierCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    note: Optional[str] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    note: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierResponse(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    note: Optional[str]
    is_active: bool
    product_count: int = 0

    model_config = {"from_attributes": True}


class SupplierHistoryItem(BaseModel):
    transaction_id: int
    created_at: datetime
    product_name: str
    variant_color: Optional[str]
    variant_size: Optional[str]
    sku_variant: Optional[str]
    quantity: int
    warehouse_name: Optional[str]
    note: Optional[str]


class SupplierHistoryResponse(BaseModel):
    items: list[SupplierHistoryItem]
    meta: dict
