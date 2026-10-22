# Pipeline model

The news pipeline described as data, independent of the app's framework, UI and database access.

It's the `@bsotd/pipeline` workspace package: `@bsotd/pipeline` exports the news pipeline, and `@bsotd/pipeline/core` exports the models, enums and helpers.

- `src/core/models/`: models and enums only, describing pipelines, steps, transformations and datasets.
- `src/core/`: logic on top of the models: validating a pipeline, connecting its steps and deriving their status.
- `src/steps/`: one module per step of the news pipeline, together with the datasets it outputs.
- `src/index.ts`: assembles and validates the news pipeline.
- `__tests__/`: tests, laid out like `src/`. They import through each folder's `index.ts`, so `src/` can be rearranged internally without breaking them.

Steps aren't wired to each other directly. Each step lists the datasets it reads (`inputs`) and writes (`outputs`), and steps are connected by matching inputs to outputs by name. Steps must be listed after the steps they read from.

A step's status is derived from its transformations: implemented or to do when they all agree, otherwise in progress.

Code here imports nothing from outside `pipeline/` and uses explicit `.ts` import paths, so it runs under plain Node. For the same reason, enums are `as const` objects rather than TypeScript `enum`s, which Node can't run without compiling. `npm test` runs the tests with Node's built-in test runner.
