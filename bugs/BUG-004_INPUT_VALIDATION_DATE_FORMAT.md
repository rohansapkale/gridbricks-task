# BUG-004: Missing Request Validation on Date Formatting & Boundary Inputs

## Severity
Medium (Input Validation & API Hardening)

## Location
`backend/app/api/endpoints.py` (lines 19–35)

## Description
The `deliveryDate` parameter in `GET /api/forecasts/day-ahead` accepted any arbitrary string without regex format enforcement.
If a client or malicious actor submitted malformed parameters (e.g., `?deliveryDate=invalid_date` or SQL injection probes), the endpoint would pass the string directly into `datetime.strptime`, triggering an internal ValueError.

While the parameter was passed securely via parameterized SQL queries (preventing SQL injection), relying on low-level exception handling instead of schema validation at the HTTP layer can expose stack traces or return unstandardized 500 status codes.

## Root Cause
Lack of FastAPI `Query` regex pattern enforcement (`pattern=r"^\d{4}-\d{2}-\d{2}$"`) on query parameters.

## Remediation
1. Add strict regex pattern: `Query("2026-01-15", pattern=r"^\d{4}-\d{2}-\d{2}$")`.
2. Add explicit boundary validation checking that the requested date exists within the available dataset range, returning a structured HTTP 400 or 404 response if out-of-bounds.

## Status
RESOLVED in `backend/app/api/endpoints.py`.
