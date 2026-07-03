# ATLAS — PostgreSQL 16 + PostGIS 3.5 + pgvector
# Image multi-arch (amd64 + arm64/Apple Silicon) — l'officielle postgis/postgis est amd64 only.
# Basée debian bookworm : pgvector s'installe via apt.
FROM imresamu/postgis:16-3.5-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      postgresql-16-pgvector \
      locales \
 && sed -i 's/# fr_FR.UTF-8 UTF-8/fr_FR.UTF-8 UTF-8/' /etc/locale.gen \
 && locale-gen \
 && rm -rf /var/lib/apt/lists/*
