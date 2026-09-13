"""
Pydantic models for API request/response payloads.

These are pure data-transfer objects — no business logic lives here.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# SKU costs
# ---------------------------------------------------------------------------

class SKUCostV2(BaseModel):
    """v2 cost model: making + packaging split."""

    making_cost: float = Field(0.0, ge=0, description="Per-unit making/material cost (₹)")
    packaging_cost: float = Field(0.0, ge=0, description="Per-unit packaging cost (₹)")


class SKUCostEntry(BaseModel):
    """A single SKU's cost record as returned by the API."""

    sku: str
    making_cost: float
    packaging_cost: float
    total_cost: float = Field(description="making_cost + packaging_cost")


class SKUCostUpdateRequest(BaseModel):
    """Bulk update payload: {sku: {making_cost, packaging_cost}}."""

    costs: dict[str, SKUCostV2]


class SKUCostSingleUpdate(BaseModel):
    """Single-SKU update payload."""

    making_cost: float = Field(ge=0)
    packaging_cost: float = Field(ge=0)


# ---------------------------------------------------------------------------
# Loss rates
# ---------------------------------------------------------------------------

class LossRateConfig(BaseModel):
    """User-adjustable COGS loss-rate assumptions (0.0 – 1.0)."""

    rto: float = Field(0.0, ge=0, le=1)
    return_rate: float = Field(1.0, ge=0, le=1, alias="return", description="Customer-return loss rate")
    lost: float = Field(1.0, ge=0, le=1, description="Lost-shipment loss rate")
    unresolved: float = Field(0.0, ge=0, le=1, description="Unresolved/shipped loss rate")
    rto_packaging_loss: float = Field(1.0, ge=0, le=1, description="Packaging loss rate for RTOs")
    return_packaging_loss: float = Field(1.0, ge=0, le=1, description="Packaging loss rate for Returns")


# ---------------------------------------------------------------------------
# P&L computation results
# ---------------------------------------------------------------------------

class OverallPnL(BaseModel):
    """Top-level P&L summary."""

    net_settlement: float
    cogs: float
    cogs_making: float = 0.0
    cogs_packaging: float = 0.0
    gross_profit: float
    ads_cost: float
    referral_income: float
    compensation_recovery: float
    net_profit: float
    payment_window_start: str
    payment_window_end: str
    total_orders: int
    total_units: float


class SKUPnLRow(BaseModel):
    """One row in the SKU-wise P&L table."""

    sku: str
    product_name: str | None = None
    orders: int
    units: float
    gross_sale_amount: float
    net_settlement: float
    cogs: float
    cogs_making: float = 0.0
    cogs_packaging: float = 0.0
    profit: float
    margin_pct: float | None = None
    cost_mapped: bool


class StatusBreakdownItem(BaseModel):
    """One segment of the order-status donut chart."""

    status: str
    order_count: int
    total_settlement: float
    percentage: float


class PendingOrdersSummary(BaseModel):
    """Summary of orders placed but not yet settled."""

    total_pending: int
    total_gross_value: float
    by_status: list[dict]


class ReviewOrder(BaseModel):
    """Order with no recognisable status — flagged for manual review."""

    sub_order_no: str
    sku: str
    net_settlement: float


class UnmappedSKU(BaseModel):
    """SKU found in data but missing from the cost file."""

    sku: str
    order_count: int = 0
    settlement_amount: float = 0.0


class PnLResponse(BaseModel):
    """Complete response from the /api/pnl/compute endpoint."""

    overall: OverallPnL
    sku_rows: list[SKUPnLRow]
    status_breakdown: list[StatusBreakdownItem]
    unmapped_skus: list[UnmappedSKU]
    pending_orders: PendingOrdersSummary | None = None
    review_orders: list[ReviewOrder]
    loss_rates: LossRateConfig


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    """Returned after a successful file upload."""

    file_id: str
    filename: str
    payment_window_start: str | None = None
    payment_window_end: str | None = None
    order_count: int | None = None
    sheets_found: list[str] | None = None


# ---------------------------------------------------------------------------
# Compute request
# ---------------------------------------------------------------------------

class ComputeRequest(BaseModel):
    """Payload for POST /api/pnl/compute."""

    payment_file_id: str
    orders_file_id: str | None = None
    loss_rates: LossRateConfig = Field(default_factory=LossRateConfig)
