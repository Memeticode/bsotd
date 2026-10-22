# Pipeline app

A Next.js app that shows the news pipeline defined in `@bsotd/pipeline`: a graph of its steps and, for each step, its transformations and a live preview of its output data from PostgreSQL.

The pipeline pages are generated entirely from the pipeline definition, so adding or changing a step there needs no changes here.

## Running

From `src/ts`:

```sh
npm install
npm run dev
```

Then open http://localhost:3000.

The app reads `NEWS_POSTGRES_CONNECTION_STRING` from the repository's `.env`, the same file the Python pipeline uses, and only opens read-only database sessions.

## Layout

- `src/app/`: routes. `/` is the homepage, `/pipeline` shows the graph with an overview, and `/pipeline/[stepId]` shows one step.
- `src/components/dag/`: a generic DAG layout and drawing that knows nothing about pipelines.
- `src/components/pipeline/`: pipeline views built on the DAG and the pipeline model.
- `src/components/ui/`: small shared UI pieces.
- `src/lib/`: database access and value formatting.
- `__tests__/`: tests, laid out like `src/`. `npm test` runs them with Node's built-in test runner.

Modules imported directly by tests (`dag-layout.ts`, `format-value.ts`, `preview-query.ts` and `connection-config.ts`) don't import Next.js or use `@/` paths, so plain Node can run them.
