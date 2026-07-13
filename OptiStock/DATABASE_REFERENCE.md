# DATABASE REFERENCE — OptiStock Inventory System

**Database:** `optistock_db`  
**Charset:** `utf8mb4`  
**Engine:** InnoDB  
**API Base URL:** `http://localhost:8000/api/`

---

## 1. INVENTORY MODULE

> **Responsibility:** Products, Categories, Suppliers, Stock Management, Users, Notifications

### `products` — Main product catalog
| Column | Type | Notes |
|--------|------|-------|
| `id` | VARCHAR(20) PK | Auto-generated (`P001`, `P002`...) |
| `sku` | VARCHAR(50) UNIQUE | Barcode / SKU |
| `name` | VARCHAR(200) | Product name |
| `category_id` | VARCHAR(20) FK → `categories.id` | |
| `supplier_id` | VARCHAR(20) FK → `suppliers.id` | |
| `cost_price` | DECIMAL(12,2) | Purchase cost |
| `selling_price` | DECIMAL(12,2) | Retail price |
| `stock` | INT | Current quantity |
| `reorder_level` | INT | Low stock threshold |
| `status` | ENUM('active','archived') | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### `categories`
| Column | Type | Notes |
|--------|------|-------|
| `id` | VARCHAR(20) PK | `C001`, `C002`... |
| `name` | VARCHAR(100) UNIQUE | |
| `description` | TEXT | |
| `product_count` | INT | Auto-updated |
| `created_at` / `updated_at` | TIMESTAMP | |

### `suppliers`
| Column | Type | Notes |
|--------|------|-------|
| `id` | VARCHAR(20) PK | `S001`, `S002`... |
| `company_name` | VARCHAR(150) UNIQUE | |
| `contact_person`, `email`, `phone`, `address` | Various | |
| `products_supplied` | INT | Auto-updated |
| `created_at` / `updated_at` | TIMESTAMP | |

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | VARCHAR(20) PK | `EMP-001`, `POS-T01`... |
| `name` | VARCHAR(100) | |
| `email` | VARCHAR(150) UNIQUE | Login credential |
| `password_hash` | VARCHAR(255) | bcrypt |
| `role` | ENUM('System Admin','Store Manager','POS Cashier','Inventory Clerk') | |
| `status` | ENUM('Active','Locked','Pending') | |

### `stock_ledger` — Every stock movement
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | Auto |
| `tx_id` | VARCHAR(30) UNIQUE | `TXN-20260625...` |
| `product_id` | VARCHAR(20) FK → `products.id` | |
| `type` | ENUM('Stock In','Stock Out','Adjustment') | |
| `qty` | INT | |
| `balance_after` | INT | Running balance |
| `user_id` | VARCHAR(20) FK → `users.id` | Who did it |
| `reference_type` | VARCHAR(20) | e.g. 'POS', 'PO', 'Manual' |
| `reference_id` | VARCHAR(50) | e.g. receipt_no |
| `notes` | TEXT | |
| `created_at` | TIMESTAMP | |

### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | Auto |
| `user_id` | VARCHAR(20) FK → `users.id` | |
| `title`, `description` | VARCHAR(200), TEXT | |
| `type` | VARCHAR(20) | `stock_alert`, `sale`, `system`, etc. |
| `is_read` | TINYINT(1) | |
| `created_at` | TIMESTAMP | |

### `stock_adjustments`
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | Auto |
| `adjustment_number` | VARCHAR(30) UNIQUE | |
| `product_id` | VARCHAR(20) FK → `products.id` | |
| `adjustment_type` | ENUM('Increase','Decrease','Correction') | |
| `qty` | INT | |
| `reason` | VARCHAR(255) | |
| `adjusted_by` | VARCHAR(20) FK → `users.id` | |
| `status` | ENUM('Pending','Approved','Rejected') | |

### API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/products/` | List active products |
| POST | `/api/products/` | Create product |
| PUT | `/api/products/{id}/` | Update product |
| DELETE | `/api/products/{id}/` | Archive product |
| GET | `/api/products/dropdown/` | Lightweight list (id, sku, name, stock) |
| GET | `/api/products/archived/` | List archived products |
| PATCH | `/api/products/{id}/unarchive/` | Restore product |
| DELETE | `/api/products/{id}/permanent_delete/` | Hard delete |
| GET/POST | `/api/categories/` | List / Create categories |
| GET/POST | `/api/suppliers/` | List / Create suppliers |
| GET | `/api/users/` | List all users |
| GET/POST | `/api/stock-ledger/` | List / Create ledger entry |
| GET/PUT/DELETE | `/api/notifications/` | Notifications CRUD |
| POST | `/api/login/` | Authenticate user |

---

## 2. POS MODULE

> **Responsibility:** Sales transactions, order items, payment processing

### `sales_orders` — Every sale transaction
| Column | Type | Notes |
|--------|------|-------|
| `receipt_no` | VARCHAR(30) PK | Receipt number |
| `cashier_id` | VARCHAR(20) FK → `users.id` | Who processed |
| `total` | DECIMAL(12,2) | Total amount |
| `paid` | DECIMAL(12,2) | Amount paid |
| `change_given` | DECIMAL(12,2) | Change |
| `payment_method` | ENUM('Cash','GCash','Card') | |
| `status` | ENUM('Completed','Refunded','Cancelled') | |
| `items_count` | INT | Number of items |
| `created_at` | TIMESTAMP | |

