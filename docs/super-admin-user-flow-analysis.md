# Super Admin User Flow — Business Analysis

## 1. Who the Super Admin is

The platform is a single-database, multi-tenant CRM. `Company` is the tenant unit (an organization/customer account); every `User` normally belongs to exactly one `Company`. The **Super Admin** is not a role scoped to a tenant — it is a boolean flag (`User.isSuperAdmin`) on an account with `companyId = null`. It represents the **platform operator** (the SaaS vendor's own staff), not a customer-side administrator. This is an important distinction the product should keep visible in the UI and docs, since "Company Admin" (a tenant's own top role) and "Super Admin" (the vendor) are easy to conflate.

## 2. End-to-end flow today

1. **Provisioning a tenant** — Super Admin calls/uses `POST /companies` (`companies-page.tsx` → `company-form-sheet.tsx`). This auto-creates the tenant's first Company Admin user and either an admin-supplied password or a server-generated one, returned once in the API response.
2. **Managing tenants** — `/companies` is the Super Admin's landing page: list, view detail, update, **suspend/resume** (`suspendedAt`) and **soft-delete** (`deletedAt`) a tenant.
3. **Intervening on a tenant's users** — from `company-detail-page.tsx`, a Super Admin can deactivate/reactivate a specific user and force a password reset (again, a new random password returned synchronously, not emailed).
4. **Impersonation** — `POST /companies/:id/users/:userId/impersonate` starts a time-boxed (default 30 min) `ImpersonationSession`, distinct from normal login sessions. Every action taken while impersonating is tagged `IMPERSONATED_ACTION` in the audit log, and the session is explicitly endable.
5. **Global RBAC governance** — Super Admin manages the platform-wide permission catalog and global (non-tenant) roles via `/rbac`, distinct from a tenant's own custom roles.
6. **Platform reference data** — Super Admin curates the shared currency/locale/timezone pool other tenants draw from (`/setting-options`).
7. **Oversight** — `/audit-log` gives a read view over platform-lifecycle events (tenant created/suspended/resumed/deleted, user deactivated/reactivated/password-reset, impersonation start/end and impersonated actions).

Enforcement mechanics worth noting: `PermissionsGuard` unconditionally bypasses all permission checks for `isSuperAdmin` (a deliberate "god mode" for the platform operator), and `CompanyGuard`/tenant-scoping guards are explicitly skipped for the same reason so a Super Admin can reach across tenants. Super Admin JWT sessions get a shorter forced max age (60 min) than ordinary users, which is a good compensating control for the broad access.

## 3. Comparison with best-practice patterns

| Area | Current implementation | Industry best practice | Gap / Risk |
|---|---|---|---|
| **Onboarding new tenants/users** | 100% admin-provisioned; generated passwords returned synchronously in the API/UI response, never emailed | Email-based invite links with expiring, single-use tokens; self-service signup for prospects; SSO/SCIM provisioning for enterprise tenants | No invite-token model exists at all. A password transiting through whoever is looking at the admin's screen/API response is a real handling risk, and there's no recovery path if the operator loses it before relaying it |
| **Authentication for privileged accounts** | Bcrypt + optional per-user TOTP; lockout after 5 failed attempts | MFA **mandatory** for any super-admin/platform-operator account (industry norm for SOC2/ISO27001); WebAuthn/hardware keys preferred over TOTP for this tier | MFA is opt-in, not enforced, for the exact accounts with the largest blast radius |
| **Network controls** | None found | IP allowlisting or a separate admin-only network path (VPN/bastion) for platform-operator consoles | Missing entirely — a Super Admin credential leak has no secondary barrier |
| **Session hygiene** | Shorter (60 min) forced session for super admin; no visible "active sessions" list or "sign out everywhere" | Session/device listing and revocation UI, step-up auth for sensitive actions (impersonation, tenant delete) | No step-up re-auth before impersonation or destructive tenant actions — a stolen/idle browser session could impersonate or delete a tenant |
| **Impersonation** | Time-boxed, separately-tabled, fully audited, explicitly endable — this is genuinely strong and matches best-in-class SaaS patterns (Salesforce "Login As", Intercom) | Same, often with a visible in-app banner during impersonation and a required reason/ticket reference | No evidence of a mandatory "reason" field or an in-app impersonation banner (worth verifying in the actual UI) |
| **Audit logging** | Covers tenant lifecycle, user deactivation/reactivation/reset, impersonation — a real, append-only `AuditLog` | Best practice extends the same immutable trail to **all** privileged actions: role/permission changes, global setting changes, login success/failure, admin login itself | RBAC changes and setting-options edits are not in `AuditLog`; there's no login audit trail beyond lockout counters |
| **Tenant lifecycle vs. billing** | Suspend/resume/delete are manual actions taken by a human Super Admin | Billing-driven suspension (auto-suspend on failed payment / plan downgrade), usage-based feature gating, dunning workflows | No billing/subscription/plan model exists in the schema at all — tenant state is entirely support-driven today |
| **Feature management** | None | Feature flags scoped per tenant/plan, so Super Admin can stage rollouts without deploys | Not present |
| **RBAC model** | Dynamic, DB-backed permission/role model (not a hardcoded enum) with global vs. tenant-scoped roles — this is a well-designed foundation | Same pattern (Auth0, Okta-style fine-grained RBAC/ABAC) | No material gap; this is a strength, not a weakness |
| **SSO/enterprise identity** | None found | SAML/OIDC SSO + SCIM for enterprise customers, especially relevant once tenants have their own admins | Missing; likely fine for current stage but will become a sales blocker at enterprise tier |

## 4. Strengths worth keeping

- The RBAC model (DB-driven permissions/roles rather than a hardcoded enum, with a clean global-vs-tenant split) is a solid architectural choice that will scale well as the permission surface grows.
- Impersonation is implemented as a first-class, separately audited, time-boxed mechanism rather than a backdoor — this is exactly the pattern regulators and enterprise customers expect to see.
- Shortened session lifetime specifically for the super-admin tier shows the team is already thinking about blast-radius reduction.

## 5. Recommended priority order for closing gaps

1. **Enforce MFA on all `isSuperAdmin` accounts** (cheapest, highest leverage — no schema change needed, just a policy check at login/guard level).
2. **Add step-up re-authentication** before impersonation and destructive tenant actions (suspend/delete).
3. **Extend `AuditLog`** to cover RBAC/global-setting changes and admin login events.
4. **Replace synchronous password delivery** with an email-based, expiring invite/reset token flow.
5. **Add IP allowlisting** (or a dedicated admin network path) for the platform-operator console.
6. Longer-term: billing/plan model to drive tenant lifecycle automatically, feature flags, and SSO/SCIM for enterprise tenants.

---
*Prepared as a codebase-grounded review of the current implementation under `apps/api` and `apps/web`; file-level references available on request.*
