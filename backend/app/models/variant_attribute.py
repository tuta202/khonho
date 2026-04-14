from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VariantAttribute(Base):
    __tablename__ = "variant_attributes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    variant_id: Mapped[int] = mapped_column(ForeignKey("variants.id"), nullable=False)
    attr_name: Mapped[str] = mapped_column(String(100), nullable=False)
    attr_value: Mapped[str] = mapped_column(String(200), nullable=False)

    variant: Mapped["Variant"] = relationship("Variant", back_populates="attributes")
