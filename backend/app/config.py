"""
Application configuration and business-logic constants.

All tunable values from the original CLI script (scripts.py) are centralised
here so every service module imports from one place.
"""

from pathlib import Path

from pydantic_settings import BaseSettings


BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    """Runtime settings, overridable via environment variables."""

    data_dir: Path = BASE_DIR / "data"
    uploads_dir: Path = BASE_DIR / "data" / "uploads"
    results_dir: Path = BASE_DIR / "data" / "results"
    sku_costs_file: str = "sku_costs.json"

    # Default loss-rate assumptions (fraction 0-1)
    default_rto_loss_rate: float = 0.0
    default_return_loss_rate: float = 1.0
    default_lost_loss_rate: float = 1.0
    default_unresolved_loss_rate: float = 0.0

    class Config:
        env_prefix = "MEESHO_"
        env_file = ".env"
        env_file_encoding = 'utf-8'


settings = Settings()

# ---------------------------------------------------------------------------
# Status-priority map — used to resolve a single final status when one
# Sub Order No appears on multiple rows with different statuses.
# Higher number wins.  Terminal outcomes (return arriving after a shipped
# snapshot) must always supersede earlier, stale snapshots.
# ---------------------------------------------------------------------------
STATUS_PRIORITY: dict[str, int] = {
    "cancelled": 5,
    "rto": 4,
    "return": 4,
    "exchange": 3,
    "delivered": 2,
    "shipped": 1,
    "lost": 4,
}

# Statuses where the customer kept the item → full COGS always.
COGS_FULL_STATUSES: set[str] = {"delivered", "exchange"}

# Statuses where COGS is always zero (order never shipped).
COGS_ZERO_STATUSES: set[str] = {"cancelled"}

# Statuses whose COGS fraction is a user-configurable loss rate.
# Maps status → the key in the loss_rates dict.
CONFIGURABLE_LOSS_STATUSES: dict[str, str] = {
    "rto": "rto",
    "return": "return",
    "lost": "lost",
}
