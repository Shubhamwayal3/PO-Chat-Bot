# 05 — Architecture

## High-level

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  Chat UI        │────▶│  Chat Orchestrator│────▶│  REST API Layer    │
│  (Web / later   │     │  Intent + slots   │     │  /articles, /pos…  │
│   Teams, etc.)  │◀────│  Confirmations    │◀────│                    │
└─────────────────┘     └────────┬─────────┘     └─────────┬──────────┘
                                 │                         │
                                 │ optional LLM            ▼
                                 ▼               ┌────────────────────┐
                        ┌────────────────┐       │  Excel Service     │
                        │ Intent parser  │       │  lock + read/write │
                        │ (rules or LLM) │       └─────────┬──────────┘
                        └────────────────┘                 │
                                                           ▼
                                                 ┌────────────────────┐
                                                 │ PO_Cycle_Master.xlsx│
                                                 │ 4 sheets            │
                                                 └────────────────────┘
```

## Components

| Component | Responsibility |
|-----------|----------------|
| Chat UI | Message thread, confirm buttons |
| Orchestrator | Map utterance → intent → call API → format reply |
| Intent parser | Rules (regex/keywords) first; LLM optional for NL |
| REST API | Validation, numbering, FK checks |
| Excel Service | Sheet CRUD, mutex, next-number helpers |

## Tech recommendation (pick one)

### Option A — Node.js (good default)

- Express or Fastify  
- `exceljs` for xlsx  
- Simple static chat page or React later  

### Option B — Python

- FastAPI  
- `openpyxl`  
- Same API shapes  

**Recommendation for this project:** **Option A (Node + exceljs)** if the chat UI will stay JS; **Option B** if the team prefers Python for scripting/SAP adjacency. Document the choice in a root `TECH.md` when you scaffold.

## Why one workbook

- Atomic-ish demo data  
- Easy backup (copy one file)  
- FK validation without a real RDBMS  

## Scaling escape hatch

If Excel becomes a bottleneck:

1. Keep API contracts  
2. Swap Excel Service for SQLite / Postgres  
3. Optional: sync export back to xlsx for business users  

Do **not** split into four files until concurrency or ownership forces it.

## Concurrency model

```
writeQueue.enqueue(async () => {
  lock file / mutex
  load workbook
  mutate sheet
  save
  release
})
```

Reads can run unlocked for MVP, or share a read lock if you see torn reads.

## Config

Environment variables (suggested):

| Var | Example |
|-----|---------|
| `PORT` | `3000` |
| `WORKBOOK_PATH` | `./data/PO_Cycle_Master.xlsx` |
| `API_KEY` | optional |
| `LLM_API_KEY` | optional |

## Security (MVP)

- Bind localhost for demo  
- Do not commit real secrets  
- Treat workbook as sensitive business data  

## Observability

- Structured log per API call  
- `GET /health` includes workbook reachable + queue depth
