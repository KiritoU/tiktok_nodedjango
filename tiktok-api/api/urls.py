from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    DeviceSaveProfileAPIView,
    GetTiktokUserAPIView,
    GetUserVideosAPIView,
    GetVideosNowaterMarkAPIView,
)

urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("tiktok/", GetUserVideosAPIView.as_view(), name="get_user_videos"),
    path("user/", GetTiktokUserAPIView.as_view(), name="get_user_info"),
    path(
        "video/", GetVideosNowaterMarkAPIView.as_view(), name="get_video_no_watermark"
    ),
    path("device/", DeviceSaveProfileAPIView.as_view(), name="device_saved_profile"),
]
