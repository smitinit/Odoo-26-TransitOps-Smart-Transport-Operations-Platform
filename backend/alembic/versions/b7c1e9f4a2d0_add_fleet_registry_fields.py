"""Add fleet registry fields and ON_TRIP status."""

from alembic import op
import sqlalchemy as sa

revision = "b7c1e9f4a2d0"
down_revision = "828e3be8b663"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE vehiclestatus ADD VALUE IF NOT EXISTS 'ON_TRIP'")

    op.add_column(
        "vehicles",
        sa.Column("vehicle_type", sa.String(length=50), nullable=False, server_default="Van"),
    )
    op.add_column(
        "vehicles",
        sa.Column("capacity", sa.String(length=50), nullable=False, server_default=""),
    )
    op.add_column(
        "vehicles",
        sa.Column("odometer", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "vehicles",
        sa.Column(
            "acquisition_cost",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("vehicles", "acquisition_cost")
    op.drop_column("vehicles", "odometer")
    op.drop_column("vehicles", "capacity")
    op.drop_column("vehicles", "vehicle_type")
    # Postgres cannot easily remove enum values; leave ON_TRIP in place.
