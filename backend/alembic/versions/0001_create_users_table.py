"""create users table and seed default owner

Revision ID: 0001
Revises:
Create Date: 2026-04-12
"""
from alembic import op
import sqlalchemy as sa
from passlib.context import CryptContext

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False, server_default="staff"),
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
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # Use bcrypt_sha256 to avoid the 72-byte limit and maintain compatibility
    pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")
    hashed = pwd_context.hash("Admin@123")

    op.execute(
        sa.text(
            "INSERT INTO users (email, name, password_hash, role, is_active) "
            "VALUES (:email, :name, :password_hash, :role, :is_active)"
        ).bindparams(
            email="admin@khonho.com",
            name="Administrator",
            password_hash=hashed,
            role="owner",
            is_active=True,
        )
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")