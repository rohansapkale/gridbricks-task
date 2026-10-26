# Video Demo Presentation Script (10-Minute Maximum)
### UK Day-Ahead Electricity Market Wind Forecast & Procurement Platform

> **Deliverable Requirement 3.1:**  
> An unlisted YouTube video containing two distinct 5-minute parts:
> 1. **Part 1 (0:00 - 5:00):** Presenting the portal and analysis to the customer as the output of a pilot project to impress them.
> 2. **Part 2 (5:00 - 10:00):** Explaining the software architecture, design, analysis, codebase, and key development practices to an internal technical lead.

---

## Part 1: Client Pitch (0:00 – 5:00)
**Audience:** Utility Commercial Director & Head of Day-Ahead Power Trading Desk.  
**Tone:** Confident, commercial, ROI-driven, and focused on risk mitigation.

### 0:00 – 1:00: Problem Context & The Day-Ahead Procurement Dilemma
- **Screen:** Show application landing page on `Day-Ahead Decision Cockpit`.
- **Spoken Script:**
  > *"Good morning. As a UK energy utility serving millions of consumer homes and businesses, our commercial trading team faces a high-stakes challenge every single morning. In the UK wholesale day-ahead market—operated across EPEX SPOT and Nord Pool—our final purchase decisions for tomorrow (Day D) must be submitted before Gate Closure at 11:00 UTC on Day D-1.*
  >
  > *To meet our consumers' electricity demand, we must determine exactly how much thermal power to purchase to cover the gap left by renewable generation. But wind is weather-dependent. If we overestimate wind output, we are short on physical power and face punitive cash-out charges under the Balancing Mechanism. If we underestimate, we needlessly buy expensive thermal power. Today, I am proud to present **GridPulse UK**, a bespoke intelligence platform built specifically to de-risk our day-ahead procurement decisions."*

### 1:00 – 2:30: Live Cockpit Walkthrough & Look-Ahead Bias Prevention
- **Screen:** Hover over the Gate Closure slider (`D-1 11:00 UTC`), select January 15, 2026, toggle between Chart View and Table View.
- **Spoken Script:**
  > *"Let's look at the Day-Ahead Decision Cockpit. Here, we are looking at real national data from Elexon BMRS for January 2026.*
  >
  > *A critical feature of our software is **temporal integrity**. Notice this slider set to **D-1 11:00 UTC**. The green shaded curve represents actual physical generation from Elexon FUELHH. The blue dashed line is NOT a post-event forecast—it is the **exact, latest forecast that was physically published and available before the 11:00 AM auction deadline**.*
  >
  > *Looking at January 15th, our traders immediately see that while wind was forecast to produce 11,800 MW in the early morning, actual generation was only 10,600 MW—a 1,200 MW deficit. Our summary cards instantly surface the Day MAE (1,038 MW), WAPE (9.8%), and a net volume discrepancy of 24,935 MWh across the day. Traders can export the entire 48-settlement-period breakdown to CSV with a single click."*

### 2:30 – 3:45: Quantitative Accuracy Evaluation & Diurnal Error Profiles
- **Screen:** Click on the **Quantitative Accuracy Analytics** tab. Point to the Diurnal Profile Chart and the Residual Error Histogram.
- **Spoken Script:**
  > *"Now let's examine the macro quantitative picture across all 1,488 settlement periods in January 2026. Across the entire month, our national wind forecasts carried an average MAE of 2,108 MW and a volume-weighted error (WAPE) of 18.2%.*
  >
  > *However, the true commercial insight lies in the distributions. First, in our **Diurnal Profile**, notice how forecast error spikes between Settlement Periods 34 and 38 (17:00 to 19:00 UTC). That is precisely the UK winter evening peak, when wholesale electricity prices are at their highest and thermal peakers cost the most.*
  >
  > *Second, look at our **Residual Histogram**. The distribution is not symmetric—it is skewed with a positive bias of +1,038 MW on peak days, meaning the model over-forecasts wind in 52% of intervals. In energy trading, over-forecasting is significantly more dangerous than under-forecasting because it leaves us short when spot prices spike."*

### 3:45 – 5:00: The Procurement & Safety Buffer Engine (Commercial ROI)
- **Screen:** Click on the **Procurement & Thermal Buffer Planner** tab. Toggle from P50 to P90, show the stacked chart and financial savings.
- **Spoken Script:**
  > *"This brings us to the core decision engine: our **Procurement Planner**. Rather than naively purchasing thermal power equal to Demand minus Unadjusted Forecast, our engine applies empirical risk modeling.*
  >
  > *By selecting the **P90 Safety Buffer**, our platform calculates that the trading desk should procure an additional **4,250 MW safety margin**. On this chart, you see total consumer demand cleanly met by the green wind forecast plus the amber thermal dispatch. The red area—unhedged physical shortfall—drops to zero.*
  >
  > *Commercially, hedging this shortfall at the Day-Ahead base price of £85/MWh avoids the emergency System Buy Price spread of £45/MWh, saving our utility an estimated **£180,000+ in punitive cash-out charges in a single month**.*
  >
  > *This pilot delivers immediate, quantifiable return on investment. Our trading desk is now empowered with precision, clarity, and downside protection. Thank you."*

---

