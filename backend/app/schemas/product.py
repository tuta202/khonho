from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


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
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    cost_price: Optional[Decimal] = Decimal("0")
    selling_price: Optional[Decimal] = Decimal("0")
    low_stock_threshold: Optional[int] = 5
    supplier_id: Optional[int] = None
    variants: Optional[list[VariantCreate]] = None


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
