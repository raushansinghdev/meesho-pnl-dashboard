"""
calculator.py — Core P&L computation engine.

Refactored from scripts.py.  Implements both the original v1 flat-cost model
and the v2 making_cost + packaging_cost model described in Readme.md §6.

Key design decisions preserved from the original:
- One final status per Sub Order No, resolved by STATUS_PRIORITY.
- COGS charged based on resolved status × configurable loss rates.
- Ads/Referral/Compensation are account-level only — never allocated per-SKU.
"""

from __future__ import annotations

from typing import IO

import pandas as pd

from app.config import (
    COGS_FULL_STATUSES,
    COGS_ZERO_STATUSES,
    CONFIGURABLE_LOSS_STATUSES,
    STATUS_PRIORITY,
)
from app.services.parser import _to_num, parse_small_sheet


# ---------------------------------------------------------------------------
# Step 1: Collapse multi-row settlement legs into one row per order
# ---------------------------------------------------------------------------

def resolve_order_level(df: pd.DataFrame) -> pd.DataFrame:
    """Collapse the Order Payments DataFrame to one row per Sub Order No.

    For each order:
    - Settlement amounts are SUMMED (handles multi-leg payments).
    - Status is resolved to the highest-priority terminal outcome.
    - SKU, product name, order date come from the first row.
    - Quantity takes the MAX (same line item, not summed across legs).
    """

    def _pick_status(statuses: pd.Series) -> str | None:
        clean = [s for s in statuses if pd.notna(s)]
        if not clean:
            return None
        return max(clean, key=lambda s: STATUS_PRIORITY.get(s.lower(), 0))

    grouped = df.groupby("Sub Order No").agg(
        supplier_sku=("Supplier SKU", "first"),
        product_name=("Product Name", "first") if "Product Name" in df.columns else ("Supplier SKU", "first"),
        order_date=("Order Date", "min"),
        payment_date=("Payment Date", "max"),
        quantity=("Quantity", "max"),
        gross_sale_amount=("Total Sale Amount (Incl. Shipping & GST)", "sum"),
        net_settlement=("Final Settlement Amount", "sum"),
        status=("Live Order Status", _pick_status),
    ).reset_index()

    grouped["status_norm"] = grouped["status"].fillna("unknown").str.lower()
    return grouped


# ---------------------------------------------------------------------------
# Step 2: Apply COGS (v2 model: making + packaging split)
# ---------------------------------------------------------------------------

def apply_cogs(
    order_level: pd.DataFrame,
    sku_costs: dict[str, dict],
    loss_rates: dict[str, float],
) -> pd.DataFrame:
    """Apply v2 COGS logic with making_cost + packaging_cost split.

    sku_costs: {sku: {"making_cost": float, "packaging_cost": float}}
    loss_rates: {"rto": float, "return": float, "lost": float, "unresolved": float}

    v2 COGS rules (from Readme.md §6):
        Delivered / Exchange → making + packaging (100%)
        RTO                 → packaging only (making cost NOT charged)
        Customer Return     → making + packaging (100%)
        Lost                → making + packaging (100%)
        Cancelled           → nothing
        Unresolved/Shipped  → uses unresolved loss rate × (making + packaging)
    """

    def _lookup_cost(sku: str, component: str) -> float:
        entry = sku_costs.get(sku)
        if entry is None:
            return 0.0
        return entry.get(component, 0.0)

    order_level["making_cost"] = order_level["supplier_sku"].apply(
        lambda s: _lookup_cost(s, "making_cost")
    )
    order_level["packaging_cost"] = order_level["supplier_sku"].apply(
        lambda s: _lookup_cost(s, "packaging_cost")
    )
    order_level["unit_cost"] = order_level["making_cost"] + order_level["packaging_cost"]
    order_level["cost_mapped"] = order_level["supplier_sku"].apply(
        lambda s: s in sku_costs and sku_costs[s] is not None
    )

    def _compute_cogs(row: pd.Series) -> tuple[float, float]:
        """Return (making_cogs, packaging_cogs) for one order."""
        status = row["status_norm"]
        qty = row["quantity"]
        making = row["making_cost"]
        packaging = row["packaging_cost"]

        if status in COGS_ZERO_STATUSES:
            return 0.0, 0.0

        if status in COGS_FULL_STATUSES:
            return making * qty, packaging * qty

        pkg_rate = loss_rates.get("packaging_loss", 1.0)

        if status == "rto":
            # RTO: product comes back resellable
            rate = loss_rates.get("rto", 0.0)
            return making * qty * rate, packaging * qty * pkg_rate

        if status == "return":
            rate = loss_rates.get("return", 1.0)
            return making * qty * rate, packaging * qty * pkg_rate

        if status == "lost":
            rate = loss_rates.get("lost", 1.0)
            return making * qty * rate, packaging * qty * pkg_rate

        # Unresolved / shipped / unknown
        rate = loss_rates.get("unresolved", 0.0)
        return making * qty * rate, packaging * qty * pkg_rate

    cogs_split = order_level.apply(_compute_cogs, axis=1, result_type="expand")
    cogs_split.columns = ["cogs_making", "cogs_packaging"]

    order_level["cogs_making"] = cogs_split["cogs_making"]
    order_level["cogs_packaging"] = cogs_split["cogs_packaging"]
    order_level["cogs"] = order_level["cogs_making"] + order_level["cogs_packaging"]
    order_level["profit"] = order_level["net_settlement"] - order_level["cogs"]

    return order_level


