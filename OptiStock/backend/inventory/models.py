from django.db import models


class DashboardViewModel(models.Model):
    class Meta:
        managed = False
        abstract = True


class VBestSeller(DashboardViewModel):
    rank = models.BigIntegerField()
    id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    sold = models.DecimalField(max_digits=32, decimal_places=0, blank=True, null=True)
    revenue = models.DecimalField(max_digits=34, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = 'v_best_sellers'
        managed = False


class VCategoryBreakdown(DashboardViewModel):
    id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=100)
    value = models.DecimalField(max_digits=39, decimal_places=1, blank=True, null=True)
    color = models.CharField(max_length=7, blank=True, null=True)

    class Meta:
        db_table = 'v_category_breakdown'
        managed = False
        verbose_name_plural = 'category breakdowns'


class VDailySalesChart(DashboardViewModel):
    date = models.DateField(primary_key=True)
    sales = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    txn = models.IntegerField(blank=True, null=True)

    class Meta:
        db_table = 'v_daily_sales_chart'
        managed = False
        verbose_name_plural = 'daily sales charts'


class VInventoryReport(DashboardViewModel):
    id = models.CharField(max_length=20, primary_key=True)
    sku = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    stock = models.IntegerField(blank=True, null=True)
    value = models.DecimalField(max_digits=22, decimal_places=2, blank=True, null=True)
    status = models.CharField(max_length=9)

    class Meta:
        db_table = 'v_inventory_report'
        managed = False


class VLowStockAlert(DashboardViewModel):
    id = models.CharField(max_length=20, primary_key=True)
    sku = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    stock = models.IntegerField(blank=True, null=True)
    reorder = models.IntegerField(blank=True, null=True)
    status = models.CharField(max_length=12)

    class Meta:
        db_table = 'v_low_stock_alerts'
        managed = False


class Category(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]
    id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    product_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'categories'
        managed = False
        verbose_name_plural = 'categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Supplier(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]
    id = models.CharField(max_length=20, primary_key=True)
    company_name = models.CharField(max_length=150, unique=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(max_length=150, blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    products_supplied = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'suppliers'
        managed = False
        ordering = ['company_name']

    def __str__(self):
        return self.company_name


class Product(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]

    id = models.CharField(max_length=20, primary_key=True)
    sku = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, db_column='category_id'
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True, db_column='supplier_id'
    )
    cost_price = models.DecimalField(max_digits=12, decimal_places=2)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    stock = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        managed = False
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.sku} - {self.name}'


class User(models.Model):
    ROLE_CHOICES = [
        ('System Admin', 'System Admin'),
        ('Store Manager', 'Store Manager'),
        ('POS Cashier', 'POS Cashier'),
        ('Inventory Clerk', 'Inventory Clerk'),
    ]
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Locked', 'Locked'),
        ('Pending', 'Pending'),
    ]

    id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=150, unique=True)
    password_hash = models.CharField(max_length=255, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        managed = False
        ordering = ['name']

    def __str__(self):
        return f'{self.id} - {self.name}'


class StockLedger(models.Model):
    TYPE_CHOICES = [
        ('Stock In', 'Stock In'),
        ('Stock Out', 'Stock Out'),
        ('Adjustment', 'Adjustment'),
    ]

    id = models.BigAutoField(primary_key=True)
    tx_id = models.CharField(max_length=30, unique=True)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, db_column='product_id'
    )
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, db_column='type')
    qty = models.IntegerField()
    balance_after = models.IntegerField()
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, db_column='user_id'
    )
    reference_type = models.CharField(max_length=20, blank=True, null=True)
    reference_id = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'stock_ledger'
        managed = False
        verbose_name_plural = 'stock ledger entries'
        ordering = ['-created_at']

    def __str__(self):
        return self.tx_id


class StockAdjustment(models.Model):
    ADJUSTMENT_CHOICES = [
        ('Increase', 'Increase'),
        ('Decrease', 'Decrease'),
        ('Correction', 'Correction'),
    ]
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]

    id = models.BigAutoField(primary_key=True)
    adjustment_number = models.CharField(max_length=30, unique=True)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, db_column='product_id'
    )
    adjustment_type = models.CharField(
        max_length=10, choices=ADJUSTMENT_CHOICES, db_column='adjustment_type'
    )
    qty = models.IntegerField()
    reason = models.CharField(max_length=255, blank=True, null=True)
    adjusted_by = models.ForeignKey(
        User, on_delete=models.CASCADE, db_column='adjusted_by'
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='Pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stock_adjustments'
        managed = False
        ordering = ['-created_at']

    def __str__(self):
        return self.adjustment_number


class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Partial', 'Partial'),
        ('Verified', 'Verified'),
        ('Cancelled', 'Cancelled'),
    ]

    id = models.CharField(max_length=30, primary_key=True)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE, db_column='supplier_id'
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='Pending'
    )
    expected_date = models.DateField(null=True, blank=True)
    total_expected_qty = models.IntegerField(default=0)
    total_received_qty = models.IntegerField(default=0)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        db_column='created_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'purchase_orders'
        managed = False
        ordering = ['-created_at']

    def __str__(self):
        return self.id


class PurchaseOrderItem(models.Model):
    po = models.ForeignKey(
        PurchaseOrder, on_delete=models.CASCADE, db_column='po_id',
        related_name='items'
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, db_column='product_id'
    )
    expected_qty = models.IntegerField()
    received_qty = models.IntegerField(default=0)
    cost_price = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True, null=True
    )

    class Meta:
        db_table = 'purchase_order_items'
        managed = False
        unique_together = [('po', 'product')]
        verbose_name_plural = 'purchase order items'

    def __str__(self):
        return f'{self.po_id} - {self.product_id}'


class Notification(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True,
        db_column='user_id'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=20, default='info')
    is_read = models.BooleanField(default=False)
    related_entity = models.CharField(max_length=50, blank=True, null=True)
    related_id = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        managed = False
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class PosSale(models.Model):
    id = models.BigAutoField(primary_key=True)
    order_id = models.CharField(max_length=50)
    customer_name = models.CharField(max_length=200, blank=True, null=True)
    cashier_name = models.CharField(max_length=100, blank=True, null=True)
    item_count = models.IntegerField(default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    items = models.JSONField(blank=True, null=True)
    sold_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pos_sales'
        managed = False
        ordering = ['-sold_at']

    def __str__(self):
        return f'{self.order_id} - {self.total_amount}'
