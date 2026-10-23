# BSOTD app

A Next.js app with two sections:

- **Stories**: each day's stories, most relevant first, each with its claims by status a click away. A Claims view lists every claim of the day by status (disputed, corroborated, single source), and can show one status at a time. Each story has a page with its claims, how each outlet covers it, its articles and tools for editors.
- **Pipeline**: the jobs pipeline defined in `@bsotd/pipeline`, as a graph of its jobs and, for each job, its inputs, its steps and a live preview of the data each step produces.

The pipeline pages are generated entirely from the pipeline definition, so adding or changing a job there needs no changes here.

## Running

From `src/ts`:

```sh
npm install
npm run dev
```

Then open http://localhost:3000.

The app reads `NEWS_POSTGRES_CONNECTION_STRING` from the repository's `.env`, the same file the Python pipeline uses. Each view's SQL is read live from `information_schema.views`, which only shows it to the view's owner.

## Editors' corrections

On a story page, editors can move an article to another of the day's stories or into a story of its own, rate the story in place of the model, and approve or reject its analysis. Corrections are written to the pipeline's editorial tables and take effect at once:

- Moved articles are recorded in `news.gnews_story_article_override`, and story clustering replays them whenever it runs again.
- Editors' ratings in `news.gnews_story_relevance_override` take precedence over the model's when stories are ranked.
- Reviews in `news.gnews_story_analysis_review` mark an analysis approved or rejected. A rejected analysis is hidden from readers.

Reading uses read-only database sessions. Only these corrections use a second, write-enabled pool (`getEditorPool` in `src/lib/db.ts`), through the server actions in `src/app/stories/actions.ts`, which check every field before writing. There are no accounts yet, so anyone who can reach the app can make corrections: keep it on a trusted network, or give the app a database role that can only write the editorial tables.

## Layout

- `src/app/`: routes. `/` shows a day's stories (`?category=…&date=…`), or its claims with `&view=claims`, narrowed by `&status=…`. `/stories/[storyId]` shows one story, `/pipeline` shows the graph with an overview, and `/pipeline/[jobId]` shows one job.
- `src/components/stories/`: the feed, story pages and editors' forms.
- `src/components/dag/`: a generic DAG layout and drawing that knows nothing about pipelines. Edges that skip rows run down lanes beside the graph.
- `src/components/pipeline/`: pipeline views built on the DAG and the pipeline model.
- `src/components/site/` and `src/components/ui/`: the site header and small shared UI pieces.
- `src/lib/`: database reads (`stories.ts`, `dataset-preview.ts`), editors' corrections (`editorial.ts`, checked by `editorial-input.ts`) and formatting.
- `__tests__/`: tests, laid out like `src/`. `npm test` runs them with Node's built-in test runner.

Modules imported directly by tests (`dag-layout.ts`, `format-value.ts`, `preview-query.ts`, `connection-config.ts`, `story-display.ts` and `editorial-input.ts`) don't import Next.js or use `@/` paths, so plain Node can run them.
