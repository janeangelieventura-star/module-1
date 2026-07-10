from django.apps import AppConfig
from django.db import connection


class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inventory'
    verbose_name = 'Inventory Management'

    def ready(self):
        import inventory.signals
        self._ensure_pos_sales_table()

    def _ensure_pos_sales_table(self):
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS pos_sales (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        order_id VARCHAR(50) NOT NULL,
                        customer_name VARCHAR(200),
                        cashier_name VARCHAR(100),
                        item_count INT DEFAULT 0,
                        total_amount DECIMAL(12, 2) NOT NULL,
                        payment_method VARCHAR(50),
                        sold_at DATETIME NOT NULL,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_pos_sales_sold_at (sold_at),
                        INDEX idx_pos_sales_id (id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """)
        except Exception as e:
            print(f'[Startup] pos_sales table check skipped: {e}')
