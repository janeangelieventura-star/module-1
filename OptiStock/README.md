# Module 1 — Inventory Hub

**Group 1 — Inventory Management System**

## Overview

Manages products, categories, suppliers, stock adjustments, and notifications. Exposes a REST API consumed by the POS (Module 2) and Dashboard (Module 3).

**Tech Stack:** Django 5.1.7 + DRF 3.15.2 + Channels 4.3.2 + React 19 + Vite

## Ports

| Service | Port |
|---------|------|
| Django Backend (ASGI) | 8000 |
| Vite Frontend | 5173 |
| WebSocket | ws://localhost:8000/ws/events/ |

## Database

- **Name:** `optistock_db`
- **Host:** localhost
- **User:** root
- **Password:** `jane2005`

### Setup

```bash
mysql -u root -p'jane2005' < optistock_complete.sql
```

## Running

### Backend
```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn config.asgi:application --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd OptiStock
npm install
npm run dev
```

## API Endpoints

### Inventory CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/products/` | List / Create products |
| GET/PUT/DELETE | `/api/products/{id}/` | Get / Update / Delete product |
| GET | `/api/products/dropdown/` | Lightweight product list (for POS) |
| GET | `/api/products/archived/` | Archived products |
| POST | `/api/products/deduct-stock/` | Deduct stock (called by POS) |
| GET/POST | `/api/categories/` | List / Create categories |
| GET/PUT/DELETE | `/api/categories/{id}/` | Get / Update / Delete category |
| GET/POST | `/api/suppliers/` | List / Create suppliers |
| GET/PUT/DELETE | `/api/suppliers/{id}/` | Get / Update / Delete supplier |
| GET/POST | `/api/stock-ledger/` | List / Create stock entries |
| GET/POST | `/api/notifications/` | List / Create notifications |
| PUT/DELETE | `/api/notifications/{id}/` | Update / Delete notification |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login/` | Session-based login (email + password) |
| GET | `/api/me/` | Get current user |
| POST | `/api/logout/` | Logout |

### Dashboard (consumed by Module 3)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/best-sellers/` | Top-selling products |
| GET | `/api/dashboard/inventory-report/` | Full inventory report |
| GET | `/api/dashboard/low-stock-alerts/` | Low stock products |
| GET | `/api/dashboard/category-breakdown/` | Sales by category |
| GET | `/api/dashboard/daily-sales-chart/` | Daily sales chart data |

## Seed Users

| Email | Password | Role |
|-------|----------|------|
| admin@optistock.com | optistock2026 | System Admin |

## Cross-Module Integration

### What we expose to other modules:
- All Dashboard endpoints above
- Product CRUD for stock validation
- Stock deduction endpoint

### What we consume:
- (This module is the data source; does not consume external APIs)

## Files

| File | Purpose |
|------|---------|
| `backend/` | Django project (config, inventory app) |
| `src/` | React frontend (pages, components, services) |
| `optistock_complete.sql` | Full schema + seed data |
