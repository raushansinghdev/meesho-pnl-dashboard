"""
upload.py — File upload endpoints.

Handles Meesho payment-file (.xlsx) and orders-file (.csv) uploads.
Files are stored in the uploads directory and metadata is extracted
for the UI to display before computation.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File

from app.config import settings
from app.models.schemas import UploadResponse
from app.services.parser import get_sheet_names, parse_order_payments
from app.utils.helpers import generate_id

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("/payment-file", response_model=UploadResponse)
async def upload_payment_file(file: UploadFile = File(...)):
    """Upload a Meesho payment-file xlsx.

    Stores the file, extracts metadata (sheet names, payment window,
    order count) and returns it so the UI can display a summary before
    the user triggers computation.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Payment file must be an Excel file (.xlsx)")

    file_id = generate_id()
    upload_dir = settings.uploads_dir
    upload_dir.mkdir(parents=True, exist_ok=True)

    dest = upload_dir / f"{file_id}.xlsx"
    content = await file.read()
    dest.write_bytes(content)

    # Extract metadata for the UI
    try:
        sheets = get_sheet_names(dest)
        df = parse_order_payments(dest)
        payment_start = df["Payment Date"].min()
        payment_end = df["Payment Date"].max()
        order_count = df["Sub Order No"].nunique()

        return UploadResponse(
            file_id=file_id,
            filename=file.filename,
            payment_window_start=str(payment_start.date()) if not payment_start is None else None,
            payment_window_end=str(payment_end.date()) if not payment_end is None else None,
            order_count=order_count,
            sheets_found=sheets,
        )
    except Exception as e:
        # Clean up the file if parsing fails
        dest.unlink(missing_ok=True)
        raise HTTPException(400, f"Failed to parse payment file: {e}")


@router.post("/orders-file", response_model=UploadResponse)
async def upload_orders_file(file: UploadFile = File(...)):
    """Upload a Meesho orders CSV (optional — pending visibility only)."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Orders file must be a CSV file (.csv)")

    file_id = generate_id()
    upload_dir = settings.uploads_dir
    upload_dir.mkdir(parents=True, exist_ok=True)

    dest = upload_dir / f"{file_id}.csv"
    content = await file.read()
    dest.write_bytes(content)

    return UploadResponse(
        file_id=file_id,
        filename=file.filename,
    )
