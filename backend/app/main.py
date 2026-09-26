import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from contextlib import asynccontextmanager

from app.config import settings
from app.api import (
    routes_cases,
    routes_detection,
    routes_drift,
    routes_ais,
    routes_attribution,
    routes_report
)
from app.utils.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.detector_startup import load_all_detectors
    results = load_all_detectors(settings)
    app.state.sar_detector, app.state.encoder_init = results["sar"]
    app.state.eo_detector, app.state.encoder_init_eo = results["eo"]
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Lagrangian Evidence for Hazard Attribution & Reconstruction (SIH26143)",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Enable permissive CORS for frontend / GIS client access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST API endpoints
app.include_router(routes_cases.router, prefix=settings.API_PREFIX)
app.include_router(routes_detection.router, prefix=settings.API_PREFIX)
app.include_router(routes_drift.router, prefix=settings.API_PREFIX)
app.include_router(routes_ais.router, prefix=settings.API_PREFIX)
app.include_router(routes_attribution.router, prefix=settings.API_PREFIX)
app.include_router(routes_report.router, prefix=settings.API_PREFIX)

# Static files directory
static_dir = (Path(__file__).resolve().parent / "static").resolve()

if not static_dir.exists():
    static_dir = (Path.cwd() / "backend" / "app" / "static").resolve()

if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "LEHAR Attribution Engine",
        "version": settings.VERSION,
        "disclaimer": settings.LEGAL_DISCLAIMER
    }

@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return HTMLResponse(f"<h1>LEHAR Engine API Running. Visit <a href='/docs'>/docs</a></h1><p>Debug: {static_dir} | {index_file} | exists: {index_file.exists()}</p>")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
