"""bâtiments OSM — première couche de données

Revision : 0002
Précédente : 0001
Date : 2026-07-04

Stocke le bâti OSM par territoire et publie la vue ``tiles.buildings``
consommée par martin (ADR-003 : martin ne sert que des vues du schéma
``tiles``, jamais les tables du schéma ``atlas``).
"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "osm_buildings",
        sa.Column("osm_id", sa.BigInteger(), primary_key=True, autoincrement=False),
        sa.Column(
            "territory_id",
            sa.Uuid(),
            sa.ForeignKey("atlas.territories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "geom",
            geoalchemy2.Geometry(geometry_type="POLYGON", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column("height_m", sa.Float(), nullable=False, comment="Hauteur estimée (m)"),
        sa.Column(
            "tags", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")
        ),
        sa.Column(
            "ingested_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema="atlas",
    )
    op.create_index(
        "ix_osm_buildings_geom",
        "osm_buildings",
        ["geom"],
        schema="atlas",
        postgresql_using="gist",
    )
    op.create_index("ix_osm_buildings_territory", "osm_buildings", ["territory_id"], schema="atlas")
    # Le contrat public cartographique : la vue servie par martin.
    op.execute(
        """
        CREATE VIEW tiles.buildings AS
        SELECT osm_id, geom, height_m
        FROM atlas.osm_buildings
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS tiles.buildings")
    op.drop_index("ix_osm_buildings_territory", table_name="osm_buildings", schema="atlas")
    op.drop_index("ix_osm_buildings_geom", table_name="osm_buildings", schema="atlas")
    op.drop_table("osm_buildings", schema="atlas")
