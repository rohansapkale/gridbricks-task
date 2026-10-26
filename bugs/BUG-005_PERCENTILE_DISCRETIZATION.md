# BUG-005: Empirical Risk Percentile Discretization Error in Thermal Buffer Sizing

## Severity
Low/Medium (Mathematical Precision in Financial Sizing)

## Location
`backend/app/services/procurement_service.py` (lines 48–56)

## Description
In `procurement_service.py`, the thermal safety buffer was previously derived by reconstructing synthetic residuals from the 14 histogram bin midpoints:
```python
hist_residuals = []
for b in full_eval["residualHistogram"]:
    midpoint = (b["binStart"] + b["binEnd"]) / 2.0
    hist_residuals.extend([midpoint] * b["count"])
safety_buffer_mw = float(np.percentile(over_forecast_errors, pct))
```
Because the histogram bins group errors into discrete ranges (e.g. 500 MW intervals), calculating percentiles from bin midpoints introduces discretization error ($\pm 250\text{ MW}$), distorting the optimal financial hedge size.

## Root Cause
Approximating empirical percentiles from discretized histogram bins instead of using the raw continuous residual vector.

## Remediation
Expose and utilize the exact continuous array of residuals computed across all 1,488 settlement periods in January 2026, ensuring high mathematical fidelity for P50, P75, P90, and P95 buffer sizing.

## Status
RESOLVED in `backend/app/services/procurement_service.py` and `backend/app/services/elexon_service.py`.
