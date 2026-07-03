# ATLAS · web

Frontend React 19 + TypeScript (strict) + Vite 7 + Tailwind v4.

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # typecheck + build production
pnpm lint         # oxlint
pnpm format       # prettier
```

Structure : `src/features/*` (une feature = un dossier), `src/design-system/`
(tokens, primitives, motion — voir `docs/IDENTITE.md`), `src/lib`, `src/stores`.
Alias : `@/` → `src/`.

Lint : **oxlint** (embarqué par le template Vite, ~50× plus rapide qu'ESLint,
règles react-hooks incluses) + Prettier pour le formatage.
