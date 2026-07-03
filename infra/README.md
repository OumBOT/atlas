# ATLAS · infra

## Services de développement

| Service | Port | Rôle |
|---|---|---|
| `db` | 5432 | PostgreSQL 16 + PostGIS 3.4 + pgvector (image custom `infra/db/Dockerfile`) |
| `redis` | 6379 | cache + broker Celery |
| `martin` | 3000 | tuiles vectorielles MVT depuis PostGIS (schéma `tiles`) |
| `ollama` | 11434 | LLM local (esprit ATLAS en dev) |

## Démarrage

```bash
cp infra/.env.example infra/.env        # puis éditer POSTGRES_PASSWORD
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d
docker exec atlas-ollama ollama pull qwen2.5:14b-instruct   # première fois
```

Vérifications :
```bash
docker compose -f infra/docker-compose.yml ps               # tous healthy
psql postgresql://atlas:***@localhost:5432/atlas -c "SELECT postgis_version();"
curl -s localhost:3000/health                               # martin: OK
curl -s localhost:11434/api/tags                            # modèles ollama
```

## Notes

- Les extensions (`postgis`, `vector`, `pg_trgm`, `unaccent`) et les schémas
  `atlas`/`tiles` sont créés automatiquement au premier démarrage
  (`db/init/01-extensions.sql`). Un `down -v` réinitialise tout.
- martin expose automatiquement toute table/vue géométrique du schéma `tiles`
  en `http://localhost:3000/{table}/{z}/{x}/{y}` — la convention ATLAS est de
  ne publier que des **vues** dans `tiles`, jamais les tables brutes.
- GPU NVIDIA pour Ollama : décommenter le bloc `deploy` dans le compose.
- CI : ce même compose (sans ollama) servira aux tests d'intégration (T-006).
