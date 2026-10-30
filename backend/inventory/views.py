from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import models, transaction
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models.functions import TruncDate

# Import the database models used by the inventory API.
from .models import Product, StockMovement

# Import the serializers used to validate and return API data.
from .serializers import ProductSerializer, StockMovementSerializer



# ============================================================
# PRODUCT LIST & CREATE API
# GET  /api/products/  -> Return all active products.
# POST /api/products/  -> Create a new product.
# ============================================================
class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    # Return active products by default, sorted by product name.
    def get_queryset(self):
        return Product.objects.filter(is_active=True)


# ============================================================
# PRODUCT DETAIL API
# GET    /api/products/<id>/ -> Retrieve a product.
# PUT    /api/products/<id>/ -> Replace product details.
# PATCH  /api/products/<id>/ -> Update selected fields.
# DELETE /api/products/<id>/ -> Deactivate the product.
# ============================================================
class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    # Find only active products so deleted/deactivated products
    # cannot be retrieved or changed through these endpoints.
    def get_queryset(self):
        return Product.objects.filter(is_active=True)

    # Keep the product record and its history instead of deleting it.
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])



# ============================================================
# STOCK MOVEMENT LIST & CREATE API
# GET  /api/stock-movements/ -> View stock movement history.
# POST /api/stock-movements/ -> Record a stock change.
# ============================================================
class StockMovementListCreateView(generics.ListCreateAPIView):
    serializer_class = StockMovementSerializer
    permission_classes = [AllowAny]

    # Show the newest stock movements first.
    queryset = StockMovement.objects.select_related("product").order_by("-created_at", "-id")

    # Validate and save stock changes atomically.
    # This prevents simultaneous requests from overselling stock.
    @transaction.atomic
    def perform_create(self, serializer):
        product_id = serializer.validated_data["product"].pk

        # Lock the product row while checking and updating stock.
        product = Product.objects.select_for_update().get(pk=product_id)

        quantity = serializer.validated_data["quantity"]
        movement_type = serializer.validated_data["movement_type"]

        # Reject zero quantities and require the quantity sign
        # to match the type of stock movement.
        if quantity == 0:
            raise serializers.ValidationError({
                "quantity": "Quantity cannot be zero."
            })

        if movement_type in ["purchase", "opening", "return"] and quantity < 0:
            raise serializers.ValidationError({
                "quantity": "This movement type requires a positive quantity."
            })

        if movement_type in ["sale"] and quantity > 0:
            raise serializers.ValidationError({
                "quantity": "A sale requires a negative quantity."
            })

        # Calculate current stock from the complete movement history.
        current_stock = StockMovement.objects.filter(
            product=product
        ).aggregate(
            total=models.Sum("quantity")
        )["total"] or Decimal("0")

        # Prevent stock from becoming negative.
        if current_stock + quantity < 0:
            raise serializers.ValidationError({
                "quantity": (
                    f"Insufficient stock. Available: {current_stock} "
                    f"{product.unit}."
                )
            })

        # Save the movement only after validation succeeds.
        serializer.save(product=product)


