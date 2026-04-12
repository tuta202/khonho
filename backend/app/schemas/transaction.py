from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, model_validator


class ImportRequest(BaseModel):
    variant_id: int
    to_warehouse_id: int
    quantity: int
    note: Optional[str] = None

    @model_validator(mode="after")
    def check_quantity(self):
        if self.quantity < 1:
            raise ValueError("Số lượng phải >= 1")
        return self


class ExportRequest(BaseModel):
    variant_id: int
    from_warehouse_id: int
    quantity: int
    export_type: Literal["sale", "damage", "adjust"] = "sale"
    note: Optional[str] = None

    @model_validator(mode="after")
    def check_quantity(self):
        if self.quantity < 1:
            raise ValueError("Số lượng phải >= 1")
        return self


class TransferRequest(BaseModel):
    variant_id: int
    from_warehouse_id: int
    to_warehouse_id: int
    quantity: int
    note: Optional[str] = None

    @model_validator(mode="after")
    def check_quantity(self):
        if self.quantity < 1:
            raise ValueError("Số lượng phải >= 1")
        if self.from_warehouse_id == self.to_warehouse_id:
            raise ValueError("Kho nguồn và kho đích không được trùng nhau")
        return self


class WarehouseSimple(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class VariantSimple(BaseModel):
    id: int
    color: Optional[str]
    size: Optional[str]
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
