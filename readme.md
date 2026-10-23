# News Intelligence

An AI-assisted news aggregation and analysis platform designed to transform traditional headline-based news consumption into a **story-centric experience**.

## Overview

Traditional news aggregators organize information around individual articles and headlines. This often results in redundant coverage, fragmented narratives, and limited visibility into how different news organizations report the same events.

This project aims to organize news around **stories rather than articles**, providing a consolidated understanding of events while preserving the perspectives, evidence, and reporting of individual sources.

The ultimate goal is to help readers understand not only *what happened*, but also **what different sources agree on, where their coverage differs, and what information may be missing**.

## Core Objectives

1. **Story Identification:** Group articles covering the same underlying event or development into a single, persistent story.
2. **Relevance Classification:** Use lightweight machine-learning classifiers to assess story significance, prioritize processing, and reduce computational costs.
3. **Human Oversight:** Allow editorial review and manual overrides of automated classifications and story assignments.
4. **Key Takeaway Extraction:** Use large language models to extract meaningful, evidence-backed claims from individual articles.
5. **Cross-Source Comparison:** Identify shared claims, unique reporting, omissions, and potential contradictions across news sources.
6. **Bias Exploration:** Examine differences in editorial emphasis and framing without assuming that omissions or disagreements necessarily indicate bias.
7. **Story-Centric Presentation:** Present consolidated stories with transparent attribution, supporting evidence, and comparisons across sources.

## Processing Architecture

The system is a **jobs pipeline**: a graph of jobs, each a small pipeline of its own. A job runs code (Python, an API call or an LLM) that writes tables, then SQL steps, one view each, build on them. What a job's last step produces is its output, which later jobs read.

```text
GNews API
    ↓
GNews Ingestion          fetch → extract → normalize → group → deduplicate → daily set
    ↓
Sentence Embeddings  +  TF-IDF Vectors
    ↓
Daily Article Pair Similarity
    ↓
Story Clustering                  ← editors' corrections
    ↓
Story Relevance Classification    ← editors' ratings
    ↓
LLM-Based Story Analysis          ← editors' reviews
```

PostgreSQL is the central data store between jobs, and each job works on one category and UTC publication day at a time. Jobs record the model, settings and input hash behind every output, so rerunning a job recomputes only what changed, and each can evolve without changes to the jobs before it.

Editors review stories in the app: they move articles between stories, rate stories in place of the model, and approve or reject analyses. Corrections take effect at once, and the jobs keep them when they run again.

The pipeline is defined as data in `src/ts/pipeline`: each job's inputs, steps and datasets. The app in `src/ts/app` shows each day's stories, and under Pipeline it draws the jobs as a graph with each step's SQL and live, paginated data.

### Data Ingestion

