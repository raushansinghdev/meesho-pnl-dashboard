"""
Shared utility functions.
"""

from __future__ import annotations

import uuid
from datetime import datetime


def generate_id() -> str:
    """Generate a short unique ID for file storage keys."""
    return uuid.uuid4().hex[:12]


def format_currency(value: float) -> str:
    """Format a number as ₹ with commas and 2 decimal places."""
    return f"₹{value:,.2f}"


def safe_round(value: float | None, decimals: int = 2) -> float | None:
    """Round a value if it's not None."""
    if value is None:
        return None
    return round(value, decimals)
