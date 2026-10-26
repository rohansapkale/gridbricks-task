# BUG-001: Insecure/Invalid CORS Configuration with Wildcard Origin and Credentials

## Severity
Medium (Security & Standards Compliance)

## Location
`backend/app/main.py` (lines 14–20)

## Description
The FastAPI CORS middleware was configured as:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
According to the W3C / WHATWG Cross-Origin Resource Sharing (CORS) specification, when responding to a credentialed request (e.g. requests with cookies, authorization headers, or TLS client certificates), the server MUST NOT specify the wildcard `*` for the `Access-Control-Allow-Origin` response header. Modern browsers (Chrome, Firefox, Safari) strictly reject responses where `Access-Control-Allow-Credentials: true` is combined with `Access-Control-Allow-Origin: *`.

## Root Cause
Boilerplate CORS setup enabled `allow_credentials=True` together with `allow_origins=["*"]`.

## Remediation
1. Explicitly list trusted origins for development and production (`http://localhost:5173`, `http://localhost:3000`, `http://127.0.0.1:5173`, `http://127.0.0.1:3000`, and Vercel domains).
2. Set `allow_credentials=False` for open public API endpoints where browser credentials are not required.

## Status
RESOLVED in `backend/app/main.py`.
