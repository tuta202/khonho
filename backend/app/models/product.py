from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    sku: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    cost_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    selling_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    supplier_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("suppliers.id"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    supplier: Mapped[Optional["Supplier"]] = relationship("Supplier", back_populates="products")
    variants: Mapped[list["Variant"]] = relationship("Variant", back_populates="product")
