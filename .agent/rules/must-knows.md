---
trigger: always_on
---

- The project uses bun, and you should also use bunx for supabase and shadcn
- We have shadcn available if you want to install frontend components to quickly prototype
- bun format should be used right before your task ends so that you can resolve linter errors
- NEVER USE the type "ANY" while writing the applications
- NEVER RUN THE BROWSER OR THE BUILD OR THE DEV SERVER UNLESS I EXPLICITLY ASK.

FOR SUPABASE:

- While creating a migration, always run supabase migration new, and do not create it manually.
- BE CAREFUL ABOUT RLS POLICIES LIKE SELF REFERENCING A TABLE IN A POLICY.
- In the migrations, the function search path should not be mutable, hence, you should probably put '' as the path.
- We gotta also apply the migrations.
- Do not forget to generate THE TYPES AUTOMATICALLY AND USE THOSE TYPES ALWAYS. You can use supabase gen types >> types.ts for this

FOR ENV:

- Always work on .example.env's. Do not read my environment variables.

GENERAL IDEA FOR THIS PROJECT:

This is a high-conviction project. By framing "Crow" as a B2B infrastructure tool, you shift the value from a "simple scraper" to a "Multi-tenant Data Ingestion Layer." YC loves "infra for the next wave." Since every SaaS is becoming an "AI Agent SaaS," they all need exactly what you’re building: a way to handle their customers' messy web/doc data without building the plumbing themselves.🏗️ The Stack: "Crow"Runtime/Backend: Bun (Fast, integrated test runner)Framework: Next.js (App Router)Database/Auth: Supabase (Postgres + Row Level Security)Identity: GitHub OAuth (for the builder/SaaS owner)UI: shadcn/ui + Tailwind (speed and clean aesthetics)The Engines: Firecrawl (Web), Reducto (Docs), Resend (Alerts)🛠️ Detailed Implementation Plan1. Database Schema (Supabase)The key to winning the "YC interest" is showing you understand multi-tenancy and security.organizations: The SaaS companies using Crow.tenants: The customers of those SaaS companies.vault_sessions: Stores encrypted cookies/tokens for specific tenants. (Use Supabase Vault or pg_sodium for encryption).workflows: JSON definitions of the "nodes" (e.g., [Scrape URL] -> [Extract with Reducto] -> [WebHook]).extractions: History of data pulled.2. Core Features (The "Coding Agent" Instructions)Feature A: The Session Vault (The "Auth" Layer)Goal: Allow a SaaS admin to save a "Session Blob" for a tenant so Firecrawl can scrape behind a login.Logic: Provide an input for JSON cookies. Store these encrypted. When a workflow runs, pass these as headers to Firecrawl’s /scrape or /crawl endpoint.Feature B: The Visual Workflow "No-Code" EngineGoal: A simple UI for non-techies to define what they want.Implementation: Use a basic "Step" list (or react-flow if you have time, but a vertical list is faster for 1 day).Step 1: Source. (URL for Firecrawl or File Upload for Reducto).Step 2: Schema. A shadcn form where users define keys like invoice_total, vendor_name.Step 3: Action. (Webhook URL or Email via Resend).Feature C: The "Agentic" Hand-offLogic: If the Firecrawl output contains a link to a PDF, automatically trigger a Reducto job.Value: This is the "Crow" magic—seamlessly moving from the web to the document.🚀 The 1-Day Execution RoadmapTimeGoalFocus09:00 - 11:00The SkeletonSetup Bun + Next.js + Supabase. Get GitHub OAuth working.11:00 - 13:00The EnginesCreate two API routes: /api/run-web (Firecrawl) and /api/run-doc (Reducto). Hardcode a schema and test it.13:00 - 15:30The Vault & Multi-tenancyBuild the Supabase tables. Create the UI for "Adding a Tenant" and saving their "Vault Secrets."15:30 - 17:30The Workflow BuilderBuild the shadcn interface to "connect" these steps. Save the workflow as a JSON blob in Supabase.17:30 - 19:00The "Flashy" Demo PrepCreate a mock "Insurance Portal" or use a complex PDF. Ensure the flow from Vault -> Web -> Doc -> Resend works end-to-end.💡 The "Flashy Demo" Script for the JudgesThe Hook: "Every SaaS is building agents, but those agents die at the login screen or get confused by a PDF table. Meet Crow."The Action: Show a tenant profile in your dashboard. Show a "Stored Session" in the Vault.The Reveal: Start a workflow. Firecrawl logs into a 'protected' page, finds a document, hands it to Reducto, and BOOM—structured JSON appears on the screen.The Close: "We give SaaS companies the infrastructure to let their non-technical users build data pipelines in minutes, not weeks."Would you like me to generate the Supabase migration SQL or the POST handler for the Firecrawl/Reducto integration to get your agent started?
