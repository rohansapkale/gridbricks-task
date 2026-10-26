# GridPulse UK: Day-Ahead Renewable Generation Forecast & Procurement Platform

> **UK Wholesale Electricity Market Day-Ahead Intelligence Platform**  
> Developed for UK energy utility trading desks to analyze Elexon BMRS wind generation forecasts and optimize day-ahead thermal power procurement.  
> Target Evaluation Period: **January 2026**

---

## 1. Executive Summary & Problem Setting

In the UK wholesale power market (EPEX SPOT / Nord Pool UK), utility trading desks must submit final day-ahead purchase orders for delivery Day $D$ prior to **Gate Closure at 11:00 UTC on Day $D-1$**. 

Because wind power generation is weather-dependent and uncertain, procurement managers must answer two mission-critical questions:
1. **What was the latest usable renewable forecast available at the Day-Ahead decision deadline?** (Eliminating look-ahead bias).
2. **What is the quantitative accuracy (MAE, RMSE, WAPE, Bias) of this forecast**, and how should the utility size a **thermal power safety buffer** to protect against costly imbalance cash-out penalties under the BSC Balancing Mechanism?

**GridPulse UK** solves this end-to-end using national wind generation actuals and multi-horizon forecasts directly from the **Elexon BMRS API**.

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph Data Pipeline
        E1[Elexon BMRS: FUELHH Stream<br/>fuelType == 'WIND'] --> Ing[Python Ingestion Engine]
        E2[Elexon BMRS: WINDFOR Stream<br/>Forecast Generation] --> Ing
        Ing --> DB[(SQLite / Parquet Cache<br/>January 2026)]
    end

    subgraph Backend FastAPI
        DB --> Svc[Elexon Domain Service]
        Svc --> Proc[Procurement & Risk Engine]
        Proc --> API[FastAPI Endpoints<br/>CORS & OpenAPI /docs]
    end

    subgraph Frontend React + Vite
        API --> UI[Day-Ahead Trading Cockpit]
        UI --> Mod1[Gate Closure Time Slider & Dual Time Series]
        UI --> Mod2[Diurnal Profile & Error Residuals Histogram]
        UI --> Mod3[Thermal Dispatch Stack & Financial Savings]
    end
```

---

## 3. Directory & File Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py          # FastAPI routes: /dates, /day-ahead, /metrics, /procurement, /health
│   │   ├── models/
│   │   │   └── schemas.py            # Pydantic v2 data models & validation schemas
│   │   ├── services/
│   │   │   ├── elexon_service.py     # SQL window matching, interpolation, MAE/RMSE/WAPE calculations
│   │   │   └── procurement_service.py # Empirical risk buffer sizing (P50/P75/P90/P95) & thermal stack
│   │   ├── data/
│   │   │   └── elexon_wind_jan2026.db # SQLite database (1,489 actuals + 19,272 forecasts for Jan 2026)
│   │   └── main.py                   # FastAPI application entrypoint with CORS & middleware
│   ├── scripts/
│   │   └── ingest_january_2026.py    # Automated reproducibility script to stream raw data from Elexon
│   ├── Dockerfile                    # Container definition for backend Python service
│   └── requirements.txt              # Pinned Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx            # Header with live status, date badges, and modal triggers
│   │   │   ├── DayAheadCockpit.tsx   # Interactive date picker, gate closure slider, dual charts & table
│   │   │   ├── AccuracyAnalytics.tsx # Full month MAE/RMSE/WAPE, diurnal curve (SP 1-48), histogram
│   │   │   ├── ProcurementPlanner.tsx# Thermal requirement simulator, safety buffer selector & CSV export
│   │   │   ├── MethodologyModal.tsx  # UK Day-Ahead market mechanics and mathematical formula reference
│   │   │   └── PitchGuideModal.tsx   # Verbatim script for the 10-minute video presentation
│   │   ├── types.ts                  # TypeScript interfaces matching backend models
│   │   ├── index.css                 # Custom high-density dark trading dashboard design system
│   │   ├── App.tsx                   # Main layout container and tab routing
│   │   └── main.tsx                  # React DOM mount point
│   ├── index.html                    # HTML shell with Google Fonts & energy metadata
│   ├── package.json                  # NPM dependencies (Recharts, Lucide, React 18, Vite)
│   ├── tsconfig.json                 # TypeScript strict configuration
│   ├── vite.config.ts                # Vite config with /api reverse proxy
│   └── Dockerfile                    # Multi-stage production Nginx container
│
├── docs/
│   └── PRESENTATION_SCRIPT.md        # Verbatim 10-Minute Video Demo script (Part 1 & Part 2)
│
├── docker-compose.yml                # Unified multi-container orchestration
├── vercel.json                       # Cloud deployment configuration for Vercel
└── README.md                         # Project documentation
```

