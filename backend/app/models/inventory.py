from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = (UniqueConstraint("variant_id", "warehouse_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    variant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("variants.id"), nullable=False
    )
    warehouse_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("warehouses.id"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    variant: Mapped["Variant"] = relationship("Variant", back_populates="inventory_items")
    warehouse: Mapped["Warehouse"] = relationship("Warehouse", back_populates="inventory_items")
