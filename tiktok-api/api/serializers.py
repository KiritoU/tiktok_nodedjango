from rest_framework import serializers

from .models import TikTokUserVideo


class TikTokUserVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TikTokUserVideo
        fields = [
            "url",
            "nowatermark_url",
            "created_at",
            "updated_at",
        ]
