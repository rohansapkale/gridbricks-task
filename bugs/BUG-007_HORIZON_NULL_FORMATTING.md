# BUG-007: `nullh` Visual Glitch on Table When Forecast Horizon is Undefined

## Severity
Low (UI/UX Formatting)

## Location
`frontend/src/components/DayAheadCockpit.tsx` (line 330)

## Description
In `DayAheadCockpit.tsx`, when displaying the forecast horizon in the table view:
```tsx
<td>{p.forecastHorizonHours}h</td>
```
If `forecastHorizonHours` was `null` (e.g., when a forecast was missing or unlinked), JavaScript string interpolation rendered the text as literal `nullh` instead of a professional fallback like `N/A`.

## Root Cause
Direct concatenation of a nullable number without null checking.

## Remediation
Update formatting expression to:
```tsx
<td>{p.forecastHorizonHours !== null ? `${p.forecastHorizonHours}h` : 'N/A'}</td>
```

## Status
RESOLVED in `frontend/src/components/DayAheadCockpit.tsx`.