The initial implementation uses the [GNews API](https://gnews.io/) to retrieve categorized news articles.

Raw article data is stored in PostgreSQL using `jsonb`, preserving the original API content. SQL views on the raw table extract article fields and remove exact duplicates, then keep one row per article per category and UTC publication day: the daily set that every later job works on.

The ingestion code is intentionally minimal and does not perform story classification or analytical transformations.

### Story Intelligence

Each day's articles are grouped into stories by agglomerative clustering on a blend of embedding and TF-IDF similarity, tuned to split rather than merge articles that merely share a topic. Both are computed from each article's title, description and the first 300 characters of its content, which carry the specifics when a headline is generic. A story keeps its identity as articles join it or editors move them.

Claude rates each story on two separate scales: how squarely it belongs in its category, and how important it is. It also flags articles that seem to report a different event from the rest of their story. The ratings rank each day's stories, and the top-ranked stories go on to analysis.

Analysis extracts each story's checkable claims, quoting every article that supports or contradicts them. Syndicated copies count as one report, and an article that doesn't mention a claim is never treated as contradicting it. Claims are classed as corroborated, single-source or disputed, alongside notes on how each outlet frames the story.

Editors can override any of these decisions, and the models' outputs are kept alongside their corrections.

## Technology Stack

| Component | Technology |
|---|---|
| Pipeline processing | Python |
| Pipeline definition and app | TypeScript |
| Database | PostgreSQL with pgvector |
| HTTP client | HTTPX |
| Database connectivity | Psycopg 3 |
| Data source | GNews API |
| Sentence embeddings | fastembed with BAAI/bge-small-en-v1.5 |
| Machine learning | scikit-learn (TF-IDF, agglomerative clustering) |
| Relevance rating and story analysis | Claude via the Anthropic SDK (claude-opus-5-5 by default) |
| Application / UI | Next.js |

## Project Structure

```text
src/db/
  001_create.sql

src/py/news/
  clients/         GNews and Claude
    claude_client.py
    gnews_client.py
  embedding/       Sentence embeddings
    gnews_article_embedding.py
    text_embedder.py
  ingestion/       GNews ingestion
    gnews_ingestion.py
  repository/      Each job's reads and writes, and readers jobs share
    gnews_article_embedding_repository.py
    gnews_article_repository.py
    gnews_article_similarity_repository.py
    gnews_article_tfidf_repository.py
    gnews_daily_article_repository.py
    gnews_story_analysis_repository.py
    gnews_story_reader.py
    gnews_story_relevance_repository.py
    gnews_story_repository.py
  similarity/      Daily pair similarity
    gnews_article_similarity.py
  stories/         Story clustering, relevance rating and analysis
    gnews_story_analysis.py
    gnews_story_clustering.py
    gnews_story_relevance.py
    story.py
    story_analysis.py
    story_clustering.py
    story_relevance.py
  text/            The text vectors are built from: title, description and opening
    input_text.py
  tfidf/           TF-IDF vectors
    gnews_article_tfidf.py
    tfidf_corpus.py
src/py/tests/      unittest tests, laid out like news/

src/ts/            npm workspace for the TypeScript packages
  pipeline/        @bsotd/pipeline: the jobs pipeline as data
    src/
      core/        Models and enums, validation, job graph, kind and status
      jobs/        One module per job, with the datasets it produces
      index.ts     The jobs pipeline
    __tests__/
  app/             @bsotd/app: Next.js app for the day's stories and the pipeline
    src/
      app/         Routes: the story feed, story pages and pipeline pages
      components/  Stories, the DAG, pipeline views and shared UI
      lib/         Database reads, editors' corrections and formatting
    __tests__/

scripts/           One script per job, plus one that runs them all
  ingest_gnews.py
  embed_gnews.py
  vectorize_gnews.py
  score_gnews.py
  cluster_gnews.py
  rate_gnews.py
  analyze_gnews.py
  run_gnews_pipeline.py
```

## Getting Started

You'll need Python 3.14, Node.js 24, and PostgreSQL with the pgvector extension.

Create a `.env` file in the repository root. The Python jobs and the app both read it:

```sh
GNEWS_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
NEWS_POSTGRES_CONNECTION_STRING=host=localhost port=5432 dbname=news user=news password=secret
```

The connection string can also be a `postgresql://` URL. Only the relevance and analysis jobs need `ANTHROPIC_API_KEY`.

Create the schema on a fresh database, then install the Python dependencies:

```sh
psql "<connection string>" -f src/db/001_create.sql
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # .venv/bin/pip on macOS and Linux
```

### Running Jobs

Each job has a script, and all of them take `--category` (default `science`) and `--date` (default today, UTC). Without `--execute`, a script does a dry run: it reports what it would do and changes nothing.

To run every job for a day, in order, starting by fetching its headlines:

```sh
.venv/Scripts/python scripts/run_gnews_pipeline.py --date 2026-10-21 --ingest --execute
```

Or run the jobs one at a time, in this order:

| Script | Job |
|---|---|
| `ingest_gnews.py` | Fetch the day's top headlines from GNews |
| `embed_gnews.py` | Embed each article's title, description and opening |
| `vectorize_gnews.py` | Fit the day's TF-IDF corpus and vectors |
| `score_gnews.py` | Score the similarity of every pair of articles |
| `cluster_gnews.py` | Group articles into stories, replaying editors' corrections |
| `rate_gnews.py` | Rate each story's category relevance and importance with Claude |
| `analyze_gnews.py` | Analyze the top-ranked stories with Claude: five by default, set with `--limit` |

Jobs skip work that's already current, so rerunning a day only recomputes what changed, such as new articles or an editor's correction.

The Python tests use the standard library's `unittest`:

```sh
.venv/Scripts/python -m unittest discover -s src/py/tests -t src/py
```

### Running the App

```sh
cd src/ts
npm install
npm run dev        # http://localhost:3000
npm test           # pipeline and app tests
npm run typecheck
```

The homepage shows the latest day's stories, most relevant first. Each story page has its claims, how each outlet covers it, its articles and editors' tools. The app has no accounts yet, so anyone who can reach it can make corrections: keep it on a trusted network.

## Development Roadmap

**Phase 1 — Data Foundation**

Establish reliable, repeatable ingestion of GNews articles into PostgreSQL, preserving source content and collection metadata.

**Phase 2 — Story Identification**

Develop article deduplication, story grouping, persistent story identities, and mechanisms for correcting story assignments.

**Phase 3 — Relevance Classification**

Develop and evaluate lightweight classifiers, configurable relevance thresholds, and human override workflows.

**Phase 4 — Story Analysis**

Introduce LLM-based takeaway extraction, claim alignment, supporting evidence, and cross-source comparisons.

**Phase 5 — Publication**

Build a story-centric news interface with daily story selection, source attribution, editorial review, and transparent presentation of agreement and disagreement.

## Initial Scope

Development and experimentation will begin with the **Science** news category, providing a manageable dataset for validating ingestion, story identification, and analytical quality.

The intended production application will focus primarily on the **Nation** category, where differences in reporting, editorial framing, and source perspectives are particularly relevant.

## Guiding Principles

- **Evidence over inference:** Analytical conclusions should be traceable to source material.
- **Transparency:** Preserve original reporting and distinguish established facts from interpretations.
- **Human oversight:** Automated classifications and analytical decisions should remain reviewable and correctable.
- **Computational efficiency:** Use lightweight models and deterministic processing where possible, reserving LLMs for tasks that require deeper language understanding.
- **Modularity:** Separate ingestion, classification, analysis, and presentation.
- **Editorial neutrality:** Surface differences in coverage without automatically attributing them to deliberate bias.
- **Reproducibility:** Preserve source data, processing metadata, and model outputs to support auditing and evaluation.

---

**Project Status:** Every stage runs end to end for the Science category: ingestion and deduplication, sentence embeddings, TF-IDF, pair similarity, story clustering, relevance rating and story analysis. Editors can correct stories, ratings and analyses in the app. Next: stories that persist across days, a relevance classifier trained on editors' ratings, and editor accounts.