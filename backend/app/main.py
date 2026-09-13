"""
Meesho P&L Calculator — FastAPI Application.

Entry point for the backend service.  Mounts all routers and configures
CORS for the frontend to call from a different port/container.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import pnl, sku, upload

app = FastAPI(
    title="Meesho P&L Calculator",
    description=(
        "Backend API for the Meesho SKU-wise P&L dashboard. "
        "Parses Meesho payment-file exports, computes realized P&L "
        "with configurable COGS loss rates, and serves results to the UI."
    ),
    version="2.0.0",
)

# CORS — allow the frontend container (port 3000) and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(upload.router)
app.include_router(pnl.router)
app.include_router(sku.router)


@app.get("/api/health")
async def health_check():
    """Simple liveness probe."""
    return {"status": "ok", "service": "meesho-pnl-backend"}


@app.on_event("startup")
async def startup():
    """Ensure required directories exist on startup."""
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.results_dir.mkdir(parents=True, exist_ok=True)
