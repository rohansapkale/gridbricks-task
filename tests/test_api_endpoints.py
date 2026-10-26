import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["actualRecords"] > 1400
    assert data["forecastRecords"] > 10000
    assert data["availableDays"] == 31

def test_dates_endpoint():
    response = client.get("/api/dates")
    assert response.status_code == 200
    dates = response.json()
    assert isinstance(dates, list)
    assert len(dates) == 31
    assert "2026-01-01" in dates
    assert "2026-01-31" in dates

def test_day_ahead_valid_query():
    response = client.get("/api/forecasts/day-ahead?deliveryDate=2026-01-15&gateClosureHour=11")
    assert response.status_code == 200
    data = response.json()
    assert data["deliveryDate"] == "2026-01-15"
    assert len(data["periods"]) == 48
    assert "summary" in data
    assert data["summary"]["mae"] > 0
    assert data["summary"]["wape"] > 0
    assert data["summary"]["rmse"] >= data["summary"]["mae"]

def test_day_ahead_invalid_date_regex():
    response = client.get("/api/forecasts/day-ahead?deliveryDate=not-a-date&gateClosureHour=11")
    assert response.status_code == 422  # Validation error from regex pattern

def test_day_ahead_out_of_range_date():
    response = client.get("/api/forecasts/day-ahead?deliveryDate=2026-05-01&gateClosureHour=11")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_analytics_metrics():
    response = client.get("/api/analytics/metrics?gateClosureHour=11")
    assert response.status_code == 200
    metrics = response.json()
    assert metrics["totalPeriodsEvaluated"] >= 1400
    assert metrics["mae"] > 0
    assert len(metrics["diurnalProfile"]) == 48
    assert len(metrics["residualHistogram"]) > 0

def test_procurement_plan_post():
    payload = {
        "deliveryDate": "2026-01-15",
        "gateClosureHour": 11,
        "baselineDemandMW": 25000,
        "riskPercentile": "P90",
        "thermalHeatRateCostGBP": 85.0,
        "imbalancePenaltySpreadGBP": 45.0
    }
    response = client.post("/api/procurement/plan", json=payload)
    assert response.status_code == 200
    plan = response.json()
    assert plan["deliveryDate"] == "2026-01-15"
    assert plan["riskPercentile"] == "P90"
    assert plan["recommendedBufferMW"] > 0
    assert len(plan["schedule"]) == 48
    assert plan["estimatedProcurementCostGBP"] > 0

def test_procurement_plan_invalid_date():
    payload = {
        "deliveryDate": "2026-09-09",
        "gateClosureHour": 11,
        "baselineDemandMW": 25000,
        "riskPercentile": "P90"
    }
    response = client.post("/api/procurement/plan", json=payload)
    assert response.status_code == 404
