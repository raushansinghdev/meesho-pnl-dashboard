"""
sku_costs.py — SKU cost file management.

Handles both v1 flat format ({"SKU": 60}) and v2 split format
({"SKU": {"making_cost": 60, "packaging_cost": 8}}).  The API always
exposes the v2 schema; v1 entries are transparently upgraded on read
(total_cost → making_cost, packaging_cost = 0).
"""

from __future__ import annotations

import json
from pathlib import Path


def load_costs(path: Path) -> dict[str, dict]:
    """Read the SKU cost JSON and normalise every entry to v2 format.

    Returns: {sku: {"making_cost": float, "packaging_cost": float}}

    Accepts either:
      - v1: {"SKU": 60}
      - v2: {"SKU": {"making_cost": 60, "packaging_cost": 8}}
      - Mixed: some v1, some v2 — each entry normalised independently.
    """
    if not path.exists():
        return {}

    with open(path, "r", encoding="utf-8") as f:
        raw: dict = json.load(f)

    costs: dict[str, dict] = {}
    for sku, val in raw.items():
        if isinstance(val, dict):
            costs[sku] = {
                "making_cost": val.get("making_cost", 0.0),
                "packaging_cost": val.get("packaging_cost", 0.0),
            }
        elif val is not None:
            # v1 flat format: entire cost treated as making_cost
            costs[sku] = {
                "making_cost": float(val),
                "packaging_cost": 0.0,
            }
        else:
            # null cost — SKU exists in template but cost not filled in
            costs[sku] = None
    return costs


def save_costs(path: Path, costs: dict[str, dict]) -> None:
    """Write costs in v2 format."""
    # Filter out None entries (template placeholders)
    out = {}
    for sku, val in sorted(costs.items()):
        if val is None:
            out[sku] = None
        else:
            out[sku] = {
                "making_cost": val["making_cost"],
                "packaging_cost": val["packaging_cost"],
            }

    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)


def update_single_sku(
    path: Path, sku: str, making_cost: float, packaging_cost: float
) -> dict[str, dict]:
    """Update one SKU's cost and persist. Returns the full updated dict."""
    costs = load_costs(path)
    costs[sku] = {"making_cost": making_cost, "packaging_cost": packaging_cost}
    save_costs(path, costs)
    return costs


def generate_template(skus: set[str]) -> dict:
    """Generate a cost-file template with all given SKUs set to null."""
    return {sku: None for sku in sorted(skus)}


def get_unmapped_skus(
    all_skus: set[str], costs: dict[str, dict]
) -> set[str]:
    """Return SKUs that have no cost entry (missing or null)."""
    return {s for s in all_skus if s not in costs or costs.get(s) is None}
