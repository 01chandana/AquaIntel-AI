
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
import models

from routers.pumps import router as pumps_router
from routers.telemetry import router as telemetry_router
from routers.alerts import router as alerts_router
from routers.maintenance import router as maintenance_router
from routers.analytics import router as analytics_router
from ml_routes import router as ml_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AquaIntel",
    description="AI-Based Water Pump Monitoring and Predictive Maintenance System",
    version="1.0.0",
)

# Allow the local React/Vite frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(pumps_router)
app.include_router(telemetry_router)
app.include_router(alerts_router)
app.include_router(maintenance_router)
app.include_router(analytics_router)
app.include_router(ml_router)


@app.get("/")
def root():
    return {
        "message": "AquaIntel API is running",
        "project": "AI-Based Water Pump Monitoring and Predictive Maintenance System",
        "status": "success",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }