from sqlalchemy import ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    vendor_id: Mapped[str] = mapped_column(ForeignKey("vendors.id"), nullable=False)
    stall_id: Mapped[str] = mapped_column(ForeignKey("stalls.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(120), nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    compare_at_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discount_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    images: Mapped[list] = mapped_column(JSON, nullable=False)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    catalogue_pdf_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    stock: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    delivery_area: Mapped[str | None] = mapped_column(Text, nullable=True)
    cod_available: Mapped[int] = mapped_column(Integer, default=0)
    courier_charge: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    offer_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
