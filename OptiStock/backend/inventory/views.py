import csv
import json
import ssl
from urllib.request import urlopen, Request
from urllib.error import URLError

from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.db.models import F
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Sum, F, Count, Q

from .models import (
    Product, Category, Supplier, User, StockLedger, Notification, PosSale,
)
from .serializers import (
    ProductSerializer, ProductDropdownSerializer,
    CategorySerializer, SupplierSerializer, UserSerializer,
    StockLedgerSerializer, NotificationSerializer, PosSaleSerializer,
    BestSellerSerializer, CategoryBreakdownSerializer,
    DailySalesChartSerializer, InventoryReportSerializer,
    LowStockAlertSerializer,
)
from .models import (
    VBestSeller, VCategoryBreakdown, VDailySalesChart,
    VInventoryReport, VLowStockAlert,
)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_view(request):
    if request.method == 'GET':
        if 'user_id' in request.session:
            try:
                user = User.objects.get(id=request.session['user_id'])
                return Response(UserSerializer(user).data)
            except User.DoesNotExist:
                request.session.flush()
        return Response({'error': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)

    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')
    try:
        user = User.objects.get(email__iexact=email)
        if not check_password(password, user.password_hash):
            return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)
        request.session['user_id'] = user.id
        request.session.save()
        return Response(UserSerializer(user).data)
    except User.DoesNotExist:
        return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def logout_view(request):
    request.session.flush()
    return Response({'status': 'logged out'})


