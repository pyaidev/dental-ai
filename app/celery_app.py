from celery import Celery
from celery.schedules import crontab

celery = Celery(
    "dental_ai",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

celery.conf.beat_schedule = {
    "check-reminders-daily": {
        "task": "app.tasks.send_daily_reminders",
        "schedule": crontab(hour=9, minute=0),  # Every day at 9:00 UTC
    },
    "check-subscriptions-daily": {
        "task": "app.tasks.check_expired_subscriptions",
        "schedule": crontab(hour=0, minute=0),  # Midnight
    },
    "backup-database-daily": {
        "task": "app.tasks.backup_database",
        "schedule": crontab(hour=3, minute=0),  # 3:00 AM
    },
}
