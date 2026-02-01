# 🪶 Crow

**Multi-Tenant Data Ingestion Infrastructure for AI Agents**

Crow is a B2B infrastructure platform that enables SaaS companies to build secure, multi-tenant data pipelines for their AI agents. It solves the critical problem of authenticated web scraping and document extraction by providing a secure session vault, visual workflow builder, and enterprise-grade access controls.

> Every SaaS is building agents, but those agents die at the login screen or get confused by a PDF table. Crow gives them the infrastructure to handle their customers' messy web and document data.

---

## ✨ Features

### 🔐 Session Vault
Store and manage encrypted authentication sessions for your tenants. Enable AI agents to scrape behind login walls without exposing credentials.

- **Encrypted cookie storage** - Sessions are encrypted at rest
- **Expiration tracking** - Auto-detect cookie expiration and receive alerts
- **Rate limiting** - Per-session hourly/daily limits to avoid detection
- **Browser extension** - One-click session capture from any website

### 🔄 Visual Workflow Builder
Build complex data extraction pipelines without code using a step-based workflow designer.

- **Web Scrape** - Extract structured data from a single page
- **Web Crawl** - Crawl multiple pages from a starting URL
- **Site Map** - Discover all URLs on a website
- **AI Agent (FIRE-1)** - Multi-page agentic extraction for complex flows
- **Document Extract** - Extract from PDFs and images using Reducto
- **Webhook** - POST extracted data to any endpoint
- **Email** - Send results via email using Resend

### 📊 Extraction Schemas
Define reusable extraction schemas with typed fields:

- String, Number, Date, Boolean field types
- Schema versioning and activation controls
- Shared across workflows for consistency

### 🏢 Multi-Tenant Architecture
Enterprise-ready multi-tenancy with granular access controls:

- **Organizations** - Top-level grouping for SaaS companies
- **Tenants** - Individual customers of your SaaS
- **Members** - Invite team members with role-based permissions
- **Row Level Security** - Postgres RLS ensures data isolation

### 🔑 API Access
Programmatic access for your AI agents:

- Per-tenant API keys for secure agent authentication
- RESTful endpoints for all extraction operations
- Webhook integrations for real-time data delivery

### 📱 Chrome Extension
Capture authenticated sessions with one click:

