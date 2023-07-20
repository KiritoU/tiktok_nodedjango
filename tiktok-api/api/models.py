from django.db import models


class TikTokUser(models.Model):
    username = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.username


class TikTokUserVideo(models.Model):
    user = models.ForeignKey(
        TikTokUser, related_name="videos", on_delete=models.CASCADE
    )
    url = models.URLField(db_index=True)
    nowatermark_url = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "url")
        ordering = ("created_at", "updated_at")
