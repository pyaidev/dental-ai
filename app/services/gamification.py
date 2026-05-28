"""Hygiene score gamification system."""

from datetime import datetime, UTC
from sqlalchemy.orm import Session

from app.models import Analysis, Patient, PatientQuestionnaire


def calculate_hygiene_score(plaque_pct: float, questionnaire: dict | None = None) -> dict:
    """Calculate 0-100 hygiene score from plaque % and questionnaire."""
    # Base score from plaque (0-60 points)
    if plaque_pct <= 5:
        plaque_score = 60
    elif plaque_pct <= 10:
        plaque_score = 50
    elif plaque_pct <= 20:
        plaque_score = 40
    elif plaque_pct <= 35:
        plaque_score = 25
    elif plaque_pct <= 50:
        plaque_score = 15
    else:
        plaque_score = 5

    # Bonus from questionnaire (0-40 points)
    q_score = 0
    if questionnaire:
        if questionnaire.get("brushing_frequency") in ("2x", "3x"):
            q_score += 10
        if questionnaire.get("uses_interdental"):
            q_score += 10
        if questionnaire.get("cleans_tongue"):
            q_score += 5
        if questionnaire.get("uses_irrigator"):
            q_score += 5
        if not questionnaire.get("smoking"):
            q_score += 5
        if not questionnaire.get("bleeding_gums"):
            q_score += 5

    total = min(plaque_score + q_score, 100)

    # Stars (1-5)
    if total >= 85:
        stars = 5
    elif total >= 70:
        stars = 4
    elif total >= 50:
        stars = 3
    elif total >= 30:
        stars = 2
    else:
        stars = 1

    # Emoji
    star_emoji = "⭐" * stars + "☆" * (5 - stars)

    # Motivation text
    if stars == 5:
        motivation = "Превосходно! Вы мастер гигиены! 🏆"
    elif stars == 4:
        motivation = "Отлично! Ещё чуть-чуть до идеала! 💪"
    elif stars == 3:
        motivation = "Хорошо! Есть куда расти — вы справитесь! 🌟"
    elif stars == 2:
        motivation = "Давайте улучшим результат вместе! 💚"
    else:
        motivation = "Начало пути — каждый шаг важен! 🦷"

    return {
        "score": total,
        "stars": stars,
        "star_emoji": star_emoji,
        "motivation": motivation,
        "plaque_score": plaque_score,
        "questionnaire_score": q_score,
    }


def get_patient_streak(patient_id: int, db: Session) -> dict:
    """Calculate patient's visit streak and improvement."""
    analyses = (
        db.query(Analysis)
        .filter(Analysis.patient_id == patient_id)
        .order_by(Analysis.created_at.desc())
        .limit(10)
        .all()
    )

    if not analyses:
        return {"streak": 0, "trend": "neutral", "improvement": 0, "visits": 0}

    visits = len(analyses)

    # Trend: compare last 2 analyses
    if len(analyses) >= 2:
        current = analyses[0].plaque_pct_overall or 0
        previous = analyses[1].plaque_pct_overall or 0
        improvement = round(previous - current, 1)
        trend = "improving" if improvement > 2 else "declining" if improvement < -2 else "stable"
    else:
        improvement = 0
        trend = "neutral"

    # Streak: consecutive visits where plaque improved or stayed good
    streak = 0
    for i in range(len(analyses) - 1):
        curr = analyses[i].plaque_pct_overall or 0
        prev = analyses[i + 1].plaque_pct_overall or 0
        if curr <= prev + 5:  # Improved or maintained (within 5% tolerance)
            streak += 1
        else:
            break

    return {
        "streak": streak,
        "trend": trend,
        "improvement": improvement,
        "visits": visits,
        "trend_emoji": "📈" if trend == "improving" else "📉" if trend == "declining" else "➡️",
    }


def generate_score_message(patient: Patient, score: dict, streak: dict) -> str:
    """Generate Telegram/Max message with hygiene score."""
    lines = [
        f"🦷 <b>Ваш индекс гигиены</b>",
        f"",
        f"Пациент: {patient.fio}",
        f"Оценка: <b>{score['score']}/100</b>",
        f"Рейтинг: {score['star_emoji']}",
        f"",
        f"{score['motivation']}",
    ]

    if streak["visits"] > 1:
        lines.extend([
            f"",
            f"📊 Динамика: {streak['trend_emoji']} {'+' if streak['improvement'] > 0 else ''}{streak['improvement']}%",
            f"🔥 Серия улучшений: {streak['streak']} визитов подряд",
        ])

    if streak["streak"] >= 3:
        lines.append(f"\n🏆 Поздравляем! {streak['streak']} визитов с улучшением!")

    return "\n".join(lines)
