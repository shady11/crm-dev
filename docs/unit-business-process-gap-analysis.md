# Unit (Inventory) Business Processes — Gap Analysis

## 1. Scope

The `Unit` is the unit of sale. It is an apartment, a commercial space, a parking spot or a storage room, placed in the hierarchy `Project → Block → Entrance → Floor → Unit`. This document reviews every process that creates a unit, changes it or moves it through its lifecycle. It covers the code in `apps/api/src/modules/units` and in the parts of `apps/api/src/modules/deals` that change a unit's state.

## 2. Processes today

| # | Process | Entry point | Who (permission) |
|---|---|---|---|
| P1 | Create a single unit on a floor | `POST floors/:floorId/units` → `UnitsService.create` | `inventory.manage` |
| P2 | Bulk-create units on a floor | `POST floors/:floorId/units/bulk` → `UnitsService.createBulk` | `inventory.manage` |
| P3 | Import a project's units from CSV/XLSX, creating blocks, entrances and floors as needed | `POST projects/:id/units/import` → `UnitsImportService` | `inventory.manage` |
| P4 | Duplicate a unit | `POST units/:id/duplicate` | `inventory.manage` |
| P5 | Edit unit details, including price and status | `PATCH units/:id` | `units.edit` (Sales Head and above) |
| P6 | Change unit status manually | `PATCH units/:id/status` | `units.edit` |
| P7 | Delete a unit (blocked if it has any deals) | `DELETE units/:id` | `inventory.manage` |
| P8 | Reserve a unit, creating a deal: `AVAILABLE → RESERVED` | `DealsService.reserveUnit` | deals permissions |
| P9 | Reservation expiry, run by a cron job every 10 minutes: `RESERVED → AVAILABLE` | `DealExpiryService` | system |
| P10 | Cancel a deal: unit goes back to `AVAILABLE` | `DealsService.cancelDeal` | deals permissions |
| P11 | Complete a deal once fully paid: `RESERVED → SOLD` | `DealsService.tryCompleteWithinTransaction` | deals permissions / payments |
| P12 | View, search and filter units, plus the chessboard | `GET units`, `floors/:id/units`, chessboard | `inventory.view` |

The intended unit lifecycle is:

```
AVAILABLE ──reserve──▶ RESERVED ──(contract signed → active → fully paid)──▶ SOLD
    ▲                     │
    └──cancel / expiry────┘
UNAVAILABLE (manual only, no process around it)
```

## 3. Gaps

Severity: **High** means a risk of double sale, money or data integrity. **Medium** means wrong reporting or a broken business rule. **Low** means missing capability or hygiene.

### 3.1 Integrity of the sale process

| # | Gap | Evidence | Business impact | Severity |
|---|---|---|---|---|
| G1 | **Unit status can be overridden manually, bypassing the deal lifecycle.** `updateStatus` and `update` accept any `UnitStatus` and never check for an active deal. | `units.service.ts` `updateStatus()`, `update()` (`status: dto.status`) | Two failures follow. (a) A Sales Head sets a unit under an active deal back to `AVAILABLE`, and a second client books it: a double sale. `ensureNoActiveDeal` would block the second booking, but the unit still shows as free on the chessboard and to sales staff. (b) A unit is marked `SOLD`/`RESERVED` with no deal, client or payment behind it, so inventory and revenue reports disagree. | **High** |
| G2 | **Reservation has a race condition.** The unit status is read, checked in application code, then written with an unconditional `unit.update`. The transaction runs at the default READ COMMITTED isolation level. No DB constraint enforces "one active deal per unit". | `deals.service.ts` `reserveUnit()`; no partial unique index in migrations | Two managers who click "Book" at the same moment can both succeed. The result is two `RESERVED` deals and two deposits on one unit. Expiry (P9) already uses the safe pattern (`updateMany where status = RESERVED`); reservation does not. | **High** |
| G3 | **Deleted or unpublished units and projects can be reserved.** The `reserveUnit` lookup filters neither `unit.deletedAt` nor `Project.status`. | `reserveUnit()` `db.unit.findFirst({ id, project: { companyId } })` | Units in `DRAFT`, `PAUSED` or `ARCHIVED` projects can be sold. There is no "sales open" gate per project or block (for example, phased sales launches). | **Medium** |
| G4 | **A reservation without an expiry date never expires.** `reservationExpiresAt` is optional, and the cron job only picks rows where `reservationExpiresAt < now`. | `reserve-unit.dto.ts`, `deal-expiry.service.ts` | Units sit in `RESERVED` indefinitely. Managers "park" stock for favourite clients, and sellable inventory looks smaller than it is. There is no company-level default reservation term (for example, 3/7/14 days) and no cap on extensions. | **Medium** |

