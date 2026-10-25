
from django.db import models


# ============================================================
# PRODUCT MODEL
# Stores the details of each animal-feed product in TradeSoft.
# Creating a product defines the item; it does not add stock.
# ============================================================
class Product(models.Model):

    # Main identification details.
    name = models.CharField(max_length=200)
    sku = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique stock-keeping code for this product.",
    )
    category = models.CharField(max_length=100, blank=True)

    # Unit and pricing information.
    unit = models.CharField(
        max_length=20,
        default="bag",
        help_text="For example: bag, kg, or ton.",
    )
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Minimum stock quantity used for low-stock warnings.
    minimum_stock = models.DecimalField(max_digits=12, decimal_places=3, default=0)

    # Allows a product to be hidden from active lists without deleting its history.
    is_active = models.BooleanField(default=True)

    # Automatically record when the product was created or last updated.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Display the product name clearly in Django admin and debugging output.
    def __str__(self):
        return f"{self.name} ({self.sku})"

    # Set the default order for product lists.
    class Meta:
        ordering = ["name"]


# ============================================================
# STOCK MOVEMENT MODEL
# Records every change to a product's stock quantity.
#
# Positive quantities represent stock coming in.
# Negative quantities represent stock going out.
# Keeping a history allows TradeSoft to explain stock changes.
# ============================================================
class StockMovement(models.Model):

    # Product whose stock is being changed.
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="stock_movements",
    )

    # Quantity added or removed.
    # Examples: 20.000 means 20 bags received; -3.000 means 3 sold.
    quantity = models.DecimalField(max_digits=12, decimal_places=3)

    # Reason for the stock change.
    MOVEMENT_TYPES = [
        ("opening", "Opening Stock"),
        ("purchase", "Purchase"),
        ("sale", "Sale"),
        ("return", "Return"),
        ("adjustment", "Stock Adjustment"),
    ]

    movement_type = models.CharField(
        max_length=20,
        choices=MOVEMENT_TYPES,
    )

    # Optional reference, such as a purchase or sales invoice number.
    reference = models.CharField(max_length=100, blank=True)

    # Additional explanation for manual adjustments or unusual changes.
    notes = models.TextField(blank=True)

    # Automatically record when this stock movement was created.
    created_at = models.DateTimeField(auto_now_add=True)

    # Display a readable description in Django admin and debugging output.
    def __str__(self):
        return (
            f"{self.product.name}: {self.quantity} "
            f"({self.get_movement_type_display()})"
        )

    # Show stock history in chronological order.
    class Meta:
        ordering = ["created_at", "id"]
