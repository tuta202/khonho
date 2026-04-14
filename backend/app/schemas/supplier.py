from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class SupplierCreate(BaseModel):
    name: str = Field(..., max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = None
    address: Optional[str] = None
    note: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Tên nhà cung cấp không được để trống")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def phone_format(cls, v):
        if v:
            digits = "".join(filter(str.isdigit, v))
            if len(digits) < 9 or len(digits) > 11:
                raise ValueError("Số điện thoại không hợp lệ (9-11 chữ số)")
        return v

    @field_validator("email")
    @classmethod
    def email_format(cls, v):
        if v and "@" not in v:
            raise ValueError("Email không đúng định dạng")
        return v


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
    variant_display_name: str
    sku_variant: Optional[str]
    quantity: int
    warehouse_name: Optional[str]
    note: Optional[str]


class SupplierHistoryResponse(BaseModel):
    items: list[SupplierHistoryItem]
    meta: dict