### 3.2 Lifecycle and status model

| # | Gap | Evidence | Business impact | Severity |
|---|---|---|---|---|
| G5 | **Unit status does not track deal stage.** The unit stays `RESERVED` from booking through `CONTRACT_SIGNED` and `ACTIVE` (installment plan). It becomes `SOLD` only after the last payment, which can be years later. | `signContract()` and `activate()` do not touch the unit; only `tryCompleteWithinTransaction` sets `SOLD` | Sales velocity, "% sold" and the chessboard all understate sales. Contracted units with a signed SPA look the same as a 3-day soft hold. Developers usually separate *booked (soft hold)*, *contracted/sold* and *fully paid/handed over*. | **Medium** |
| G6 | **Cancellation after money was received has no refund or penalty step.** `cancelDeal` relists the unit and soft-deletes open schedules, but it ignores payments already made (deposit and installments). | `cancelDeal()` | The unit goes back on sale while the client's money stays recorded against a cancelled deal, with no refund obligation, penalty or approval. Cancelling a contracted or active deal needs no higher authority than cancelling a soft reservation. | **Medium** |
| G7 | **`UNAVAILABLE` has no reason and no process.** It can only be set by hand, with no reason, owner or end date. | `UnitStatus` enum, `updateStatus()` | There is no way to tell a developer hold, a show flat, a unit reserved for an investor or partner, or a construction defect from one another. Holds are invisible to management and never released automatically. | **Low** |
| G8 | **Project status is never derived from unit status.** `ProjectStatus.SOLDOUT` exists but is never set automatically. | `ProjectStatus` is referenced only in `projects.service.ts` create | Project lists and dashboards show stale status. | **Low** |

### 3.3 Pricing

| # | Gap | Evidence | Business impact | Severity |
|---|---|---|---|---|
| G9 | **`pricePerSqm` is never stored.** The column exists but no write path sets it, so the frontend recomputes it on each page. | `unit.prisma`, `deal.mapper.ts` (returns `null`), `unit-info-sheet-page.tsx` | Units cannot be filtered or sorted by price/m², which is the main pricing metric for developers, and the value can't be used in reports. | **Low** |
| G10 | **No price-list management.** Prices are edited one unit at a time. There are no bulk revaluations (for example, +5% on floors 10–16 of Block A), no floor or view coefficients, no effective dates and no price history beyond the activity diff. | `UnitsService.update` only | Raising prices after each construction milestone is a routine developer process. Today it means hundreds of manual edits with a high chance of error, and there is no "price on date X" for disputes. | **Medium** |
| G11 | **Price and area can be changed on a reserved or contracted unit.** Neither `update()` nor the import checks for an active deal. | `update()` | The deal keeps its own `listPrice`, so money is not corrupted. However, the unit card then shows a price and area that differ from the signed contract, which confuses sales and makes re-measurement disputes (common at handover) untraceable. | **Low** |

### 3.4 Inventory setup and data quality

| # | Gap | Evidence | Business impact | Severity |
|---|---|---|---|---|
| G12 | **Bulk create is neither atomic nor validated.** `createBulk` runs `Promise.all` over individual creates, outside a transaction and with no number-uniqueness pre-check. It also has no `@Min(0)` on area/price and lets `rooms` be a non-integer. | `units.service.ts` `createBulk()`, `create-units-bulk.dto.ts` | One duplicate number fails the request with a 500 after some units were already created, leaving a half-filled floor with no clear error. Negative prices or areas are accepted. | **Medium** |
| G13 | **Duplicate numbering is naive.** `duplicate` picks `max(parseInt(number)) + 1` across the whole block. It ignores floor-based schemes such as `1201`, letter suffixes such as `12A` and soft-deleted rows, and it is not protected against concurrent duplicates. | `duplicate()` | Generated numbers don't follow the developer's numbering convention, and two concurrent duplicates hit the unique constraint and return a 500. | **Low** |
| G14 | **Delete behaviour is inconsistent.** Units are hard-deleted, yet every read filters on `deletedAt`, which nothing ever sets. The same applies to blocks, floors, entrances and projects. | `remove()` → `prisma.unit.delete`; no writes to `unit.deletedAt` | There is no recycle bin or undo. The unit's activity history loses its link (`unitId` is set to null). The `deletedAt` filters are dead code that hides the real behaviour. | **Low** |
| G15 | **`Block.unitsCount`, `floorsCount` and `entrancesCount` are never maintained.** These denormalised counters are never written. | `block.prisma`; no writes in `src/` | Any screen or report that trusts them shows 0 or stale numbers. | **Low** |
| G16 | **The unit card is thin.** It holds only number, type, rooms, area and price. There is no layout or floor-plan image, finishing level, view or orientation, ceiling height, balcony or terrace area, cadastral number, or handover/ready date. | `unit.prisma` | Sales can't present or filter by the attributes buyers ask about first, and contracts and handover acts can't be generated from structured data. | **Low** |

