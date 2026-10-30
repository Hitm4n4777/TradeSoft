from rest_framework import status
from rest_framework.test import APITestCase

from .models import Customer


class CustomerApiTests(APITestCase):
    def test_create_list_update_and_soft_delete_customer(self):
        create_response = self.client.post(
            "/api/customers/",
            {
                "name": "  Ahmed Traders  ",
                "phone": "03001234567",
                "email": "ahmed@example.com",
                "address": "Lahore",
                "notes": "Wholesale customer",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        customer_id = create_response.data["id"]
        self.assertEqual(create_response.data["name"], "Ahmed Traders")
        self.assertEqual(self.client.get("/api/customers/").data[0]["id"], customer_id)

        update_response = self.client.patch(
            f"/api/customers/{customer_id}/",
            {"phone": "03007654321"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["phone"], "03007654321")

        delete_response = self.client.delete(f"/api/customers/{customer_id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Customer.objects.get(pk=customer_id).is_active)
        self.assertEqual(self.client.get("/api/customers/").data, [])

    def test_customer_name_is_required(self):
        response = self.client.post(
            "/api/customers/",
            {"name": "   "},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Customer.objects.exists())