# ---------------------------------------------------------------------------
# Step 3: Summarise account-level adjustments (ads, referral, comp/recovery)
# ---------------------------------------------------------------------------

def summarize_account_level(source) -> dict[str, float]:
    """Extract ads cost, referral income, and compensation/recovery totals.

    These are account-level (not per-SKU) because Meesho's export provides
    no SKU or order linkage for these sheets.
    """
    out = {"ads_cost": 0.0, "referral_income": 0.0, "compensation_recovery": 0.0}

    ads = parse_small_sheet(source, "Ads Cost")
    if not ads.empty and "Total Ads Cost" in ads.columns:
        out["ads_cost"] = _to_num(ads["Total Ads Cost"]).sum()

    # Need to re-open the file for each sheet if source is a file-like object
    ref = parse_small_sheet(source, "Referral Payments")
    if not ref.empty and "Net Referral Amount" in ref.columns:
        out["referral_income"] = _to_num(ref["Net Referral Amount"]).sum()

    comp = parse_small_sheet(source, "Compensation and Recovery")
    if not comp.empty and "Amount (inc GST) INR" in comp.columns:
        out["compensation_recovery"] = _to_num(comp["Amount (inc GST) INR"]).sum()

    return out


# ---------------------------------------------------------------------------
# Step 4: Build the SKU-wise P&L report
# ---------------------------------------------------------------------------

def build_sku_report(order_level: pd.DataFrame) -> pd.DataFrame:
    """Aggregate order-level data into a SKU-wise P&L table, sorted by profit."""

    sku = order_level.groupby("supplier_sku").agg(
        orders=("Sub Order No", "count"),
        units=("quantity", "sum"),
        gross_sale_amount=("gross_sale_amount", "sum"),
        net_settlement=("net_settlement", "sum"),
        cogs=("cogs", "sum"),
        cogs_making=("cogs_making", "sum"),
        cogs_packaging=("cogs_packaging", "sum"),
        profit=("profit", "sum"),
        cost_mapped=("cost_mapped", "all"),
        product_name=("product_name", "first"),
    ).reset_index().rename(columns={"supplier_sku": "sku"})

    # Margin % only meaningful when net settlement is positive
    positive_rev = sku["net_settlement"] > 0
    sku["margin_pct"] = None
    sku.loc[positive_rev, "margin_pct"] = (
        sku.loc[positive_rev, "profit"]
        / sku.loc[positive_rev, "net_settlement"]
        * 100
    ).round(2)

    sku = sku.sort_values("profit", ascending=False)
    return sku


# ---------------------------------------------------------------------------
# Step 5: Identify pending (unsettled) orders
# ---------------------------------------------------------------------------

def find_pending_orders(
    orders_df: pd.DataFrame, settled_sub_order_nos: set[str]
) -> pd.DataFrame:
    """Find orders placed in the window that haven't been settled yet."""
    return orders_df[~orders_df["Sub Order No"].isin(settled_sub_order_nos)].copy()


# ---------------------------------------------------------------------------
# Step 6: Build the status breakdown for the donut chart
# ---------------------------------------------------------------------------

def build_status_breakdown(order_level: pd.DataFrame) -> list[dict]:
    """Aggregate orders by resolved status for the status-donut chart."""
    total = len(order_level)
    breakdown = (
        order_level.groupby("status_norm")
        .agg(
            order_count=("Sub Order No", "count"),
            total_settlement=("net_settlement", "sum"),
        )
        .reset_index()
        .rename(columns={"status_norm": "status"})
    )
    breakdown["percentage"] = (breakdown["order_count"] / total * 100).round(2)
    return breakdown.to_dict(orient="records")
