
## Goal

Recreate the IMS in this Lovable project with a polished marketing landing page, a redesigned dashboard, and reports split into sections with CSV + Excel export. Brand color stays **orange `#E74600`** with deep-charcoal neutrals and a green accent for positive deltas.

## Backend (Lovable Cloud / Postgres)

Schema mirrors the uploaded backend, adapted to Postgres + RLS:

- `profiles` — `id (uuid → auth.users)`, `full_name`, `store_id`, `branch_id`, `email`
- `user_roles` — separate `(user_id, role)` table, enum `app_role` = `superadmin | ceo | manager | staff`, plus `has_role()` SECURITY DEFINER
- `stores`, `branches` — multi-tenant container
- `inventories` — name, category, qty, purchase_price, selling_price, profit (generated), status (available/low/out_of_stock), reorder_level
- `sales` — sale_ref, items jsonb, total_amount, payment_method, store_id, branch_id, added_by
- `credit_sales` — buyer, qty, total, amount_paid, balance, status
- `sales_returns` — qty, reason, refund_amount
- `damages` — qty, reason, inventory_id
- RLS: every row scoped by `store_id`; superadmin sees all; managers/staff see their branch only

Each table gets the mandatory `GRANT` block.

## Routes (TanStack Start, file-based)

Public:
- `/` — marketing landing page (hero, features, modules, screenshots-style mock dashboard, pricing tiers, FAQ, CTA → /auth)
- `/auth` — sign in / sign up (email + password; first signup becomes superadmin)

Authenticated (`_authenticated/`):
- `/dashboard` — KPIs (revenue, profit, units sold, low-stock count), trend charts (sales 30d, top categories, top products), recent activity
- `/inventory` — CRUD, search/filter, low-stock badge, import-ready table
- `/sales` — point-of-sale style: pick items → cart → checkout → receipt
- `/credit-sales` — list, record payment
- `/returns` — process return against a sale
- `/damages` — log damaged stock
- `/stores` and `/branches` — superadmin/ceo only
- `/users` — invite + role assignment
- `/reports` — sectioned reports with date range + filters + Export CSV / Export Excel
- `/settings` — profile, store info

### Reports sections (each its own tab + export)

1. Sales summary (by day, by payment method, by branch)
2. Inventory / stock on hand (with valuation at purchase & selling price)
3. Low stock & out of stock
4. Top selling products & categories
5. Profit & loss (revenue − COGS − returns − damages)
6. Damages report
7. Returns report
8. Credit sales / outstanding receivables
9. Staff performance (sales per user)
10. Branch comparison

Each section: filter bar (date range, branch, category) → table + chart → **Export CSV** + **Export Excel** buttons.

## Design system

`src/styles.css` tokens (oklch):
- `--primary` = orange `#E74600`, `--primary-glow` = `#F15A24`
- `--accent` = green `#00C853` for positive deltas
- `--destructive` = `#F32F2F` for negatives
- Charcoal foreground `#121212`, off-white background
- Custom Button variants: `hero` (gradient orange), `outline-brand`
- Card variants for KPI tiles, gradient glow on hover
- Typography: **Sora** (display) + **Inter** (body) via `@fontsource`

Charts: `recharts` (already common). Animations: `framer-motion` for hero + KPI count-up.

## Exports

`xlsx` (SheetJS) for `.xlsx`, native CSV builder for `.csv`. Single util `exportReport(section, rows)` used by every report tab.

## Build order

1. Enable Lovable Cloud
2. Design system + brand tokens + fonts + Button/Card variants
3. Landing page (`/`)
4. Auth + profiles + roles + `_authenticated` gate (managed)
5. Schema migration + RLS + grants + seed helpers
6. Inventory, Sales, Credit sales, Returns, Damages, Stores, Branches, Users
7. Dashboard
8. Reports with sections + exports
9. Polish: sidebar nav, empty states, toasts, loading states
10. Sitemap + robots, SEO meta on landing

## Technical notes

- Server functions in `src/lib/*.functions.ts`; protected via `requireSupabaseAuth`
- Public landing uses no protected calls
- Mutations via `useServerFn` + `useMutation`, invalidate query keys on success
- Charts and export libs are client-side only

## Out of scope (this pass)

- Email invites (use direct add by admin)
- Multi-currency / tax engine (single currency, flat tax field)
- Realtime sync between branches (queries refetch on focus)
