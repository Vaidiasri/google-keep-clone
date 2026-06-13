import os
from datetime import date
from typing import Dict, Tuple

_daily_counts: Dict[int, Tuple[str, int]] = {}
DEFAULT_LIMIT = int(os.getenv("AI_MAX_REQUESTS_PER_USER_PER_DAY", "50"))


def check_rate_limit(user_id: int) -> None:
    today = date.today().isoformat()
    stored = _daily_counts.get(user_id)
    if stored and stored[0] == today and stored[1] >= DEFAULT_LIMIT:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=429,
            detail=f"Daily AI limit reached ({DEFAULT_LIMIT} requests). Try again tomorrow.",
        )


def increment_rate_limit(user_id: int) -> int:
    today = date.today().isoformat()
    stored = _daily_counts.get(user_id)
    if not stored or stored[0] != today:
        count = 1
    else:
        count = stored[1] + 1
    _daily_counts[user_id] = (today, count)
    return count


def get_remaining(user_id: int) -> int:
    today = date.today().isoformat()
    stored = _daily_counts.get(user_id)
    if not stored or stored[0] != today:
        return DEFAULT_LIMIT
    return max(0, DEFAULT_LIMIT - stored[1])
