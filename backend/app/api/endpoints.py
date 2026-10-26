from fastapi import APIRouter, Query, HTTPException
from typing import List
from ..models.schemas import (
    DayAheadComparisonResponse,
    AccuracyMetricsResponse,
    ProcurementPlanRequest,
    ProcurementPlanResponse
)
from ..services.elexon_service import elexon_service
from ..services.procurement_service import procurement_service

router = APIRouter()

@router.get("/dates", response_model=List[str], summary="List available delivery dates")
def get_dates():
    """Returns all distinct settlement dates available in January 2026."""
    dates = elexon_service.get_available_dates()
    if not dates:
        raise HTTPException(status_code=503, detail="No settlement dates found in database. Ingestion required.")
    return dates

@router.get("/forecasts/day-ahead", response_model=DayAheadComparisonResponse, summary="Day-Ahead Usable Forecast vs Actuals")
def get_day_ahead_forecasts(
    deliveryDate: str = Query(
        "2026-01-15", 
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="Delivery date (YYYY-MM-DD) in January 2026"
    ),
    gateClosureHour: int = Query(11, ge=0, le=23, description="Gate closure hour on Day D-1 (0-23 UTC)")
):
    """
    Retrieves the actual generation and the exact wind forecast available at the Day-Ahead
    auction gate closure (published on D-1 prior to the specified hour).
    """
    available_dates = elexon_service.get_available_dates()
    if deliveryDate not in available_dates:
        raise HTTPException(
            status_code=404, 
            detail=f"Delivery date '{deliveryDate}' not found. Available span: {available_dates[0]} to {available_dates[-1]}."
        )

    try:
        data = elexon_service.get_day_ahead_comparison(
            delivery_date=deliveryDate,
            gate_closure_hour=gateClosureHour
        )
        return data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve day-ahead data: {str(e)}")

@router.get("/analytics/metrics", response_model=AccuracyMetricsResponse, summary="Quantitative Forecast Evaluation Metrics")
def get_accuracy_metrics(
    gateClosureHour: int = Query(11, ge=0, le=23, description="Gate closure hour on Day D-1 (0-23 UTC)")
):
    """
    Computes overall accuracy statistics (MAE, RMSE, WAPE, Mean Bias, Diurnal Profile,
    and Residual Histogram) across January 2026 for the given gate closure timeline.
    """
    try:
        metrics = elexon_service.get_full_month_eval(gate_closure_hour=gateClosureHour)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate metrics: {str(e)}")

@router.post("/procurement/plan", response_model=ProcurementPlanResponse, summary="Calculate Thermal Procurement Schedule")
def calculate_procurement(payload: ProcurementPlanRequest):
    """
    Generates a 48 settlement-period thermal procurement schedule with statistical
    safety buffer (P50/P75/P90/P95) to protect against wind under-delivery and imbalance penalties.
    """
    available_dates = elexon_service.get_available_dates()
    if payload.deliveryDate not in available_dates:
        raise HTTPException(
            status_code=404, 
            detail=f"Delivery date '{payload.deliveryDate}' not found in dataset."
        )

    try:
        plan = procurement_service.calculate_procurement_plan(
            delivery_date=payload.deliveryDate,
            gate_closure_hour=payload.gateClosureHour,
            baseline_demand_mw=payload.baselineDemandMW,
            risk_percentile=payload.riskPercentile,
            thermal_cost_gbp=payload.thermalHeatRateCostGBP,
            imbalance_spread_gbp=payload.imbalancePenaltySpreadGBP
        )
        return plan
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate procurement plan: {str(e)}")

@router.get("/health", summary="System Health & Elexon DB Status")
def health_check():
    """Returns database status and record counts."""
    try:
        with elexon_service.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT count(*) FROM actual_generation")
            act_count = cursor.fetchone()[0]
            cursor.execute("SELECT count(*) FROM forecast_generation")
            fc_count = cursor.fetchone()[0]
            dates = elexon_service.get_available_dates()

        return {
            "status": "healthy",
            "database": "SQLite (Elexon BMRS January 2026)",
            "actualRecords": act_count,
            "forecastRecords": fc_count,
            "availableDays": len(dates),
            "dateSpan": f"{dates[0]} to {dates[-1]}" if dates else "None"
        }
    except Exception as e:
        return {"status": "degraded", "error": str(e)}