### 3.5 Controls and visibility

| # | Gap | Evidence | Business impact | Severity |
|---|---|---|---|---|
| G17 | **No maker-checker on sensitive inventory changes.** Price cuts and status overrides by `units.edit` take effect immediately. In contrast, deal discounts already have an approval flow (`DiscountApprovalStatus`). | `update()`, `updateStatus()` | A unit-price reduction is an uncontrolled path around the discount-approval process: cut the list price first, then book with no discount. | **Medium** |
| G18 | **Activity logging is fire-and-forget, outside the transaction.** | `logUnitActivity()` comment | If the activity insert fails, a status or price change leaves no trace. That is acceptable for UX history but not for an audit of who changed a price. | **Low** |

## 4. Strengths worth keeping

- Reservation, cancellation, expiry and completion each run in a single DB transaction and write the unit's own activity trail, separate from the deal's.
- Expiry uses a conditional `updateMany`, so it is idempotent and safe against races. That pattern should be reused for reservation (G2).
- The CSV/XLSX import works row by row, with per-row transactions and per-row error reporting. That is the right design for large inventory loads.
- Unit numbers are unique per block at the DB level, and units with deals can't be deleted.
- Company-wide (not per-branch) inventory visibility is a documented, deliberate decision in `project.prisma`.

## 5. Recommended priority

1. **G1 + G2 + G17. Make the deal the only way to change a unit's sale status.**
   - *G1 fixed:* manual changes now only toggle `AVAILABLE ↔ UNAVAILABLE`, are refused while an in-progress or completed deal holds the unit, and are written conditionally on the status read (`UnitsService.ensureManualStatusChangeAllowed` / `applyStatusChangeIfUnchanged`). The unit form offers only those two statuses and locks the field for deal-held units.
   - *G2 fixed:* `reserveUnit` claims the unit with a conditional `AVAILABLE → RESERVED` write before creating the deal, so of two concurrent bookings only one succeeds. A partial unique index `Deal_unitId_open_key` allows at most one open deal per unit as the database backstop.
   - Restrict manual status changes to `AVAILABLE ↔ UNAVAILABLE`, and only when there is no active deal.
   - Make the reservation write conditional: `updateMany({ where: { id, status: AVAILABLE } })` and fail if `count = 0`.
   - Add a partial unique index on `Deal(unitId) WHERE status IN ('RESERVED','CONTRACT_SIGNED','ACTIVE') AND "deletedAt" IS NULL`.
2. **G3 + G4. Close the open doors on reservation.**
   - *G3 fixed:* `reserveUnit` ignores soft-deleted units and projects, and refuses units in projects that are not open for sales. Bookable statuses are `PLANNING` (off-plan pre-sales), `ACTIVE` and `COMPLETED`; `DRAFT`, `PAUSED`, `SOLDOUT` and `ARCHIVED` are closed. The unit sheet disables Book and states why.
   - Reject deleted units and non-`ACTIVE` projects.
   - Add a company default reservation term, a maximum term and a maximum number of extensions.
3. **G5 + G6. Align the unit status model with the deal stages.**
   - For example, add a `CONTRACTED`/`SOLD` state at contract signing, with a separate "fully paid / handed over" flag.
   - Add a cancellation process that settles payments already received: refund or penalty, with approval above the reservation stage.
4. **G10 + G9 + G11. Pricing.**
   - Add bulk repricing with effective dates and history.
   - Store `pricePerSqm`.
   - Lock price and area once a unit is under contract, or require approval to change them.
5. **G12–G16. Data-quality hygiene.**
   - Make bulk create transactional and validated.
   - Settle on soft delete or hard delete.
   - Maintain or remove the block counters.
   - Extend the unit attributes.
6. **G7, G8, G18. Holds with reasons, automatic `SOLDOUT`, and audit-grade logging of price and status changes.**
