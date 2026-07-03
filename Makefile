# ATLAS — commandes du quotidien
COMPOSE := docker compose -f infra/docker-compose.yml --env-file infra/.env

.PHONY: up down logs ps db-shell web api api-install test

up:            ## démarre les services (PostGIS, Redis, martin, Ollama)
	$(COMPOSE) up -d

down:          ## arrête les services
	$(COMPOSE) down

ps:            ## état des services
	$(COMPOSE) ps

logs:          ## logs de tous les services (Ctrl+C pour sortir)
	$(COMPOSE) logs -f

db-shell:      ## console psql dans la base atlas
	docker exec -it atlas-db psql -U atlas -d atlas

web:           ## frontend en développement (http://localhost:5173)
	cd apps/web && pnpm dev

API_PORT ?= 8000
api:           ## backend en développement (http://localhost:$(API_PORT), surcharger : make api API_PORT=8010)
	cd apps/api && .venv/bin/uvicorn atlas.presentation.app:app --reload --port $(API_PORT)

api-install:   ## crée le venv backend et installe les dépendances
	cd apps/api && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"

migrate:       ## applique les migrations de schéma
	cd apps/api && .venv/bin/alembic upgrade head

seed:          ## charge les 3 territoires de démonstration
	cd apps/api && .venv/bin/python -m atlas.infrastructure.db.seed_territories

test:          ## tests backend
	cd apps/api && .venv/bin/pytest -q
