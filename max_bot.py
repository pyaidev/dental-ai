"""Max messenger bot polling server for Odonta Index AI."""

import asyncio
import logging

from app.config import settings
from app.database import SessionLocal
from app.services.max_bot import max_get_updates, max_handle_message, MAX_TOKEN

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("max_bot")


async def main():
    if not MAX_TOKEN:
        logger.error("MAX_BOT_TOKEN not set in .env")
        return

    logger.info("Odonta Index AI Max Bot started")
    marker = 0

    while True:
        data = await max_get_updates(marker)
        updates = data.get("updates", [])
        if data.get("marker"):
            marker = data["marker"]

        for update in updates:
            msg = update.get("message", {})
            body = msg.get("body", {})
            text = body.get("text", "")
            chat_id = str(msg.get("recipient", {}).get("chat_id", ""))
            user_id = str(msg.get("sender", {}).get("user_id", ""))

            if chat_id and text:
                db = SessionLocal()
                try:
                    logger.info(f"Max msg from {chat_id}: {text[:50]}")
                    await max_handle_message(chat_id, text, user_id, db)
                finally:
                    db.close()


if __name__ == "__main__":
    asyncio.run(main())
