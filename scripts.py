#!/usr/bin/env python3
"""
meesho_pnl.py -- Overall + SKU-wise P&L calculator for a Meesho seller account.

WHY THIS SCRIPT IS BUILT THE WAY IT IS
=======================================================================
Meesho gives you two very different exports, and they do NOT cover the
same set of orders:

  1. The "...PAYMENT_FILE..." workbook's "Order Payments" sheet is
     organised by PAYMENT DATE, not order date. Its filename says
     2026-08-01_2026-08-31, but the underlying orders in it stretch back
     to mid-July -- because an order placed in July can easily get PAID
     in August (delivery + Meesho's settlement cycle takes 1-4 weeks).
     This sheet is the source of truth for ACTUAL MONEY RECEIVED.

  2. The "Orders_..." CSV is organised by ORDER DATE (all rows are
     August orders here), and lists every order placed in the window --
     including ones that are still in transit / not yet paid at all.
     It has no fee/commission/settlement breakdown, only the gross
     order value.

So "real" P&L for a payment period = the Order Payments sheet.
The Orders CSV is used only to tell you how much business is sitting
in the pipeline, not yet reflected in any settlement.

KEY ASSUMPTIONS (change the constants/flags below if your business works
differently):

  * Final Settlement Amount (as computed by Meesho) is trusted as-is;
    we do not recompute commission/GST/shipping ourselves. Meesho's own
    per-line formula already nets every fee, TCS/TDS, and per-order
    compensation/claim/recovery into this one number.

  * A single Sub Order No can appear on MULTIPLE rows (an initial
    settlement leg, plus a later return/adjustment leg). We SUM
    Final Settlement Amount per Sub Order No -- that sum is the true
    net amount paid for that order.

  * Live Order Status can differ across those rows for the same Sub
    Order No (e.g. "Shipped" on the first leg, "Return" on the
    reversal leg that arrives weeks later). We resolve ONE final status
    per Sub Order No using the priority order in STATUS_PRIORITY below
    (a later return/RTO/cancellation always supersedes an earlier
    shipped/delivered snapshot).

  * COGS (product cost) is charged only for orders whose final status
    is Delivered or Exchange -- i.e. the customer kept the item.
    RTO and Customer Return are treated separately, each with its own
    configurable loss rate, because they're different failure modes:
      - RTO (buyer never accepted delivery): item never left courier
        custody in the buyer's hands, so by default it's assumed to
        come back to your warehouse resellable --> --rto-loss-rate
        defaults to 0.0 (no COGS charged).
      - Customer Return (buyer accepted, then returned): by default
        assumed damaged / swapped / stolen more often than not, since
        that's the real-world pattern for handmade goods --> so
        --return-loss-rate defaults to 1.0 (full COGS charged, same
        as a genuine sale).
      - Lost (courier lost the shipment): item is genuinely gone -->
        --lost-loss-rate defaults to 1.0 (full COGS charged).
    Override any of these per your own experience, e.g.
    --rto-loss-rate 0.1 if some RTOs do come back damaged. Cancelled
    orders never shipped, so they never carry COGS regardless.

  * Ads Cost, Referral Payments, and Compensation/Recovery sheets are
    ACCOUNT-LEVEL (not tied to a SKU or even always to a Sub Order No),
    so they're folded into the OVERALL P&L only, never allocated
    per-SKU.

  * SKU matching is case-sensitive / exact-string, deliberately not
    fuzzy. This data has near-duplicate SKU codes (BQ_RS_01 vs
    BQ_RS_001 vs bq_rs_1 ...) that look like the same product but are
    NOT silently merged here -- any SKU missing from your cost JSON is
    listed at the end of the report so you can decide whether to fix
    the SKU on Meesho's catalog side or add the variant to your cost
    file.

  * Orders placed in this window with no matching Sub Order No anywhere
    in the payment file are reported separately as "Pending / Not Yet
    Settled" and are EXCLUDED from the realized P&L -- counting them
    at listing price would double-count once they actually settle, and
    until they settle we don't know if they'll end up Delivered, RTO,
    or Return.

USAGE
=======================================================================
    python meesho_pnl.py \\
        --payment-file  "4497632_SP_ORDER_ADS_REFERRAL_PAYMENT_FILE_....xlsx" \\
        --orders-file   "Orders_2026-08-01_2026-08-31_....csv" \\
        --sku-cost-file sku_costs.json \\
        --output-dir    ./pnl_output

If --sku-cost-file doesn't exist yet, the script writes a TEMPLATE there
(every SKU found in your data, cost set to null) and stops, so you can
fill in real numbers and re-run.
"""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

