"""
pnl.py — P&L computation endpoints.

Orchestrates the full pipeline: parse → resolve → apply COGS → summarise.
Returns the complete PnLResponse that the frontend dashboard consumes.
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.schemas import (
    ComputeRequest,
    LossRateConfig,
    OverallPnL,
    PendingOrdersSummary,
    PnLResponse,
    ReviewOrder,
    SKUPnLRow,
    StatusBreakdownItem,
    UnmappedSKU,
)
from app.services.calculator import (
    apply_cogs,
    build_sku_report,
    build_status_breakdown,
    find_pending_orders,
    resolve_order_level,
    summarize_account_level,
)
from app.services.parser import parse_order_payments, parse_orders_csv
from app.services.sku_costs import get_unmapped_skus, load_costs
from app.utils.helpers import generate_id, safe_round

router = APIRouter(prefix="/api/pnl", tags=["pnl"])


@router.post("/compute", response_model=PnLResponse)
async def compute_pnl(request: ComputeRequest):
    """Run the full P&L computation pipeline.

    Accepts a payment file ID (from a prior upload), optional orders file ID,
    and loss-rate configuration.  Returns the complete PnLResponse.
    """
    # Locate uploaded files
    payment_path = settings.uploads_dir / f"{request.payment_file_id}.xlsx"
    if not payment_path.exists():
        raise HTTPException(404, "Payment file not found. Please upload it first.")

    orders_path = None
    if request.orders_file_id:
        orders_path = settings.uploads_dir / f"{request.orders_file_id}.csv"
        if not orders_path.exists():
            raise HTTPException(404, "Orders file not found. Please upload it first.")

    # Load SKU costs
    cost_file = settings.data_dir / settings.sku_costs_file
    sku_costs = load_costs(cost_file)

    # Build the loss-rates dict the calculator expects
    loss_rates = {
        "rto": request.loss_rates.rto,
        "return": request.loss_rates.return_rate,
        "lost": request.loss_rates.lost,
        "unresolved": request.loss_rates.unresolved,
    }

    # --- Pipeline (mirrors scripts.py main()) ---

    # 1. Parse order payments
    order_payments_raw = parse_order_payments(payment_path)

    # 2. Resolve to one row per Sub Order No
    order_level = resolve_order_level(order_payments_raw)

    # 3. Apply COGS
    order_level = apply_cogs(order_level, sku_costs, loss_rates)

    # 4. Account-level adjustments
    extras = summarize_account_level(payment_path)

    # 5. Build overall P&L
    net_settlement = float(order_level["net_settlement"].sum())
    cogs = float(order_level["cogs"].sum())
    cogs_making = float(order_level["cogs_making"].sum())
    cogs_packaging = float(order_level["cogs_packaging"].sum())
    gross_profit = net_settlement - cogs
    net_profit = (
        gross_profit
        + extras["ads_cost"]
        + extras["referral_income"]
        + extras["compensation_recovery"]
    )

    payment_start = order_payments_raw["Payment Date"].min()
    payment_end = order_payments_raw["Payment Date"].max()

    overall = OverallPnL(
        net_settlement=safe_round(net_settlement),
        cogs=safe_round(cogs),
        cogs_making=safe_round(cogs_making),
        cogs_packaging=safe_round(cogs_packaging),
        gross_profit=safe_round(gross_profit),
        ads_cost=safe_round(extras["ads_cost"]),
        referral_income=safe_round(extras["referral_income"]),
        compensation_recovery=safe_round(extras["compensation_recovery"]),
        net_profit=safe_round(net_profit),
        payment_window_start=str(payment_start.date()) if payment_start is not None else "",
        payment_window_end=str(payment_end.date()) if payment_end is not None else "",
        total_orders=int(order_level["Sub Order No"].nunique()),
        total_units=safe_round(float(order_level["quantity"].sum())),
    )

    # 6. SKU-wise report
    sku_df = build_sku_report(order_level)
    sku_rows = [
        SKUPnLRow(
            sku=row["sku"],
            product_name=row.get("product_name"),
            orders=int(row["orders"]),
            units=safe_round(float(row["units"])),
            gross_sale_amount=safe_round(float(row["gross_sale_amount"])),
            net_settlement=safe_round(float(row["net_settlement"])),
            cogs=safe_round(float(row["cogs"])),
            cogs_making=safe_round(float(row.get("cogs_making", 0))),
            cogs_packaging=safe_round(float(row.get("cogs_packaging", 0))),
            profit=safe_round(float(row["profit"])),
            margin_pct=safe_round(float(row["margin_pct"])) if row["margin_pct"] is not None else None,
            cost_mapped=bool(row["cost_mapped"]),
        )
        for _, row in sku_df.iterrows()
    ]

    # 7. Status breakdown
    status_breakdown = [
        StatusBreakdownItem(**item) for item in build_status_breakdown(order_level)
    ]

    # 8. Unmapped SKUs
    all_skus = set(order_payments_raw["Supplier SKU"].dropna())
    unmapped = get_unmapped_skus(all_skus, sku_costs)

    # Enrich unmapped with order counts
    unmapped_list = []
    for sku in sorted(unmapped):
        sku_orders = order_level[order_level["supplier_sku"] == sku]
        unmapped_list.append(UnmappedSKU(
            sku=sku,
            order_count=len(sku_orders),
            settlement_amount=safe_round(float(sku_orders["net_settlement"].sum())),
        ))

    # 9. Review orders (no status at all)
    review_mask = order_level["status"].isna()
    review_orders = [
        ReviewOrder(
            sub_order_no=row["Sub Order No"],
            sku=row["supplier_sku"],
            net_settlement=safe_round(float(row["net_settlement"])),
        )
        for _, row in order_level[review_mask].iterrows()
    ]

    # 10. Pending orders (optional)
    pending = None
    if orders_path:
        orders_df = parse_orders_csv(orders_path)
        settled_ids = set(order_level["Sub Order No"])
        pending_df = find_pending_orders(orders_df, settled_ids)

        if not pending_df.empty:
            by_status = (
                pending_df.groupby("Reason for Credit Entry")
                .agg(
                    orders=("Sub Order No", "count"),
                    gross_value=("Supplier Discounted Price (Incl GST and Commision)", "sum"),
                )
                .reset_index()
                .to_dict(orient="records")
            )
            pending = PendingOrdersSummary(
                total_pending=len(pending_df),
                total_gross_value=safe_round(
                    float(pending_df["Supplier Discounted Price (Incl GST and Commision)"].sum())
                ),
                by_status=by_status,
            )
        else:
            pending = PendingOrdersSummary(
                total_pending=0, total_gross_value=0.0, by_status=[]
            )

    # Cache results
    result_id = generate_id()
    results_dir = settings.results_dir
    results_dir.mkdir(parents=True, exist_ok=True)

    response = PnLResponse(
        overall=overall,
        sku_rows=sku_rows,
        status_breakdown=status_breakdown,
        unmapped_skus=unmapped_list,
        pending_orders=pending,
        review_orders=review_orders,
        loss_rates=request.loss_rates,
    )

    # Save for later retrieval
    with open(results_dir / f"{result_id}.json", "w", encoding="utf-8") as f:
        f.write(response.model_dump_json(indent=2))

    return response


@router.get("/results/{result_id}", response_model=PnLResponse)
async def get_results(result_id: str):
    """Retrieve cached computation results by ID."""
    path = settings.results_dir / f"{result_id}.json"
    if not path.exists():
        raise HTTPException(404, "Results not found.")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return PnLResponse(**data)
