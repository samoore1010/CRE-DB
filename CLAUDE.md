# CLAUDE.md — LAO Pipeline Pro

This file provides guidance for AI assistants (Claude Code and others) working in this repository.

---

## Project Overview

**LAO Pipeline Pro** is a bespoke Commercial Real Estate (CRE) Deal Pipeline and Commission Forecasting Dashboard built for the LAO team. It is a full-stack React + Express application featuring:

- Transaction pipeline management across CRE deal stages (LOI, Contract, Escrow, Closed, Option)
- Commission forecasting and split tracking per agent (Trey, Kirk, Pete)
- Lead management with stage tracking, reminders, and contact management
- Contact management with auto-derivation from transactions/leads and merge support
- Email inbox (receives forwarded emails via webhook)
- Document management per transaction
- AI Assistant powered by Google Gemini
- CSV data import/export
- Calendar event (ICS) generation
- Reports and analytics dashboard
- Dark mode, mobile-responsive with haptic feedback and pull-to-refresh

---

## Tech Stack

| Layer         | Technology                              | Version   |
|---------------|-----------------------------------------|-----------|
| UI Framework  | React                                   | ^19.0.0   |
| Language      | TypeScript                              | ~5.8.2    |
| Build Tool    | Vite                                    | ^6.2.0    |
| Styling       | Tailwind CSS (v4)                       | ^4.1.14   |
| Icons         | lucide-react                            | ^0.546.0  |
| Charts        | recharts                                | ^3.7.0    |
| Animation     | motion                                  | ^12.23.24 |
| Class Utils   | clsx + tailwind-merge                   | latest    |
| AI            | Google Gemini (`@google/genai`)         | ^1.29.0   |
| Backend       | Express.js                              | ^4.21.2   |
| Database      | better-sqlite3 (SQLite)                 | ^12.4.1   |
| Validation    | zod                                     | ^4.3.6    |
| CORS          | cors                                    | ^2.8.6    |
| Rate Limiting | express-rate-limit                      | ^8.3.1    |
| CSV Parsing   | papaparse                               | ^5.5.3    |
| Date Utils    | date-fns                                | ^4.1.0    |
| Env Vars      | dotenv                                  | ^17.2.3   |
| Testing       | vitest                                  | ^4.1.1    |

---

## Development Setup

**Prerequisites:** Node.js

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
#    Copy .env.example to .env.local and fill in values:
GEMINI_API_KEY="your-gemini-api-key"
APP_URL="http://localhost:3000"
APP_PASSWORD=""           # Optional: set to enable login screen
SESSION_SECRET=""         # Optional: set for persistent sessions in production

