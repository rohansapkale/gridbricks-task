import pytest
import numpy as np
from backend.app.services.elexon_service import elexon_service, safe_float
from backend.app.services.procurement_service import procurement_service

def test_safe_float_sanitization():
    assert safe_float(123.45) == 123.45
    assert safe_float(None) == 0.0
    assert safe_float(np.nan) == 0.0
    assert safe_float(float("inf")) == 0.0
    assert safe_float(None, default=None) is None

def test_elexon_available_dates():
    dates = elexon_service.get_available_dates()
    assert len(dates) == 31
    assert dates[0] == "2026-01-01"
    assert dates[-1] == "2026-01-31"

def test_day_ahead_comparison_calculation():
    res = elexon_service.get_day_ahead_comparison("2026-01-10", gate_closure_hour=11)
    assert res["deliveryDate"] == "2026-01-10"
    assert len(res["periods"]) == 48
    for p in res["periods"]:
        assert p["actualGeneration"] >= 0
        assert p["forecastGeneration"] >= 0
        assert p["absoluteError"] == abs(p["forecastGeneration"] - p["actualGeneration"])
        assert p["residualError"] == p["forecastGeneration"] - p["actualGeneration"]

def test_risk_percentile_monotonicity():
    """Verify statistical rigor: P95 buffer >= P90 buffer >= P75 buffer >= P50 buffer."""
    plan_p50 = procurement_service.calculate_procurement_plan("2026-01-15", 11, 25000, "P50")
    plan_p75 = procurement_service.calculate_procurement_plan("2026-01-15", 11, 25000, "P75")
    plan_p90 = procurement_service.calculate_procurement_plan("2026-01-15", 11, 25000, "P90")
    plan_p95 = procurement_service.calculate_procurement_plan("2026-01-15", 11, 25000, "P95")

    b50 = plan_p50["recommendedBufferMW"]
    b75 = plan_p75["recommendedBufferMW"]
    b90 = plan_p90["recommendedBufferMW"]
    b95 = plan_p95["recommendedBufferMW"]

    assert b95 >= b90 >= b75 >= b50, f"Expected monotonic buffers: {b50} <= {b75} <= {b90} <= {b95}"

def test_procurement_thermal_dispatch_bounds():
    """Verify thermal procurement never exceeds demand and handles wind fluctuations safely."""
    plan = procurement_service.calculate_procurement_plan("2026-01-15", 11, 25000, "P90")
    for s in plan["schedule"]:
        assert s["recommendedThermalMW"] <= s["demandMW"]
        assert s["recommendedThermalMW"] >= 0
