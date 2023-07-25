import requests

NODE_API_URL = "http://localhost:3000"


def get_user_homepage_video(username: str) -> list:
    url = NODE_API_URL + f"/{username}"

    response = requests.get(url)

    return response.json().get("data", [])


def get_video_no_watermark(video_url: str) -> str:
    url = NODE_API_URL + "/video"

    response = requests.post(url, json={"url": video_url})

    return response.json().get("data", [])


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
