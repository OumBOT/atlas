-- ATLAS — extensions requises (exécuté une seule fois à l'initialisation du volume)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS vector;        -- pgvector : mémoire des territoires
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- recherche floue de communes
CREATE EXTENSION IF NOT EXISTS unaccent;      -- "Saint-Denis" ≈ "saint denis"
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schémas de travail (les tables arrivent avec Alembic, T-004+)
CREATE SCHEMA IF NOT EXISTS atlas;            -- cœur applicatif
CREATE SCHEMA IF NOT EXISTS tiles;            -- vues exposées à martin
