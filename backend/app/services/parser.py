"""
parser.py — Excel/CSV parsing for Meesho export files.

Refactored from scripts.py.  Every parsing gotcha documented in Readme.md §2.1
is preserved here:

- Formula-legend row (row 0 after header=1) is dropped from every sheet.
- Numeric columns are coerced with pd.to_numeric because Meesho exports them
  as text/object dtype.
- Sub Order No can appear on multiple rows — callers must NOT deduplicate.
- Live Order Status can differ across rows for the same Sub Order No.
- SKU matching is exact-string, case-sensitive.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import BinaryIO

import pandas as pd


def _to_num(series: pd.Series) -> pd.Series:
    """Coerce a text-typed numeric column to float, blanks → 0."""
    return pd.to_numeric(series, errors="coerce").fillna(0.0)


# ---------------------------------------------------------------------------
# Order Payments sheet (source of truth for revenue + COGS)
# ---------------------------------------------------------------------------

def parse_order_payments(source: Path | BinaryIO) -> pd.DataFrame:
    """Parse the 'Order Payments' sheet from a Meesho payment-file xlsx.

    Returns one row per settlement leg — callers must group by Sub Order No
    to get the true net settlement per order.
    """
    df = pd.read_excel(source, sheet_name="Order Payments", header=1)

    # Drop the formula-legend / description row that sits directly under
    # the real header (it's row 0 after we set header=1).
    df = df.iloc[1:].reset_index(drop=True)

    # Clean key text columns
    df["Sub Order No"] = df["Sub Order No"].astype(str).str.strip()
    df["Supplier SKU"] = df["Supplier SKU"].astype(str).str.strip()
    df["Live Order Status"] = df["Live Order Status"].astype(str).str.strip()

    # Blank / sentinel status values → pd.NA
    df.loc[
        df["Live Order Status"].isin(["nan", "None", ""]),
        "Live Order Status",
    ] = pd.NA

    # Parse dates
    df["Order Date"] = pd.to_datetime(df["Order Date"], errors="coerce")
    df["Payment Date"] = pd.to_datetime(df["Payment Date"], errors="coerce")

    # Coerce numeric columns that Meesho exports as text
    df["Final Settlement Amount"] = _to_num(df["Final Settlement Amount"])
    df["Total Sale Amount (Incl. Shipping & GST)"] = _to_num(
        df["Total Sale Amount (Incl. Shipping & GST)"]
    )
    df["Quantity"] = _to_num(df["Quantity"])

    # Preserve Product Name if present
    if "Product Name" in df.columns:
        df["Product Name"] = df["Product Name"].astype(str).str.strip()

    return df


# ---------------------------------------------------------------------------
# Small auxiliary sheets (Ads Cost, Referral Payments, Comp & Recovery)
# ---------------------------------------------------------------------------

def parse_small_sheet(source: Path | BinaryIO, sheet_name: str) -> pd.DataFrame:
    """Parse an auxiliary sheet from the payment-file xlsx.

    These sheets share the same layout quirk: a title row, then the header
    row, then a blank / legend row, then data (or a single 'No data is
    available for these dates.' row).
    """
    df = pd.read_excel(source, sheet_name=sheet_name, header=1)
    # Drop the legend / blank row
    df = df.iloc[1:].reset_index(drop=True)

    if df.empty:
        return df

    # Drop the "No data is available..." sentinel row
    first_col = df.columns[0]
    df = df[
        ~df[first_col].astype(str).str.contains("No data is available", na=False)
    ]
    return df.reset_index(drop=True)


# ---------------------------------------------------------------------------
# Orders CSV (optional — pending-order visibility only)
# ---------------------------------------------------------------------------

def parse_orders_csv(source: Path | BinaryIO) -> pd.DataFrame:
    """Parse the Meesho Orders_*.csv export.

    This file is organised by ORDER DATE and has no settlement breakdown.
    It is NOT used for P&L math — only for showing which orders in this
    window haven't been paid yet.
    """
    df = pd.read_csv(source)
    df = df.drop_duplicates()  # exact-duplicate export rows seen in practice

    df["Sub Order No"] = df["Sub Order No"].astype(str).str.strip()
    df["SKU"] = df["SKU"].astype(str).str.strip()
    df["Order Date"] = pd.to_datetime(df["Order Date"], errors="coerce")
    df["Quantity"] = pd.to_numeric(df["Quantity"], errors="coerce").fillna(0.0)
    df["Supplier Discounted Price (Incl GST and Commision)"] = pd.to_numeric(
        df["Supplier Discounted Price (Incl GST and Commision)"], errors="coerce"
    ).fillna(0.0)

    return df


# ---------------------------------------------------------------------------
# Utility: extract sheet names from an xlsx
# ---------------------------------------------------------------------------

def get_sheet_names(source: Path | BinaryIO) -> list[str]:
    """Return all sheet names in the workbook without reading data."""
    xls = pd.ExcelFile(source)
    return xls.sheet_names
