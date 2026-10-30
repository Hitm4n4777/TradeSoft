from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Customer
from .serializers import CustomerSerializer


class CustomerListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Customer.objects.filter(is_active=True)


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Customer.objects.filter(is_active=True)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])