# ============================================================
# DAILY SALES SUMMARY API
# GET /api/dashboard/daily-sales/ -> Today's recorded sale value.
# ============================================================
class DailySalesSummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        today = timezone.localdate()
        total = StockMovement.objects.filter(
            movement_type="sale",
            quantity__lt=0,
            created_at__date=today,
        ).aggregate(
            total=models.Sum(
                models.ExpressionWrapper(
                    -models.F("quantity") * models.F("product__selling_price"),
                    output_field=models.DecimalField(
                        max_digits=30,
                        decimal_places=5,
                    ),
                )
            )
        )["total"] or Decimal("0.00")

        return Response({
            "date": today.isoformat(),
            "total_sales": str(total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        })


# ============================================================
# WEEKLY SALES SUMMARY API
# GET /api/dashboard/weekly-sales/ -> Daily sales for the last 7 days.
# ============================================================
class WeeklySalesSummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        today = timezone.localdate()
        start_date = today - timedelta(days=6)
        daily_totals = StockMovement.objects.filter(
            movement_type="sale",
            quantity__lt=0,
            created_at__date__gte=start_date,
            created_at__date__lte=today,
        ).annotate(
            sale_date=TruncDate("created_at", tzinfo=timezone.get_current_timezone())
        ).values("sale_date").annotate(
            total=models.Sum(
                models.ExpressionWrapper(
                    -models.F("quantity") * models.F("product__selling_price"),
                    output_field=models.DecimalField(
                        max_digits=30,
                        decimal_places=5,
                    ),
                )
            )
        )
        totals_by_date = {
            item["sale_date"]: item["total"] or Decimal("0.00")
            for item in daily_totals
        }

        return Response([
            {
                "date": (start_date + timedelta(days=day)).isoformat(),
                "day": (start_date + timedelta(days=day)).strftime("%a"),
                "total_sales": str(
                    totals_by_date.get(
                        start_date + timedelta(days=day), Decimal("0.00")
                    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                ),
            }
            for day in range(7)
        ])


# ============================================================
# CURRENT STOCK API
# GET /api/stock-movements/stock/ -> View stock totals.
# ============================================================
class CurrentStockView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Sum stock movements separately for every product.
        from django.db.models import Sum

        products = Product.objects.filter(is_active=True).annotate(
            current_stock=models.Sum("stock_movements__quantity")
        ).order_by("name")

        # Return zero for products that have no stock movements yet.
        data = [
            {
                "product_id": product.id,
                "name": product.name,
                "sku": product.sku,
                "unit": product.unit,
                "current_stock": product.current_stock or Decimal("0"),
                "minimum_stock": product.minimum_stock,
                "low_stock": (
                    (product.current_stock or Decimal("0"))
                    <= product.minimum_stock
                ),
            }
            for product in products
        ]

        return Response(data)
# ============================================================
# SALES AND PROFITS SUMMARY API
# GET /api/dashboard/sales-profits/?range=7days|30days|90days|all
# Returns revenue, cost of goods sold, gross profit, margin,
# and a per-product breakdown for the selected period.
# ============================================================
class SalesProfitsSummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        range_param = (request.query_params.get("range") or "7days").lower()
        today = timezone.localdate()

        if range_param == "30days":
            start_date = today - timedelta(days=29)
        elif range_param == "90days":
            start_date = today - timedelta(days=89)
        elif range_param == "all":
            start_date = None
        else:
            range_param = "7days"
            start_date = today - timedelta(days=6)

        explicit_start = request.query_params.get("start")
        explicit_end = request.query_params.get("end")
        if explicit_start:
            try:
                start_date = timezone.datetime.fromisoformat(explicit_start).date()
            except ValueError:
                return Response(
                    {"detail": "Invalid start date. Use YYYY-MM-DD."},
                    status=400,
                )
        if explicit_end:
            try:
                today = timezone.datetime.fromisoformat(explicit_end).date()
            except ValueError:
                return Response(
                    {"detail": "Invalid end date. Use YYYY-MM-DD."},
                    status=400,
                )

        movements = StockMovement.objects.select_related("product").filter(
            movement_type="sale",
            quantity__lt=0,
        )
        if start_date is not None:
            movements = movements.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=today,
            )

        total_sales = Decimal("0.00")
        total_cost = Decimal("0.00")
        total_quantity = Decimal("0.000")
        sales_count = 0
        breakdown_map = {}

        for movement in movements:
            product = movement.product
            quantity_sold = abs(movement.quantity)
            selling_price = product.selling_price or Decimal("0.00")
            purchase_price = product.purchase_price or Decimal("0.00")

            sales_value = (quantity_sold * selling_price).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            cost_value = (quantity_sold * purchase_price).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            profit_value = sales_value - cost_value

            total_sales += sales_value
            total_cost += cost_value
            total_quantity += quantity_sold
            sales_count += 1

            entry = breakdown_map.setdefault(
                product.id,
                {
                    "product_id": product.id,
                    "product": product.name,
                    "sku": product.sku,
                    "unit": product.unit,
                    "quantity": Decimal("0.000"),
                    "sales": Decimal("0.00"),
                    "cost": Decimal("0.00"),
                    "profit": Decimal("0.00"),
                },
            )
            entry["quantity"] += quantity_sold
            entry["sales"] += sales_value
            entry["cost"] += cost_value
            entry["profit"] += profit_value

        total_profit = total_sales - total_cost
        profit_margin = (
            (total_profit / total_sales * Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            if total_sales
            else Decimal("0.00")
        )

        breakdown = []
        for entry in breakdown_map.values():
            entry_margin = (
                (entry["profit"] / entry["sales"] * Decimal("100")).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                if entry["sales"]
                else Decimal("0.00")
            )
            breakdown.append(
                {
                    "product_id": entry["product_id"],
                    "product": entry["product"],
                    "sku": entry["sku"],
                    "unit": entry["unit"],
                    "quantity": str(entry["quantity"].quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)),
                    "sales": str(entry["sales"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                    "cost": str(entry["cost"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                    "profit": str(entry["profit"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                    "profit_margin": str(entry_margin),
                }
            )

        breakdown.sort(key=lambda item: Decimal(item["profit"]), reverse=True)

        return Response(
            {
                "range": range_param,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": today.isoformat(),
                "summary": {
                    "total_sales": str(total_sales.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                    "total_cost": str(total_cost.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                    "total_profit": str(total_profit.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                    "total_quantity": str(total_quantity.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)),
                    "profit_margin": str(profit_margin),
                    "sales_count": sales_count,
                },
                "breakdown": breakdown,
            }
        )

