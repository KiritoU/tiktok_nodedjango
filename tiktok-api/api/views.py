from django.shortcuts import render
from rest_framework import generics, pagination, status
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import TikTokUser, TikTokUserVideo
from .serializers import TikTokUserVideoSerializer
from .utils import get_response_message, get_user_homepage_video, get_video_no_watermark


class CustomError:
    PERMISSION_DENIED = "Bạn không thể thực hiện hành động này"
    UNAUTHORIZED = "Thông tin xác thực không chính xác"


class CustomSuccess:
    UPDATED = "Cập nhật thành công"
    SUCCESS = "Thành công"
    DELETED = "Đã xoá"


custom_success = CustomSuccess()

custom_error = CustomError()


class BaseAPIView(APIView):
    def handle_exception(self, exc):
        if isinstance(exc, PermissionDenied):
            return Response(
                get_response_message(
                    data=[],
                    success=0,
                    message="",
                    error=custom_error.PERMISSION_DENIED,
                ),
                status=status.HTTP_403_FORBIDDEN,
            )
        elif isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
            return Response(
                get_response_message(
                    data=[],
                    success=0,
                    message="",
                    error=custom_error.UNAUTHORIZED,
                ),
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return super().handle_exception(exc)


class GetUserVideosAPIView(BaseAPIView, generics.ListAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        username = request.query_params.get("username")
        urls = get_user_homepage_video(username)
        urls.reverse()

        tiktok_user, _ = TikTokUser.objects.get_or_create(username=username)

        for url in urls:
            TikTokUserVideo.objects.get_or_create(user=tiktok_user, url=url)

        user_videos = tiktok_user.videos.all()

        paginator = self.pagination_class()
        paginated_videos = paginator.paginate_queryset(user_videos, request)
        serialized_orders = TikTokUserVideoSerializer(paginated_videos, many=True).data

        return paginator.get_paginated_response(serialized_orders)


class GetVideosNowaterMarkAPIView(BaseAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        url = request.data.get("url")

        url = get_video_no_watermark(url)

        return Response(
            {
                "success": 1,
                "message": custom_success.SUCCESS,
                "error": "",
                "data": url,
            },
            status=status.HTTP_200_OK,
        )


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