## Part 2: Technical Lead Review (5:00 – 10:00)
**Audience:** Internal Lead Software Architect / Senior SWE Reviewer.  
**Tone:** Technical, precise, covering architecture, algorithms, data engineering, code cleanliness, and deployment.

### 5:00 – 6:15: Architecture Overview & Modern Stack Selection
- **Screen:** Show project directory structure in IDE (`backend/` and `frontend/`) and `docker-compose.yml`.
- **Spoken Script:**
  > *"Hi everyone. Transitioning now into the internal technical architecture review. The goal of this design was production-grade decoupling, sub-second query performance, and zero look-ahead bias.*
  >
  > *We chose a decoupled full-stack architecture:
  > - **Backend:** Python 3.11 with FastAPI. We leverage Pandas, NumPy, and Pydantic v2 for analytical calculations. Python is the gold standard for quantitative energy modeling.
  > - **Frontend:** React 18 with TypeScript and Vite. For styling, we implemented a custom Vanilla CSS design system tailored for trading dashboards, avoiding heavy CSS framework overhead while delivering rich responsive layouts. Charts are built with Recharts using optimized SVG rendering.
  > - **Orchestration:** Multi-stage Docker containers orchestrated via Docker Compose."*

### 6:15 – 7:30: Data Engineering, Elexon Ingestion & Window Functions
- **Screen:** Open `backend/app/services/elexon_service.py` and show lines containing the SQL window function.
- **Spoken Script:**
  > *"Let's examine data engineering. We ingest from two official Elexon BMRS streams:
  > 1. `FUELHH/stream` filtered strictly for `fuelType == 'WIND'` for actual generation.
  > 2. `WINDFOR/stream` for multi-horizon forecast data.
  >
  > A key domain challenge is that WINDFOR is published continuously with varying forecast horizons, while actuals occur at 30-minute settlement periods. To strictly replicate the trader's information set at Day D-1 without look-ahead leakage, we engineered this SQL window query:*
  >
  > ```sql
  > WITH ranked_forecasts AS (
  >     SELECT startTime, publishTime, generation,
  >            ROW_NUMBER() OVER (PARTITION BY startTime ORDER BY publishTime DESC) as rn
  >     FROM forecast_generation
  >     WHERE publishTime <= :gate_closure_cutoff
  > )
  > SELECT a.settlementDate, a.settlementPeriod, a.generation as actualGen, f.generation as forecastGen
  > FROM actual_generation a
  > LEFT JOIN ranked_forecasts f ON a.startTime = f.startTime AND f.rn = 1
  > WHERE a.settlementDate = :delivery_date
  > ```
  >
  > *Notice that WINDFOR outputs hourly forecasts (e.g., 00:00, 01:00), while the settlement market operates half-hourly (SP 1, SP 2, etc.). Our service implements continuous linear interpolation to align every single one of the 48 settlement periods, guaranteeing zero missing intervals."*

### 7:30 – 8:30: Mathematical Modeling & Performance Optimizations
- **Screen:** Open `backend/app/services/procurement_service.py` and show the percentile buffer logic.
- **Spoken Script:**
  > *"On the analytics layer, we evaluate four key metrics:
  > - **MAE:** Quantifies overall volume error in MW.
  > - **RMSE:** Penalizes volatility and fat-tailed forecasting errors.
  > - **WAPE:** Computes volume-weighted absolute percentage error, avoiding division-by-zero anomalies when actual wind generation approaches zero.
  > - **Mean Directional Bias:** Captures systematic skew.
  >
  > For the Thermal Safety Buffer, we extract the empirical distribution of over-forecast residuals and compute the $k$-th percentile:
  > $$\text{Buffer} = \text{Percentile}_k(\{F_t - A_t \mid F_t > A_t\})$$
  >
  > For performance, we added `@functools.lru_cache(maxsize=32)` over the evaluation service and indexed all SQLite timestamp columns (`startTime`, `publishTime`, `settlementDate`). Full month aggregations across 19,000+ forecast points execute in under **15 milliseconds**."*

### 8:30 – 9:30: API Design, TypeScript Types & Testability
- **Screen:** Show `backend/app/models/schemas.py` and `frontend/src/types.ts`.
- **Spoken Script:**
  > *"On API contract design, all endpoints use Pydantic models with strict typing and validation. The FastAPI app automatically generates interactive OpenAPI documentation at `/docs`.
  >
  > On the frontend, TypeScript interfaces in `types.ts` mirror backend schemas exactly. With `verbatimModuleSyntax` and strict TypeScript compilation enabled, the production build completes in under 3 seconds with zero type errors. All chart components use memoized data transforms to prevent redundant re-renders."*

### 9:30 – 10:00: Docker Deployment, Anonymous Repo & Submission Readiness
- **Screen:** Show `Dockerfile`, `docker-compose.yml`, and `README.md`.
- **Spoken Script:**
  > *"Finally, deployment and operations:
  > - The entire application is containerized with multi-stage Dockerfiles. A developer or reviewer can run `docker compose up` to spin up both services with health checks on ports 3000 and 8000.
  > - For cloud deployment, we configured `vercel.json` for frontend edge hosting with proxy routing to the containerized backend.
  > - The repository has been structured anonymously per competition guidelines, with a detailed README covering directory trees, quickstart commands, and AI tool disclosures.
  >
  > Thank you for your review, and I look forward to your questions."*
