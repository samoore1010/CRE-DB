# CLAUDE.md — LAO Pipeline Pro

This file provides guidance for AI assistants (Claude Code and others) working in this repository.

---

## Project Overview

**LAO Pipeline Pro** is a bespoke Commercial Real Estate (CRE) Deal Pipeline and Commission Forecasting Dashboard built for the LAO team. It is a single-page React application hosted on Google AI Studio, featuring:

- Transaction pipeline management across CRE deal stages
- Commission forecasting and split tracking per agent (Trey, Kirk)
- Lead management with reminders and contact tracking
- Document management per transaction
- AI Assistant powered by Google Gemini
- CSV data import/export
- Calendar event (ICS) generation

---

## Critical: File Name Mismatch

> **WARNING:** The files in this repository were uploaded with scrambled names. The filename on disk does NOT match the intended file role. Do not rename files without understanding this mapping.

| Filename on Disk     | Actual Content / Intended Role           |
|----------------------|------------------------------------------|
| `index.css`          | **`App.tsx`** — Main React component (~5600 lines) |
| `package.json`       | **`metadata.json`** — AI Studio app metadata (name, description) |
| `README.md`          | **`package-lock.json`** — npm lockfile   |
| `vite.config.ts`     | **`tsconfig.json`** — TypeScript compiler config |
| `tsconfig.json`      | **`README.md`** — Project README (run instructions) |
| `download`           | **`.env.example`** — Environment variable template |
| `index.html`         | **`.gitignore`** — Git ignore rules      |
| `env.example`        | **`main.tsx`** — React application entry point |
| `main.tsx`           | **`index.css`** — Tailwind CSS import (`@import "tailwindcss"`) |
| `metadata.json`      | **`index.html`** — HTML entry point      |
| `package-lock.json`  | **`package.json`** — npm package config with scripts and dependencies |

When making edits, always look at the file **content**, not the filename.

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
| CSV Parsing   | papaparse                               | ^5.5.3    |
| Date Utils    | date-fns                                | ^4.1.0    |
| Env Vars      | dotenv                                  | ^17.2.3   |

---

## Development Setup

**Prerequisites:** Node.js

```bash
# 1. Install dependencies (reads package-lock.json for the lock file)
npm install

# 2. Set up environment variables
#    Copy the template (stored in `download` file) to .env.local
#    and fill in your Gemini API key:
GEMINI_API_KEY="your-gemini-api-key"
APP_URL="http://localhost:3000"

# 3. Start the dev server
npm run dev
# App is served at http://localhost:3000
```

## npm Scripts

All scripts are defined in `package-lock.json` (the file that is actually the package.json):

| Script          | Command                          | Purpose                          |
|-----------------|----------------------------------|----------------------------------|
| `npm run dev`   | `vite --port=3000 --host=0.0.0.0` | Start development server         |
| `npm run build` | `vite build`                     | Production build to `dist/`      |
| `npm run preview` | `vite preview`                 | Serve the production build       |
| `npm run clean` | `rm -rf dist`                    | Remove build output              |
| `npm run lint`  | `tsc --noEmit`                   | TypeScript type check (no tests) |

---

## Project Structure

The entire application is a **flat directory** — there are no subdirectories beyond `.git`. All source code lives in the root.

```
/
├── index.css          ← App.tsx: the ENTIRE application (React components, types, state, logic)
├── env.example        ← main.tsx: React entry point (mounts <App /> into #root)
├── main.tsx           ← index.css: Tailwind CSS import (@import "tailwindcss")
├── metadata.json      ← index.html: HTML shell with <div id="root">
├── package-lock.json  ← package.json: npm config with scripts and dependencies
├── README.md          ← package-lock.json: npm lockfile
├── vite.config.ts     ← tsconfig.json: TypeScript compiler options
├── tsconfig.json      ← README.md: project documentation
├── package.json       ← metadata.json: AI Studio app metadata
├── download           ← .env.example: environment variable template
└── index.html         ← .gitignore: ignored paths (node_modules, dist, .env*, etc.)
```

### Main Application File (`index.css` — actual App.tsx)

The entire frontend lives in a single ~5600-line file organized as:

1. **Imports** — React, date-fns, lucide-react, recharts, Gemini SDK, papaparse
2. **Utility functions** — `cn()`, `formatCurrency()`, `formatPercent()`, `generateICS()`
3. **Type definitions** — all interfaces and union types
4. **Mock/initial data** — `INITIAL_TRANSACTIONS`, `INITIAL_LEADS`
5. **React components** — all UI components defined inline
6. **Default export** — `App` component with all state and routing logic

---

## Core Domain Types

Defined in `index.css` (~line 125):

