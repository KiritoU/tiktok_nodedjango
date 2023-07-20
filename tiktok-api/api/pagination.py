from rest_framework import pagination
from rest_framework.response import Response

from .views import custom_success


class CustomPagination(pagination.LimitOffsetPagination):
    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "success": 1,
                "message": custom_success.SUCCESS,
                "error": "",
                "data": data,
            }
        )
