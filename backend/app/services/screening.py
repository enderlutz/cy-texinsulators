from typing import Any


def score_applicant(
    raw_lead_data: dict[str, Any], criteria: list[dict[str, Any]]
) -> int:
    """Apply screening rules to a Lead Ads payload and return a score.

    raw_lead_data: flattened field_data, e.g. {"has_truck": "yes", "experience_years": "3"}
    criteria: list of dicts shaped like ScreeningQuestion rows.
    """
    score = 0
    for rule in criteria:
        key = rule["field_key"]
        value = (raw_lead_data.get(key) or "").strip().lower()
        target = (rule.get("criteria_value") or "").strip().lower()
        weight = int(rule.get("weight", 1))
        ctype = rule["criteria_type"]

        match ctype:
            case "required":
                if value:
                    score += weight
            case "equals":
                if value == target:
                    score += weight
            case "contains":
                if target and target in value:
                    score += weight
            case "min":
                try:
                    if float(value) >= float(target):
                        score += weight
                except ValueError:
                    pass
            case "max":
                try:
                    if float(value) <= float(target):
                        score += weight
                except ValueError:
                    pass
    return score


def flatten_field_data(field_data: list[dict[str, Any]]) -> dict[str, str]:
    """Meta Lead Ads webhook returns field_data as [{name, values:[...]}]. Flatten it."""
    out: dict[str, str] = {}
    for entry in field_data or []:
        name = entry.get("name")
        values = entry.get("values") or []
        if name:
            out[name] = values[0] if values else ""
    return out
