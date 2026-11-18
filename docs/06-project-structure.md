# 06 — Suggested Project Structure

Scaffold when you start coding (this kit is docs-only).

```
PO cycle chat bot/
├── README.md
├── docs/                          # ← this startup kit
│   ├── 01-vision-and-scope.md
│   ├── 02-excel-data-model.md
│   ├── 03-api-design.md
│   ├── 04-chatbot-flows.md
│   ├── 05-architecture.md
│   ├── 06-project-structure.md
│   ├── 07-roadmap.md
│   ├── api/
│   │   └── openapi-sketch.md
│   └── samples/
│       └── sample-rows.md
├── data/
│   ├── PO_Cycle_Master.xlsx       # system of record
│   └── .gitkeep
├── src/                           # or app/
│   ├── server.js                  # entry
│   ├── config.js
│   ├── routes/
│   │   ├── articles.js
│   │   ├── vendors.js
│   │   ├── sites.js
│   │   ├── purchaseOrders.js
│   │   ├── chatActions.js
│   │   └── health.js
│   ├── services/
│   │   ├── excelService.js        # load/save/mutex
│   │   ├── articleService.js
│   │   ├── vendorService.js
│   │   ├── siteService.js
│   │   └── poService.js
│   ├── validation/
│   │   └── schemas.js             # zod / joi / pydantic
│   └── chat/
│       ├── intents.js
│       ├── slotFiller.js
│       └── replyFormatter.js
├── public/                        # simple chat UI
│   └── index.html
├── scripts/
│   └── seedWorkbook.js            # create xlsx from sample-rows
├── tests/
│   ├── articles.test.js
│   └── purchaseOrders.test.js
├── .env.example
├── package.json                   # or requirements.txt + pyproject
└── .gitignore                     # include .env; optionally ignore data/*.xlsx backups
```

## First implementation order

1. `scripts/seedWorkbook` + empty/seeded xlsx  
2. `excelService` (read sheet → JSON, write row, mutex)  
3. Master CRUD routes  
4. PO create / get / patch  
5. Minimal chat UI calling `/chat/actions` or REST directly  
6. Intent layer  

## `.gitignore` starters

```
node_modules/
.env
__pycache__/
.venv/
data/*.bak
*.log
```

Keep `data/PO_Cycle_Master.xlsx` tracked **or** generate via seed script — pick one and stick to it.
