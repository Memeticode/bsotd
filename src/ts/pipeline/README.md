# Pipeline model

The jobs pipeline described as data, independent of the app's framework, UI and database access.

It's the `@bsotd/pipeline` workspace package: `@bsotd/pipeline` exports the jobs pipeline, and `@bsotd/pipeline/core` exports the models, enums and helpers.

- `src/core/models/`: models and enums only: `Pipeline`, `PipelineJob`, `PipelineJobStep`, datasets and the enums they use.
- `src/core/`: logic on top of the models: validating a pipeline, connecting its jobs and deriving their outputs, kind and status.
- `src/jobs/`: one module per job, together with the datasets it produces.
- `src/index.ts`: assembles and validates the jobs pipeline.
- `__tests__/`: tests, laid out like `src/`. They import through each folder's `index.ts`, so `src/` can be rearranged internally without breaking them.

The pipeline is a graph of jobs, and each job is a mini pipeline: its `inputs` and an ordered list of `steps`. Typically the first step runs code (ingestion, a model or an LLM) and the rest are SQL steps, each one view or one table built by SQL. Tables and views are named, not described column by column: the app reads their columns, types and (for views) SQL from PostgreSQL.

Each step produces data for the steps after it. What the last step produces is the job's output. Everything else stays inside the job, because jobs can only read each other's outputs: they're connected by matching inputs to outputs by name, and must be listed after the jobs they read from.

Two kinds of input come from outside the jobs, so no job produces them: external data, such as the GNews API, and editorial tables (`editorial: true`), which editors write in the app, such as corrections that story clustering replays. A job can read either, but no job may produce an editorial table.

A job's status is derived from its steps (implemented or to do when they all agree, otherwise in progress), and its kind is that of its step that runs code: the first step that isn't SQL.

Code here imports nothing from outside `pipeline/` and uses explicit `.ts` import paths, so it runs under plain Node. For the same reason, enums are `as const` objects rather than TypeScript `enum`s, which Node can't run without compiling. `npm test` runs the tests with Node's built-in test runner.
