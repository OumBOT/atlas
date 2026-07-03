# ◉ ATLAS

**The Territory Intelligence System**

ATLAS n'est pas un SIG augmenté par l'IA — c'est une intelligence territoriale qui utilise
la carte comme langage. Chaque territoire est une entité vivante : identité, mémoire,
historique, portrait généré spontanément. L'utilisateur dialogue avec une seule entité,
ATLAS, qui raisonne à partir de données géospatiales réelles (PostGIS, INSEE, OSM, BAN)
et restitue son raisonnement à travers quatre facettes : **Carte**, **Canvas**,
**Knowledge Graph** et **Timeline**.

> Conception complète : [`docs/CONCEPTION.md`](docs/CONCEPTION.md)

---

## Structure du monorepo

```
atlas/
├── apps/
│   ├── web/          # Frontend — React 18 · TypeScript · Vite · Tailwind
│   │                 #   Three.js (globe) · MapLibre GL + deck.gl (carto)
│   │                 #   @xyflow/react (Canvas) · sigma.js (Knowledge Graph)
│   └── api/          # Backend — Python · FastAPI · Clean Architecture
│                     #   LangGraph (esprit ATLAS) · PostGIS · pgvector · Celery
├── infra/            # docker-compose (PostGIS, Redis, martin, Ollama) · CI
├── docs/             # Conception, ADRs, conventions
│   └── adr/          # Architecture Decision Records
└── data/seeds/       # Territoires de démonstration pré-chargés
```

## Démarrage rapide

> Disponible à partir de T-004 (scaffolds front/back). Prévu :

```bash
docker compose -f infra/docker-compose.yml up -d   # PostGIS + Redis + martin + Ollama
cd apps/api && make dev                             # API sur :8000
cd apps/web && pnpm dev                             # UI sur :5173
```

## Développement

- **Protocole** : une tâche à la fois, terminée, documentée, validée (voir `docs/CONCEPTION.md` §8).
- **Conventions** : commits conventionnels, branches par tâche — voir [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md).
- **Décisions d'architecture** : consignées dans `docs/adr/`.

## Licence

MIT — voir [`LICENSE`](LICENSE).
