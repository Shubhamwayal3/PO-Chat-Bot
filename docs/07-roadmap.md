# 07 — Roadmap

## Phase 0 — Foundations (this kit)

- [x] Vision, Excel model, API sketch, chat flows  
- [x] Choose Node vs Python → **Node + Express + exceljs**  
- [x] Repo scaffold + seed script  

## Phase 1 — Excel + Master APIs (MVP core)

- [x] Create workbook with 4 sheets + seed data  
- [x] Excel service with write queue  
- [x] CRUD: articles, vendors, sites  
- [x] Validation + error codes  
- [x] Health endpoint  
- [ ] Postman / Thunder Client collection  

**Exit:** Can maintain masters via API without opening Excel for edits.

## Phase 2 — Purchase Order APIs

- [x] Create PO with auto number + line items  
- [x] Get PO (grouped lines)  
- [x] List / filter by vendor, site, status  
- [x] Patch status / line qty / price  
- [x] FK Active checks  

**Exit:** Full PO create–display–change via API.

## Phase 3 — Chatbot window

- [x] Simple web chat UI  
- [x] Rule-based intents for masters + PO  
- [ ] Multi-turn slot filling + confirmations (basic confirm flag in place)  
- [x] `/chat/actions` facade  

**Exit:** Business user completes “create PO” only via chat.

## Phase 4 — NL polish (optional LLM)

- [ ] LLM for intent/slot extraction only  
- [ ] Deterministic API still owns writes  
- [ ] Prompt templates + guardrails  

## Phase 5 — P2P depth (beyond MVP)

- [ ] Goods Receipt sheet / status updates (`PartiallyReceived`)  
- [ ] Invoice sheet (3-way match lite)  
- [ ] Simple reports in chat (“open PO value by vendor”)  
- [ ] Export / download workbook from UI  

## Phase 6 — Hardening

- [ ] Auth  
- [ ] Audit log sheet or file  
- [ ] Backup on every N writes  
- [ ] Swap Excel → SQLite behind same API if needed  

---

## Definition of Done (project MVP)

A user can, in one chat session:

1. Look up an article and vendor  
2. Create a PO referencing them and a site  
3. Display that PO  
4. Cancel or change quantity  

…and see the same data when opening `PO_Cycle_Master.xlsx`.
