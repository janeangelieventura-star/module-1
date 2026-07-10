import re
from rest_framework import serializers
from .models import (
    Product, Category, Supplier, User, StockLedger,
    StockAdjustment, Notification,
    VBestSeller, VCategoryBreakdown, VDailySalesChart,
    VInventoryReport, VLowStockAlert,
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ['id']

    def validate_name(self, value):
        if not re.match(r'^[a-zA-Z0-9 ]+$', value):
            raise serializers.ValidationError('Only letters, numbers, and spaces allowed.')
        if len(value) > 40:
            raise serializers.ValidationError('Category name must be 40 characters or fewer.')
        return value

    def validate_description(self, value):
        if value and len(value) > 60:
            raise serializers.ValidationError('Description must be 60 characters or fewer.')
        return value


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ['id']

    def validate_company_name(self, value):
        if not re.match(r'^[a-zA-Z0-9 ]+$', value):
            raise serializers.ValidationError('Only letters, numbers, and spaces allowed.')
        if len(value) > 40:
            raise serializers.ValidationError('Company name must be 40 characters or fewer.')
        return value

    def validate_contact_person(self, value):
        if value and not re.match(r'^[a-zA-Z ]+$', value):
            raise serializers.ValidationError('Only letters and spaces allowed.')
        if value and len(value) > 40:
            raise serializers.ValidationError('Contact person must be 40 characters or fewer.')
        return value

    def validate_email(self, value):
        if value and len(value) > 40:
            raise serializers.ValidationError('Email must be 40 characters or fewer.')
        return value

    def validate_phone(self, value):
        if value and not re.match(r'^\d{11}$', value):
            raise serializers.ValidationError('Phone number must be exactly 11 digits.')
        return value

    def validate_address(self, value):
        if value and len(value) > 50:
            raise serializers.ValidationError('Address must be 50 characters or fewer.')
        return value


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source='category.name', read_only=True
    )
    supplier_name = serializers.CharField(
        source='supplier.company_name', read_only=True
    )

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'category', 'category_name',
            'supplier', 'supplier_name', 'cost_price', 'selling_price',
            'stock', 'reorder_level', 'status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'sku', 'status', 'created_at', 'updated_at']

    def validate(self, data):
        if data.get('selling_price', 0) <= data.get('cost_price', 0):
            raise serializers.ValidationError(
                'Selling price must be strictly greater than cost price.'
            )
        return data


class ProductDropdownSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(source='selling_price', max_digits=12, decimal_places=2)

    class Meta:
        model = Product
        fields = ['id', 'sku', 'name', 'price', 'stock']
        read_only_fields = ['id']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        exclude = ['password_hash']


class StockLedgerSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='product.name', read_only=True
    )

    class Meta:
        model = StockLedger
        fields = [
            'id', 'tx_id', 'product', 'product_name', 'type',
            'qty', 'balance_after', 'user', 'reference_type',
            'reference_id', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'tx_id', 'balance_after', 'created_at']

    def validate_notes(self, value):
        if value and len(value) > 60:
            raise serializers.ValidationError('Notes must be 60 characters or fewer.')
        return value


class NotificationSerializer(serializers.ModelSerializer):
    message = serializers.CharField(source='description', read_only=True)

    class Meta:
        model = Notification
        fields = '__all__'


class BestSellerSerializer(serializers.ModelSerializer):
    class Meta:
        model = VBestSeller
        fields = '__all__'


class CategoryBreakdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = VCategoryBreakdown
        fields = '__all__'


class DailySalesChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = VDailySalesChart
        fields = '__all__'


class InventoryReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = VInventoryReport
        fields = '__all__'


class LowStockAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = VLowStockAlert
        fields = '__all__'
