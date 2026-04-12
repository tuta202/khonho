from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (Index("ix_transactions_created_at", "created_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String, nullable=False)
    # "import" | "export_sale" | "export_damage" | "transfer" | "adjust"
    variant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("variants.id"), nullable=False
    )
    from_warehouse_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("warehouses.id"), nullable=True
    )
    to_warehouse_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("warehouses.id"), nullable=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    variant: Mapped["Variant"] = relationship("Variant")
    from_warehouse: Mapped[Optional["Warehouse"]] = relationship(
        "Warehouse", foreign_keys=[from_warehouse_id]
    )
    to_warehouse: Mapped[Optional["Warehouse"]] = relationship(
        "Warehouse", foreign_keys=[to_warehouse_id]
    )
    user: Mapped["User"] = relationship("User")