# 3. Start the dev server (frontend + backend)
npm run dev           # Vite frontend on port 3000
npm run dev:server    # Express backend on port 3001 (separate terminal)
```

## npm Scripts

| Script             | Command                            | Purpose                          |
|--------------------|------------------------------------|----------------------------------|
| `npm run dev`      | `vite --port=3000 --host=0.0.0.0` | Start Vite dev server            |
| `npm run dev:server` | `tsx watch server.ts`            | Start Express backend (dev)      |
| `npm run build`    | `vite build`                       | Production build to `dist/`      |
| `npm run start`    | `NODE_ENV=production tsx server.ts` | Production server (serves built frontend) |
| `npm run preview`  | `vite preview`                     | Serve the production build       |
| `npm run clean`    | `rm -rf dist`                      | Remove build output              |
| `npm run lint`     | `tsc --noEmit`                     | TypeScript type check            |
| `npm run test`     | `vitest run`                       | Run test suite                   |
| `npm run test:watch` | `vitest`                         | Run tests in watch mode          |

---

## Project Structure

```
/
├── server.ts              ← Express backend (API routes, SQLite, auth, email webhook)
├── src/
│   ├── App.tsx            ← Main React application (~11k lines, all UI components)
│   ├── types.ts           ← TypeScript type definitions (canonical source)
│   ├── utils.ts           ← Utility functions, formatting, commission math, animation variants
│   ├── csvProcessing.ts   ← CSV import/export logic for transactions and leads
│   ├── utils.test.ts      ← Tests for utils (commission math, formatting, validation)
│   ├── csvProcessing.test.ts ← Tests for CSV parsing
│   ├── main.tsx           ← React entry point (mounts <App /> into #root)
│   └── index.css          ← Tailwind CSS import (@import "tailwindcss")
├── public/
│   ├── transactions.csv   ← Sample transaction data
│   └── leads.csv          ← Sample lead data
├── package.json           ← npm config with scripts and dependencies
├── package-lock.json      ← npm lockfile
├── tsconfig.json          ← TypeScript compiler options
├── vite.config.ts         ← Vite config (includes vitest config)
├── index.html             ← HTML entry point
├── metadata.json          ← AI Studio app metadata
├── railway.json           ← Railway deployment config
├── vercel.json            ← Vercel deployment config
├── nixpacks.toml          ← Nixpacks build config
└── .gitignore             ← Git ignore rules
```

### Frontend (`src/App.tsx`)

The main UI (~11k lines) containing all React components, organized as:

1. **Imports** — React, date-fns, lucide-react, recharts, Gemini SDK, papaparse, plus extracted modules
2. **Components** — `StatusBadge`, `MetricCard`, `DocumentSection`, `AIAssistant`, etc.
3. **Views** — `DashboardView`, `PipelineView`, `LeadsView`, `ContactsView`, `InboxView`, `ReportsView`, `SettingsView`, etc.
4. **Modals/Drawers** — `NewTransactionModal`, `NewLeadModal`, `QuickEditTransactionDrawer`, etc.
5. **`AppInner`** — Main app component with all state (~151 `useState` calls) and routing logic
6. **`App`** — Default export wrapped in `ErrorBoundary`

### Extracted Modules

| File                  | Contents                                                    |
|-----------------------|-------------------------------------------------------------|
| `src/types.ts`        | All TypeScript interfaces and union types (canonical source)|
| `src/utils.ts`        | `cn()`, `formatCurrency()`, `formatPercent()`, `generateICS()`, `mkParty()`, `useCommissionMath()`, `calculateCommission()`, animation variants, validation helpers, preferences |
| `src/csvProcessing.ts`| `processTransactionCSV()`, `processLeadCSV()` — CSV row-to-object mapping |

### Backend (`server.ts`)

Express.js server providing:
- **SQLite database** with tables: `transactions`, `leads`, `action_log`, `inbox_items`, `standalone_contacts`, `preferences`
- **Indexed columns** (`stage`, `is_deleted`) on transactions/leads for efficient DB-level queries
- **Zod validation** on all write endpoints (transactions, leads, contacts, action log)
- **CORS** configuration for dev/production
- **Rate limiting** on the auth login endpoint (10 attempts per 15 minutes)
- **DB availability guard** middleware — returns 503 if SQLite is unavailable
- **Cookie-based authentication** with HMAC-signed session tokens (optional, enabled via `APP_PASSWORD`)
- **Email webhook** (`POST /api/email-inbox`) for receiving forwarded emails (Google Apps Script / SendGrid)
- REST API: full CRUD + batch operations + soft deletes for all entities

---

## Core Domain Types

Defined in `src/types.ts`:

```typescript
type PipelineStage = 'LOI' | 'Contract' | 'Escrow' | 'Closed' | 'Option';
type LeadStage = 'Buyer Lead' | 'Listing Lead' | 'Listing' | 'Dead Lead' | 'Dead Listing';

interface Transaction {
  id: string;
  dealName: string;
  stage: PipelineStage;
  price: number;
  grossCommissionPercent: number;
  treyLaoPercent: number;       // Trey's LAO cut percentage
  kirkLaoPercent: number;       // Kirk's LAO cut percentage
  treySplitPercent: number;     // Trey's commission split
  kirkSplitPercent: number;     // Kirk's commission split
  buyer: Party;
  seller: Party;
  otherParties: Party[];
  // ... plus dates, documents, notes, reminders, etc.
}

interface Lead {
  id: string;
  stage: LeadStage;
  projectName: string;
  contactName: string;
  details: string;
  lastSpokeDate: string;
  summary: string;
  isDeleted: boolean;
  // ... plus contacts, reminders, conversion tracking, etc.
}
```

---

## React Components

All components are defined in `src/App.tsx`:

| Component                    | Purpose                                              |
|------------------------------|------------------------------------------------------|
| `StatusBadge`                | Colored badge for `PipelineStage` values             |
| `MetricCard`                 | KPI display card with trending indicator             |
| `DocumentSection`            | Document upload/list UI for transactions             |
| `AIAssistant`                | Gemini AI chat panel                                 |
| `DataManagementView`         | CSV import/export interface                          |
| `DashboardView`              | Main dashboard: KPIs, charts, bulletin board         |
| `LeadsView`                  | Lead list with search, filtering, stage transitions  |
| `LeadDetailView`             | Full detail page for a single lead                   |
| `PipelineView`               | Table + Kanban views for deal pipeline               |
| `TransactionDetailView`      | Full detail page for a single transaction            |
| `ContactsView`               | Contact directory derived from transactions/leads    |
| `ContactDetailView`          | Full detail page for a contact                       |
| `InboxView`                  | Email inbox for received emails                      |
| `ReportsView`                | Analytics and reporting dashboard                    |
| `SettingsView`               | App preferences and configuration                    |
| `NewTransactionModal`        | Form modal to create a new transaction               |
| `NewLeadModal`               | Form modal to create a new lead                      |
| `QuickEditTransactionDrawer` | Slide-over drawer for quick transaction edits        |
| `QuickEditLeadDrawer`        | Slide-over drawer for quick lead edits               |
| `MergeContactsModal`         | Modal to merge duplicate contacts                    |
| `RecentlyDeletedView`        | Trash/soft-delete recovery view                      |
| `RecentActionsView`          | Activity/audit log view                              |
| `ConfirmDialog`              | Generic confirmation dialog                          |
| `LoginScreen`                | Password login screen (when auth enabled)            |
| `OnboardingModal`            | First-time user onboarding                           |
| `TutorialModal`              | Context-sensitive page help                          |
| `MobileBottomNav`            | Bottom navigation bar for mobile                     |
| `ToastContainer`             | Toast notification display                           |

---

## Key Conventions

### State Management
- All state is managed with `useState` in the top-level `AppInner` component (~151 `useState` calls)
- `useMemo` and `useCallback` used heavily for derived/computed values
- No external state library (no Redux, Zustand, etc.)

### Styling
- Tailwind CSS v4 with the Vite plugin (`@tailwindcss/vite`)
- `cn()` utility (clsx + tailwind-merge) for conditional class composition — defined in `src/utils.ts`
- No custom CSS beyond `@import "tailwindcss"` in `src/index.css`

### Formatting Utilities (in `src/utils.ts`)
- `formatCurrency(amount: number)` — formats as USD with no decimal places
- `formatPercent(value: number)` — formats as percentage (value is 0–100, not 0–1)

### Commission Math (in `src/utils.ts`)
- `useCommissionMath(transaction)` — React hook for component use
- `calculateCommission(transaction)` — Pure function for use in tests/non-React code

### Data Persistence
- SQLite database via Express backend (`server.ts`)
- Data stored as JSON blobs with extracted indexed columns (`stage`, `is_deleted`) for query performance
- All API routes use Zod schema validation on write operations
- Frontend loads data from API on startup, syncs changes back via fetch

### API Validation (in `server.ts`)
- All POST/PUT routes validate request bodies using Zod schemas
- Invalid requests receive 400 responses with detailed error messages
- Schemas use `.passthrough()` to allow additional fields for forward compatibility

### AI Integration
- Uses `GoogleGenAI` and `Type` from `@google/genai`
- API key loaded from `process.env.GEMINI_API_KEY`
- AI features are encapsulated in the `AIAssistant` component

### Calendar/ICS (in `src/utils.ts`)
- `generateICS(events)` produces iCalendar-formatted strings for export
- Events are all-day (end date = start + 1 day)

### Soft Deletes
- Both `Transaction` and `Lead` use soft delete: `isDeleted: boolean`, `deletedAt?: string`
- Server-side soft delete updates both JSON blob and `is_deleted` indexed column
- `RecentlyDeletedView` provides recovery UI

---

## Environment Variables

Create `.env.local` (ignored by git) with:

```
GEMINI_API_KEY="your-key"         # Required for AI features
APP_URL="http://localhost:3000"   # App's hosted URL
APP_PASSWORD=""                    # Optional: enables login screen
SESSION_SECRET=""                  # Optional: stable sessions across restarts
EMAIL_WEBHOOK_SECRET=""            # Optional: webhook auth for email ingestion
DB_PATH="pipeline.db"             # Optional: custom SQLite path
```

---

## Testing

Tests use **Vitest** and are located alongside source files in `src/`:

- `src/utils.test.ts` — Commission math, formatting, validation helpers, ICS generation
- `src/csvProcessing.test.ts` — Transaction and lead CSV parsing

Run tests:
```bash
npm run test          # Single run
npm run test:watch    # Watch mode
```

---

## Deployment

Configured for multiple platforms:
- **Railway** (`railway.json`) — uses `npm run start` for production
- **Vercel** (`vercel.json`)
- **Nixpacks** (`nixpacks.toml`)
- **Google AI Studio** — original deployment target
- Dev server binds to `0.0.0.0:3000` (frontend) and port `3001` (backend)

---

## Git Workflow

- **Main branch:** `master`
- **Feature branches:** use `claude/<description>` naming convention
- No CI/CD pipelines are configured
