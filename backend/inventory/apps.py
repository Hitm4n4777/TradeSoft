
from django.apps import AppConfig


# ============================================================
# INVENTORY APP CONFIGURATION
# Tells Django how to identify and initialize the inventory app.
# ============================================================
class InventoryConfig(AppConfig):
    # Use a 64-bit integer as the default primary-key type for models.
    default_auto_field = "django.db.models.BigAutoField"

    # Python package path of the inventory app.
    name = "inventory"

    # Human-readable name shown in Django admin and other interfaces.
    verbose_name = "Products & Inventory"
