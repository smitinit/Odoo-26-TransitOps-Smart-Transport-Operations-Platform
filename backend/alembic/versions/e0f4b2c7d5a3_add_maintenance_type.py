"""Add maintenance_type to maintenance records."""

from alembic import op
import sqlalchemy as sa

revision = "e0f4b2c7d5a3"
down_revision = "d9e3a1b6c4f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "maintenance",
        sa.Column(
            "maintenance_type",
            sa.String(length=100),
            nullable=False,
            server_default="General",
        ),
    )


def downgrade() -> None:
    op.drop_column("maintenance", "maintenance_type")
