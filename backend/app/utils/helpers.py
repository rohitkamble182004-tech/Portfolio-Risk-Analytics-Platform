"""General-purpose helper utilities."""
from __future__ import annotations

import hashlib
import json
from typing import Any

import numpy as np


def stable_hash(obj: Any) -> str:
    """Deterministic MD5 hash of any JSON-serialisable object."""
    raw = json.dumps(obj, sort_keys=True, default=str)
    return hashlib.md5(raw.encode()).hexdigest()


def clamp(value: float, lo: float, hi: float) -> float:
    """Clamp a value to [lo, hi]."""
    return max(lo, min(hi, value))


def normalize_weights(weights: list[float]) -> list[float]:
    """Re-normalise a weight list so it sums to exactly 1.0."""
    total = sum(weights)
    if total <= 0:
        raise ValueError("Weights must sum to a positive number")
    return [w / total for w in weights]


def pct_format(value: float, decimals: int = 2) -> str:
    """Format a fraction as a percentage string, e.g. 0.0523 → '5.23%'."""
    return f"{value * 100:.{decimals}f}%"


def dollar_format(value: float) -> str:
    """Format a dollar amount with commas, e.g. 1234567.8 → '$1,234,567.80'."""
    return f"${value:,.2f}"


def is_positive_definite(matrix: np.ndarray) -> bool:
    """Check whether a matrix is symmetric positive definite."""
    try:
        np.linalg.cholesky(matrix)
        return True
    except np.linalg.LinAlgError:
        return False


def chunk(lst: list, size: int) -> list[list]:
    """Split a list into chunks of at most `size`."""
    return [lst[i: i + size] for i in range(0, len(lst), size)]