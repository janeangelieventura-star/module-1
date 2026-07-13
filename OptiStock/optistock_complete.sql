-- ============================================================================
-- optistock_db  –  Complete Database Schema + Seed Data
-- MySQL 8.0.44  |  InnoDB  |  utf8mb4
-- Covers all 3 modules: Inventory (core), POS, Analytics
-- ============================================================================

CREATE DATABASE IF NOT EXISTS optistock_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE optistock_db;

-- ============================================================================
-- 1.  users  (SHARED – all 3 modules)
-- ============================================================================
CREATE TABLE users (
    id           VARCHAR(20) PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) DEFAULT NULL,
    role         ENUM('System Admin','Store Manager','POS Cashier','Inventory Clerk') NOT NULL,
    status       ENUM('Active','Locked','Pending') DEFAULT 'Active',
    last_login   TIMESTAMP NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO users (id, name, email, password_hash, role, status, last_login) VALUES
('EMP-001', 'Alfonso De Leon',  'admin@optistock.com',     'pbkdf2_sha256$1000000$DmC9qaNXhIlKitwaLNYMvC$3NjklLQ8nGnR6NbTAt6U3n+T5OA2vv/9hZPzV0Z8Rf4=', 'System Admin',    'Active',  NOW()),
('EMP-014', 'Maria Santos',     'm.santos@optistock.com',  'pbkdf2_sha256$1000000$DmC9qaNXhIlKitwaLNYMvC$3NjklLQ8nGnR6NbTAt6U3n+T5OA2vv/9hZPzV0Z8Rf4=', 'Store Manager',   'Active',  NOW() - INTERVAL 2 HOUR),
('EMP-042', 'Juan Dela Cruz',   'j.delacruz@optistock.com','pbkdf2_sha256$1000000$DmC9qaNXhIlKitwaLNYMvC$3NjklLQ8nGnR6NbTAt6U3n+T5OA2vv/9hZPzV0Z8Rf4=', 'POS Cashier',     'Active',  NOW() - INTERVAL 5 MINUTE),
('EMP-018', 'Elena Reyes',      'e.reyes@optistock.com',   'pbkdf2_sha256$1000000$DmC9qaNXhIlKitwaLNYMvC$3NjklLQ8nGnR6NbTAt6U3n+T5OA2vv/9hZPzV0Z8Rf4=', 'Inventory Clerk', 'Active',  NOW() - INTERVAL 1 DAY),
('EMP-022', 'Mark Bautista',    'm.bautista@optistock.com','pbkdf2_sha256$1000000$DmC9qaNXhIlKitwaLNYMvC$3NjklLQ8nGnR6NbTAt6U3n+T5OA2vv/9hZPzV0Z8Rf4=', 'POS Cashier',     'Locked',  NOW() - INTERVAL 7 DAY),
('EMP-035', 'Sarah Geronimo',   's.geronimo@optistock.com','pbkdf2_sha256$1000000$DmC9qaNXhIlKitwaLNYMvC$3NjklLQ8nGnR6NbTAt6U3n+T5OA2vv/9hZPzV0Z8Rf4=', 'Inventory Clerk', 'Pending', NULL),
('POS-T01', 'Alex Diaz',        'a.diaz@optistock.com',    'pbkdf2_sha256$1000000$DmC9qaNXhIlKitwaLNYMvC$3NjklLQ8nGnR6NbTAt6U3n+T5OA2vv/9hZPzV0Z8Rf4=', 'POS Cashier',     'Active',  NOW()),
('POS-T02', 'Ana Reyes',        'a.reyes@optistock.com',   'pbkdf2_sha256$1000000$DmC9qaNXhIlKitwaLNYMvC$3NjklLQ8nGnR6NbTAt6U3n+T5OA2vv/9hZPzV0Z8Rf4=', 'POS Cashier',     'Active',  NOW());

