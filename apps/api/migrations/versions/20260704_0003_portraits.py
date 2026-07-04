"""portraits : la présentation spontanée des territoires

Revision : 0003
Précédente : 0002
Date : 2026-07-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "portraits",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "territory_id",
            sa.Uuid(),
            sa.ForeignKey("atlas.territories.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("narrative", sa.Text(), nullable=False, comment="Résumé rédigé par ATLAS"),
        sa.Column(
            "sections",
            postgresql.JSONB(),
            nullable=False,
            comment="forces, faiblesses, tendances, risques, opportunites",
        ),
        sa.Column("facts", postgresql.JSONB(), nullable=False, comment="Faits sources du portrait"),
        sa.Column("model", sa.Text(), nullable=False),
        sa.Column(
            "generated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema="atlas",
    )


def downgrade() -> None:
    op.drop_table("portraits", schema="atlas")
