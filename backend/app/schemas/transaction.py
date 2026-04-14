from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class ImportRequest(BaseModel):
    variant_id: int = Field(..., gt=0)
    to_warehouse_id: int = Field(..., gt=0)
    quantity: int
    note: Optional[str] = Field(None, max_length=500)

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v):
        if v <= 0:
            raise ValueError("Số lượng phải lớn hơn 0")
        return v


class ExportRequest(BaseModel):
    variant_id: int = Field(..., gt=0)
    from_warehouse_id: int = Field(..., gt=0)
    quantity: int
    export_type: Literal["sale", "damage", "adjust"] = "sale"
    note: Optional[str] = Field(None, max_length=500)

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v):
        if v <= 0:
            raise ValueError("Số lượng phải lớn hơn 0")
        return v


class TransferRequest(BaseModel):
    variant_id: int = Field(..., gt=0)
    from_warehouse_id: int = Field(..., gt=0)
    to_warehouse_id: int = Field(..., gt=0)
    quantity: int
    note: Optional[str] = Field(None, max_length=500)

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v):
        if v <= 0:
            raise ValueError("Số lượng phải lớn hơn 0")
        return v

    @model_validator(mode="after")
    def check_warehouses_differ(self):
        if self.from_warehouse_id == self.to_warehouse_id:
            raise ValueError("Kho nguồn và kho đích không được trùng nhau")
        return self


class WarehouseSimple(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class VariantSimple(BaseModel):
    id: int
    display_name: str
    sku_variant: Optional[str]
    product_name: Optional[str] = None

    model_config = {"from_attributes": True}


class UserSimple(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class TransactionResponse(BaseModel):
    id: int
    type: str
    variant_id: int
    variant: VariantSimple
    from_warehouse: Optional[WarehouseSimple]
    to_warehouse: Optional[WarehouseSimple]
    quantity: int
    note: Optional[str]
    user: UserSimple
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    meta: dict
