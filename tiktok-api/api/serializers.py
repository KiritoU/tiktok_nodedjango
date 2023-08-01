from rest_framework import serializers

from .models import Device, SavedProfile, TikTokUserVideo


class TikTokUserVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TikTokUserVideo
        fields = [
            "url",
            "nowatermark_url",
            "created_at",
            "updated_at",
        ]


class SavedProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedProfile
        fields = [
            "username",
            "created_at",
            "updated_at",
        ]


class DeviceSavedProfileSerializer(serializers.ModelSerializer):
    saved_profiles = SavedProfileSerializer(many=True, read_only=True)

    class Meta:
        model = Device
        fields = [
            "device_id",
            "saved_profiles",
            "created_at",
            "updated_at",
        ]
