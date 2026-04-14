from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Variant(Base):
    __tablename__ = "variants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id"), nullable=False
    )
    sku_variant: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    cost_price_override: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    product: Mapped["Product"] = relationship("Product", back_populates="variants")
    inventory_items: Mapped[list["Inventory"]] = relationship(
        "Inventory", back_populates="variant"
    )
    attributes: Mapped[list["VariantAttribute"]] = relationship(
        "VariantAttribute", back_populates="variant", cascade="all, delete-orphan"
    )
