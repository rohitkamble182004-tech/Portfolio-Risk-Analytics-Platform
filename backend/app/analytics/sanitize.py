"""
Final line of defense against NaN/Infinity leaking into an API response.

This is deliberately a *second* layer, not the only one: the real fix
for most NaN/Inf sources is at the root (see returns.py, covariance.py)
-- catching a bad value the moment it's produced, with enough context
to know what a sane replacement is (0.0 return, -1.0 total loss,
regularized covariance, etc). `sanitize_numeric` exists for whatever
slips past those targeted fixes, so a single unexpected edge case in
the analytics stack degrades to `null` in the JSON response instead of
crashing the endpoint with a 422 ("array must not contain infs or
NaNs") or, worse, silently serializing invalid JSON.

Both layers matter: fixing only at the root leaves you exposed to the
*next* unanticipated edge case; sanitizing only at the boundary would
quietly turn real bugs into silent `null`s throughout the codebase
without ever surfacing where the bad data came from. Use both.
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np


def sanitize_numeric(value: Any, default: Any = None) -> Any:
    """Recursively replace NaN/Infinity/-Infinity with `default` (None
    by default, per spec).

    Handles:
      - plain Python floats/ints
      - numpy scalars (np.float64, np.int64, etc.)
      - numpy arrays (converted to nested lists)
      - dicts and lists/tuples, recursively
      - pydantic v2 models (via model_dump(), returned as a plain dict)
      - anything else is returned unchanged

    NaN and Infinity are not valid JSON. `None` (-> JSON `null`) is
    the right default for Optional response fields: it reads as "no
    value available", never as a misleading real number. For fields
    that are *required* (non-Optional) on their Pydantic schema, pass
    `default=0.0` explicitly so a sanitized value doesn't fail
    response-model validation.
    """
    # numpy scalar -> python scalar first, so the float branch below catches it
    if isinstance(value, np.generic):
        value = value.item()

    if isinstance(value, float):
        return value if math.isfinite(value) else default

    if isinstance(value, np.ndarray):
        return sanitize_numeric(value.tolist(), default=default)

    if isinstance(value, dict):
        return {k: sanitize_numeric(v, default=default) for k, v in value.items()}

    if isinstance(value, (list, tuple)):
        return [sanitize_numeric(v, default=default) for v in value]

    if hasattr(value, "model_dump"):
        return sanitize_numeric(value.model_dump(), default=default)

    return value