### `order_items` — Items in each sale
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | Auto |
| `receipt_no` | VARCHAR(30) FK → `sales_orders.receipt_no` ON DELETE CASCADE | |
| `product_id` | VARCHAR(20) FK → `products.id` | |
| `qty` | INT | Quantity sold |
| `price` | DECIMAL(12,2) | Snapshot of selling price |
| `subtotal` | DECIMAL(12,2) | GENERATED: `qty * price` |

### `product_sales_summary` — Daily per-product sales (auto materialized)
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | Auto |
| `product_id` | VARCHAR(20) FK → `products.id` | |
| `sale_date` | DATE | |
| `quantity_sold` | INT | |
| `revenue` | DECIMAL(14,2) | |

### `daily_sales_summary` — Daily aggregated sales
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | Auto |
| `sale_date` | DATE UNIQUE | |
| `total_revenue` | DECIMAL(14,2) | |
| `total_transactions` | INT | |
| `total_items_sold` | INT | |

### Data Flow: POS → Inventory
```
POST /api/stock-ledger/
  product_id: products.id
  type: 'Stock Out'
  qty: (quantity sold)
  reference_type: 'POS'
  reference_id: receipt_no
```
→ Para ma-record ang stock deduction at ma-link pabalik sa POS transaction.

### Key API Endpoints POS will use
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/products/` | Get product list with prices |
| GET | `/api/products/dropdown/` | Quick product search |
| GET | `/api/users/` | Get cashier list |
| POST | `/api/stock-ledger/` | Record stock out on sale |
| POST | `/api/notifications/` | Create notification if needed |

---

## 3. DASHBOARD MODULE

> **Responsibility:** Analytics, reports, visualizations

### Views (Read-Only)

#### `v_best_sellers` — Top products this month
| Column | Type | Description |
|--------|------|-------------|
| `rank` | BIGINT | Rank order |
| `id` | VARCHAR(20) | Product ID |
| `name` | VARCHAR(200) | Product name |
| `category` | VARCHAR(100) | Category name |
| `sold` | DECIMAL(32) | Quantity sold |
| `revenue` | DECIMAL(34,2) | Total revenue |

#### `v_category_breakdown` — Sales % per category
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(20) | Category ID |
| `name` | VARCHAR(100) | Category name |
| `value` | DECIMAL(39,1) | Percentage of total |
| `color` | VARCHAR(7) | HEX color code |

#### `v_daily_sales_chart` — Last 12 days
| Column | Type | Description |
|--------|------|-------------|
| `date` | DATE | Sale date |
| `sales` | DECIMAL(14,2) | Revenue |
| `txn` | INT | Transaction count |

#### `v_inventory_report` — Full inventory status
| Column | Type | Description |
|--------|------|-------------|
| `id`, `sku`, `name`, `category` | Various | Product details |
| `stock` | INT | Current stock |
| `value` | DECIMAL(22,2) | `stock × cost_price` |
| `status` | VARCHAR(9) | 'Critical', 'Low Stock', or 'In Stock' |

#### `v_low_stock_alerts` — Items needing restock
| Column | Type | Description |
|--------|------|-------------|
| `id`, `sku`, `name`, `category` | Various | Product details |
| `stock` | INT | Current stock |
| `reorder` | INT | Reorder level |
| `status` | VARCHAR(12) | 'out_of_stock', 'critical', or 'low' |

> **Note:** `v_inventory_report` shows **all** active products with stock status; `v_low_stock_alerts` shows **only** products below/at reorder level.

### Key API Endpoints for Dashboard
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/dashboard/best-sellers/` | Top selling products |
| GET | `/api/dashboard/category-breakdown/` | Sales by category |
| GET | `/api/dashboard/daily-sales-chart/` | Daily trend |
| GET | `/api/dashboard/inventory-report/` | Full inventory status |
| GET | `/api/dashboard/low-stock-alerts/` | Low stock items |
| GET | `/api/products/` | Product list for metrics |

---

## Entity Relationship Summary

```
categories ──┐
              │
suppliers ───┤
              │
             products ←── stock_ledger
              │           stock_adjustments
              │
              ├── order_items ←── sales_orders ←── users
              │
              └── product_sales_summary
                      │
                daily_sales_summary
```

### Foreign Key Cross-Reference

| Table | FK Column | References |
|-------|-----------|------------|
| `products` | `category_id` | `categories.id` |
| `products` | `supplier_id` | `suppliers.id` |
| `stock_ledger` | `product_id` | `products.id` |
| `stock_ledger` | `user_id` | `users.id` |
| `stock_adjustments` | `product_id` | `products.id` |
| `stock_adjustments` | `adjusted_by` | `users.id` |
| `order_items` | `product_id` | `products.id` |
| `order_items` | `receipt_no` | `sales_orders.receipt_no` ON DELETE CASCADE |
| `sales_orders` | `cashier_id` | `users.id` |
| `product_sales_summary` | `product_id` | `products.id` |
| `notifications` | `user_id` | `users.id` |
| `purchase_orders` | `supplier_id` | `suppliers.id` |
| `purchase_orders` | `created_by` | `users.id` |
| `purchase_order_items` | `po_id` | `purchase_orders.id` ON DELETE CASCADE |
| `purchase_order_items` | `product_id` | `products.id` |

---

## CORS Configuration

```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',  # React Vite (Inventory)
    'http://localhost:3000',  # (add POS port here)
    'http://localhost:XXXX',  # (add Dashboard port here)
]
```
