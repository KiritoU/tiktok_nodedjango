import re

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

from .models import Device, SavedProfile, TikTokUser, TikTokUserVideo
from .serializers import (
    DeviceSavedProfileSerializer,
    SavedProfileSerializer,
    TikTokUserVideoSerializer,
)
from .utils import (
    get_response_message,
    get_tiktok_user_info,
    get_user_homepage_video,
    get_video_no_watermark,
)


class CustomError:
    PERMISSION_DENIED = "Bạn không thể thực hiện hành động này"
    UNAUTHORIZED = "Thông tin xác thực không chính xác"
    EMPTY_DEVICE_OR_USERNAME = "device_id hoặc username không được để trống"
    UNKNOWN = "Lỗi không xác định"


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

    def post(self, request, *args, **kwargs):
        try:
            username = request.data.get("username")
            cursor = request.data.get("cursor")
            json_response = get_user_homepage_video(username, cursor)

            return Response(
                {
                    "success": 1,
                    "message": custom_success.SUCCESS,
                    "error": "",
                    "data": json_response,
                },
                status=status.HTTP_200_OK,
            )

        except:
            return Response(
                {
                    "success": 0,
                    "message": custom_error.UNKNOWN,
                    "error": "",
                    "data": [],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class GetVideosNowaterMarkAPIView(BaseAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            url = request.data.get("url")
            video = get_video_no_watermark(url)

            return Response(
                {
                    "success": 1,
                    "message": custom_success.SUCCESS,
                    "error": "",
                    "data": video,
                },
                status=status.HTTP_200_OK,
            )
        except:
            return Response(
                {
                    "success": 0,
                    "message": custom_error.UNKNOWN,
                    "error": "",
                    "data": [],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class GetTiktokUserAPIView(BaseAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            username = request.data.get("username")
            user_info = get_tiktok_user_info(username)

            return Response(
                {
                    "success": 1,
                    "message": custom_success.SUCCESS,
                    "error": "",
                    "data": user_info,
                },
                status=status.HTTP_200_OK,
            )
        except:
            return Response(
                {
                    "success": 0,
                    "message": custom_error.UNKNOWN,
                    "error": "",
                    "data": [],
                },
                status=status.HTTP_400_BAD_REQUEST,
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


class DeviceSaveProfileAPIView(BaseAPIView, generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SavedProfileSerializer

    def get(self, request, *args, **kwargs):
        device_id = request.data.get("device_id", "")
        device, _ = Device.objects.get_or_create(device_id=device_id)
        saved_profiles = device.saved_profiles.all()

        paginator = self.pagination_class()
        paginated_saved_profiles = paginator.paginate_queryset(saved_profiles, request)
        serialized_saved_profiles = self.serializer_class(
            paginated_saved_profiles, many=True
        ).data

        return paginator.get_paginated_response(serialized_saved_profiles)

    def post(self, request, *args, **kwargs):
        device_id = request.data.get("device_id", "")
        username = request.data.get("username", "")

        if not device_id or not username:
            return Response(
                {
                    "success": 0,
                    "message": custom_error.EMPTY_DEVICE_OR_USERNAME,
                    "error": "",
                    "data": [],
                },
                status=status.HTTP_200_OK,
            )

        device, _ = Device.objects.get_or_create(device_id=device_id)
        saved_profile = SavedProfile.objects.get_or_create(
            username=username, device=device
        )

        saved_profiles = Device.objects.get(device_id=device_id).saved_profiles.all()
        paginator = self.pagination_class()
        paginated_saved_profiles = paginator.paginate_queryset(saved_profiles, request)
        serialized_saved_profiles = self.serializer_class(
            paginated_saved_profiles, many=True
        ).data

        return paginator.get_paginated_response(serialized_saved_profiles)

    def delete(self, request, *args, **kwargs):
        device_id = request.data.get("device_id", "")
        username = request.data.get("username", "")

        if not device_id or not username:
            return Response(
                {
                    "success": 0,
                    "message": custom_error.EMPTY_DEVICE_OR_USERNAME,
                    "error": "",
                    "data": [],
                },
                status=status.HTTP_200_OK,
            )

        device, _ = Device.objects.get_or_create(device_id=device_id)
        saved_profile = SavedProfile.objects.filter(username=username, device=device)

        if saved_profile.exists():
            saved_profile.delete()

        saved_profiles = Device.objects.get(device_id=device_id).saved_profiles.all()
        paginator = self.pagination_class()
        paginated_saved_profiles = paginator.paginate_queryset(saved_profiles, request)
        serialized_saved_profiles = self.serializer_class(
            paginated_saved_profiles, many=True
        ).data

        return paginator.get_paginated_response(serialized_saved_profiles)
