from django.shortcuts import render
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .tiktok import get_user_videos, get_user_videos_no_captcha


def get_response_message(
    data,
    success: int = 0,
    message: str = "",
    error: str = "",
) -> dict:
    return {
        "success": success,
        "message": message,
        "error": error,
        "data": data,
    }


class GetUserVideosAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        username = request.query_params.get("username")
        urls = get_user_videos_no_captcha(username)

        return Response(
            get_response_message(
                data=urls,
                success=1,
                message="success",
                error="",
            ),
            status=status.HTTP_200_OK,
        )
