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

The system follows a modular pipeline:

```text
GNews API
    ↓
Raw Data Ingestion
    ↓
JSONB Extraction
    ↓
Exact Deduplication
    ↓
Sentence Embeddings  +  TF-IDF Vectors
    ↓
Daily Article Pair Similarity
    ↓
Story Clustering
    ↓
Story Relevance Classification
    ↓
LLM-Based Story Analysis
    ↓
Story-Centric Presentation
```

PostgreSQL is the central data store between stages, and human review and editorial overrides remain possible at every major stage.

Each stage is designed to operate independently, allowing processing strategies and models to evolve without requiring changes to the underlying ingestion system.

The full pipeline definition, with each step's transformations, datasets and implementation status, lives in `src/ts/pipeline`.

### Data Ingestion

The initial implementation uses the [GNews API](https://gnews.io/) to retrieve categorized news articles.

Raw article data is stored in PostgreSQL using `jsonb`, preserving the original API content for subsequent extraction and transformation.

The ingestion layer is intentionally minimal and does not perform story classification or analytical transformations.

### Story Intelligence

Articles will be grouped into persistent stories that can evolve as additional reporting becomes available.

A lightweight classifier will assign relevance levels to help determine which stories warrant more expensive analysis. Human operators will be able to override automated decisions.

Selected stories will undergo LLM-assisted analysis to extract factual claims and compare their treatment across sources.

The system will distinguish between agreement, unique coverage, omission, and contradiction, while accounting for syndicated reporting and changes in information over time.

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
| Machine learning | scikit-learn (TF-IDF; classifiers to be determined) |
| LLM analysis | To be determined |
| Application / UI | Next.js |

## Project Structure

```text
src/db/
  001_create.sql

src/py/news/
  clients/
    gnews_client.py
  embedding/
    gnews_article_embedding.py
    text_embedder.py
  ingestion/
    gnews_ingestion.py
  repository/
    gnews_article_embedding_repository.py
    gnews_article_repository.py

src/ts/            npm workspace for the TypeScript packages
  pipeline/        @bsotd/pipeline: steps, transformations and datasets
    src/
      core/        Models and enums, validation, step graph and status
      steps/       One module per pipeline step
      index.ts     The news pipeline
    __tests__/
  app/             @bsotd/app: Next.js app that shows the pipeline
    src/
    __tests__/

scripts/
  embed_gnews.py
  ingest_gnews.py
```

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

**Project Status:** Early development — ingestion, extraction, exact deduplication and sentence embeddings are in place; TF-IDF vectors and daily pair similarity are designed; story clustering and relevance classification are next.