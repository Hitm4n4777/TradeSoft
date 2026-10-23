
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path


def api_status(request):
    return JsonResponse({
        "app": "TradeSoft",
        "status": "success",
        "message": "TradeSoft backend is running"
    })


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/status/", api_status, name="api_status"),
]