- Automatically detects cookies on any site
- Push sessions directly to your tenant's vault
- Manage existing sessions from the extension

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | [Bun](https://bun.sh) |
| **Framework** | [Next.js 16](https://nextjs.org) (App Router) |
| **Database** | [Supabase](https://supabase.com) (Postgres + RLS) |
| **Auth** | Supabase Auth (GitHub OAuth) |
| **UI** | [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS v4](https://tailwindcss.com) |
| **Forms** | React Hook Form + Zod validation |
| **Web Scraping** | [Firecrawl](https://firecrawl.dev) |
| **Document OCR** | [Reducto](https://reducto.ai) |
| **Email** | [Resend](https://resend.com) |
| **Linting** | [Biome](https://biomejs.dev) |

---

## 📁 Project Structure

```
├── app/
│   ├── actions.ts              # Server actions for mutations
│   ├── page.tsx                # Landing page with auth redirects
│   ├── layout.tsx              # Root layout with providers
│   ├── globals.css             # Tailwind CSS + custom styles
│   ├── api/
│   │   ├── scrape-with-session/  # Authenticated web scraping
│   │   ├── extract-web/          # Web extraction with schema
│   │   ├── extract-document/     # Document extraction (Reducto)
│   │   ├── crawl/                # Multi-page crawling
│   │   ├── map/                  # Site URL discovery
│   │   ├── agent/                # AI agent orchestration
│   │   ├── send-email/           # Email via Resend
│   │   ├── vault/                # Vault session management
│   │   └── extension/            # Chrome extension API
│   ├── dashboard/
│   │   ├── page.tsx              # Main dashboard view
│   │   ├── tenants/              # Tenant management pages
│   │   └── monitoring/           # Analytics and monitoring
│   └── auth/
│       └── callback/             # OAuth callback handler
├── components/
│   ├── ui/                       # shadcn/ui components
│   └── dashboard/
│       ├── workflow-builder.tsx  # Visual workflow editor
│       ├── vault-session-list.tsx
│       ├── extraction-schema-list.tsx
│       ├── api-key-manager.tsx
│       ├── notifications-popover.tsx
│       └── ...
├── lib/
│   ├── supabase/
│   │   ├── server.ts             # Server-side Supabase client
│   │   ├── client.ts             # Client-side Supabase client
│   │   └── middleware.ts         # Auth middleware
│   ├── encryption.ts             # API key generation/hashing
│   ├── cookie-parser.ts          # Cookie expiration detection
│   └── utils.ts                  # Utility functions
├── supabase/
│   ├── config.toml               # Supabase local config
│   ├── seed.sql                  # Database seed data
│   └── migrations/               # SQL migrations
├── extension/
│   ├── manifest.json             # Chrome extension manifest
│   ├── popup.html                # Extension popup UI
│   └── popup.js                  # Extension logic
└── types.ts                      # Generated Supabase types
```

---

## 🗄️ Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `organizations` | SaaS companies using Crow |
| `organization_members` | User ↔ Organization membership |
| `tenants` | Customers of the SaaS companies |
| `tenant_members` | User ↔ Tenant membership |
| `tenant_invites` | Pending invitations |

### Vault & Sessions

| Table | Description |
|-------|-------------|
| `vault_sessions` | Encrypted session cookies |
| `vault_error_logs` | Session error tracking |
| `vault_rate_limits` | Rate limit windows |

### Extraction

| Table | Description |
|-------|-------------|
| `extraction_schemas` | Field definitions for extraction |
| `document_extractions` | Extracted document data |
| `extractions` | General extraction history |

### Workflows

| Table | Description |
|-------|-------------|
| `scheduled_workflows` | Workflow definitions with scheduling |
| `workflow_runs` | Execution history and results |
| `workflows` | Legacy workflow definitions |

### Notifications

| Table | Description |
|-------|-------------|
| `notifications` | In-app notifications (realtime) |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- GitHub OAuth app (for authentication)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/crow.git
cd crow
bun install
```

### 2. Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# External Services
FIRECRAWL_API_KEY=your_firecrawl_key
REDUCTO_API_KEY=your_reducto_key
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=notifications@yourdomain.com
```

### 3. Database Setup

Start the local Supabase instance and apply migrations:

```bash
bunx supabase start
bunx supabase db push
```

Generate TypeScript types:

```bash
bunx supabase gen types typescript --local > types.ts
```

### 4. Run Development Server

```bash
bun dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

---

## 🔧 Development

### Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server |
| `bun build` | Build for production |
| `bun start` | Start production server |
| `bun lint` | Run Biome linter |
| `bun format` | Format code with Biome |

### Database Migrations

Create a new migration:

```bash
bunx supabase migration new migration_name
```

Apply migrations:

```bash
bunx supabase db push
```

Regenerate types after schema changes:

```bash
bunx supabase gen types typescript --local > types.ts
```

### Adding UI Components

```bash
bunx shadcn@latest add component-name
```

---

## 🔌 API Reference

### Authentication

All API endpoints require authentication. For user requests, cookies handle session auth automatically. For programmatic access, use tenant API keys:

```bash
curl -X POST https://your-crow-instance/api/extract-web \
  -H "Authorization: Bearer crow_tenant_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"schemaId": "...", "url": "..."}'
```

### Endpoints

#### `POST /api/scrape-with-session`
Scrape a URL using a stored vault session for authentication.

```json
{
  "sessionId": "uuid",
  "url": "https://example.com/protected-page",
  "formats": ["markdown", "html"],
  "onlyMainContent": true
}
```

#### `POST /api/extract-web`
Extract structured data from a URL using a schema.

```json
{
  "schemaId": "uuid",
  "url": "https://example.com/data",
  "sessionId": "uuid (optional)"
}
```

#### `POST /api/extract-document`
Extract data from PDFs or images using Reducto.

```json
{
  "schemaId": "uuid",
  "documentUrl": "https://example.com/invoice.pdf",
  "filename": "invoice.pdf"
}
```

#### `POST /api/crawl`
Crawl multiple pages starting from a URL.

```json
{
  "url": "https://example.com",
  "maxDepth": 3,
  "maxPages": 100,
  "sessionId": "uuid (optional)"
}
```

#### `POST /api/map`
Discover all URLs on a website.

```json
{
  "url": "https://example.com",
  "sessionId": "uuid (optional)"
}
```

#### `POST /api/send-email`
Send extraction results via email.

```json
{
  "to": "user@example.com",
  "subject": "Extraction Results",
  "data": { "field1": "value1" }
}
```

---

## 🧩 Chrome Extension

The Crow Session Vault extension enables one-click capture of authenticated sessions.

### Installation

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `/extension` folder

### Usage

1. Log into the target website
2. Click the Crow extension icon
3. Select a tenant from the dropdown
4. Name your session
5. Click "Capture Session"

The session is encrypted and stored in your tenant's vault, ready for use by AI agents.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Crow Dashboard                          │
│  ┌──────────────────┬──────────────────┬──────────────────────┐ │
│  │  Organizations   │     Tenants      │      Workflows       │ │
│  │  & Members       │  & Vault Sessions│   & Extractions      │ │
│  └──────────────────┴──────────────────┴──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                         │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │ /scrape  │ /extract │ /crawl   │  /agent  │   /webhook   │  │
│  │ -session │ -document│          │          │              │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Firecrawl   │    │    Reducto    │    │    Resend     │
│  Web Scraping │    │  Document OCR │    │    Email      │
└───────────────┘    └───────────────┘    └───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase (Postgres + RLS)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Organizations │ Tenants │ Vault Sessions │ Extractions  │  │
│  │  Row Level Security ensures complete data isolation      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security

### Data Isolation
- **Row Level Security (RLS)** - All tables protected by Postgres RLS policies
- **Multi-tenant isolation** - Users only see data they're authorized to access
- **Organization boundaries** - Tenants are scoped to organizations

### Session Security
- **Encrypted at rest** - Vault sessions are encrypted before storage
- **Rate limiting** - Configurable per-session rate limits
- **Expiration tracking** - Automatic alerts for expiring sessions

### API Security
- **Hashed API keys** - Only the hash is stored; keys cannot be retrieved
- **Scoped access** - API keys are tenant-specific
- **Audit logging** - All operations are logged for compliance

---

## 📄 License

Use it however i dont care, I dont take responsibilty for anything you or this software causes though.