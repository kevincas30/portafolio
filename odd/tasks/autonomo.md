# Autónomo tab in the vault

Objective: a new encrypted "Autónomo" tab in the user vault covering the Spanish freelancer workflow from `Guia_autonomo_facturacion.pdf` (invoice ledger, tax calculators, tax savings, filing calendar, encrypted documents).
Branch: `feat/autonomo` (from `origin/main`). Delivery strategy: ordered work-unit commits pushed directly to `main` (user choice, L5). Test runner: `pnpm vitest run` (vitest).

## Specs

- **S1** — New vault tab. User: "quiero hacer en el panel una parte de autonomo, con todo lo necesario, tienes la guia pdf que me armaste para basarte en eso" / "en la boveda una pestaña de autonomos". Data is zero-knowledge like the rest of the vault: encrypted in the browser with the DEK, the server only stores sealed blobs scoped by `user_id`.
- **S2** — Documents. User: "quiero tener un apartado para subir los documentos, facturas, etc" / "voy a usar blob por ahora". Files are encrypted client-side with the DEK before upload to Vercel Blob; metadata stored as sealed rows in Turso. *(Assumption: client-side encryption, following the vault rule in S1.)*
- **S3** — Filing calendar. User: "toda la info de cuando presentar los trimestrales o la renta y asi". Per the guide: 303 and 130 from the 1st to the 20th of April, July and October, and from the 1st to the 30th of January; 390 in January; Renta (100) April to June; reminders on day 1 and day 10 of each filing month. Includes the guide's 10-step roadmap checklist.
- **S4** — Tax calculator. User: "algo que me calcule el IRPF o las retenciones, todos los impuestos". Withholding per guide p.04: professional activity + client is a company or freelancer in Spain → 7% in the start year and the two following, 15% after; private individuals and foreign clients → none. IVA 21%. Quarterly 303 and 130, yearly Renta estimate. Tax rates are parametrised per year in config, verified against official 2026 sources before implementation.
- **S5** — Tax savings. User: "una parte para apartar el iva y asi". Shows how much should be set aside (IVA collected pending + IRPF estimate) vs. what is already set aside. Guide: "el IVA y un 15 a 20% para el IRPF".
- **S6** — No invoice generation. User: "mejor que no me haga las facturas eso lo hago yo mismo con el generador desde mi maquina". The panel only records invoices issued elsewhere (and received invoices / expenses).

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1, S4, S6 | inline | done (RED→GREEN: 15 tests) | 9d8f8bf |
| T2 | S4, S5 | inline | done (RED→GREEN: 10 tests) | ad1dc4d |
| T3 | S3 | inline | done (RED→GREEN: 7 tests) | see L8 |
| T4 | S2 | inline | pending | — |
| T5 | S4 | inline | pending | — |

- T1 — Tab scaffold + invoice ledger (issued/received: base, IVA, withholding, client type) with withholding suggestion; storage tables + API + encrypted blobs.
- T2 — Quarterly 303/130 calculation + tax savings view.
- T3 — Filing calendar with status (pending/filed) + roadmap checklist.
- T4 — Encrypted document uploads to Vercel Blob. Risk: item 5 (new dependency/env) and item 2 (file access must stay scoped per user).
- T5 — Yearly Renta estimate with parametrised brackets.

Route evidence: no Writer trigger reason (tasks are sequential and depend on T1's ledger); parent works inline.

## Log

- **L1** (2026-10-30) — Original request: "claude quiero hacer en el panel una parte de autonomo, con todo lo necesario, tienes la guia pdf que me armaste para basarte en eso y quiero tener un apartado para subir los documentos, facturas, etc y toda la info de cuando presentar los trimestrales o la renta y asi y algo que me calcule el IRPF o las retenciones, todos los impuestos, y una parte para apartar el iva y asi.. dime como lo podriamos hacer en la boveda una pestaña de autonomos, vamos a hacer todo con ODD"
- **L2** (2026-10-30) — User: "se puede hacer que me genere facturas usando el generador Latex que tengo??" → explained compile location, zero-knowledge and Verifactu (1 July 2027) constraints.
- **L3** (2026-10-30) — User: "mejor que no me haga las facturas eso lo hago yo mismo con el generador desde mi maquina, y voy a usar blob por ahora" → S6 register-only; S2 uses Vercel Blob.
- **L4** (2026-10-30) — Forecast ~2000 authored lines across 5 tasks (> 400): chain strategy to be chosen by the user before the first commit. Mapping of the existing finances feature delegated to a read-only explorer.
- **L5** (2026-10-30) — User: "haz los commits en orden pero pushea a main, tengo permiso como colaborador" → each task is committed in order and pushed directly to `main`.
- **L6** (2026-10-30) — T1 done: `src/types/autonomo.ts`, `src/lib/autonomo/{invoice,blob}.ts` (+ tests), aad `aut-inv`/`aut-settings`, tables `autonomo_invoices`/`autonomo_settings`, route `user-vault/autonomo` (same scoping as finances, guarded by the vault middleware), hook `useVaultAutonomo`, components `src/components/autonomo/*`, fourth tab in `SectionSwitcher`/`Dashboard`. Checks: vitest 24 files / 153 tests pass; `tsc --noEmit` clean. `astro check` not run: local Node 22.15.1 < Astro's required 22.23.4. Not checked in the browser for the same reason. Next: T2.
- **L7** (2026-10-30) — T2 done: `src/lib/autonomo/{taxes,tax-rules}.ts` (+ tests) and `TaxPanel.tsx`. 303: IVA accrued − deductible IVA, negative quarters compensated forward, Q4 negative "a devolver o compensar". 130 per AEAT instructions (boxes 01–19 without sections II, 16 and 18): 20% of cumulative net yield, 5% hard-to-justify expenses capped at 2,000 €/year, previous positive box 07, withholdings, box 13 reduction by prior-year net yield (no prior activity counts as 0 → 100 €), negatives carried forward. Sources: AEAT modelo 130 instructions and activities manual 3.7. Tax savings = positive 303 + 130 of pending quarters (previous while its window is open + current) vs. `setAside` setting. Checks: vitest 25 files / 163 tests; `tsc --noEmit` clean. Next: T3.
- **L8** (2026-10-30) — T3 done: `src/lib/autonomo/{calendar,roadmap}.ts` (+ tests), `CalendarPanel.tsx`, `RoadmapDialog.tsx`. Obligations 303/130 per quarter (1st–20th of the month after; Q4 1–30 January), 390 (1–30 January), Renta 100 (1 April–30 June, exact start published yearly by AEAT); shown from the activity start (or the current year if unset), sorted by deadline with status filed/overdue/open/upcoming and stage review (days 1–9) / file (day 10+). Settings gained `filed` and `roadmapDone`; the tax savings skip filed models. Checks: vitest 26 files / 170 tests; `tsc --noEmit` clean. Next: T4 (Vercel Blob).
