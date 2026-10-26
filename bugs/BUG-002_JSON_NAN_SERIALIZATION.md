# BUG-002: Potential Illegal NaN in JSON Serialization for Edge Date Intervals

## Severity
High (Frontend Runtime Failure / Spec Violation)

## Location
`backend/app/services/elexon_service.py` (lines 55–115)

## Description
When calculating forecast metrics for settlement periods where no prior forecast exists (such as January 1 at 00:00 with gate closure set to early hours), pandas interpolation could leave `np.nan` values in numeric columns (`forecastGeneration`, `residualError`, `absoluteError`, `forecastHorizonHours`).

In Python, standard `json.dumps()` or FastAPI's default encoder can output `NaN` into the JSON payload (e.g., `{"forecastGeneration": NaN}`). 

Under RFC 8259, `NaN`, `Infinity`, and `-Infinity` are NOT valid JSON tokens. When the React client executes `await response.json()`, the browser's JavaScript V8 engine throws:
```text
SyntaxError: Unexpected token 'N', "NaN" is not valid JSON
```
This causes the frontend data fetch to abort completely, leading to an unhandled promise rejection and UI blanking.

## Root Cause
Pandas dataframe operations (`.mean()`, `.sum()`, interpolation) produce `np.nan` on empty slices or missing values without converting them to Python `None` or sanitized zeros before returning through Pydantic.

## Remediation
Sanitize all dataframe values before converting to response dicts:
1. Replace `np.nan` with `None` (which correctly serializes to standard `null` in JSON).
2. For aggregate metrics (MAE, RMSE, WAPE), guarantee a default `0.0` if no intervals are evaluated.

## Status
RESOLVED in `backend/app/services/elexon_service.py`.
