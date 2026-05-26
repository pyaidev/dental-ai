from dataclasses import dataclass


@dataclass
class DentalIndices:
    fedorov_volodkina: float
    fedorov_interpretation: str
    api_lange: float
    api_interpretation: str
    ohi_s: float
    ohi_s_interpretation: str
    silness_loe: float
    silness_loe_interpretation: str
    php: float
    php_interpretation: str


def calculate_indices(
    plaque_pct_front: float,
    plaque_pct_right: float,
    plaque_pct_left: float,
    zone_data: dict | None = None,
) -> DentalIndices:
    fedorov = calc_fedorov_volodkina(plaque_pct_front)
    api = calc_api_lange(plaque_pct_front, plaque_pct_right, plaque_pct_left, zone_data)
    ohi_s = calc_ohi_s(plaque_pct_front, plaque_pct_right, plaque_pct_left)
    silness = calc_silness_loe(plaque_pct_front, plaque_pct_right, plaque_pct_left)
    php = calc_php(plaque_pct_front, plaque_pct_right, plaque_pct_left, zone_data)

    return DentalIndices(
        fedorov_volodkina=fedorov,
        fedorov_interpretation=interpret_fedorov(fedorov),
        api_lange=api,
        api_interpretation=interpret_api(api),
        ohi_s=ohi_s,
        ohi_s_interpretation=interpret_ohi_s(ohi_s),
        silness_loe=silness,
        silness_loe_interpretation=interpret_silness_loe(silness),
        php=php,
        php_interpretation=interpret_php(php),
    )


def calc_fedorov_volodkina(front_pct: float) -> float:
    """Map front photo plaque% to 1.0-5.0 scale."""
    if front_pct <= 0:
        return 1.0
    elif front_pct <= 25:
        return 1.0 + (front_pct / 25) * 1.0
    elif front_pct <= 50:
        return 2.0 + ((front_pct - 25) / 25) * 1.0
    elif front_pct <= 75:
        return 3.0 + ((front_pct - 50) / 25) * 1.0
    else:
        return 4.0 + ((min(front_pct, 100) - 75) / 25) * 1.0


def interpret_fedorov(value: float) -> str:
    if value <= 1.5:
        return "Хороший"
    elif value <= 2.0:
        return "Удовлетворительный"
    elif value <= 2.5:
        return "Неудовлетворительный"
    elif value <= 3.4:
        return "Плохой"
    else:
        return "Очень плохой"


def calc_api_lange(
    front_pct: float, right_pct: float, left_pct: float,
    zone_data: dict | None = None,
) -> float:
    """Approximate API Lange from border zone plaque presence."""
    if zone_data:
        border_zones = [
            zone_data.get("upper_left", 0),
            zone_data.get("upper_right", 0),
            zone_data.get("lower_left", 0),
            zone_data.get("lower_right", 0),
        ]
        avg_border = sum(border_zones) / len(border_zones)
        return round(min(avg_border, 100), 1)
    avg = (front_pct + right_pct + left_pct) / 3
    return round(min(avg * 1.2, 100), 1)


def interpret_api(value: float) -> str:
    if value < 25:
        return "Хороший"
    elif value < 40:
        return "Удовлетворительный"
    elif value < 70:
        return "Неудовлетворительный"
    else:
        return "Плохой"


def calc_ohi_s(front_pct: float, right_pct: float, left_pct: float) -> float:
    """Map average plaque% to 0-3.0 OHI-S scale."""
    avg = (front_pct + right_pct + left_pct) / 3
    return round((avg / 100) * 3.0, 1)


def interpret_ohi_s(value: float) -> str:
    if value <= 0.6:
        return "Хороший"
    elif value <= 1.8:
        return "Удовлетворительный"
    else:
        return "Плохой"


# ── Silness–Löe Plaque Index ──
# Scale 0–3 per tooth surface:
#   0 = no plaque, 1 = thin film (visible with probe),
#   2 = moderate visible plaque, 3 = abundant plaque
# Average across all surfaces gives the index.

def calc_silness_loe(front_pct: float, right_pct: float, left_pct: float) -> float:
    """Map average plaque% to Silness-Löe 0-3 scale."""
    avg = (front_pct + right_pct + left_pct) / 3
    # 0% -> 0.0, ~33% -> 1.0, ~66% -> 2.0, 100% -> 3.0
    return round((avg / 100) * 3.0, 1)


def interpret_silness_loe(value: float) -> str:
    if value <= 0.1:
        return "Отличный"
    elif value <= 0.9:
        return "Хороший"
    elif value <= 1.9:
        return "Удовлетворительный"
    else:
        return "Неудовлетворительный"


# ── PHP Index (Podshadley–Haley) ──
# Patient Hygiene Performance: each tooth surface divided into 5 zones,
# score 0 (no plaque) or 1 (plaque present) per zone.
# PHP = total stained zones / number of surfaces examined.
# Scale 0–5 per surface, average gives the index.
# Interpretation: 0 = excellent, 0.1-0.6 good, 0.7-1.6 satisfactory, ≥1.7 poor.

def calc_php(
    front_pct: float, right_pct: float, left_pct: float,
    zone_data: dict | None = None,
) -> float:
    """Map plaque distribution to PHP 0-5 scale."""
    if zone_data:
        # Count how many of 6 zones have significant plaque (>10%)
        zones = list(zone_data.values())
        # Each zone maps to 0-5 based on plaque intensity
        zone_scores = []
        for z in zones:
            # Map 0-100% to 0-5 score
            score = (z / 100) * 5.0
            zone_scores.append(min(score, 5.0))
        return round(sum(zone_scores) / len(zone_scores), 1) if zone_scores else 0.0

    avg = (front_pct + right_pct + left_pct) / 3
    return round((avg / 100) * 5.0, 1)


def interpret_php(value: float) -> str:
    if value <= 0.0:
        return "Отличный"
    elif value <= 0.6:
        return "Хороший"
    elif value <= 1.6:
        return "Удовлетворительный"
    else:
        return "Неудовлетворительный"
