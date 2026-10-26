# BUG-006: Ingestion Script Missing Retry Logic for Transient Network Errors & HTTP 429 Rate Limits

## Severity
Medium (Data Pipeline Reliability)

## Location
`backend/scripts/ingest_january_2026.py` (lines 45–54)

## Description
In `ingest_january_2026.py`, the `fetch_json(url)` function executed a single synchronous HTTP request:
```python
def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "UK-DayAhead-EnergyApp/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"Error fetching {url}: {e}", file=sys.stderr)
        return []
```
If the external Elexon BMRS endpoint returned a transient network timeout, HTTP 429 (Rate Limit Exceeded), or HTTP 503 (Service Temporarily Unavailable), the function immediately swallowed the exception and returned an empty list `[]`. 

This resulted in silent data loss where an entire 5-day chunk of actual generation or forecasts was skipped without triggering an alert or retry.

## Root Cause
Lack of an exponential backoff retry loop around upstream external API calls.

## Remediation
Implement an automatic retry loop (up to 3 retries) with exponential backoff (e.g., 2s, 4s, 8s) that logs retries, detects rate limits (HTTP 429), and raises an explicit error if all retries are exhausted.

## Status
RESOLVED in `backend/scripts/ingest_january_2026.py`.
