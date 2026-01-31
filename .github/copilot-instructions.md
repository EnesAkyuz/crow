# Copilot instructions for this repo

## Big picture
- Next.js App Router app with Supabase (auth + Postgres + RLS). Auth redirects happen in [app/page.tsx](app/page.tsx) and session refresh/redirect logic lives in [lib/supabase/middleware.ts](lib/supabase/middleware.ts), wired via [proxy.ts](proxy.ts).
- Server actions in [app/actions.ts](app/actions.ts) mutate orgs/tenants/invites and revalidate `/dashboard`. Client UI calls them from dialogs like [components/dashboard/create-org-dialog.tsx](components/dashboard/create-org-dialog.tsx).
- Supabase schema is multi-tenant: organizations → tenants → tenant_members; invites in tenant_invites; notifications used with realtime in [components/dashboard/notifications-popover.tsx](components/dashboard/notifications-popover.tsx). View `tenant_members_with_profiles` is used for member lists.

## Data + Supabase conventions
- Use typed Supabase clients: `createClient()` from [lib/supabase/server.ts](lib/supabase/server.ts) on the server and [lib/supabase/client.ts](lib/supabase/client.ts) on the client; always use `Database` types from [types.ts](types.ts) (generated).
- Never use `any` types.
- RLS helpers like `is_tenant_member`/`is_org_member_of_tenant` exist (see [supabase/migrations](supabase/migrations)); keep policies consistent with multi-tenant access.

## UI patterns
- UI is shadcn/ui + Tailwind v4; styling favors `rounded-none`, `border-border/50`, uppercase microcopy, and small tracking/typography (see [app/globals.css](app/globals.css)).
- Prefer existing shadcn components under [components/ui](components/ui) and reuse dashboard patterns (tables/cards/dialogs).

## Dev workflow (local)
- Package manager: **bun**. Use **bunx** for Supabase and shadcn tasks.
- Format before finishing: `bun format` (Biome). Lint: `bun lint`.
- Do **not** run the dev server, build, or open a browser unless explicitly asked.

## Supabase migrations + types
- Create migrations with `supabase migration new` (do not hand-roll files).
- In SQL functions, set `search_path` to `''` (immutable search path).
- Apply migrations after changes, then regenerate types: `supabase gen types >> types.ts`.

## Env handling
- Never read real env files; work from .example.env only.

## GENERAL IDEA FOR THIS PROJECT:

This is a high-conviction project. By framing "Crow" as a B2B infrastructure tool, you shift the value from a "simple scraper" to a "Multi-tenant Data Ingestion Layer." YC loves "infra for the next wave." Since every SaaS is becoming an "AI Agent SaaS," they all need exactly what you’re building: a way to handle their customers' messy web/doc data without building the plumbing themselves.🏗️ The Stack: "Crow"Runtime/Backend: Bun (Fast, integrated test runner)Framework: Next.js (App Router)Database/Auth: Supabase (Postgres + Row Level Security)Identity: GitHub OAuth (for the builder/SaaS owner)UI: shadcn/ui + Tailwind (speed and clean aesthetics)The Engines: Firecrawl (Web), Reducto (Docs), Resend (Alerts)🛠️ Detailed Implementation Plan1. Database Schema (Supabase)The key to winning the "YC interest" is showing you understand multi-tenancy and security.organizations: The SaaS companies using Crow.tenants: The customers of those SaaS companies.vault_sessions: Stores encrypted cookies/tokens for specific tenants. (Use Supabase Vault or pg_sodium for encryption).workflows: JSON definitions of the "nodes" (e.g., [Scrape URL] -> [Extract with Reducto] -> [WebHook]).extractions: History of data pulled.2. Core Features (The "Coding Agent" Instructions)Feature A: The Session Vault (The "Auth" Layer)Goal: Allow a SaaS admin to save a "Session Blob" for a tenant so Firecrawl can scrape behind a login.Logic: Provide an input for JSON cookies. Store these encrypted. When a workflow runs, pass these as headers to Firecrawl’s /scrape or /crawl endpoint.Feature B: The Visual Workflow "No-Code" EngineGoal: A simple UI for non-techies to define what they want.Implementation: Use a basic "Step" list (or react-flow if you have time, but a vertical list is faster for 1 day).Step 1: Source. (URL for Firecrawl or File Upload for Reducto).Step 2: Schema. A shadcn form where users define keys like invoice_total, vendor_name.Step 3: Action. (Webhook URL or Email via Resend).Feature C: The "Agentic" Hand-offLogic: If the Firecrawl output contains a link to a PDF, automatically trigger a Reducto job.Value: This is the "Crow" magic—seamlessly moving from the web to the document.🚀 The 1-Day Execution RoadmapTimeGoalFocus09:00 - 11:00The SkeletonSetup Bun + Next.js + Supabase. Get GitHub OAuth working.11:00 - 13:00The EnginesCreate two API routes: /api/run-web (Firecrawl) and /api/run-doc (Reducto). Hardcode a schema and test it.13:00 - 15:30The Vault & Multi-tenancyBuild the Supabase tables. Create the UI for "Adding a Tenant" and saving their "Vault Secrets."15:30 - 17:30The Workflow BuilderBuild the shadcn interface to "connect" these steps. Save the workflow as a JSON blob in Supabase.17:30 - 19:00The "Flashy" Demo PrepCreate a mock "Insurance Portal" or use a complex PDF. Ensure the flow from Vault -> Web -> Doc -> Resend works end-to-end.💡 The "Flashy Demo" Script for the JudgesThe Hook: "Every SaaS is building agents, but those agents die at the login screen or get confused by a PDF table. Meet Crow."The Action: Show a tenant profile in your dashboard. Show a "Stored Session" in the Vault.The Reveal: Start a workflow. Firecrawl logs into a 'protected' page, finds a document, hands it to Reducto, and BOOM—structured JSON appears on the screen.The Close: "We give SaaS companies the infrastructure to let their non-technical users build data pipelines in minutes, not weeks."Would you like me to generate the Supabase migration SQL or the POST handler for the Firecrawl/Reducto integration to get your agent started?