# ----------------------------------------------------------------------
# Tunable business-logic constants
# ----------------------------------------------------------------------

# Higher number = takes priority when the same Sub Order No shows up with
# more than one status across its settlement rows. Terminal / final-word
# outcomes (a return that arrives after an initial "Shipped" snapshot)
# should always win over an earlier, superseded snapshot.
STATUS_PRIORITY = {
    "cancelled": 5,
    "rto": 4,
    "return": 4,
    "exchange": 3,
    "delivered": 2,
    "shipped": 1,
    "lost": 4,
}

# Statuses for which we treat the item as "kept by the customer" and
# therefore charge full (100%) COGS, not subject to any loss-rate flag.
COGS_FULL_STATUSES = {"delivered", "exchange"}

# Statuses that never carry COGS, regardless of any loss-rate flag
# (order never left the warehouse / never reached the customer as sold).
COGS_ZERO_STATUSES = {"cancelled"}

# Statuses with their own independently configurable loss rate -- maps
# status -> the argparse attribute name holding that rate.
CONFIGURABLE_LOSS_STATUSES = {
    "rto": "rto_loss_rate",
    "return": "return_loss_rate",
    "lost": "lost_loss_rate",
}


# ----------------------------------------------------------------------
# Loading & cleaning
# ----------------------------------------------------------------------

def to_num(series):
    """Meesho exports these columns as text (a description row above the
    data forces pandas to read the whole column as object/str). Coerce to
    float, treating blanks/garbage as 0."""
    return pd.to_numeric(series, errors="coerce").fillna(0.0)


