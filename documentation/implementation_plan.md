# Implementation plan

## Phase 1: Environment Setup

1.  **Prevalidation**: Check if current directory is a new project root by verifying absence of `package.json` or presence of a marker file; if not, prompt user to confirm proceeding (Development and Deployment).
2.  Install **Node.js v20.2.1** if not present (Non-Negotiable Tech Stack: Backend). Validation: Run `node -v` to confirm `v20.2.1`.
3.  Install **pnpm** globally: `npm install -g pnpm` (Non-Negotiable Tech Stack: Package Manager). Validation: Run `pnpm -v` to confirm installation.
4.  Initialize Git repository: `git init` at project root (Development and Deployment).
5.  Initialize workspace: run `pnpm init -y` then add to `/package.json`:

`{ "name": "mcp-platform", "private": true, "workspaces": ["web","api"] } `(Development and Deployment).

1.  Create root `.gitignore` with:

`node_modules/ .cursor/ .env `(Environment Variables).

1.  Create `cursor_metrics.md` in project root and refer to `cursor_project_rules.mdc` for instructions on populating metrics (Phase 1 Tools Setup).
2.  Create `.cursor` directory at project root (Phase 1 Tools Setup).
3.  Create `.cursor/mcp.json` with macOS config:

`{ "mcpServers": { "supabase": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-postgres", "<connection-string>"] } } } `(Tech Stack: DB/Auth/Storage).

1.  Add `.cursor/mcp.json` to `.gitignore` (Phase 1 Tools Setup).
2.  Display link to obtain Supabase MCP connection string: <https://supabase.com/docs/guides/getting-started/mcp#connect-to-supabase-using-mcp> (Tech Stack: DB/Auth/Storage).
3.  Instruct user to replace `<connection-string>` in `.cursor/mcp.json` with their actual Supabase connection string (Tech Stack: DB/Auth/Storage).
4.  After replacement, open Cursor Settings → MCP and confirm a green active status (Phase 1 Tools Setup).

## Phase 2: Frontend Development

1.  Create Next.js 14 App Router project in `/web`:

`pnpm create next-app@14 web --typescript --app `Note: Use **Next.js 14** for better AI tool compatibility (Non-Negotiable Tech Stack: Frontend).

1.  **Validation**: Run `pnpm --filter web dev` and verify default page at <http://localhost:3000> (Development and Deployment).
2.  In `/web`, install Tailwind CSS v3: `pnpm add -D tailwindcss postcss autoprefixer` (Non-Negotiable Tech Stack: Frontend).
3.  Initialize Tailwind: `npx tailwindcss init -p` in `/web` (Non-Negotiable Tech Stack: Frontend).
4.  Configure `tailwind.config.js` to scan `./app/**/*.{js,ts,jsx,tsx}` and `./components/**/*.{js,ts,jsx,tsx}` (Non-Negotiable Tech Stack: Frontend).
5.  Install shadcn/ui in `/web`: `pnpm dlx shadcn-ui init` (Non-Negotiable Tech Stack: Frontend).
6.  Create `/web/app/layout.tsx` with AddOn-branded header/footer using Tailwind and shadcn components (Style and Branding).
7.  Create `/web/app/dashboard/page.tsx` showing run status, recent jobs, and health cards (Frontend Key Screens: Dashboard).
8.  Create `/web/app/oems/page.tsx` with table of OEM sources and “Add OEM” button (Frontend Key Screens: OEMs).
9.  Create `/web/app/docs/page.tsx` with file upload component (20 MB limit) and parsed-text view (Frontend Key Screens: Docs; File Upload Size).
10. Create `/web/app/runs/page.tsx` to select LLM adapter, launch extraction run, and display token/cost metrics (Frontend Key Screens: Runs).
11. Create `/web/app/results/page.tsx` with a filterable table, score badges, and evidence popovers (Frontend Key Screens: Results).
12. Create `/web/app/settings/page.tsx` with form fields for API keys, default models, scraping flag, and ToS acceptance (Frontend Key Screens: Settings).
13. Implement `/web/src/services/api.ts` with `fetch` calls to backend REST endpoints (App Flow: API Calls).
14. **Validation**: Write Vitest tests under `/web/tests` for rendering of each page and mock API integration (Testing).

