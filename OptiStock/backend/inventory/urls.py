from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'products', views.ProductViewSet)
router.register(r'categories', views.CategoryViewSet)
router.register(r'suppliers', views.SupplierViewSet)
router.register(r'users', views.UserViewSet)
router.register(r'stock-ledger', views.StockLedgerViewSet)
router.register(r'notifications', views.NotificationViewSet)
router.register(r'dashboard/best-sellers', views.BestSellerViewSet)
router.register(r'dashboard/category-breakdown', views.CategoryBreakdownViewSet)
router.register(r'dashboard/daily-sales-chart', views.DailySalesChartViewSet)
router.register(r'dashboard/inventory-report', views.InventoryReportViewSet)
router.register(r'dashboard/low-stock-alerts', views.LowStockAlertViewSet)

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.me_view, name='me'),
    path('dashboard-stats/', views.dashboard_stats_view, name='dashboard-stats'),
    path('integration/pos-sales/', views.integration_pos_sales_view, name='integration-pos-sales'),
    path('products/export/csv/', views.export_products_csv, name='export-products-csv'),
    path('stock-ledger/export/csv/', views.export_stock_ledger_csv, name='export-stock-ledger-csv'),
    path('dashboard/inventory-report/export/csv/', views.export_inventory_report_csv, name='export-inventory-report-csv'),
    path('', include(router.urls)),
]