def load_sku_costs(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    # Accept either {"SKU": 45} or {"SKU": {"cost": 45, ...}}
    costs = {}
    for sku, val in raw.items():
        if isinstance(val, dict):
            costs[sku] = val.get("cost")
        else:
            costs[sku] = val
    return costs


def write_sku_cost_template(path: Path, skus: set):
    template = {sku: None for sku in sorted(skus)}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(template, f, indent=2, ensure_ascii=False)


def load_order_payments(xlsx_path: Path) -> pd.DataFrame:
    """Read the 'Order Payments' sheet, dropping the formula-legend row
    that sits directly under the header (row 0 after header=1)."""
    df = pd.read_excel(xlsx_path, sheet_name="Order Payments", header=1)
    df = df.iloc[1:].reset_index(drop=True)

    df["Sub Order No"] = df["Sub Order No"].astype(str).str.strip()
    df["Supplier SKU"] = df["Supplier SKU"].astype(str).str.strip()
    df["Live Order Status"] = df["Live Order Status"].astype(str).str.strip()
    df.loc[df["Live Order Status"].isin(["nan", "None", ""]), "Live Order Status"] = pd.NA

    df["Order Date"] = pd.to_datetime(df["Order Date"], errors="coerce")
    df["Payment Date"] = pd.to_datetime(df["Payment Date"], errors="coerce")

    df["Final Settlement Amount"] = to_num(df["Final Settlement Amount"])
    df["Total Sale Amount (Incl. Shipping & GST)"] = to_num(
        df["Total Sale Amount (Incl. Shipping & GST)"]
    )
    df["Quantity"] = to_num(df["Quantity"])

    return df


def load_small_sheet(xlsx_path: Path, sheet_name: str) -> pd.DataFrame:
    """Ads Cost / Referral Payments / Compensation and Recovery sheets
    share the same layout: title row, header row, blank row, then data
    (or a single 'No data is available for these dates.' row)."""
    df = pd.read_excel(xlsx_path, sheet_name=sheet_name, header=1)
    df = df.iloc[1:].reset_index(drop=True)  # drop the formula-legend / blank row
    if df.empty:
        return df
    first_col = df.columns[0]
    df = df[~df[first_col].astype(str).str.contains("No data is available", na=False)]
    return df.reset_index(drop=True)


def load_orders_csv(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df = df.drop_duplicates()  # exact-duplicate export rows seen in practice
    df["Sub Order No"] = df["Sub Order No"].astype(str).str.strip()
    df["SKU"] = df["SKU"].astype(str).str.strip()
    df["Order Date"] = pd.to_datetime(df["Order Date"], errors="coerce")
    df["Quantity"] = pd.to_numeric(df["Quantity"], errors="coerce").fillna(0.0)
    df["Supplier Discounted Price (Incl GST and Commision)"] = pd.to_numeric(
        df["Supplier Discounted Price (Incl GST and Commision)"], errors="coerce"
    ).fillna(0.0)
    return df


# ----------------------------------------------------------------------
# Core computation
# ----------------------------------------------------------------------

def resolve_order_level(df: pd.DataFrame) -> pd.DataFrame:
    """Collapse the (possibly multi-row) Order Payments sheet to one row
    per Sub Order No: net settlement summed, one SKU, one resolved
    status, total units."""

    def pick_status(statuses):
        clean = [s for s in statuses if pd.notna(s)]
        if not clean:
            return None
        return max(clean, key=lambda s: STATUS_PRIORITY.get(s.lower(), 0))

    grouped = df.groupby("Sub Order No").agg(
        supplier_sku=("Supplier SKU", "first"),
        product_name=("Product Name", "first"),
        order_date=("Order Date", "min"),
        payment_date=("Payment Date", "max"),
        quantity=("Quantity", "max"),  # same order line, don't sum across settlement legs
        gross_sale_amount=("Total Sale Amount (Incl. Shipping & GST)", "sum"),
        net_settlement=("Final Settlement Amount", "sum"),
        status=("Live Order Status", pick_status),
    ).reset_index()

    grouped["status_norm"] = grouped["status"].fillna("unknown").str.lower()
    return grouped


def apply_cogs(order_level: pd.DataFrame, sku_costs: dict, loss_rates: dict):
    """loss_rates: {'rto': .., 'return': .., 'lost': .., 'unresolved': ..}
    -- fraction of COGS charged for each of those outcomes."""
    unit_cost = order_level["supplier_sku"].map(sku_costs)
    order_level["unit_cost"] = unit_cost
    order_level["cost_mapped"] = unit_cost.notna()

    def cogs_fraction(status_norm):
        if status_norm in COGS_ZERO_STATUSES:
            return 0.0
        if status_norm in COGS_FULL_STATUSES:
            return 1.0
        if status_norm in CONFIGURABLE_LOSS_STATUSES:
            return loss_rates[status_norm]
        # "shipped" (still in transit, outcome not yet known) or "unknown"
        # (orphan adjustment-only leg, primary status recorded elsewhere)
        return loss_rates["unresolved"]

    order_level["cogs_fraction"] = order_level["status_norm"].map(cogs_fraction)
    order_level["cogs"] = (
        order_level["unit_cost"].fillna(0.0)
        * order_level["quantity"]
        * order_level["cogs_fraction"]
    )
    order_level["profit"] = order_level["net_settlement"] - order_level["cogs"]
    return order_level


def summarize_ads_referral_recovery(xlsx_path: Path) -> dict:
    out = {"ads_cost": 0.0, "referral_income": 0.0, "compensation_recovery": 0.0}

    ads = load_small_sheet(xlsx_path, "Ads Cost")
    if not ads.empty and "Total Ads Cost" in ads.columns:
        out["ads_cost"] = to_num(ads["Total Ads Cost"]).sum()

    ref = load_small_sheet(xlsx_path, "Referral Payments")
    if not ref.empty and "Net Referral Amount" in ref.columns:
        out["referral_income"] = to_num(ref["Net Referral Amount"]).sum()

    comp = load_small_sheet(xlsx_path, "Compensation and Recovery")
    if not comp.empty and "Amount (inc GST) INR" in comp.columns:
        out["compensation_recovery"] = to_num(comp["Amount (inc GST) INR"]).sum()

    return out


def find_pending_orders(orders_df: pd.DataFrame, settled_sub_order_nos: set) -> pd.DataFrame:
    pending = orders_df[~orders_df["Sub Order No"].isin(settled_sub_order_nos)].copy()
    return pending


# ----------------------------------------------------------------------
# Reporting
# ----------------------------------------------------------------------

def build_sku_report(order_level: pd.DataFrame) -> pd.DataFrame:
    sku = order_level.groupby("supplier_sku").agg(
        orders=("Sub Order No" if "Sub Order No" in order_level.columns else "supplier_sku", "count"),
        units=("quantity", "sum"),
        gross_sale_amount=("gross_sale_amount", "sum"),
        net_settlement=("net_settlement", "sum"),
        cogs=("cogs", "sum"),
        profit=("profit", "sum"),
        cost_mapped=("cost_mapped", "all"),
    ).reset_index().rename(columns={"supplier_sku": "sku"})
    # Margin % is only meaningful when net settlement is positive -- with a
    # negative denominator the ratio is technically defined but not
    # interpretable as a normal margin, so leave it blank in that case.
    positive_rev = sku["net_settlement"] > 0
    sku["margin_pct"] = pd.NA
    sku.loc[positive_rev, "margin_pct"] = (
        sku.loc[positive_rev, "profit"] / sku.loc[positive_rev, "net_settlement"] * 100
    ).round(2)
    sku = sku.sort_values("profit", ascending=False)
    return sku


def print_report(overall: dict, sku_df: pd.DataFrame, pending_df: pd.DataFrame,
                  unmapped_skus: set, review_df: pd.DataFrame, payment_window: tuple,
                  loss_rates: dict):
    line = "=" * 72
    print(line)
    print(f"MEESHO REALIZED P&L  |  payments settled {payment_window[0]} to {payment_window[1]}")
    print("(cash/settlement basis -- covers whichever order dates actually got paid")
    print(" in this window, not only orders placed in it)")
    print(f"COGS loss assumptions -- RTO: {loss_rates['rto']*100:.0f}%  "
          f"Customer Return: {loss_rates['return']*100:.0f}%  "
          f"Lost: {loss_rates['lost']*100:.0f}%  "
          f"Unresolved: {loss_rates['unresolved']*100:.0f}%")
    print(line)
    print(f"{'Net settlement (revenue)':38s} {overall['net_settlement']:>14,.2f}")
    print(f"{'COGS':38s} {-overall['cogs']:>14,.2f}")
    print(f"{'Gross profit (SKU-level)':38s} {overall['gross_profit']:>14,.2f}")
    print(f"{'Ads cost':38s} {overall['ads_cost']:>14,.2f}")
    print(f"{'Referral income':38s} {overall['referral_income']:>14,.2f}")
    print(f"{'Other compensation / recovery':38s} {overall['compensation_recovery']:>14,.2f}")
    print("-" * 72)
    print(f"{'NET PROFIT':38s} {overall['net_profit']:>14,.2f}")
    print(line)

    print("\nSKU-WISE P&L (sorted by profit)")
    print("-" * 72)
    with pd.option_context("display.max_rows", None, "display.width", 140):
        print(sku_df.to_string(index=False, float_format=lambda x: f"{x:,.2f}"))

    if unmapped_skus:
        print("\n" + "!" * 72)
        print(f"{len(unmapped_skus)} SKU(s) seen in your data have NO cost in the JSON file")
        print("-> for any of these in a settled order, COGS was treated as 0, so that")
        print("   SKU's 'profit' above is overstated. (Some may only appear in pending")
        print("   orders below and won't affect this month's numbers yet.)")
        print("Add these to your cost file and re-run:")
        for s in sorted(unmapped_skus):
            print(f"   - {s}")
        print("!" * 72)

    if not pending_df.empty:
        print(f"\nPENDING / NOT YET SETTLED (placed in this window, no payment yet)")
        print("-" * 72)
        print("Not included in the P&L above -- outcome (Delivered vs RTO vs Return)")
        print("and hence the actual payout isn't known until Meesho settles it.")
        by_status = pending_df.groupby("Reason for Credit Entry").agg(
            orders=("Sub Order No", "count"),
            gross_order_value=("Supplier Discounted Price (Incl GST and Commision)", "sum"),
        ).reset_index().sort_values("orders", ascending=False)
        print(by_status.to_string(index=False, float_format=lambda x: f"{x:,.2f}"))
        print(f"\nTotal pending orders: {len(pending_df)}   "
              f"Total gross order value: {pending_df['Supplier Discounted Price (Incl GST and Commision)'].sum():,.2f}")

    if not review_df.empty:
        print(f"\nREVIEW: {len(review_df)} settled order(s) with no recognisable status at all")
        print("(cost charged at the --unresolved-loss-rate since outcome is unclear)")
        print(review_df[["Sub Order No", "supplier_sku", "net_settlement"]].to_string(index=False))


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--payment-file", required=True, type=Path, help="Meesho *_PAYMENT_FILE_*.xlsx")
    ap.add_argument("--orders-file", required=False, type=Path, default=None,
                     help="Meesho Orders_*.csv (optional). Not used in the P&L math at all -- the "
                          "payment file alone has everything needed for that. This is only used to "
                          "additionally show a 'Pending / Not Yet Settled' section: orders placed in "
                          "this window that haven't been paid yet. Skip this flag if you don't need "
                          "that pipeline visibility.")
    ap.add_argument("--sku-cost-file", required=True, type=Path, help="JSON of SKU -> per-unit cost")
    ap.add_argument("--output-dir", type=Path, default=Path("."), help="Where to write CSV reports")
    ap.add_argument("--rto-loss-rate", type=float, default=0.0,
                     help="Fraction (0-1) of COGS charged on RTO units (buyer never accepted "
                          "delivery). Default 0.0 = assume item comes back resellable.")
    ap.add_argument("--return-loss-rate", type=float, default=1.0,
                     help="Fraction (0-1) of COGS charged on Customer Return units (buyer accepted, "
                          "then returned). Default 1.0 = assume damaged/swapped/unsellable.")
    ap.add_argument("--lost-loss-rate", type=float, default=1.0,
                     help="Fraction (0-1) of COGS charged when the courier lost the shipment. "
                          "Default 1.0 = item is genuinely gone.")
    ap.add_argument("--unresolved-loss-rate", type=float, default=0.0,
                     help="Fraction (0-1) of COGS charged for orders whose outcome isn't yet known "
                          "as of this file (still 'Shipped', or an orphan settlement leg with no "
                          "status). Default 0.0 = don't charge COGS until the outcome is confirmed.")
    args = ap.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    order_payments_raw = load_order_payments(args.payment_file)
    orders_df = load_orders_csv(args.orders_file) if args.orders_file else None

    all_skus = set(order_payments_raw["Supplier SKU"].dropna())
    if orders_df is not None:
        all_skus |= set(orders_df["SKU"].dropna())

    if not args.sku_cost_file.exists():
        write_sku_cost_template(args.sku_cost_file, all_skus)
        print(f"No cost file found at {args.sku_cost_file}.")
        print(f"Wrote a template with {len(all_skus)} SKU(s) found in your data -- fill in the")
        print("per-unit cost for each, then re-run this script.")
        sys.exit(0)

    sku_costs = load_sku_costs(args.sku_cost_file)

    loss_rates = {
        "rto": args.rto_loss_rate,
        "return": args.return_loss_rate,
        "lost": args.lost_loss_rate,
        "unresolved": args.unresolved_loss_rate,
    }
    order_level = resolve_order_level(order_payments_raw)
    order_level = apply_cogs(order_level, sku_costs, loss_rates)

    unmapped_skus = set(order_level.loc[~order_level["cost_mapped"], "supplier_sku"]) | {
        s for s in all_skus if s not in sku_costs or sku_costs.get(s) is None
    }

    review_df = order_level[order_level["status"].isna()][["Sub Order No", "supplier_sku", "net_settlement"]]

    overall = {
        "net_settlement": order_level["net_settlement"].sum(),
        "cogs": order_level["cogs"].sum(),
    }
    overall["gross_profit"] = overall["net_settlement"] - overall["cogs"]

    extra = summarize_ads_referral_recovery(args.payment_file)
    overall.update(extra)
    overall["net_profit"] = (
        overall["gross_profit"]
        + overall["ads_cost"]
        + overall["referral_income"]
        + overall["compensation_recovery"]
    )

    sku_df = build_sku_report(order_level)

    settled_sub_order_nos = set(order_level["Sub Order No"])
    pending_df = find_pending_orders(orders_df, settled_sub_order_nos) if orders_df is not None else pd.DataFrame()

    payment_window = (
        order_payments_raw["Payment Date"].min().date(),
        order_payments_raw["Payment Date"].max().date(),
    )

    print_report(overall, sku_df, pending_df, unmapped_skus, review_df, payment_window, loss_rates)

    sku_df.to_csv(args.output_dir / "sku_wise_pnl.csv", index=False)
    with open(args.output_dir / "overall_pnl.json", "w", encoding="utf-8") as f:
        json.dump({k: round(v, 2) for k, v in overall.items()}, f, indent=2)
    if not pending_df.empty:
        pending_df.to_csv(args.output_dir / "pending_orders.csv", index=False)

    print(f"\nWritten: {args.output_dir / 'sku_wise_pnl.csv'}")
    print(f"Written: {args.output_dir / 'overall_pnl.json'}")
    if not pending_df.empty:
        print(f"Written: {args.output_dir / 'pending_orders.csv'}")


if __name__ == "__main__":
    main()