@api_view(['GET'])
@ensure_csrf_cookie
@permission_classes([AllowAny])
def me_view(request):
    if 'user_id' not in request.session:
        return Response({'error': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        user = User.objects.get(id=request.session['user_id'])
        return Response(UserSerializer(user).data)
    except User.DoesNotExist:
        request.session.flush()
        return Response({'error': 'Session invalid.'}, status=status.HTTP_401_UNAUTHORIZED)


def _fetch_pos_api(endpoint):
    """Helper: call M2 POS API and return parsed JSON, or None on failure."""
    url = f"{settings.POS_API_URL}{endpoint}"
    try:
        req = Request(url, headers={'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true'})
        ctx = ssl._create_unverified_context()
        with urlopen(req, timeout=5, context=ctx) as resp:
            return json.loads(resp.read().decode())
    except (URLError, json.JSONDecodeError, OSError) as e:
        print(f"POS integration: failed to fetch {url} — {e}")
        return None


@api_view(['GET'])
@permission_classes([AllowAny])
def integration_pos_sales_view(request):
    """
    Consumes M2 (POS) API: GET /api/sales/today/
    Returns today's POS sales data to the Inventory frontend.
    This endpoint proves Module 1 consumes data from Module 2.
    """
    data = _fetch_pos_api('/sales/today/')
    if data is None:
        return Response({
            'error': 'POS module unavailable',
            'order_count': 0,
            'total_sales': '0.00',
            'total_items': 0,
            'source': settings.POS_API_URL,
        }, status=status.HTTP_200_OK)

    return Response({
        'order_count': data.get('order_count', 0),
        'total_sales': str(data.get('total_sales', '0.00')),
        'total_items': data.get('total_items', 0),
        'source': settings.POS_API_URL,
    })


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
@csrf_exempt
def pos_sales_view(request):
    if request.method == 'POST':
        serializer = PosSaleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # GET — return sales from the last 24h
    from django.utils.timezone import now, timedelta
    since = request.query_params.get('since')
    if since:
        from django.utils.dateparse import parse_datetime
        since_dt = parse_datetime(since)
    else:
        since_dt = now() - timedelta(hours=24)
    qs = PosSale.objects.filter(sold_at__gte=since_dt).order_by('-sold_at')
    # Return id of latest seen sale so Dashboard can check for new ones
    last_id = qs.first().id if qs.exists() else 0
    return Response({
        'sales': PosSaleSerializer(qs, many=True).data,
        'last_id': last_id,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def pos_sales_recent_view(request):
    """Dashboard polls this to get only NEW sales since last_id."""
    last_id = request.query_params.get('last_id', 0)
    qs = PosSale.objects.filter(id__gt=last_id).order_by('-sold_at')
    last_id_new = qs.first().id if qs.exists() else int(last_id)
    return Response({
        'sales': PosSaleSerializer(qs, many=True).data,
        'last_id': last_id_new,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats_view(request):
    active = Product.objects.filter(status='active')
    total_active = active.count()
    low_stock = active.filter(stock__lte=F('reorder_level')).count()
    total_value = active.aggregate(v=Sum(F('cost_price') * F('stock')))['v'] or 0
    return Response({
        'total_active_items': total_active,
        'low_stock_count': low_stock,
        'total_inventory_value': float(total_value),
    })


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def perform_create(self, serializer):
        last_id = Category.objects.order_by('id').last()
        next_num = int(last_id.id[1:]) + 1 if last_id else 1
        serializer.save(id=f'C{next_num:03d}')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.product_count > 0:
            return Response(
                {'error': f'Cannot delete "{instance.name}". There are {instance.product_count} products assigned to this category.'},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

    def perform_create(self, serializer):
        last_id = Supplier.objects.order_by('id').last()
        next_num = int(last_id.id[1:]) + 1 if last_id else 1
        serializer.save(id=f'S{next_num:03d}')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.products_supplied > 0:
            return Response(
                {'error': f'Cannot delete "{instance.company_name}". There are {instance.products_supplied} products linked to this supplier.'},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(status='active')
    serializer_class = ProductSerializer

    def perform_create(self, serializer):
        import re
        last_id = Product.objects.order_by('id').last()
        next_num = int(last_id.id[1:]) + 1 if last_id else 1
        all_nums = []
        for s in Product.objects.all().values_list('sku', flat=True):
            all_nums.extend(int(n) for n in re.findall(r'\d+', s))
        next_sku = max(all_nums) + 1 if all_nums else 1
        product = serializer.save(id=f'P{next_num:03d}', sku=f'SKU-{next_sku:04d}')
        Category.objects.filter(id=product.category_id).update(product_count=F('product_count') + 1)
        Supplier.objects.filter(id=product.supplier_id).update(products_supplied=F('products_supplied') + 1)
        if product.stock > 0:
            from django.utils.timezone import now
            StockLedger.objects.create(
                product=product,
                type='Stock In',
                qty=product.stock,
                balance_after=product.stock,
                user_id='EMP-018',
                tx_id=f'TXN-{now():%Y%m%d%H%M%S%f}',
                notes='Initial stock on product creation',
            )

    def perform_update(self, serializer):
        old = self.get_object()
        old_stock = old.stock
        old_cat_id = old.category_id
        old_sup_id = old.supplier_id

        product = serializer.save()

        if old_cat_id != product.category_id:
            Category.objects.filter(id=old_cat_id).update(product_count=F('product_count') - 1)
            Category.objects.filter(id=product.category_id).update(product_count=F('product_count') + 1)
        if old_sup_id != product.supplier_id:
            Supplier.objects.filter(id=old_sup_id).update(products_supplied=F('products_supplied') - 1)
            Supplier.objects.filter(id=product.supplier_id).update(products_supplied=F('products_supplied') + 1)

        if product.stock != old_stock:
            diff = product.stock - old_stock
            from django.utils.timezone import now
            StockLedger.objects.create(
                product=product,
                type='Stock In' if diff > 0 else 'Stock Out',
                qty=abs(diff),
                balance_after=product.stock,
                user_id='EMP-018',
                tx_id=f'TXN-{now():%Y%m%d%H%M%S%f}',
                notes='Manual adjustment via product edit',
            )

    def perform_destroy(self, instance):
        instance.status = 'archived'
        instance.save(update_fields=['status'])
        Category.objects.filter(id=instance.category_id).update(product_count=F('product_count') - 1)
        Supplier.objects.filter(id=instance.supplier_id).update(products_supplied=F('products_supplied') - 1)

    def get_serializer_class(self):
        if self.action == 'dropdown':
            return ProductDropdownSerializer
        return ProductSerializer

    @action(detail=False, methods=['get'])
    def dropdown(self, request):
        products = self.queryset.only('id', 'sku', 'name', 'selling_price', 'stock')
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def archived(self, request):
        archived_qs = Product.objects.filter(status='archived')
        page = self.paginate_queryset(archived_qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(archived_qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def unarchive(self, request, pk=None):
        try:
            product = Product.objects.get(id=pk, status='archived')
        except Product.DoesNotExist:
            return Response({'error': 'Archived product not found.'}, status=404)
        product.status = 'active'
        product.save(update_fields=['status'])
        Category.objects.filter(id=product.category_id).update(product_count=F('product_count') + 1)
        Supplier.objects.filter(id=product.supplier_id).update(products_supplied=F('products_supplied') + 1)
        serializer = self.get_serializer(product)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'])
    def permanent_delete(self, request, pk=None):
        try:
            product = Product.objects.get(id=pk, status='archived')
        except Product.DoesNotExist:
            return Response({'error': 'Archived product not found.'}, status=404)
        with transaction.atomic():
            StockLedger.objects.filter(product=product).delete()
            product.delete()
        return Response({'status': 'permanently deleted'})

    @action(detail=False, methods=['post'], url_path='deduct-stock')
    def deduct_stock(self, request):
        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity')

        if not product_id or not quantity:
            return Response({'error': 'product_id and quantity required'}, status=400)

        try:
            product = Product.objects.get(Q(id=product_id) | Q(sku=product_id), status='active')
        except Product.DoesNotExist:
            return Response({'error': f'Product {product_id} not found'}, status=404)

        try:
            qty = int(quantity)
        except (ValueError, TypeError):
            return Response({'error': 'quantity must be an integer'}, status=400)

        if qty <= 0:
            return Response({'error': 'quantity must be positive'}, status=400)

        if product.stock < qty:
            return Response({'error': f'Insufficient stock. Available: {product.stock}, requested: {qty}'}, status=400)

        product.stock -= qty
        product.save(update_fields=['stock'])

        from django.utils.timezone import now
        StockLedger.objects.create(
            product=product,
            type='Stock Out',
            qty=qty,
            balance_after=product.stock,
            user_id='EMP-018',
            tx_id=f'TXN-{now():%Y%m%d%H%M%S%f}',
            notes='POS sale via M2 integration (auto-deduct)',
        )

        return Response({
            'status': 'ok',
            'product_id': product.id,
            'stock_before': product.stock + qty,
            'stock_after': product.stock,
        })


class StockLedgerViewSet(viewsets.ModelViewSet):
    queryset = StockLedger.objects.all()
    serializer_class = StockLedgerSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data['product'].id
        ledger_type = serializer.validated_data['type']
        qty = serializer.validated_data['qty']

        with transaction.atomic():
            product = Product.objects.select_for_update().get(id=product_id)

            if ledger_type == 'Stock In':
                new_stock = product.stock + qty
            elif ledger_type == 'Stock Out':
                if product.stock < qty:
                    return Response(
                        {'error': f'Cannot stock out {qty} units. Current stock is only {product.stock}.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                new_stock = product.stock - qty
            else:
                new_stock = product.stock + qty

            Product.objects.filter(id=product_id).update(stock=new_stock)

            from django.utils.timezone import now
            tx_id = f'TXN-{now():%Y%m%d%H%M%S%f}'
            serializer.save(tx_id=tx_id, balance_after=new_stock)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

    @action(detail=True, methods=['put'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['put'])
    def mark_all_read(self, request):
        updated = Notification.objects.filter(is_read=False).update(is_read=True)
        return Response({'status': f'{updated} notifications marked as read'})

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        count = Notification.objects.count()
        Notification.objects.all().delete()
        return Response({'status': f'{count} notifications cleared'})


class BestSellerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VBestSeller.objects.all()
    serializer_class = BestSellerSerializer
    pagination_class = None


class CategoryBreakdownViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VCategoryBreakdown.objects.all()
    serializer_class = CategoryBreakdownSerializer
    pagination_class = None


class DailySalesChartViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VDailySalesChart.objects.all()
    serializer_class = DailySalesChartSerializer
    pagination_class = None


class InventoryReportViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VInventoryReport.objects.all()
    serializer_class = InventoryReportSerializer
    pagination_class = None


class LowStockAlertViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VLowStockAlert.objects.all()
    serializer_class = LowStockAlertSerializer
    pagination_class = None


@api_view(['GET'])
@permission_classes([AllowAny])
def export_products_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="products.csv"'
    writer = csv.writer(response)
    writer.writerow(['ID', 'SKU', 'Name', 'Category', 'Supplier', 'Cost Price', 'Selling Price', 'Stock', 'Reorder Level', 'Status', 'Created At'])
    for p in Product.objects.select_related('category', 'supplier').all():
        writer.writerow([p.id, p.sku, p.name, p.category.name, p.supplier.company_name, p.cost_price, p.selling_price, p.stock, p.reorder_level, p.status, p.created_at])
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def export_stock_ledger_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="stock_ledger.csv"'
    writer = csv.writer(response)
    writer.writerow(['ID', 'Transaction ID', 'Product', 'Type', 'Quantity', 'Balance After', 'User', 'Reference Type', 'Reference ID', 'Notes', 'Created At'])
    for s in StockLedger.objects.select_related('product', 'user').all():
        writer.writerow([s.id, s.tx_id, s.product.name, s.type, s.qty, s.balance_after, s.user.name if s.user else '', s.reference_type, s.reference_id, s.notes, s.created_at])
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def export_inventory_report_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="inventory_report.csv"'
    writer = csv.writer(response)
    writer.writerow(['ID', 'SKU', 'Name', 'Category', 'Stock', 'Value', 'Status'])
    for r in VInventoryReport.objects.all():
        writer.writerow([r.id, r.sku, r.name, r.category, r.stock, r.value, r.status])
    return response
