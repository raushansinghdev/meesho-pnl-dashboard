"""
sku.py — SKU cost CRUD endpoints.

Exposes the v2 (making_cost + packaging_cost) schema.  Old v1 flat-format
files are transparently upgraded on read (see sku_costs.load_costs).
"""

from __future__ import annotations

import io
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from app.config import settings
from app.models.schemas import SKUCostEntry, SKUCostSingleUpdate, SKUCostUpdateRequest
from app.services.sku_costs import load_costs, save_costs, update_single_sku

router = APIRouter(prefix="/api/sku", tags=["sku"])


def _cost_file_path() -> Path:
    return settings.data_dir / settings.sku_costs_file


@router.get("/costs", response_model=list[SKUCostEntry])
async def list_costs():
    """Return all SKU costs in v2 format."""
    costs = load_costs(_cost_file_path())
    result = []
    for sku, val in sorted(costs.items()):
        if val is None:
            result.append(SKUCostEntry(
                sku=sku, making_cost=0.0, packaging_cost=0.0, total_cost=0.0
            ))
        else:
            result.append(SKUCostEntry(
                sku=sku,
                making_cost=val["making_cost"],
                packaging_cost=val["packaging_cost"],
                total_cost=val["making_cost"] + val["packaging_cost"],
            ))
    return result


@router.put("/costs")
async def bulk_update_costs(request: SKUCostUpdateRequest):
    """Bulk-update SKU costs. Merges with existing data (doesn't delete SKUs
    not mentioned in the request)."""
    costs = load_costs(_cost_file_path())
    for sku, new_cost in request.costs.items():
        costs[sku] = {
            "making_cost": new_cost.making_cost,
            "packaging_cost": new_cost.packaging_cost,
        }
    save_costs(_cost_file_path(), costs)
    return {"status": "ok", "updated": len(request.costs)}


@router.put("/costs/{sku}")
async def update_sku_cost(sku: str, body: SKUCostSingleUpdate):
    """Update a single SKU's cost."""
    update_single_sku(_cost_file_path(), sku, body.making_cost, body.packaging_cost)
    return {"status": "ok", "sku": sku}


@router.post("/costs/import")
async def import_costs(file: UploadFile = File(...)):
    """Import SKU costs from an uploaded JSON file.

    Accepts both v1 ({"SKU": 60}) and v2 ({"SKU": {"making_cost": 60, ...}})
    formats — the file is loaded and normalised through the same pipeline.
    """
    if not file.filename.endswith(".json"):
        raise HTTPException(400, "Cost file must be JSON (.json)")

    content = await file.read()
    try:
        raw = json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"Invalid JSON: {e}")

    # Write the raw content, then reload through normaliser
    cost_path = _cost_file_path()
    cost_path.parent.mkdir(parents=True, exist_ok=True)
    cost_path.write_text(content.decode("utf-8"), encoding="utf-8")

    # Re-read to normalise and persist in v2 format
    costs = load_costs(cost_path)
    save_costs(cost_path, costs)

    return {"status": "ok", "skus_imported": len(costs)}


@router.get("/costs/export")
async def export_costs():
    """Download the current SKU costs as a JSON file."""
    costs = load_costs(_cost_file_path())
    return JSONResponse(
        content=costs,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=sku_costs.json"},
    )
