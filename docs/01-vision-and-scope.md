# 01 — Vision and Scope

## Purpose

Give a **business user one chat window** to maintain master data and run purchase-order operations without opening SAP GUI or wrestling with Excel filters.

The chatbot reads, creates, and updates rows in a single Excel workbook that models a simplified **SAP MM Procure-to-Pay** path.

## Goal

Replicate core **Procure-to-Pay (P2P)** master + PO steps in a lightweight chatbot:

1. Maintain Article / Vendor / Site masters  
2. Create a Purchase Order against those masters  
3. Display / change PO status and key fields  
4. Keep Excel as the system of record for MVP  

## Target user

| Role | Need |
|------|------|
| Business / procurement user | Natural language: “create PO for vendor V1001…” |
| Power user / admin | Seed and fix master data via chat or Excel directly |
| Developer | Stable REST APIs over the same workbook |

## In scope (MVP)

- One workbook, four sheets (3 masters + Purchase Order)  
- REST API: list / get / create / update per sheet  
- Chat intents for: search master, create/update master, create PO, show PO, change PO  
- Basic validation (required fields, FK to masters, unique keys)  
- File lock / queue so concurrent writes do not corrupt Excel  

## Out of scope (MVP)

- Full SAP IDoc / BAPI / OData integration  
- Goods Receipt (MIGO), Invoice (MIRO), Payment  
- Multi-company / multi-language  
- Heavy auth (SSO); simple API key or none for local demo is enough  
- Separate Excel file per entity  

## Success criteria

- User can create a PO in chat that lands as a row (or rows) in `PurchaseOrder`  
- PO references valid Article, Vendor, Site  
- User can ask “status of PO 4500000001” and get fields from Excel  
- Master create/update works without opening Excel  

## Non-goals for v1

Do not build a full ERP. Prefer **correct simple flows** over feature breadth.
