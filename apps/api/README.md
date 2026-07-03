# ATLAS · api

Backend FastAPI — Clean Architecture (`domain` / `application` / `infrastructure` / `presentation`).

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env          # ajuster le mot de passe et le port DB

uvicorn atlas.presentation.app:app --reload    # http://localhost:8000/health
pytest                                          # tests
ruff check src tests && mypy                    # qualité
alembic revision --autogenerate -m "..."        # migrations (dès T-00x modèles)
alembic upgrade head
```

Règle d'or (docs/IDENTITE.md) : la couche `presentation` parle d'une seule
voix — aucune trace des agents internes ne sort de l'API.
