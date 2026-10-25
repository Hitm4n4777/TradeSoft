
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


# ============================================================
# API STATUS
# Confirms that the TradeSoft backend is running.
# ============================================================
def api_status(request):
    return JsonResponse({
        "app": "TradeSoft",
        "status": "success",
        "message": "TradeSoft backend is running",
    })


# ============================================================
# MAIN URL CONFIGURATION
# Registers URLs for the main site and backend applications.
# ============================================================
urlpatterns = [
    # Django administration panel.
    path("admin/", admin.site.urls),

    # Backend health/status endpoint.
    path("api/status/", api_status, name="api_status"),

    # Include the inventory app's product API routes.
    path("api/", include("inventory.urls")),
]
