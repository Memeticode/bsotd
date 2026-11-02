# BSOTD app

A Next.js app with three sections:

- **Stories**: each day's relevant stories, most important first, with the rest collapsed under Not relevant. A story shows its headline, summary and lead image, links to every outlet carrying it, and its claims by status (disputed, corroborated, single source) a click away. When a story has two or more independent sources, its claims, in its card and on its page, have their own filters for sources and, if the claims' statuses differ, statuses. A single source's claims are simply listed, since there's nothing to compare. Each filter row starts at All; picking an option narrows to it, picking more adds them, picking one again removes it, and All clears the row. A claim's status always counts every source, copies of one report once, so filters only narrow the list. Choosing sources shows the claims they report or contradict, and choosing two or more compares them: each claim shows which of them report it, contradict it or leave it out. A single-source story keeps its outlet's own headline, unchanged. Each story has a page with its claims, how each outlet covers it and its articles. Wherever an outlet is named, it links to its copy of the article.
- **Editor**: each day's stories as a work queue, showing whether each is relevant and who decided, where its analysis stands (claims, to review, approved or rejected), flagged articles and anything out of date. Each story has an editor's page with its notices, its relevance, its analysis laid out for review and its articles, each of which can be moved.
- **Pipeline**: the jobs pipeline defined in `@bsotd/pipeline`, as a graph of its jobs and, for each job, its inputs, its steps and a live preview of the data each step produces.

The pipeline pages are generated entirely from the pipeline definition, so adding or changing a job there needs no changes here.

## Running

From `src/ts`:

```sh
npm install
npm run dev
```

Then open http://localhost:3000.

The app reads `NEWS_POSTGRES_CONNECTION_STRING` from the repository's `.env`, the same file the Python pipeline uses. Story images load straight from the outlets' sites, without a referrer, and are left out when they don't load. Each view's SQL is read live from `information_schema.views`, which only shows it to the view's owner.

## Editors' corrections

On a story's editor page, editors can move an article to another of the day's stories or into a story of its own, mark the story relevant or not in place of the model, and approve or reject its analysis. Corrections are written to the pipeline's editorial tables and take effect at once:

- Moved articles are recorded in `news.gnews_story_article_override`, and story clustering replays them whenever it runs again.
- Editors' verdicts in `news.gnews_story_relevance_override` decide whether a story is relevant in place of the model's ratings, which still set its place among the day's stories.
- Reviews in `news.gnews_story_analysis_review` mark an analysis approved or rejected. A rejected analysis is hidden from readers.

Reading uses read-only database sessions. Only these corrections use a second, write-enabled pool (`getEditorPool` in `src/lib/db.ts`), through the server actions in `src/app/editor/actions.ts`, which check every field before writing. There are no accounts yet, so anyone who can reach the app can make corrections: keep it on a trusted network, or give the app a database role that can only write the editorial tables.

## Layout

- `src/app/`: routes. `/` shows a day's stories (`?category=…&date=…`). `/stories/[storyId]` shows one story to readers. `/editor` shows a day's stories for editors (same parameters) and `/editor/stories/[storyId]` one story's corrections. `/pipeline` shows the graph with an overview, and `/pipeline/[jobId]` shows one job.
- `src/components/stories/`: the feed and story pages.
- `src/components/editor/`: the editor's day view, panels and forms.
- `src/components/dag/`: a generic DAG layout and drawing that knows nothing about pipelines. Edges that skip rows run down lanes beside the graph.
- `src/components/pipeline/`: pipeline views built on the DAG and the pipeline model.
- `src/components/site/` and `src/components/ui/`: the site header and small shared UI pieces.
- `src/lib/`: database reads (`stories.ts`, `dataset-preview.ts`), editors' corrections (`editorial.ts`, checked by `editorial-input.ts`) and formatting.
- `__tests__/`: tests, laid out like `src/`. `npm test` runs them with Node's built-in test runner.

Modules imported directly by tests (`dag-layout.ts`, `format-value.ts`, `preview-query.ts`, `connection-config.ts`, `story-display.ts` and `editorial-input.ts`) don't import Next.js or use `@/` paths, so plain Node can run them.
