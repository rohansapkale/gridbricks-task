import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.endpoints import router as api_router

app = FastAPI(
    title="UK Day-Ahead Renewable Forecast & Procurement Platform",
    description="Product for UK Energy Utility Day-Ahead power procurement and wind forecast quantitative error evaluation.",
    version="1.0.0"
)

# Enable CORS for modern web frontend & preview hosts
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "platform": "UK Day-Ahead Renewable Forecast & Procurement Intelligence",
        "market": "UK Day-Ahead Wholesale Electricity (EPEX SPOT / Nord Pool)",
        "dataSource": "Elexon BMRS (FUELHH - Wind Actuals & WINDFOR - Wind Forecasts)",
        "targetPeriod": "January 2026",
        "documentation": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=True)
