"""territoires — table fondatrice

Revision : 0001
Précédente : None
Date : 2026-07-03

Crée ``atlas.territories`` : l'entité vivante au cœur d'ATLAS
(CONCEPTION §4). Portrait, mémoire, canvas et graphe s'y rattacheront.
"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "territories",
        sa.Column(
            "id",
            sa.Uuid(),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("code_insee", sa.Text(), nullable=False, unique=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column(
            "boundary",
            geoalchemy2.Geometry(
                geometry_type="MULTIPOLYGON",
                srid=4326,
                spatial_index=False,  # index GIST créé explicitement ci-dessous
            ),
            nullable=False,
        ),
        sa.Column(
            "stats_cache",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
            comment="Chiffres clés dénormalisés (population, superficie…) + provenance",
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema="atlas",
    )
    op.create_index(
        "ix_territories_boundary",
        "territories",
        ["boundary"],
        schema="atlas",
        postgresql_using="gist",
    )
    op.create_index(
        "ix_territories_name_trgm",
        "territories",
        [sa.text("name gin_trgm_ops")],
        schema="atlas",
        postgresql_using="gin",
    )


def downgrade() -> None:
    op.drop_index("ix_territories_name_trgm", table_name="territories", schema="atlas")
    op.drop_index("ix_territories_boundary", table_name="territories", schema="atlas")
    op.drop_table("territories", schema="atlas")