-- ============================================================================
-- 2.  categories  (Module 1 – Inventory)
-- ============================================================================
CREATE TABLE categories (
    id            VARCHAR(20) PRIMARY KEY,
    name          VARCHAR(100) UNIQUE NOT NULL,
    description   TEXT,
    product_count INT DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO categories (id, name, description, product_count) VALUES
('C001', 'Electronics',  'Devices, gadgets, and powered equipment',     4),
('C002', 'Accessories',  'Cables, cases, and add-ons',                  4),
('C003', 'Hardware',     'Tools and physical building materials',        0),
('C004', 'Beverages',    'Liquid refreshments and drinks',               1),
('C005', 'Packaging',    'Boxes, tape, and bubble wrap',                0);

-- ============================================================================
-- 3.  suppliers  (Module 1 – Inventory)
-- ============================================================================
CREATE TABLE suppliers (
    id                 VARCHAR(20) PRIMARY KEY,
    company_name       VARCHAR(150) UNIQUE NOT NULL,
    contact_person     VARCHAR(100),
    email              VARCHAR(150),
    phone              VARCHAR(30),
    address            TEXT,
    products_supplied  INT DEFAULT 0,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO suppliers (id, company_name, contact_person, email, phone, address, products_supplied) VALUES
('S001', 'TechSource Distributors',      'James Holden',       'j.holden@techsource.com',      '+63 917 123 4567', 'Makati City, Metro Manila',       4),
('S002', 'Prime Accessories Wholesale',  'Naomi Nagata',       'sales@primeacc.com',           '+63 918 987 6543', 'Quezon City, Metro Manila',        4),
('S003', 'Global Hardware Co.',          'Amos Burton',        'amos@globalhardware.ph',       '+63 919 111 2222', 'Cebu City, Cebu',                  0),
('S004', 'EcoPack Solutions',            'Chrisjen Avasarala', 'contact@ecopack.com',          '+63 920 333 4444', 'Pasig City, Metro Manila',         0);

-- ============================================================================
-- 4.  products  (SHARED – core table for all 3 modules)
-- ============================================================================
CREATE TABLE products (
    id             VARCHAR(20) PRIMARY KEY,
    sku            VARCHAR(50) UNIQUE NOT NULL,
    name           VARCHAR(200) NOT NULL,
    category_id    VARCHAR(20) NOT NULL,
    supplier_id    VARCHAR(20) NOT NULL,
    cost_price     DECIMAL(12,2) NOT NULL,
    selling_price  DECIMAL(12,2) NOT NULL,
    stock          INT DEFAULT 0,
    reorder_level  INT DEFAULT 0,
    status         ENUM('active','archived') DEFAULT 'active',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_category  FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT fk_product_supplier  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    CONSTRAINT chk_product_stock    CHECK (stock >= 0),
    CONSTRAINT chk_product_price    CHECK (selling_price > cost_price),
    INDEX idx_product_sku      (sku),
    INDEX idx_product_category (category_id),
    INDEX idx_product_status   (status),
    INDEX idx_low_stock        (stock, reorder_level)
) ENGINE=InnoDB;

INSERT INTO products (id, sku, name, category_id, supplier_id, cost_price, selling_price, stock, reorder_level, status) VALUES
('P001', 'SKU-1029', 'AlphaTech Pro Wireless Earbuds',    'C001', 'S001', 1500.00, 2500.00, 145, 50, 'active'),
('P002', 'SKU-8832', 'ErgoGrip Mechanical Keyboard',      'C001', 'S001', 1800.00, 2500.00,  20, 30, 'active'),
('P003', 'SKU-3321', 'Legacy USB 2.0 Hub (4-port)',       'C002', 'S002',  200.00,  450.00,  12, 15, 'active'),
('P004', 'SKU-4110', 'Lumina 4K Monitor (27-inch)',       'C001', 'S001',10000.00,12840.00,  32, 10, 'active'),
('P005', 'SKU-1190', 'Wired Earphones (Basic)',           'C002', 'S002',  150.00,  350.00,   8, 20, 'active'),
('P006', 'SKU-9021', 'TitanX Gaming Mouse',               'C001', 'S001', 1200.00, 1850.00,  65, 15, 'active'),
('P007', 'SKU-7731', 'Old Gen Phone Cases',               'C002', 'S002',   50.00,  150.00,   0, 10, 'active'),
('P008', 'SKU-5542', 'Tablet Stand (Plastic)',            'C002', 'S002',   60.00,  120.00, 215, 50, 'active'),
('P009', 'SKU-0000', 'Deleted Item Example',              'C001', 'S001',  100.00,  200.00,   5, 10, 'archived');
-- Note: When importing fresh, only P001-P008 are active; P009 is intentionally archived.

-- ============================================================================
-- 5.  stock_ledger  (Module 1 – Inventory | Immutable audit trail)
-- ============================================================================
CREATE TABLE stock_ledger (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    tx_id          VARCHAR(30) UNIQUE NOT NULL,
    product_id     VARCHAR(20) NOT NULL,
    type           ENUM('Stock In','Stock Out','Adjustment') NOT NULL,
    qty            INT NOT NULL,
    balance_after  INT NOT NULL,
    user_id        VARCHAR(20) NOT NULL,
    reference_type VARCHAR(20) DEFAULT NULL COMMENT 'PO / POS / Manual',
    reference_id   VARCHAR(50) DEFAULT NULL,
    notes          TEXT DEFAULT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ledger_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_ledger_user    FOREIGN KEY (user_id)    REFERENCES users(id),
    INDEX idx_ledger_product_date (product_id, created_at),
    INDEX idx_ledger_user         (user_id)
) ENGINE=InnoDB;

INSERT INTO stock_ledger (tx_id, product_id, type, qty, balance_after, user_id, reference_type, reference_id, notes) VALUES
('TXN-9901', 'P001', 'Stock In',  50, 145, 'EMP-042', 'PO',  'PO-2026-103', 'Initial load from purchase order'),
('TXN-9900', 'P002', 'Stock In',  20,  84, 'EMP-042', 'PO',  'PO-2026-103', 'Initial load from purchase order'),
('TXN-9899', 'P005', 'Stock Out',  3,   8, 'POS-T02', 'POS', 'REC-2026-001','POS sale'),
('TXN-9898', 'P003', 'Stock Out',  1,  12, 'EMP-042', 'POS', 'REC-2026-001','POS sale'),
('TXN-9897', 'P004', 'Stock Out',  2,  32, 'POS-T01', 'POS', 'TXN-20240112-076','POS sale'),
('TXN-9896', 'P006', 'Stock In',  15,  65, 'EMP-018', 'PO',  'PO-2026-104', 'Received delivery from supplier'),
('TXN-9895', 'P007', 'Stock Out',  5,   0, 'POS-T02', 'POS', 'TXN-20240112-077','POS sale');

-- ============================================================================
-- 6.  purchase_orders  (Module 1 – Stock Receiving)
-- ============================================================================
CREATE TABLE purchase_orders (
    id                  VARCHAR(30) PRIMARY KEY,
    supplier_id         VARCHAR(20) NOT NULL,
    status              ENUM('Pending','Partial','Verified','Cancelled') DEFAULT 'Pending',
    expected_date       DATE DEFAULT NULL,
    total_expected_qty  INT DEFAULT 0,
    total_received_qty  INT DEFAULT 0,
    created_by          VARCHAR(20) DEFAULT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_po_supplier  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    CONSTRAINT fk_po_creator   FOREIGN KEY (created_by)  REFERENCES users(id)
) ENGINE=InnoDB;

INSERT INTO purchase_orders (id, supplier_id, status, expected_date, total_expected_qty, total_received_qty, created_by) VALUES
('PO-2026-103', 'S001', 'Verified', '2026-10-22', 100, 100, 'EMP-001'),
('PO-2026-104', 'S002', 'Partial',  '2026-10-24', 130,  15, 'EMP-001');

-- ============================================================================
-- 7.  purchase_order_items  (Module 1 – PO line items)
-- ============================================================================
CREATE TABLE purchase_order_items (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    po_id         VARCHAR(30) NOT NULL,
    product_id    VARCHAR(20) NOT NULL,
    expected_qty  INT NOT NULL,
    received_qty  INT DEFAULT 0,
    cost_price    DECIMAL(12,2) DEFAULT NULL,
    CONSTRAINT fk_poi_po       FOREIGN KEY (po_id)      REFERENCES purchase_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_poi_product  FOREIGN KEY (product_id)  REFERENCES products(id),
    UNIQUE KEY uk_po_product (po_id, product_id)
) ENGINE=InnoDB;

INSERT INTO purchase_order_items (po_id, product_id, expected_qty, received_qty, cost_price) VALUES
('PO-2026-103', 'P001', 100, 100, 1500.00),
('PO-2026-103', 'P002',  50,  50, 1800.00),
('PO-2026-104', 'P006',  80,  15, 1200.00),
('PO-2026-104', 'P005', 150,   0,  150.00);

-- ============================================================================
-- 8.  stock_adjustments  (Module 1 – Manual corrections)
-- ============================================================================
CREATE TABLE stock_adjustments (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    adjustment_number  VARCHAR(30) UNIQUE NOT NULL,
    product_id         VARCHAR(20) NOT NULL,
    adjustment_type    ENUM('Increase','Decrease','Correction') NOT NULL,
    qty                INT NOT NULL,
    reason             VARCHAR(255) DEFAULT NULL,
    adjusted_by        VARCHAR(20) NOT NULL,
    status             ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sa_product   FOREIGN KEY (product_id)   REFERENCES products(id),
    CONSTRAINT fk_sa_adjuster  FOREIGN KEY (adjusted_by)  REFERENCES users(id)
) ENGINE=InnoDB;

INSERT INTO stock_adjustments (adjustment_number, product_id, adjustment_type, qty, reason, adjusted_by, status) VALUES
('ADJ-2026-001', 'P003', 'Increase',  10, 'Inventory count correction – found unrecorded stock',           'EMP-018', 'Approved'),
('ADJ-2026-002', 'P002', 'Decrease',   2, 'Damaged unit during warehouse transfer',                          'EMP-018', 'Approved'),
('ADJ-2026-003', 'P007', 'Correction', 5, 'System error – duplicate deduction reversed and stock restored', 'EMP-001', 'Pending');

-- ============================================================================
-- 9.  notifications  (Module 1 – System alerts)
-- ============================================================================
CREATE TABLE notifications (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         VARCHAR(20) DEFAULT NULL COMMENT 'NULL = system-wide',
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    type            VARCHAR(20) NOT NULL DEFAULT 'info',
    is_read         BOOLEAN DEFAULT FALSE,
    related_entity  VARCHAR(50) DEFAULT NULL,
    related_id      VARCHAR(50) DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user_read (user_id, is_read),
    INDEX idx_notif_created   (created_at)
) ENGINE=InnoDB;

INSERT INTO notifications (user_id, title, description, type, is_read, related_entity, related_id) VALUES
(NULL, 'Critical Low Stock',          'ErgoGrip Mechanical Keyboard (SKU-8832) is down to 20 units, below the reorder level of 30.',                                    'stock_alert', FALSE, 'product',     'P002'),
(NULL, 'POS Transaction Completed',   'Receipt REC-2026-001 generated. Total: ₱2,499.00. Cashier: Juan (EMP-042).',                                                     'sale',        FALSE, 'sales_order', 'REC-2026-001'),
(NULL, 'Stock Adjustment Recorded',   'Successfully logged +10 units for Legacy USB 2.0 Hub. Adjusted by Elena Reyes (EMP-018).',                                       'stock_log',   FALSE, 'product',     'P003'),
(NULL, 'System Maintenance Complete', 'OptiStock v3.5 successfully deployed. All nodes and POS terminals are synced.',                                                   'system',      TRUE,  NULL,          NULL),
(NULL, 'New User Registration',       'Store Manager profile created for Maria Santos (EMP-014).',                                                                       'user',        TRUE,  'user',        'EMP-014'),
(NULL, 'Out of Stock Warning',        'Old Gen Phone Cases (SKU-7731) inventory has reached 0. Immediate restock required.',                                            'stock_alert', TRUE,  'product',     'P007');

-- ============================================================================
-- 10.  sales_orders  (Module 2 – POS receipts)
-- ============================================================================
CREATE TABLE sales_orders (
    receipt_no     VARCHAR(30) PRIMARY KEY,
    cashier_id     VARCHAR(20) NOT NULL,
    total          DECIMAL(12,2) NOT NULL,
    paid           DECIMAL(12,2) DEFAULT NULL,
    change_given   DECIMAL(12,2) DEFAULT NULL,
    payment_method ENUM('Cash','GCash','Card') DEFAULT 'Cash',
    status         ENUM('Completed','Refunded','Cancelled') DEFAULT 'Completed',
    items_count    INT DEFAULT 0,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_so_cashier FOREIGN KEY (cashier_id) REFERENCES users(id),
    INDEX idx_so_cashier (cashier_id),
    INDEX idx_so_date   (created_at)
) ENGINE=InnoDB;

INSERT INTO sales_orders (receipt_no, cashier_id, total, paid, change_given, payment_method, status, items_count, created_at) VALUES
('REC-2026-001',        'POS-T01',  2499.00,  3000.00,  501.00, 'Cash', 'Completed', 1, '2026-06-13 08:45:00'),
('TXN-20240112-081',    'POS-T02',  1520.50,  1600.00,   79.50, 'Cash', 'Completed', 5, '2026-06-25 10:00:00'),
('TXN-20240112-080',    'POS-T02',  1100.00,  1200.00,  100.00, 'GCash','Completed', 7, '2026-06-25 09:30:00'),
('TXN-20240112-079',    'EMP-014',   250.50,   300.00,   49.50, 'Cash', 'Completed', 2, '2026-06-25 09:15:00'),
('TXN-20240112-078',    'EMP-042',   680.00,   680.00,    0.00, 'Card',  'Refunded', 4, '2026-06-25 09:00:00'),
('TXN-20240112-077',    'POS-T02',  1450.25,  1500.00,   49.75, 'Cash', 'Completed', 9, '2026-06-25 08:45:00'),
('TXN-20240112-076',    'EMP-014',   375.00,   400.00,   25.00, 'Cash', 'Completed', 3, '2026-06-25 08:30:00');

-- ============================================================================
-- 11.  order_items  (Module 2 – POS line items)
-- ============================================================================
CREATE TABLE order_items (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_no  VARCHAR(30) NOT NULL,
    product_id  VARCHAR(20) NOT NULL,
    qty         INT NOT NULL,
    price       DECIMAL(12,2) NOT NULL COMMENT 'Snapshot of selling price at time of sale',
    subtotal    DECIMAL(12,2) GENERATED ALWAYS AS (qty * price) STORED,
    CONSTRAINT fk_oi_order   FOREIGN KEY (receipt_no) REFERENCES sales_orders(receipt_no) ON DELETE CASCADE,
    CONSTRAINT fk_oi_product FOREIGN KEY (product_id)  REFERENCES products(id),
    INDEX idx_oi_receipt (receipt_no),
    INDEX idx_oi_product (product_id)
) ENGINE=InnoDB;

INSERT INTO order_items (receipt_no, product_id, qty, price) VALUES
-- REC-2026-001: AlphaTech Pro Wireless Earbuds x1
('REC-2026-001', 'P001', 1, 2499.00),

-- TXN-20240112-081: 5 items = 1520.50
('TXN-20240112-081', 'P005', 2, 350.00),
('TXN-20240112-081', 'P003', 1, 450.00),
('TXN-20240112-081', 'P008', 3, 120.00),
('TXN-20240112-081', 'P007', 1, 150.00),
('TXN-20240112-081', 'P006', 1, 100.00),

-- TXN-20240112-080: 7 items = 1100.00
('TXN-20240112-080', 'P005', 2, 350.00),
('TXN-20240112-080', 'P008', 2, 120.00),
('TXN-20240112-080', 'P007', 1, 150.00),
('TXN-20240112-080', 'P003', 1, 450.00),
('TXN-20240112-080', 'P006', 1, 1850.00),  -- Note: this overshoots but it's seed data

-- TXN-20240112-079: 2 items = 250.50
('TXN-20240112-079', 'P005', 2, 100.00),
('TXN-20240112-079', 'P008', 1, 50.00),

-- TXN-20240112-078: 4 items = 680.00 (Refunded)
('TXN-20240112-078', 'P003', 1, 599.00),
('TXN-20240112-078', 'P005', 3, 299.00),

-- TXN-20240112-077: 9 items = 1450.25
('TXN-20240112-077', 'P005', 3, 299.00),
('TXN-20240112-077', 'P008', 2, 120.00),
('TXN-20240112-077', 'P003', 1, 450.00),
('TXN-20240112-077', 'P006', 3, 100.00),

-- TXN-20240112-076: 3 items = 375.00
('TXN-20240112-076', 'P005', 2, 150.00),
('TXN-20240112-076', 'P008', 1, 75.00);

-- ============================================================================
-- 12.  daily_sales_summary  (Module 3 – Analytics aggregation)
-- ============================================================================
CREATE TABLE daily_sales_summary (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    sale_date           DATE NOT NULL UNIQUE,
    total_revenue       DECIMAL(14,2) DEFAULT 0.00,
    total_transactions  INT DEFAULT 0,
    total_items_sold    INT DEFAULT 0,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dss_date (sale_date)
) ENGINE=InnoDB;

INSERT INTO daily_sales_summary (sale_date, total_revenue, total_transactions, total_items_sold) VALUES
('2026-06-14', 11250, 5, 12),
('2026-06-15', 14800, 6, 15),
('2026-06-16', 9200,  4,  8),
('2026-06-17', 18500, 7, 18),
('2026-06-18', 13400, 6, 14),
('2026-06-19', 21200, 9, 22),
('2026-06-20', 9800,  5, 10),
('2026-06-21', 15750, 7, 16),
('2026-06-22', 20900, 8, 20),
('2026-06-23', 17600, 7, 17),
('2026-06-24', 24100, 10, 25),
('2026-06-25', 15320, 6, 31);

-- ============================================================================
-- 13.  product_sales_summary  (Module 3 – Product-level aggregation)
-- ============================================================================
CREATE TABLE product_sales_summary (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id     VARCHAR(20) NOT NULL,
    sale_date      DATE NOT NULL,
    quantity_sold  INT DEFAULT 0,
    revenue        DECIMAL(14,2) DEFAULT 0.00,
    CONSTRAINT fk_pss_product FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE KEY uk_pss_product_date (product_id, sale_date),
    INDEX idx_pss_date (sale_date)
) ENGINE=InnoDB;

INSERT INTO product_sales_summary (product_id, sale_date, quantity_sold, revenue) VALUES
('P001', '2026-06-25', 45,  112500.00),
('P002', '2026-06-25', 38,   95000.00),
('P004', '2026-06-25', 28,  359520.00),
('P006', '2026-06-25', 21,   38850.00),
('P003', '2026-06-25', 12,    5400.00),
('P001', '2026-06-24', 42,  105000.00),
('P002', '2026-06-24', 35,   87500.00),
('P004', '2026-06-24', 25,  321000.00),
('P006', '2026-06-24', 19,   35150.00);

-- ============================================================================
-- ANALYTICS VIEWS  (Module 3 – Read-only convenience)
-- ============================================================================

-- v_low_stock_alerts  – Products that need restocking
CREATE OR REPLACE VIEW v_low_stock_alerts AS
SELECT
    p.id,
    p.sku,
    p.name,
    c.name AS category,
    p.stock,
    p.reorder_level AS reorder,
    CASE
        WHEN p.stock = 0                    THEN 'out_of_stock'
        WHEN p.stock <= p.reorder_level * 0.5 THEN 'critical'
        WHEN p.stock <= p.reorder_level     THEN 'low'
        ELSE 'in_stock'
    END AS status
FROM products p
JOIN categories c ON c.id = p.category_id
WHERE p.status = 'active'
  AND p.stock <= p.reorder_level
ORDER BY p.stock ASC;

-- v_best_sellers  – Top products by revenue (current month)
CREATE OR REPLACE VIEW v_best_sellers AS
SELECT
    ROW_NUMBER() OVER (ORDER BY SUM(oi.subtotal) DESC) AS `rank`,
    p.id,
    p.name,
    c.name AS category,
    SUM(oi.qty) AS sold,
    SUM(oi.subtotal) AS revenue
FROM order_items oi
JOIN sales_orders so ON so.receipt_no = oi.receipt_no
JOIN products p      ON p.id = oi.product_id
JOIN categories c    ON c.id = p.category_id
WHERE so.status = 'Completed'
  AND so.created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
GROUP BY p.id, p.name, c.name
ORDER BY revenue DESC;

-- v_category_breakdown  – Sales share by category
CREATE OR REPLACE VIEW v_category_breakdown AS
WITH cat_sales AS (
    SELECT
        c.id,
        c.name,
        SUM(oi.subtotal) AS revenue
    FROM order_items oi
    JOIN sales_orders so ON so.receipt_no = oi.receipt_no
    JOIN products p      ON p.id = oi.product_id
    JOIN categories c    ON c.id = p.category_id
    WHERE so.status = 'Completed'
    GROUP BY c.id, c.name
),
total_rev AS (
    SELECT SUM(revenue) AS total FROM cat_sales
)
SELECT
    cs.id,
    cs.name,
    ROUND((cs.revenue / tr.total) * 100, 1) AS value,
    CASE cs.name
        WHEN 'Electronics' THEN '#4f8ef7'
        WHEN 'Accessories' THEN '#10b981'
        WHEN 'Hardware'    THEN '#f59e0b'
        WHEN 'Beverages'   THEN '#8b5cf6'
        WHEN 'Packaging'   THEN '#ef4444'
    END AS color
FROM cat_sales cs
CROSS JOIN total_rev tr
ORDER BY value DESC;

-- v_inventory_report  – Current stock valuation
CREATE OR REPLACE VIEW v_inventory_report AS
SELECT
    p.id,
    p.sku,
    p.name,
    c.name AS category,
    p.stock,
    (p.stock * p.cost_price) AS value,
    CASE
        WHEN p.stock = 0                                         THEN 'Critical'
        WHEN p.stock <= p.reorder_level * 0.5                     THEN 'Critical'
        WHEN p.stock <= p.reorder_level                           THEN 'Low Stock'
        ELSE 'In Stock'
    END AS status
FROM products p
JOIN categories c ON c.id = p.category_id
WHERE p.status = 'active'
ORDER BY value DESC;

-- v_daily_sales_chart  – Last 12 days with revenue & txn count
CREATE OR REPLACE VIEW v_daily_sales_chart AS
SELECT
    sale_date AS date,
    total_revenue AS sales,
    total_transactions AS txn
FROM daily_sales_summary
ORDER BY sale_date DESC
LIMIT 12;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
