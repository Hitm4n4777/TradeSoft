from rest_framework import serializers
from .models import Product, StockMovement


# ============================================================
# PRODUCT SERIALIZER
# Converts product records to and from API JSON.
# ============================================================
class ProductSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "sku",
            "category",
            "unit",
            "purchase_price",
            "selling_price",
            "minimum_stock",
            "is_active",
            "created_at",
            "updated_at",
        ]

        # The database automatically manages these fields.
        read_only_fields = ["id", "created_at", "updated_at"]


# ============================================================
# STOCK MOVEMENT SERIALIZER
# Converts stock movement records to and from API JSON.
# ============================================================
class StockMovementSerializer(serializers.ModelSerializer):

    # Include the product name in API responses for easier display.
    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )
    product_selling_price = serializers.DecimalField(
        source="product.selling_price",
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )
    product_sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "product_selling_price",
            "quantity",
            "movement_type",
            "reference",
            "notes",
            "created_at",
        ]

        # The database assigns the movement ID and timestamp.
        read_only_fields = ["id", "created_at"]
