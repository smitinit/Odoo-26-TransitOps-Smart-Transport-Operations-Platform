"""Extend drivers table for safety profiles mockup fields."""

from alembic import op
import sqlalchemy as sa

revision = "c8d2f0a5b3e1"
down_revision = "b7c1e9f4a2d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        for value in ("AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"):
            op.execute(f"ALTER TYPE driverstatus ADD VALUE IF NOT EXISTS '{value}'")

    op.add_column(
        "drivers",
        sa.Column("first_name", sa.String(length=100), nullable=False, server_default=""),
    )
    op.add_column(
        "drivers",
        sa.Column("last_name", sa.String(length=100), nullable=False, server_default=""),
    )
    op.add_column(
        "drivers",
        sa.Column("license_category", sa.String(length=20), nullable=False, server_default="LMV"),
    )
    op.add_column("drivers", sa.Column("license_expiry", sa.Date(), nullable=True))
    op.add_column(
        "drivers",
        sa.Column("contact_number", sa.String(length=30), nullable=False, server_default=""),
    )
    op.add_column(
        "drivers",
        sa.Column("safety_score", sa.Integer(), nullable=False, server_default="100"),
    )
    op.add_column("drivers", sa.Column("trip_completion_pct", sa.Float(), nullable=True))

    # Allow drivers without linked login accounts
    op.alter_column("drivers", "user_id", existing_type=sa.Uuid(), nullable=True)
    op.drop_constraint("drivers_user_id_fkey", "drivers", type_="foreignkey")
    op.create_foreign_key(
        "drivers_user_id_fkey",
        "drivers",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Map legacy statuses toward mockup vocabulary
    op.execute("UPDATE drivers SET status = 'AVAILABLE' WHERE status = 'ACTIVE'")
    op.execute("UPDATE drivers SET status = 'OFF_DUTY' WHERE status = 'ON_LEAVE'")
    op.execute("UPDATE drivers SET status = 'SUSPENDED' WHERE status = 'TERMINATED'")


def downgrade() -> None:
    op.execute("UPDATE drivers SET status = 'ACTIVE' WHERE status = 'AVAILABLE'")
    op.execute("UPDATE drivers SET status = 'ON_LEAVE' WHERE status = 'OFF_DUTY'")
    op.execute("UPDATE drivers SET status = 'TERMINATED' WHERE status = 'SUSPENDED'")

    op.drop_constraint("drivers_user_id_fkey", "drivers", type_="foreignkey")
    op.create_foreign_key(
        "drivers_user_id_fkey",
        "drivers",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column("drivers", "user_id", existing_type=sa.Uuid(), nullable=False)

    op.drop_column("drivers", "trip_completion_pct")
    op.drop_column("drivers", "safety_score")
    op.drop_column("drivers", "contact_number")
    op.drop_column("drivers", "license_expiry")
    op.drop_column("drivers", "license_category")
    op.drop_column("drivers", "last_name")
    op.drop_column("drivers", "first_name")
