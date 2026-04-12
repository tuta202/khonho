"""create data tables: suppliers, products, variants, warehouses, inventory, transactions

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-12
"""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. suppliers
    op.create_table(
        "suppliers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 2. products
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("sku", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("cost_price", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("selling_price", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("low_stock_threshold", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sku"),
    )

    # 3. variants
    op.create_table(
        "variants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("color", sa.String(), nullable=True),
        sa.Column("size", sa.String(), nullable=True),
        sa.Column("sku_variant", sa.String(), nullable=True),
        sa.Column("cost_price_override", sa.Numeric(12, 2), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sku_variant"),
    )

    # 4. warehouses
    op.create_table(
        "warehouses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # 5. inventory
    op.create_table(
        "inventory",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("variant_id", sa.Integer(), sa.ForeignKey("variants.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("variant_id", "warehouse_id"),
    )

    # 6. transactions
    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("variant_id", sa.Integer(), sa.ForeignKey("variants.id"), nullable=False),
        sa.Column(
            "from_warehouse_id",
            sa.Integer(),
            sa.ForeignKey("warehouses.id"),
            nullable=True,
        ),
        sa.Column(
            "to_warehouse_id",
            sa.Integer(),
            sa.ForeignKey("warehouses.id"),
            nullable=True,
        ),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transactions_created_at", "transactions", ["created_at"])

    # Seed: default warehouse
    op.execute(
        sa.text(
            "INSERT INTO warehouses (name, location) VALUES (:name, :location)"
        ).bindparams(name="Kho chính", location="Cửa hàng")
    )


def downgrade() -> None:
    op.drop_index("ix_transactions_created_at", table_name="transactions")
    op.drop_table("transactions")
    op.drop_table("inventory")
    op.drop_table("warehouses")
    op.drop_table("variants")
    op.drop_table("products")
    op.drop_table("suppliers")
