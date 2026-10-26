# BUG-003: Unchecked Array Type on `/api/dates` and Missing Error Fallback State in Frontend

## Severity
Medium (Frontend Crash on API Error)

## Location
`frontend/src/App.tsx` (lines 35–45)

## Description
In `App.tsx`:
```typescript
fetch('/api/dates')
  .then((res) => res.json())
  .then((data: string[]) => {
    if (data && data.length > 0) {
      setDates(data);
      if (data.includes('2026-01-15')) {
        setSelectedDate('2026-01-15');
      }
    }
  })
```
If the API endpoint returns an HTTP 500 error or maintenance response (e.g. `{"detail": "Failed to connect to database"}`), `data` is an object, not an array.
Invoking `data.includes('2026-01-15')` results in an uncaught TypeError:
```text
Uncaught TypeError: data.includes is not a function
```
This causes React's component tree to crash and display an unrecoverable blank screen.

## Root Cause
Assuming the JSON payload is guaranteed to be an array without validating `Array.isArray(data)` or verifying `res.ok`.

## Remediation
1. Verify `if (!res.ok) throw new Error(...)` before parsing JSON.
2. Guard array operations with `if (Array.isArray(data) && data.length > 0)`.
3. Add a dedicated `apiError` state in `App.tsx` and render an informative Alert Banner with an interactive "Retry Connection" button.

## Status
RESOLVED in `frontend/src/App.tsx`.
