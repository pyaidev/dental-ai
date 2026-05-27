import httpx
import json

from app.config import settings


async def generate_recommendations(
    plaque_pct: float,
    zone_data: dict,
    has_braces: bool = False,
    has_implants: bool = False,
    indices: dict | None = None,
    questionnaire: dict | None = None,
) -> str:
    """Generate recommendations via YandexGPT or fallback to templates."""
    if settings.yandex_gpt_api_key and settings.yandex_gpt_folder_id:
        try:
            return await _call_yandex_gpt(plaque_pct, zone_data, has_braces, has_implants, indices, questionnaire)
        except Exception:
            pass
    return _template_recommendations(plaque_pct, zone_data, has_braces, has_implants)


async def _call_yandex_gpt(
    plaque_pct: float,
    zone_data: dict,
    has_braces: bool,
    has_implants: bool,
    indices: dict | None,
    questionnaire: dict | None = None,
) -> str:
    q_text = ""
    if questionnaire:
        q_parts = []
        if questionnaire.get("smoking"): q_parts.append("курит")
        if questionnaire.get("diabetes"): q_parts.append("диабет")
        if questionnaire.get("pregnancy"): q_parts.append("беременность")
        if questionnaire.get("dry_mouth"): q_parts.append("сухость во рту")
        if questionnaire.get("bruxism"): q_parts.append("бруксизм")
        if questionnaire.get("bleeding_gums"): q_parts.append("кровоточивость дёсен")
        if questionnaire.get("sensitivity"): q_parts.append("чувствительность зубов")
        if questionnaire.get("bad_breath"): q_parts.append("запах изо рта")
        if questionnaire.get("wants_whitening"): q_parts.append("хочет отбеливание")
        freq_map = {"rarely": "редко", "1x": "1 раз в день", "2x": "2 раза в день", "3x": "3 раза в день"}
        freq = freq_map.get(questionnaire.get("brushing_frequency", ""), "")
        if freq: q_parts.append(f"чистит зубы {freq}")
        if questionnaire.get("uses_interdental"): q_parts.append("использует ёршики/нить")
        if q_parts:
            q_text = f"\n- Анкета пациента: {', '.join(q_parts)}"

    prompt = f"""Ты — стоматолог-гигиенист. На основании результатов анализа зубного налёта и анкеты пациента составь персональные рекомендации на русском языке.

Результаты анализа:
- Общий процент налёта: {plaque_pct}%
- Распределение по зонам: {json.dumps(zone_data, ensure_ascii=False)}
- Брекеты: {"да" if has_braces else "нет"}
- Импланты: {"да" if has_implants else "нет"}
{f"- Индексы: {json.dumps(indices, ensure_ascii=False)}" if indices else ""}{q_text}

Составь рекомендации по пунктам:
1. Оценка уровня гигиены (1-2 предложения)
2. Проблемные зоны
3. Конкретные средства гигиены с названиями брендов (щётка, паста, ополаскиватель, ёршики, нить, ирригатор — подбери под клиническую картину и анкету пациента)
4. Техника чистки (учитывай особенности пациента)
5. Рекомендуемый срок следующей профессиональной гигиены
{("6. Рекомендации по отбеливанию" if questionnaire and questionnaire.get("wants_whitening") else "")}"""

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


async def generate_whitening_recommendations(tooth_type: str, patient_name: str = "") -> str:
    """Generate whitening recommendations based on tooth type."""
    type_names = {
        "tetracycline": "тетрациклиновые зубы",
        "fluorosis": "флюороз",
        "healthy": "здоровые зубы",
        "after_braces": "после снятия брекетов",
    }
    type_name = type_names.get(tooth_type, tooth_type)

    if settings.yandex_gpt_api_key and settings.yandex_gpt_folder_id:
        try:
            prompt = f"""Ты — стоматолог, специалист по отбеливанию. Пациент обратился за отбеливанием.
Тип зубов: {type_name}

Составь рекомендации:
1. Можно ли проводить отбеливание для данного типа зубов
2. Рекомендуемый метод отбеливания (кабинетное, домашнее, комбинированное)
3. Подготовка к отбеливанию
4. Ожидаемый результат
5. Уход после отбеливания
6. Противопоказания и риски"""

            url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"
            headers = {"Authorization": f"Api-Key {settings.yandex_gpt_api_key}", "Content-Type": "application/json"}
            body = {
                "modelUri": f"gpt://{settings.yandex_gpt_folder_id}/yandexgpt/latest",
                "completionOptions": {"stream": False, "temperature": 0.3, "maxTokens": 1000},
                "messages": [
                    {"role": "system", "text": "Ты — опытный стоматолог, специалист по эстетической стоматологии и отбеливанию."},
                    {"role": "user", "text": prompt},
                ],
            }
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(url, headers=headers, json=body)
                resp.raise_for_status()
                return resp.json()["result"]["alternatives"][0]["message"]["text"]
        except Exception:
            pass

    # Template fallback
    templates = {
        "tetracycline": "Тетрациклиновые зубы требуют особого подхода. Стандартное отбеливание малоэффективно. Рекомендуется: внутреннее отбеливание или виниры. Консультация обязательна.",
        "fluorosis": "При флюорозе отбеливание возможно, но результат зависит от степени поражения. Рекомендуется кабинетное отбеливание с предварительной реминерализацией.",
        "healthy": "Здоровые зубы отлично поддаются отбеливанию. Рекомендуется кабинетное отбеливание (ZOOM, Beyond) или домашнее с каппами. Результат: осветление на 4-8 тонов.",
        "after_braces": "После снятия брекетов рекомендуется подождать 2-4 недели. Сначала провести профессиональную гигиену, затем отбеливание. Домашнее отбеливание с каппами — оптимальный вариант.",
    }
    return templates.get(tooth_type, "Консультация стоматолога по отбеливанию.")