## Phase 3: Backend Development

1.  Create `/api` directory, run `pnpm init -y` there, and add a `tsconfig.json` (Non-Negotiable Tech Stack: Backend).
2.  In `/api`, install dependencies:

`pnpm add express cors node-cron dotenv @supabase/supabase-js pnpm add -D typescript ts-node supertest vitest `(Non-Negotiable Tech Stack: Backend, Jobs, Testing).

1.  Create `/api/src/index.ts` to configure Express on port 3001, load `.env`, and apply CORS for `http://localhost:3000` (Tech Stack: Backend).

2.  Define routes in `/api/src/routes`:

    *   **oems.ts**: `POST /oems`, `GET /oems`
    *   **docs.ts**: `POST /docs/ingest`
    *   **extract.ts**: `POST /extract/run`
    *   **catalog.ts**: `POST /catalog/ingest`
    *   **results.ts**: `GET /results/compat`, `GET /results/fact/:id`
    *   **health.ts**: `GET /health` (REST API Endpoints).

3.  Create Supabase client in `/api/src/lib/supabase.ts` using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Environment Variables).

4.  Define PostgreSQL schema via MCP for tables `oem_sources`, `oem_docs`, `compat_facts`, `catalog_products`, `correlations`, `extraction_runs` with relations (Data Model).

5.  **Validation**: Run MCP query `SELECT table_name FROM information_schema.tables WHERE table_schema='public';` and verify six new tables (Tech Stack: DB/Auth/Storage).

6.  Implement SHA-256 dedupe utility in `/api/src/utils/dedupe.ts` for `/docs/ingest` (Key Features: Deduplication).

7.  Build LLM adapter layer in `/api/src/adapters` for OpenAI GPT-4o, Claude 3.5 Sonnet, Local LLM HTTP, and Deepseek R1 (Key Features: AI Adapters).

8.  Implement `/api/src/controllers/extractController.ts` to invoke adapters with the system prompt and JSON schema (LLM Extraction Prompt).

9.  Implement `/api/src/controllers/correlationController.ts` applying score thresholds for exact (≥0.90), close (0.60–0.89), and inferred (≤0.59) matches (Correlation Engine Rules).

10. Write unit tests in `/api/src/tests`:

    *   Parser tests for ingestion
    *   Scoring math tests (Testing).

11. **Validation**: Run `pnpm --filter api test` and ensure ≥90% coverage for ingestion and correlation modules (Testing).

## Phase 4: Integration

1.  Update `/web/src/services/api.ts` to target `http://localhost:3001` for all endpoints (App Flow).
2.  In `/api/src/index.ts`, enable CORS for the production Railway domain once deployed (Development and Deployment).
3.  Start combined dev servers: `pnpm -w dev` and verify a full ingest→extract→correlate→results flow works locally (POC Acceptance Criteria).
4.  **Validation**: Create E2E tests under `/api/src/tests/e2e` using supertest + Vitest to simulate file upload, extraction run, catalog ingest, and `GET /results/compat` (Testing).

## Phase 5: Deployment

1.  In Railway, create two services:

    *   **API**: build with `pnpm --filter api build`, start with `node dist/index.js`.
    *   **Web**: build with `pnpm --filter web build`, start with `pnpm --filter web start`. (Deployment).

2.  Add environment variables in Railway for both services: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `LOCAL_LLM_BASE_URL`, `DEFAULT_LLM`, `DEFAULT_OPENAI_MODEL`, `DEFAULT_ANTHROPIC_MODEL`, `ALLOW_SCRAPING`, `RAILWAY_ENVIRONMENT` (Environment Variables).

3.  Configure Railway to use your preferred region and attach the Supabase add-on (Deployment).

4.  **Validation**: After deployment, curl `https://<api-url>/health` and `https://<web-url>` to ensure both return 200 (POC Acceptance Criteria).

5.  Run one full POC workflow on Railway: ingest sample OEM docs, extract with each LLM adapter, ingest sample catalog, and verify ≥1 exact and ≥1 close match via `GET /results/compat` (POC Acceptance Criteria).
