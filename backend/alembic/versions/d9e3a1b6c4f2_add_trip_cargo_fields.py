"""Add cargo / distance fields to trips."""

from alembic import op
import sqlalchemy as sa

revision = "d9e3a1b6c4f2"
down_revision = "c8d2f0a5b3e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trips",
        sa.Column("load_type", sa.String(length=100), nullable=False, server_default=""),
    )
    op.add_column(
        "trips",
        sa.Column("cargo_weight_kg", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "trips",
        sa.Column("planned_distance_km", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("trips", "planned_distance_km")
    op.drop_column("trips", "cargo_weight_kg")
    op.drop_column("trips", "load_type")
