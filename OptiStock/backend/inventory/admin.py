from django.contrib import admin
from .models import Product, Category, Supplier, User, StockLedger, StockAdjustment, Notification


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'product_count']
    search_fields = ['name']


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['id', 'company_name', 'contact_person', 'email', 'products_supplied']
    search_fields = ['company_name', 'contact_person']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['sku', 'name', 'category', 'stock', 'selling_price', 'status']
    list_filter = ['status', 'category']
    search_fields = ['sku', 'name']


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'email', 'role', 'status']
    list_filter = ['role', 'status']
    search_fields = ['name', 'email']


@admin.register(StockLedger)
class StockLedgerAdmin(admin.ModelAdmin):
    list_display = ['tx_id', 'product', 'type', 'qty', 'balance_after', 'created_at']
    list_filter = ['type']
    search_fields = ['tx_id']


@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
    list_display = ['adjustment_number', 'product', 'adjustment_type', 'qty', 'status', 'created_at']
    list_filter = ['status', 'adjustment_type']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'type', 'is_read', 'created_at']
    list_filter = ['type', 'is_read']