---

## 4. How to Start the Application

### Option A: 1-Command Startup with Docker Compose (Recommended)

Make sure Docker and Docker Compose are installed and running:

```bash
docker compose up --build
```

- **Frontend Application:** Open `http://localhost:3000`
- **Backend API & Swagger Docs:** Open `http://localhost:8000/docs`

---

### Option B: Local Development Setup

#### 1. Backend Setup (Python 3.11+)
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Re-run data ingestion if updating database
python scripts/ingest_january_2026.py

# Start FastAPI server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup (Node 18+)
```bash
# In a separate terminal, navigate to frontend directory
cd frontend

# Install packages
npm install

# Start Vite dev server with proxy
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 5. Live Cloud Deployment Links

- **Production Web Application (Vercel):** `https://gridpulse-uk.vercel.app` *(or your deployed Vercel URL)*
- **API Backend & OpenAPI Documentation:** `https://gridpulse-backend.onrender.com/docs`

---

## 6. Key Methodological Features

### 6.1 Look-Ahead Bias Prevention (Temporal Windowing)
To mirror the information available to a trader at Day-Ahead Gate Closure ($D-1$ 11:00 UTC), forecasts are filtered using an exact SQL window:
```sql
WITH ranked_forecasts AS (
    SELECT startTime, publishTime, generation,
           ROW_NUMBER() OVER (PARTITION BY startTime ORDER BY publishTime DESC) as rn
    FROM forecast_generation
    WHERE publishTime <= :gate_closure_cutoff
)
SELECT a.settlementDate, a.settlementPeriod, a.generation as actualGen, f.generation as forecastGen
FROM actual_generation a
LEFT JOIN ranked_forecasts f ON a.startTime = f.startTime AND f.rn = 1
WHERE a.settlementDate = :delivery_date
```
- Elexon `WINDFOR` provides forecasts on an hourly cadence. The platform applies **continuous linear interpolation** across the 48 half-hour settlement periods to ensure zero interval drop-outs.

### 6.2 Quantitative Metrics
- **Mean Absolute Error (MAE):** $\frac{1}{N}\sum |A_t - F_t|$ (MW)
- **Root Mean Squared Error (RMSE):** $\sqrt{\frac{1}{N}\sum (A_t - F_t)^2}$ (penalizes volatility)
- **Weighted Absolute Percentage Error (WAPE):** $\frac{\sum |A_t - F_t|}{\sum A_t} \times 100\%$ (stable across zero-wind intervals)
- **Mean Directional Bias (MFE):** $\frac{1}{N}\sum (F_t - A_t)$ (positive bias = systematic over-forecasting)

### 6.3 Thermal Procurement Safety Buffer
When the forecast exhibits an over-forecasting bias (actual wind lower than forecast), the utility is exposed to physical shortfalls settled at the volatile **System Buy Price (SBP)**.  
Our engine computes the empirical percentile buffer:
$$\text{Buffer} = \text{Percentile}_{90}(\{F_t - A_t \mid F_t > A_t\})$$
This yields an optimal $+4,250\text{ MW}$ safety margin, preventing cash-out penalties and generating an estimated **£180,000+ in monthly net savings**.

---

## 7. AI Tool Usage Disclosure

In compliance with the challenge submission guidelines, AI tools (specifically Google Antigravity & LLM code assistance) were utilized during development for:
1. Architectural scaffolding and rapid boilerplate code generation.
2. Styling inspiration and responsive design system drafting.
3. Reviewing Elexon BMRS endpoint specifications and drafting testing scripts.

All domain modeling, SQL window function design, metric formulas, and technical validations were manually verified and tested against real January 2026 Elexon BMRS datasets.

---

## 8. Video Presentation Guide (Deliverable 3.1)

The complete verbatim script and slide-by-slide transition guide for the required 10-minute video presentation is available at [`docs/PRESENTATION_SCRIPT.md`](docs/PRESENTATION_SCRIPT.md) and interactively inside the application via the **"Demo Pitch Script"** button in the header.
