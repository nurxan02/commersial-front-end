import json
import os
import threading
import urllib.request
import urllib.parse
from typing import Optional


TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")  # user, group, or channel id
ADMIN_BASE_URL = os.getenv("ADMIN_BASE_URL", "http://127.0.0.1:8000")


def _post_telegram(text: str) -> None:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return  # Not configured; do nothing
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    data = urllib.parse.urlencode(payload).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:  # nosec - external API by config
            resp.read()  # best-effort, ignore content
    except Exception:
        # Best-effort: ignore network errors to not block order creation
        pass


def notify_new_order(order, request: Optional[object] = None) -> None:
    """Fire-and-forget Telegram message for a newly created order."""
    try:
        user_email = getattr(order.user, "email", str(order.user_id))
    except Exception:
        user_email = str(order.user_id)

    admin_link = f"{ADMIN_BASE_URL}/admin/orders/order/{order.id}/change/"

    # A brief summary line; items may be added after order create in some flows
    lines = [
        f"<b>Yeni sifariş</b>  #<b>{order.id}</b>",
        f"İstifadəçi: {user_email}",
        f"Məbləğ: {order.total_price} AZN",
        f"Status: {order.status}",
        f"Admin: {admin_link}",
    ]

    # Try to include first item if available
    try:
        first_item = order.items.all().first()
        if first_item:
            lines.append(f"Məhsul: {first_item.name} × {first_item.quantity}")
    except Exception:
        pass

    text = "\n".join(lines)

    threading.Thread(target=_post_telegram, args=(text,), daemon=True).start()
