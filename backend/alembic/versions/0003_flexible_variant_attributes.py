"""flexible_variant_attributes

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Tạo bảng variant_attributes
    op.create_table(
        "variant_attributes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("variant_id", sa.Integer(), sa.ForeignKey("variants.id"), nullable=False),
        sa.Column("attr_name", sa.String(100), nullable=False),
        sa.Column("attr_value", sa.String(200), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.Index("ix_variant_attributes_variant_id", "variant_id"),
    )

    # 2. Migrate data cũ: color → attr_name="Màu sắc", size → attr_name="Size"
    conn = op.get_bind()

    # Migrate color
    conn.execute(sa.text("""
        INSERT INTO variant_attributes (variant_id, attr_name, attr_value)
        SELECT id, 'Màu sắc', color
        FROM variants
        WHERE color IS NOT NULL AND color != ''
    """))

    # Migrate size
    conn.execute(sa.text("""
        INSERT INTO variant_attributes (variant_id, attr_name, attr_value)
        SELECT id, 'Size', size
        FROM variants
        WHERE size IS NOT NULL AND size != ''
    """))

    # 3. Xóa cột cũ
    op.drop_column("variants", "color")
    op.drop_column("variants", "size")


def downgrade():
    op.add_column("variants", sa.Column("color", sa.String(), nullable=True))
    op.add_column("variants", sa.Column("size", sa.String(), nullable=True))

    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE variants v
        SET color = (
            SELECT attr_value FROM variant_attributes
            WHERE variant_id = v.id AND attr_name = 'Màu sắc' LIMIT 1
        )
    """))
    conn.execute(sa.text("""
        UPDATE variants v
        SET size = (
            SELECT attr_value FROM variant_attributes
            WHERE variant_id = v.id AND attr_name = 'Size' LIMIT 1
        )
    """))

    op.drop_table("variant_attributes")
