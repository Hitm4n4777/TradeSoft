
from django.contrib import admin

# Import the Product model so it can be managed through Django admin.
from .models import Product


# Configure which product fields appear in the admin list.
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "sku",
        "category",
        "unit",
        "purchase_price",
        "selling_price",
        "is_active",
    )

    # Add filters and search to make products easier to manage.
    list_filter = ("category", "unit", "is_active")
    search_fields = ("name", "sku")