```typescript
type PipelineStage = 'LOI' | 'Contract' | 'Escrow' | 'Closed' | 'Option';

interface Transaction {
  id: string;
  dealName: string;
  stage: PipelineStage;
  price: number;
  grossCommissionPercent: number;
  laoCutPercent: number;        // LAO team's cut
  treySplitPercent: number;     // Trey's commission split
  kirkSplitPercent: number;     // Kirk's commission split
  earnestMoney: number;
  psaDate: string;              // ISO date
  feasibilityDate: string;      // ISO date
  coeDate: string;              // Close of Escrow date (ISO)
  address: string;
  acreage: number;
  zoning: string;
  buyer: Party;
  seller: Party;
  otherParties: Party[];
  customDates: CustomDate[];
  documents: TransactionDocument[];
  notesLog: Note[];
  reminders?: LeadReminder[];
  apn?: string;
  county?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

interface Lead {
  id: string;
  type: string;
  projectName: string;
  contactName: string;
  details: string;
  lastSpokeDate: string;
  summary: string;
  isDeleted: boolean;
  notesLog?: Note[];
  contacts?: LeadContact[];
  reminders?: LeadReminder[];
}

interface Party {
  role: string; name: string; entity?: string; email?: string; phone?: string;
}

interface Note {
  id: string; content: string; date: string;
}

interface CustomDate {
  id: string; label: string; date: string; completed: boolean;
  type?: 'reminder' | 'event';
}
```

---

## React Components

All components are defined in `index.css` (App.tsx):

| Component              | Purpose                                              |
|------------------------|------------------------------------------------------|
| `StatusBadge`          | Colored badge for `PipelineStage` values             |
| `MetricCard`           | KPI display card with trending indicator             |
| `DocumentSection`      | Document upload/list UI for transactions             |
| `AIAssistant`          | Gemini AI chat panel                                 |
| `DataManagementView`   | CSV import/export interface                          |
| `DashboardView`        | Main dashboard: KPIs, charts, recent transactions    |
| `LeadsView`            | Lead list with search and filtering                  |
| `LeadDetailView`       | Full detail page for a single lead                   |
| `PipelineView`         | Kanban-style pipeline board by stage                 |
| `TransactionDetailView`| Full detail page for a single transaction            |
| `NewTransactionModal`  | Form modal to create a new transaction               |
| `RecentlyDeletedView`  | Trash/soft-delete recovery view                      |
| `ConfirmDialog`        | Generic confirmation dialog                          |
| `TimelineSummary`      | Timeline of key dates for a transaction              |
| `PartiesSummary`       | Display panel for Buyer/Seller/Other parties         |

---

## Key Conventions

### State Management
- All state is managed with `useState` in the top-level `App` component (~58 `useState` calls)
- `useMemo` is used heavily (~15 instances) for derived/computed values (filtered lists, commission calculations)
- No external state library (no Redux, Zustand, etc.)

### Styling
- Tailwind CSS v4 with the Vite plugin (`@tailwindcss/vite`)
- `cn()` utility (clsx + tailwind-merge) is used for conditional class composition:
  ```typescript
  function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```
- No custom CSS beyond `@import "tailwindcss"` in `main.tsx`

### Formatting Utilities
- `formatCurrency(amount: number)` — formats as USD with no decimal places
- `formatPercent(value: number)` — formats as percentage (value is 0–100, not 0–1)

### Commission Math
All commission-related calculations go through `useCommissionMath()` hook.

### Data Persistence
- Currently client-side only (in-memory `useState` seeded from `INITIAL_TRANSACTIONS`/`INITIAL_LEADS`)
- `better-sqlite3` is listed as a dependency, indicating server-side persistence is planned/available via the Express backend
- `dotenv` is used for `GEMINI_API_KEY` and `APP_URL`

### AI Integration
- Uses `GoogleGenAI` and `Type` from `@google/genai`
- API key loaded from `process.env.GEMINI_API_KEY` (injected by AI Studio at runtime)
- AI features are encapsulated in the `AIAssistant` component

### Calendar/ICS
- `generateICS(events)` produces iCalendar-formatted strings for export
- Events are all-day (end date = start + 1 day)

### Soft Deletes
- Both `Transaction` and `Lead` use soft delete: `isDeleted: boolean`, `deletedAt?: string`
- `RecentlyDeletedView` provides recovery UI

---

## Environment Variables

Stored in `download` file (the `.env.example`):

```
GEMINI_API_KEY="MY_GEMINI_API_KEY"   # Required for AI features
APP_URL="MY_APP_URL"                  # App's hosted URL
```

In local development, create `.env.local` (ignored by git) with real values. AI Studio injects these automatically in production.

---

## No Test Suite

There is no testing framework installed (no Vitest, Jest, etc.) and no test files. The `npm run lint` script runs TypeScript type checking as the only automated quality check.

---

## Deployment

This app is deployed on Google AI Studio:
- AI Studio link: https://ai.studio/apps/724766c0-2c7a-40be-9951-215ffedfc059
- Dev server binds to `0.0.0.0:3000` to be reachable from all network interfaces

---

## Git Workflow

- **Main branch:** `master`
- **Feature branches:** use `claude/<description>` naming convention
- No CI/CD pipelines are configured
