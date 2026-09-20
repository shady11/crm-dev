# V1 Core Modules & Business Logic

Product definition of the modules that make up v1 of the CRM. Written against
the current implementation (`apps/api/src/modules`, `apps/api/prisma/models`)
so this doc tracks what's actually shipped, not an aspirational roadmap. Where
v1 intentionally punts on something, it's called out as **Out of scope (v1)**.

Product: a multi-tenant CRM for real-estate developers — one tenant
("Company") sells units across one or more construction projects, through one
or more sales branches.

---

## 1. Platform & Tenancy

**Entities:** Company, Branch, SettingOption

**Purpose:** Everything in the product is scoped to a Company (tenant).
Branches are a tenant's own sales offices/locations.

**Business logic:**
- A tenant is created by a platform SUPER_ADMIN, who assigns it a default
  Company Admin. Company Admin is the highest role *within* a tenant.
- A Company can be **suspended** (reversible, blocks login/access) or
  **deleted** (not reversible) — tracked as two separate timestamps, not one
  status enum, so support can answer "suspended since when" independently of
  deletion.
- A Branch belongs to exactly one Company. Branches can be **deactivated**
  and **reactivated**, never deleted — deactivating a branch does not delete
  its historical leads/deals/clients.
- Branch scoping is a role property, not a hardcoded role check: a Role has
  `isBranchScoped`. A user holding a branch-scoped role must have a
  `branchId` and only sees that branch's leads, clients, deals, and tasks. A
  company-wide role (e.g. Company Admin, Finance) sees everything regardless
  of branch.
- **Inventory (Project/Block/Entrance/Floor/Unit) is deliberately company-wide,
  not branch-scoped.** Any branch can see and reserve any unit — this is a
  product decision to keep unit-booking atomic and simple, revisited only if
  branches start colliding over the same inventory in practice.
- Company-level settings (currency, timezone, locale) are picked from a
  platform-curated `SettingOption` pool so values stay valid ISO/BCP-47/IANA
  codes usable directly in formatting.

**Out of scope (v1):** billing/subscription management, self-serve tenant
signup, cross-tenant reporting.

---

## 2. Identity, Auth & RBAC

**Entities:** User, Role, Permission, RolePermission, ImpersonationSession

**Purpose:** Who can log in, and what they're allowed to do.

**Business logic:**
- Every user has **exactly one Role** (dynamic, not a hardcoded enum). A Role
  is a named bundle of Permissions (`"module.action"` keys, e.g.
  `"leads.create"`).
- Two kinds of Role: **global** (`companyId = null`, shared across all
  tenants, editable only by SUPER_ADMIN — the 5 built-in roles: Super Admin,
  Company Admin, Sales Head, Sales Manager, Finance) and **tenant-custom**
  (`companyId` set, created by that tenant's Company Admin to slice access
  finer than the built-ins). Both are otherwise ordinary, fully editable
  roles — `isSystem` is a UI label ("Built-in"), not a lock.
- `SUPER_ADMIN` is a platform-operator flag on User, independent of RBAC
  entirely — it bypasses permission checks rather than needing a role that
  lists every permission, because it belongs to no company.
- **Discount authority is a Role attribute** (`discountLimit`, percent,
  nullable = unlimited) rather than a per-company config — see Deals module.
- **Auth hardening:** account lockout after N failed logins
  (`failedLoginAttempts` / `lockedUntil`), optional TOTP 2FA
  (`totpEnabled`/`totpSecret`, only set once a code is confirmed),
  session invalidation via `sessionsValidFrom` (bump to force logout
  everywhere — used for password reset, deactivation, role change).
- **Impersonation:** a SUPER_ADMIN can impersonate a tenant user for support,
  via its own `ImpersonationSession` table (not the normal JWT/session path)
  so it's independently time-boxed, revocable, and audited regardless of
  what the issued token claims.

**Out of scope (v1):** SSO/SAML, per-field permission granularity, custom
permission definitions (the permission catalog itself is fixed; only
role→permission assignment is tenant-editable).

---

