
from django.urls import path

# Import the views that handle product API requests.
from .views import ProductListCreateView, ProductDetailView
from .views import (
    ProductListCreateView,
    ProductDetailView,
    StockMovementListCreateView,
    CurrentStockView,
    DailySalesSummaryView,
    WeeklySalesSummaryView,
    SalesProfitsSummaryView,
)

# ============================================================
# INVENTORY URLS
# Routes for listing, creating, viewing, and updating products.
# ============================================================
urlpatterns = [
    # List active products or create a new product.
    path(
        "products/",
        ProductListCreateView.as_view(),
        name="product-list-create",
    ),

    # Retrieve, update, or deactivate a product by its ID.
    path(
        "products/<int:pk>/",
        ProductDetailView.as_view(),
        name="product-detail",
    ),

    # Record and inspect stock movement history.
    path("stock-movements/", StockMovementListCreateView.as_view(), name="stock-movements"),

    # Retrieve current stock totals for active products.
    path("stock-movements/stock/", CurrentStockView.as_view(), name="current-stock"),

    # Retrieve the value of sale movements recorded today.
    path("dashboard/daily-sales/", DailySalesSummaryView.as_view(), name="daily-sales"),
    path("dashboard/weekly-sales/", WeeklySalesSummaryView.as_view(), name="weekly-sales"),
    path("dashboard/sales-profits/", SalesProfitsSummaryView.as_view(), name="sales-profits"),
    
]
