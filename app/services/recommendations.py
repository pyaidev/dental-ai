import httpx
import json

from app.config import settings


async def generate_recommendations(
    plaque_pct: float,
    zone_data: dict,
    has_braces: bool = False,
    has_implants: bool = False,
    indices: dict | None = None,
) -> str:
    """Generate recommendations via YandexGPT or fallback to templates."""
    if settings.yandex_gpt_api_key and settings.yandex_gpt_folder_id:
        try:
            return await _call_yandex_gpt(plaque_pct, zone_data, has_braces, has_implants, indices)
        except Exception:
            pass
    return _template_recommendations(plaque_pct, zone_data, has_braces, has_implants)


async def _call_yandex_gpt(
    plaque_pct: float,
    zone_data: dict,
    has_braces: bool,
    has_implants: bool,
    indices: dict | None,
) -> str:
    prompt = f"""Ты — стоматолог-гигиенист. На основании результатов анализа зубного налёта составь краткие рекомендации для пациента на русском языке.

Результаты анализа:
- Общий процент налёта: {plaque_pct}%
- Распределение по зонам: {json.dumps(zone_data, ensure_ascii=False)}
- Брекеты: {"да" if has_braces else "нет"}
- Импланты: {"да" if has_implants else "нет"}
{f"- Индексы: {json.dumps(indices, ensure_ascii=False)}" if indices else ""}

Составь рекомендации по пунктам:
1. Оценка уровня гигиены (1-2 предложения)
2. Проблемные зоны
3. Рекомендуемые средства гигиены (щётка, паста, ополаскиватель, ёршики, нить)
4. Техника чистки
5. Рекомендуемый срок следующей профессиональной гигиены"""

    url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"
    headers = {
        "Authorization": f"Api-Key {settings.yandex_gpt_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "modelUri": f"gpt://{settings.yandex_gpt_folder_id}/yandexgpt/latest",
        "completionOptions": {
            "stream": False,
            "temperature": 0.3,
            "maxTokens": 1000,
        },
        "messages": [
            {"role": "system", "text": "Ты — опытный стоматолог-гигиенист. Отвечай профессионально и по делу."},
            {"role": "user", "text": prompt},
        ],
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, json=body)
        resp.raise_for_status()
        data = resp.json()
        return data["result"]["alternatives"][0]["message"]["text"]


def _template_recommendations(
    plaque_pct: float,
    zone_data: dict,
    has_braces: bool,
    has_implants: bool,
) -> str:
    lines = []

    # Assessment
    if plaque_pct <= 10:
        lines.append("1. Уровень гигиены: хороший. Продолжайте поддерживать текущий уход за полостью рта.")
        next_visit = "6 месяцев"
    elif plaque_pct <= 25:
        lines.append("1. Уровень гигиены: удовлетворительный. Есть незначительные отложения налёта, рекомендуется улучшить домашний уход.")
        next_visit = "4 месяца"
    elif plaque_pct <= 50:
        lines.append("1. Уровень гигиены: неудовлетворительный. Обнаружен значительный налёт. Необходимо скорректировать технику чистки и использовать дополнительные средства гигиены.")
        next_visit = "2-3 месяца"
    else:
        lines.append("1. Уровень гигиены: плохой. Необходима срочная забота о полости рта. Рекомендуется профессиональная гигиена и коррекция домашнего ухода.")
        next_visit = "1-2 месяца"

    # Problem zones
    problem_zones = {k: v for k, v in zone_data.items() if v > 15}
    zone_names_ru = {
        "upper_left": "верхние левые",
        "upper_center": "верхние передние",
        "upper_right": "верхние правые",
        "lower_left": "нижние левые",
        "lower_center": "нижние передние",
        "lower_right": "нижние правые",
    }
    if problem_zones:
        zones_str = ", ".join(f"{zone_names_ru.get(k, k)} ({v}%)" for k, v in problem_zones.items())
        lines.append(f"\n2. Проблемные зоны: {zones_str}.")
    else:
        lines.append("\n2. Проблемных зон не выявлено.")

    # Products
    lines.append("\n3. Рекомендуемые средства гигиены:")
    lines.append("   - Зубная щётка: мягкая (soft), например Curaprox 5460 или аналог")
    if has_braces:
        lines.append("   - Ортодонтическая щётка V-образной формы")
        lines.append("   - Монопучковая щётка для зон вокруг брекетов")
        lines.append("   - Суперфлосс для чистки под дугой")
    if has_implants:
        lines.append("   - Мягкая щётка для зон вокруг имплантов")
        lines.append("   - Ирригатор с насадкой для имплантов")
    lines.append("   - Межзубные ёршики подходящего размера")
    lines.append("   - Зубная нить или флосс")
    lines.append("   - Ополаскиватель без спирта")

    if plaque_pct > 25:
        lines.append("   - Таблетки для индикации зубного налёта (для самоконтроля)")

    # Technique
    lines.append("\n4. Техника чистки: метод Басса — щётка под углом 45° к десне, короткие выметающие движения от десны к режущему краю. Время чистки — не менее 3 минут, 2 раза в день.")

    # Next visit
    lines.append(f"\n5. Следующая профессиональная гигиена: через {next_visit}.")

    return "\n".join(lines)