## 3. Leads

**Entities:** Lead

**Purpose:** Capture and qualify inbound interest before it becomes a Client.

**Business logic:**
- Status pipeline: `NEW → CONTACTED → QUALIFIED → MEETING → NEGOTIATION →
  CONVERTED | LOST`.
- A Lead can be branch-unassigned (`branchId = null`) — visible only to
  company-wide roles until a Company Admin hands it to a branch.
- Tracks `nextContactAt`/`lastContactAt` to drive follow-up cadence and
  "overdue contact" surfacing.
- **Conversion** (`CONVERTED_LEAD` activity) links the Lead to a Client
  record — a Lead itself never becomes an owner of Deals; a Client does.
- Every status change, reassignment, and branch transfer is written to the
  Activity feed for pipeline auditability.

**Out of scope (v1):** lead scoring, marketing-channel attribution beyond a
free-text `source` field, automated lead routing rules.

---

## 4. Clients

**Entities:** Client

**Purpose:** The counterparty on a Deal — a converted Lead or a direct client.

**Business logic:**
- Holds identity/KYC-adjacent fields (passport, PIN, birth date, address)
  needed for contract generation later.
- Same branch-visibility rule as Leads: `branchId = null` means unassigned,
  visible only company-wide until handed to a branch.
- A Client can have many Leads, Deals, Activities, Tasks, and outbound
  messages against it — it's the durable identity; Leads and Deals are
  transient/transactional against it.

**Out of scope (v1):** duplicate-client detection/merge, external KYC
provider integration.

---

## 5. Inventory (Projects, Blocks, Entrances, Floors, Units)

**Entities:** Project, Block, Entrance, Floor, Unit

**Purpose:** The sellable product catalog — what a developer is building and
what's available to sell.

**Business logic:**
- Strict hierarchy: Project → Block → Entrance → Floor → Unit. Each level
  denormalizes counts upward where useful (`Block.unitsCount`, etc.).
- Project lifecycle: `DRAFT → PLANNING → ACTIVE → PAUSED → SOLDOUT →
  COMPLETED → ARCHIVED`.
