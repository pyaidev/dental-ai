"""Telegram bot polling server for Odonta Index AI."""

import asyncio
import logging
import httpx

from app.config import settings
from app.database import SessionLocal
from app.services.telegram_bot import handle_start, handle_contact, handle_stop, handle_status

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bot")

BOT_TOKEN = getattr(settings, "telegram_bot_token", "")
API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"


async def get_updates(offset: int = 0) -> list:
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{API_URL}/getUpdates", params={"offset": offset, "timeout": 25})
            data = resp.json()
            return data.get("result", [])
    except Exception as e:
        logger.error(f"Get updates error: {e}")
        return []


async def process_update(update: dict):
    db = SessionLocal()
    try:
        message = update.get("message", {})
        chat_id = str(message.get("chat", {}).get("id", ""))
        text = message.get("text", "")
        contact = message.get("contact")
        user_name = message.get("from", {}).get("first_name", "")

        if not chat_id:
            return

        if text == "/start":
            logger.info(f"/start from {chat_id} ({user_name})")
            await handle_start(chat_id, user_name)

        elif text == "/stop":
            logger.info(f"/stop from {chat_id}")
            await handle_stop(chat_id, db)

        elif text == "/status":
            logger.info(f"/status from {chat_id}")
            await handle_status(chat_id, db)

        elif contact:
            phone = contact.get("phone_number", "")
            logger.info(f"Contact from {chat_id}: {phone}")
            await handle_contact(chat_id, phone, db)

        else:
            from app.services.telegram_bot import send_message
            await send_message(
                chat_id,
                "🦷 <b>Odonta Index AI</b>\n\n"
                "Команды:\n"
                "/start — подключить уведомления\n"
                "/status — последний анализ\n"
                "/stop — отключить уведомления",
            )
    finally:
        db.close()


async def main():
    if not BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not set in .env")
        return

    logger.info("Odonta Index AI Bot started")
    # Get bot info
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_URL}/getMe")
        bot_info = resp.json().get("result", {})
        logger.info(f"Bot: @{bot_info.get('username', '?')}")

    offset = 0
    while True:
        updates = await get_updates(offset)
        for update in updates:
            offset = update["update_id"] + 1
            await process_update(update)


if __name__ == "__main__":
    asyncio.run(main())
