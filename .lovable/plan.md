I'll deliver this in 6 phases. After each phase finishes I'll pause for your review before moving on.

## Phase 1 — Role separation (Superadmin vs CEO vs Demo)

**Problem:** Today every signup becomes `superadmin` of a new store, so the CEO role inherits superadmin powers, and the seeded Demo account is also superadmin.

**Fix:**
- Change `handle_new_user()` so new signups get role `ceo` (scoped to their store), not `superadmin`.
- Reserve `superadmin` for platform staff only — a flat, store-less role with no `store_id`.
- Rewrite RLS so `superadmin` can read/write only **store metadata** (stores, branches, subscriptions, invites, profiles light fields) — NOT inventory, sales, expenses, customers, reports, audit, cash drawer, credit, damages, returns, transfers, notifications.
- CEO regains full control but **only within their own store** (no cross-tenant access).
- Demote the seeded Demo account from `superadmin` to `ceo` of the demo store. Keep the imported real superadmin from the SQL dump as the only platform superadmin.
- Hide operational nav items (Dashboard, Inventory, Sales, Reports, etc.) from superadmins; show only Stores, Subscriptions, Invites, Settings.

## Phase 2 — Per-store branding

- Replace the hardcoded "Stockly" wordmark + Boxes icon in the sidebar and topbar with the active store's `logo` + `name`. Fallback to the Stockly mark only for superadmins (platform view) or when no logo is set.
- Same swap on the auth page right panel after a store is detected via subdomain (see Phase 4).
- Logo upload already supported on the Settings/Stores form via the `branding` bucket — just surface it more clearly.

## Phase 3 — Subscriptions module

New table `store_subscriptions`:
- plan (`trial` / `monthly` / `yearly` / `lifetime`)
- status (`active` / `expired` / `suspended` / `pending`)
- started_at, expires_at, amount, currency, notes
- payment_log child table for renewal history

UI:
- **Superadmin**: new `/subscriptions` page — list all stores with current plan, expiry, renew/extend/suspend actions, payment log.
- **CEO**: a Subscription card on Settings showing plan, days remaining, renewal history, and a "Request renewal" button that pings the superadmin (creates a notification + email).
- A daily check marks expired subs and (optionally) blocks login for `suspended` stores.

## Phase 4 — Signup with subdomain + richer fields

Extend signup form with: full name, store name, **desired subdomain** (validated unique, lowercase a–z 0–9 -), phone, country, business type, plus email/password.

Flow:
1. User submits → account created with status `pending_setup`, store row created with `subdomain` reserved but `status='pending'`.
2. Trigger sends two emails (via Lovable Emails, scaffolded):
   - To the new user: "Your account is being set up."
   - To every superadmin: "New store awaiting setup: {name} / {subdomain}".
3. Superadmin opens the new store in `/stores`, clicks **Activate**. That flips store status to `active`, attaches the chosen subscription plan, and triggers a third email to the user with their login URL `https://{subdomain}.yourdomain.com` (or the dev fallback URL) + temporary instructions.
4. CEO can then sign in and use the app.

Subdomain handling at runtime: the app reads `window.location.host`, resolves the store by `subdomain`, and scopes login to that tenant. A wildcard DNS / Lovable custom domain step will be required at publish time — I'll document it but it doesn't block local dev.

## Phase 5 — Emails

Use Lovable Emails (built-in). Scaffold three templates:
- `account-pending` (to new signup)
- `new-store-notice` (to superadmin)
- `store-activated` (to new CEO, includes store URL + login link)

Triggered from server functions after signup and after Activate.

## Phase 6 — Hardening & polish

- Audit log entries for: store created, store activated, subscription renewed/suspended, role changed.
- Migration to backfill: ensure every existing CEO has exactly one store and is not superadmin.
- Update `AppShell` navigation visibility per role.
- Update Stores page columns to include status, plan, expiry, and an Activate / Renew action.

---

### Technical summary (for reference)

- DB: new migrations for `store_subscriptions`, `subscription_payments`, `stores.status` + `stores.subdomain` unique, RLS rewrite splitting `superadmin` (metadata-only) from `ceo` (full intra-store).
- New server functions: `signup_store`, `activate_store`, `renew_subscription`, `suspend_store`, `request_renewal`.
- New routes: `/_authenticated/subscriptions.tsx`, update `/_authenticated/stores.tsx`, update `/auth.tsx`, update `AppShell.tsx`.
- Emails scaffolded via `email_domain--scaffold_transactional_email`.

Shall I start with **Phase 1 (role separation)**?