- Unit lifecycle: `AVAILABLE → RESERVED → SOLD`, or `UNAVAILABLE` (pulled
  from sale — e.g. developer's own use, defect). Unit status is the single
  source of truth for what's sellable; it's driven by Deal state transitions,
  never edited independently while a Deal is active.
- Unit types: `APARTMENT`, `COMMERCIAL`, `PARKING`, `STORAGE` — same pipeline,
  differ only in attributes (rooms/area apply mainly to apartments).
- Bulk import supported for Units and Floors (construction inventory is
  large — hundreds/thousands of units per project) rather than one-by-one
  creation only.
- **Chessboard view**: the sales-floor visualization of inventory (grid of
  units by floor/entrance colored by status) — the primary tool a sales
  manager uses to find and reserve a unit.

**Out of scope (v1):** floor-plan CAD/2D rendering, pricing rule engines
(dynamic pricing by view/floor), construction progress tracking.

---

## 6. Deals (Reservation → Sale)

**Entities:** Deal, DealNumberCounter

**Purpose:** The core transaction — turns an available Unit + a Client into a
sale, and is the anchor for payments, documents, and discount approval.

**Business logic:**
- Status pipeline: `RESERVED → CONTRACT_SIGNED → ACTIVE → COMPLETED`, or
  `CANCELLED`/`EXPIRED` off of `RESERVED`.
- **Reservation is atomic**: reserving a Unit for a Deal must be
  transactionally exclusive so two sales managers can never reserve the same
  unit. Reservations carry an expiry (`reservationExpiresAt`); an unconverted
  reservation past expiry frees the unit back to `AVAILABLE` (see
  Notifications: `RESERVATION_EXPIRING`).
- `branchId` on a Deal is **derived from the client's branch at reservation
  time**, not stamped from the acting user — so a deal's branch reporting
  stays tied to whose client it is, not who happened to click reserve.
- Deal numbering is per-company, per-year, sequential (`DealNumberCounter`),
  giving human-readable, gap-free contract numbers.
- Financing type (`CASH`/`INSTALLMENT`/`MORTGAGE`) drives what payment
  schedule and document set apply.

**Discount approval workflow (the most complex piece of business logic in
v1):**
- Every Role has a `discountLimit` (percent, nullable = unlimited, e.g.
  Company Admin).
- A discount within the requester's own limit is auto-applied — status stays
  `NONE`, no approval needed. This covers "no discount" and "in-range
  discount" as the same case.
- A discount **above** the requester's limit sets
  `discountApprovalStatus = PENDING`; the price fields (`salePrice`,
  `discountAmount`/`Percent`) are held at whatever the requester's own limit
  allows (0 if none) — **not** the requested price — while
  `requestedDiscountPercent`/`requestedDiscountAmount` hold the ask
  separately. The deal is usable at the safe price while pending.
- Approving copies the requested values onto the live fields and stamps
  `discountApprovedById`/`At`; rejecting stamps a reason and leaves the deal
  at the safe price. Only a user whose own `discountLimit` covers the
  requested amount (or who has no limit) can decide it — approval authority
  is the same ceiling mechanism as the request limit, not a separate
  permission tier.
- Every discount request/approval/rejection is both an Activity entry and a
  Notification to the relevant approver/requester.

**Cancellation:** `cancelReason` is required, frees the Unit back to
`AVAILABLE`, and is logged.

**Out of scope (v1):** multi-unit deals (one deal = one unit in v1),
deal-level e-signature integration (signing is tracked as a status + date,
not executed in-product).

---

## 7. Payments

**Entities:** Payment, PaymentSchedule, OutboundMessage

**Purpose:** Track what's owed and what's been collected against a Deal.

**Business logic:**
- A Deal (typically `INSTALLMENT`/`MORTGAGE`) has an ordered
  `PaymentSchedule` (installment plan): due date, amount, running
  `paidAmount`, and a derived status `PENDING → PARTIAL → PAID`, or
  `OVERDUE` once `dueDate` passes with `paidAmount < amount`.
- A `Payment` is an actual received amount against a Deal (not necessarily
  1:1 with a schedule row — partial payments accumulate into
  `PaymentSchedule.paidAmount`). Payment types: `DEPOSIT`, `INSTALLMENT`,
  `FINAL`, `REFUND`.
- **Payment reminders**: automated outbound nudges (`PAYMENT_DUE_SOON`,
  `PAYMENT_OVERDUE`) sent to the client via WhatsApp/SMS/Email, logged in
  `OutboundMessage` — a delivery log distinct from in-app `Notification`,
  because it answers "did the client actually receive it" (with provider
  message id / failure reason), not "does a CRM user have an unread badge."
  The rendered message body is kept verbatim even if the template is edited
  later, for dispute resolution.
- Recording a payment is logged as an Activity and triggers a
  `PAYMENT_RECEIVED` notification to the deal's manager.

**Out of scope (v1):** in-product payment collection/processing (payments are
*recorded*, not *taken* — no card/bank gateway integration), automated
refund workflows beyond logging a `REFUND`-type payment.

---

## 8. Documents & Document Generation

**Entities:** Document, DocumentTemplate

**Purpose:** Contracts, receipts, and other paperwork tied to a Lead, Client,
Deal, Project, or Unit.

**Business logic:**
- `Document` covers both user-uploaded files (passport scans, POA) and
  system-generated files (contracts, reservation confirmations, payment
  schedules, invoices) — distinguished by whether
  `generatedFromTemplateId` is set, not a separate table.
- `DocumentTemplate` holds a company's own HTML + placeholder-token wording
  per document type (`{{deal.*}}`, `{{client.*}}`, `{{unit.*}}`,
  `{{company.*}}`, `{{schedule.rows}}`). Only one template may be **active**
  per (company, type) at a time — enforced at write time, since "the
  previous one deactivates" is a business decision, not a DB constraint.
  Companies with no custom template fall back to a built-in default so
  generation works before any admin setup.
- `version` increments on template edits as a display/audit counter — it is
  **not** a version-history table; re-printing an exact historical copy of
  an old template state is explicitly out of scope.
- **Retention**: deleting a Document is soft (`deletedAt`); the underlying
  file bytes are purged from storage only after a retention window elapses
  (`purgedAt`), keeping the row for audit history regardless.

**Out of scope (v1):** in-product e-signature, template WYSIWYG editor
(HTML/token editing only), document versioning/redlining.

---

## 9. Tasks

**Entities:** Task

**Purpose:** Follow-up work items for sales/ops staff, optionally tied to a
Lead, Client, or Deal.

**Business logic:**
- Status: `TODO → IN_PROGRESS → DONE`, or `CANCELLED`.
- `assignedToId` is required; `branchId` is **derived from the assignee's
  branch**, not the creator's — so branch-scoped task lists show correctly
  regardless of who created the task on someone's behalf.
- Drives `TASK_DUE_SOON`/`TASK_OVERDUE` notifications.
- Every status change, reassignment, and completion is an Activity entry.

**Out of scope (v1):** recurring tasks, task templates/checklists, task
dependencies.

---

## 10. Activities (Audit / Timeline Feed)

**Entities:** Activity

**Purpose:** The single per-tenant, user-facing feed of "what happened" —
powers Lead/Client/Deal timelines and manager oversight.

**Business logic:**
- Every meaningful state change across every module above writes an
  `Activity` row: entity CRUD, status transitions, reservations, payments,
  discount workflow, document generation, reassignments, branch transfers.
- Scoped by company and (for branch-scoped viewers) by the actor's branch.
- Deliberately a flat, append-only feed rather than per-module logs — one
  place a manager or auditor reads to reconstruct history on any record.
- Separate from `AuditLog` (below) — this is tenant-facing product history,
  not platform-operator security audit.

---

## 11. Notifications

**Entities:** Notification

**Purpose:** In-app "you have something to look at" signals for a CRM user.

**Business logic:**
- Covers: task assignment/due/overdue, deal status change, reservation
  expiring, payment received/due/overdue, discount requested/decided,
  document uploaded.
- In-app only, per-user, read/unread with `readAt` — distinct from
  `OutboundMessage`, which is client-facing delivery over external channels.
- Generated as a side effect of the triggering module's business logic
  (e.g. discount approval workflow raises `DISCOUNT_APPROVAL_REQUESTED` to
  the approver), not user-configured rules in v1.

**Out of scope (v1):** push/email digest delivery, user-configurable
notification preferences.

---

## 12. Platform Audit Log

**Entities:** AuditLog

**Purpose:** Security/compliance trail for **platform-operator** actions —
separate from the tenant-facing Activity feed.

**Business logic:**
- Covers tenant lifecycle (create/suspend/resume/delete), tenant user
  admin actions taken by a platform operator, impersonation
  start/end/in-session actions, role/permission changes, setting-option
  management, and login success/failure.
- Append-only — no delete endpoint, no `deletedAt`.
- `actorEmail` is denormalized onto each row so an entry stays legible even
  if the actor's account is later changed or deactivated.

---

## Cross-cutting rules that apply to every module

- **Multi-tenancy**: every tenant-owned row carries `companyId`; no query
  path may cross tenants except platform/SUPER_ADMIN surfaces.
- **Branch isolation**: enforced per-role (`isBranchScoped`), not
  per-module — a module doesn't decide branch visibility itself.
- **Soft delete**: `deletedAt` throughout tenant data; nothing product-facing
  hard-deletes except where explicitly noted (AuditLog, Activity).
- **Everything auditable**: any state transition a human can trigger has a
  corresponding Activity (tenant-facing) or AuditLog (platform-facing) entry.

## Deferred to v2 (explicitly, so it isn't silently assumed in v1)

- Billing/subscription & self-serve signup
- Multi-unit deals
- In-product payment collection and e-signature
- Pricing/dynamic pricing engine
- Lead scoring and marketing attribution
- SSO/SAML
- Construction progress tracking
