"""Date and trading-calendar utilities."""
from __future__ import annotations

from datetime import date, timedelta

import pandas as pd

# Approximate US market holidays (simplified; use pandas_market_calendars for production)
_US_MARKET_HOLIDAYS_2024_2025 = {
    date(2024, 1, 1), date(2024, 1, 15), date(2024, 2, 19), date(2024, 3, 29),
    date(2024, 5, 27), date(2024, 6, 19), date(2024, 7, 4), date(2024, 9, 2),
    date(2024, 11, 28), date(2024, 12, 25),
    date(2025, 1, 1), date(2025, 1, 20), date(2025, 2, 17), date(2025, 4, 18),
    date(2025, 5, 26), date(2025, 6, 19), date(2025, 7, 4), date(2025, 9, 1),
    date(2025, 11, 27), date(2025, 12, 25),
}


def is_trading_day(d: date) -> bool:
    """Return True if `d` is a US equity trading day."""
    return d.weekday() < 5 and d not in _US_MARKET_HOLIDAYS_2024_2025


def previous_trading_day(d: date | None = None) -> date:
    """Return the most recent trading day on or before `d` (default: today)."""
    d = d or date.today()
    while not is_trading_day(d):
        d -= timedelta(days=1)
    return d


def trading_days_between(start: date, end: date) -> int:
    """Count trading days in [start, end] inclusive."""
    bdays = pd.bdate_range(start=start, end=end)
    return len(bdays)


def lookback_start(lookback_days: int, reference: date | None = None) -> date:
    """
    Return a calendar start date that gives approximately `lookback_days`
    trading days of history ending at `reference`.
    """
    ref = reference or date.today()
    # Multiply by ~1.4 to account for weekends and holidays
    calendar_days = int(lookback_days * 1.45)
    return ref - timedelta(days=calendar_days)


def date_range_str(lookback_days: int) -> tuple[str, str]:
    """
    Return (start_str, end_str) suitable for yfinance download.
    """
    end = previous_trading_day()
    start = lookback_start(lookback_days, reference=end)
    return str(start), str(end)