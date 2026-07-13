# OptiStock — Integrated Inventory, POS & Dashboard System

**IT 3012 — System Integration and Architecture 1 | Final Project | Summer 2026 | Laguna University**

A fully integrated 3-module system built collaboratively by 3 groups. Each module has its own backend, database, and frontend, communicating via REST APIs.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
├─────────────┬───────────────────┬───────────────────────────┤
│  Module 1   │    Module 2       │      Module 3             │
│  Inventory  │    POS            │      Dashboard            │
│  :5173      │    :5174          │      :5175                │
├─────────────┼───────────────────┼───────────────────────────┤
│  Django API │  Express API      │  Express API              │
│  :8000      │  :8002            │  :8003                   │
├─────────────┼───────────────────┼───────────────────────────┤
│ optistock_db│  pos_db           │  dashboard_db             │
│  (MySQL)    │  (MySQL)          │  (MySQL)                  │
└─────────────┴───────────────────┴───────────────────────────┘
         ◄──── API Integration ────►
```

## Integration Flow

| From | To | What |
|------|----|------|
| POS (M2) | Inventory (M1) | Fetches products, deducts stock after sale |
| Dashboard (M3) | Inventory (M1) | Reads inventory data, handles auth |
| Dashboard (M3) | POS (M2) | Reads sales transactions and user data |

## Prerequisites

- **Node.js** v18+
- **Python** 3.10+
- **MySQL** 8.0+ (root password: `jane2005`)

## Quick Start (Single Machine)

```bash
cd /path/to/Inventory
npm run dev
```

This starts all 6 services:
- 3 Vite frontends (ports 5173, 5174, 5175)
- 1 Django backend (port 8000)
- 2 Express backends (ports 8002, 8003)

## Per-Module Quick Start

### Module 1 — Inventory (port 5173 / 8000)
```bash
cd OptiStock
# Backend
cd backend && python3 -m uvicorn config.asgi:application --reload --host 0.0.0.0 --port 8000
# Frontend (separate terminal)
cd OptiStock && npm run dev
```

### Module 2 — POS (port 5174 / 8002)
```bash
cd /Users/janeventura/Downloads/POS-Module
# Backend
npm run dev:server
# Frontend (separate terminal)
npm run dev
```

### Module 3 — Dashboard (port 5175 / 8003)
```bash
cd /Users/janeventura/Downloads/Dashboard-Module
# Backend
npm run dev:server
# Frontend (separate terminal)
npm run dev
```

## Folder Structure

```
/Users/janeventura/Downloads/
├── Inventory/                  # Module 1 — Inventory Hub (your module)
│   ├── OptiStock/              # Django backend + React frontend
│   ├── package.json            # Root startup (npm run dev)
│   └── README.md
├── POS-Module/                 # Module 2 — POS (ibigay kay Classmate A)
│   ├── src/backend/            # Express backend
│   ├── src/pages/              # React frontend
│   └── README.md
└── Dashboard-Module/           # Module 3 — Dashboard (ibigay kay Classmate B)
    ├── backend/                # Express backend
    ├── src/                    # React frontend
    └── README.md
```

## Integration Checklist

- [ ] All three machines on the same network
- [ ] IP addresses configured in each module's `.env` or config files
- [ ] MySQL running on all machines (or shared server)
- [ ] Backends started before frontends
- [ ] Test: POS fetches products from Inventory
- [ ] Test: Dashboard fetches data from POS and Inventory
