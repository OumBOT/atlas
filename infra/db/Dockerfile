# ATLAS — PostgreSQL 16 + PostGIS 3.4 + pgvector
# L'image officielle postgis/postgis n'inclut pas pgvector : on l'ajoute.
FROM postgis/postgis:16-3.4

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      postgresql-16-pgvector \
      locales \
 && sed -i 's/# fr_FR.UTF-8 UTF-8/fr_FR.UTF-8 UTF-8/' /etc/locale.gen \
 && locale-gen \
 && rm -rf /var/lib/apt/lists/*
