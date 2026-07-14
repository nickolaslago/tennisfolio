# CLAUDE.md

Build conventions for the Tennisfolio monorepo. See [README.md](./README.md) for project vision and scope.

## Structure

```
tennisfolio/
├── apps/
│   ├── web/    # React 18 + TypeScript (Vite), Tailwind v4, shadcn/ui
│   └── api/    # FastAPI (Python 3.12), SQLAlchemy 2, Alembic, Pydantic v2
├── packages/
│   └── core/   # shared TS logic (score parser, types) — no runtime deps, consumed via workspace protocol
```

`apps/web` and `packages/core` are a pnpm workspace (see `pnpm-workspace.yaml`). `apps/api` is a standalone `uv`-managed Python project — it is not part of the pnpm workspace and has its own lockfile (`uv.lock`).

## Commands

### Web (`apps/web`)

Run from `apps/web`, or via the root scripts (`pnpm dev:web`, etc.):

- `pnpm dev` — start the Vite dev server at http://localhost:5173
- `pnpm build` — typecheck (`tsc -b`) and produce a production build
- `pnpm lint` — ESLint (flat config, `eslint.config.js`)
- `pnpm format` — Prettier, writes in place

### API (`apps/api`)

Run from `apps/api`:

- `uv run uvicorn app.main:app --reload` — start the API at http://localhost:8000/docs
- `uv run pytest` — run the test suite
- `uv run ruff check .` — lint
- `uv run ruff format .` — format
- `uv run alembic revision --autogenerate -m "message"` — create a migration after changing models in `app/`
- `uv run alembic upgrade head` — apply migrations

### Core (`packages/core`)

Run from `packages/core`:

- `pnpm test` — Vitest
- `pnpm typecheck` — `tsc --noEmit`

## Conventions

- **TypeScript**: strict mode everywhere. Import shared code from `@tennisfolio/core` via the `workspace:*` protocol rather than duplicating types between `apps/web` and future clients.
- **Path alias**: `apps/web` uses `@/*` → `src/*` (see `vite.config.ts` and `tsconfig.app.json`). shadcn/ui components live in `src/components/ui` and are treated as vendored — don't hand-edit generated primitives beyond what `shadcn add` produces; wrap them instead.
- **Python**: SQLAlchemy 2.0 declarative style (`DeclarativeBase`, typed `Mapped[...]` columns) for models in `app/`. Pydantic v2 schemas stay separate from ORM models. Every schema change to a model needs a matching Alembic migration in the same change.
- **FastAPI routes**: grouped under `app/routers/`, included in `app/main.py`. Settings live in `app/config.py` via `pydantic-settings`, reading from `.env` (prefixed `TENNISFOLIO_`).
- **Derived data**: match/set results and score strings are computed (in `packages/core`'s score parser, and mirrored in the API), never stored redundantly — see the data model in the README.
- **Linting is not optional**: `pnpm lint` / `ruff check` must pass before a change is considered done. Both are wired with Prettier/ruff-format equivalents — run the formatter rather than hand-fixing style nits.
