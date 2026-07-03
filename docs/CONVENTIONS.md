# Conventions de développement — ATLAS

## Commits (Conventional Commits)

Format : `type(scope): description à l'impératif`

| Type | Usage |
|---|---|
| `feat` | nouvelle fonctionnalité |
| `fix` | correction de bug |
| `perf` | optimisation de performance |
| `refactor` | refactoring sans changement de comportement |
| `style` | formatage, design tokens, CSS |
| `docs` | documentation, ADR |
| `test` | ajout/modification de tests |
| `chore` | outillage, dépendances, CI |
| `data` | seeds, connecteurs, migrations de données |

Scopes : `web`, `api`, `mind`, `gis`, `canvas`, `kg`, `timeline`, `infra`, `docs`.

Exemples :
```
feat(mind): génère le portrait de territoire à la sélection
fix(gis): corrige la reprojection des isochrones en 4326
perf(web): memoïse le rendu des couches deck.gl
docs(adr): ADR-002 choix du LLM local
```

Référencer la tâche dans le corps du commit : `Task: T-042`.

## Branches

- `main` : toujours stable et déployable.
- Une branche par tâche : `t-042-portrait-service`.
- Merge en squash après validation de la tâche.

## Protocole de tâche (rappel)

1. Implémentation complète de la tâche (une seule à la fois)
2. Revue du code (lisibilité, SOLID, sécurité)
3. Vérification des performances
4. Commentaires et documentation à jour
5. Propositions d'améliorations éventuelles
6. **Validation** → tâche suivante

## Qualité

- **web** : TypeScript `strict`, ESLint + Prettier, aucun `any` non justifié.
- **api** : Ruff + mypy, docstrings sur les use cases et ports, tests pytest
  (unit sur Domain/Application, integration sur Infrastructure).
- Toute décision structurante → ADR dans `docs/adr/` (format : contexte,
  décision, conséquences).
- Le champ `agent` interne ne doit **jamais** apparaître dans une réponse
  d'API publique : ATLAS est une entité unique (voir CONCEPTION §-1).
