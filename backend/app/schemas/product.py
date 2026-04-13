from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class VariantCreate(BaseModel):
    color: Optional[str] = None
    size: Optional[str] = None
    sku_variant: Optional[str] = None
    cost_price_override: Optional[Decimal] = None


class VariantUpdate(BaseModel):
    color: Optional[str] = None
    size: Optional[str] = None
    sku_variant: Optional[str] = None
    cost_price_override: Optional[Decimal] = None
    is_active: Optional[bool] = None


class VariantResponse(BaseModel):
    id: int
    product_id: int
    color: Optional[str]
    size: Optional[str]
    sku_variant: Optional[str]
    cost_price_override: Optional[Decimal]
    is_active: bool
    total_quantity: int = 0

    model_config = {"from_attributes": True}


class SupplierNameResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str = Field(..., max_length=200)
    sku: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    cost_price: Optional[Decimal] = Field(Decimal("0"), ge=0)
    selling_price: Optional[Decimal] = Field(Decimal("0"), ge=0)
    low_stock_threshold: Optional[int] = Field(5, ge=0)
    supplier_id: Optional[int] = None
    variants: Optional[list[VariantCreate]] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Tên sản phẩm không được để trống")
        return v.strip()

    @field_validator("sku")
    @classmethod
    def sku_format(cls, v):
        if v is not None and len(v.strip()) == 0:
            return None
        return v.strip() if v else v


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    cost_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    low_stock_threshold: Optional[int] = None
    supplier_id: Optional[int] = None
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    id: int
    name: str
    sku: Optional[str]
    category: Optional[str]
    cost_price: Decimal
    selling_price: Decimal
    low_stock_threshold: int
    supplier: Optional[SupplierNameResponse]
    total_quantity: int
    variants_count: int
    is_active: bool
    variants: Optional[list[VariantResponse]] = None

    model_config = {"from_attributes": True}


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    meta: PaginationMeta
