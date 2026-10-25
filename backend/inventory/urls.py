
from django.urls import path

# Import the views that handle product API requests.
from .views import ProductListCreateView, ProductDetailView
from .views import (
    ProductListCreateView,
    ProductDetailView,
    StockMovementListCreateView,
    CurrentStockView,
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
    
]
