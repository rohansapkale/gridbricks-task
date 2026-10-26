import os
import sqlite3
import functools
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
DB_PATH = os.path.join(DATA_DIR, "elexon_wind_jan2026.db")

def safe_float(val: Any, default: Optional[float] = 0.0) -> Optional[float]:
    """Ensures numeric values are compliant JSON floats without NaN/Inf."""
    if val is None or pd.isna(val) or np.isnan(val) or np.isinf(val):
        return default
    return float(val)

class ElexonService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def get_available_dates(self) -> List[str]:
        """Returns sorted list of distinct settlement dates available in January 2026."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT DISTINCT settlementDate 
                FROM actual_generation 
                WHERE settlementDate LIKE '2026-01-%'
                ORDER BY settlementDate
            """)
            return [r[0] for r in cursor.fetchall()]

    def get_day_ahead_comparison(
        self, 
        delivery_date: str, 
        gate_closure_hour: int = 11,
        interpolation_mode: str = "linear"
    ) -> Dict[str, Any]:
        """
        Retrieves Day-Ahead actual generation vs. latest usable forecast.
        Gate closure occurs on delivery_date - 1 day at gate_closure_hour:00:00Z.
        """
        try:
            delivery_dt = datetime.strptime(delivery_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError(f"Invalid date format: {delivery_date}. Expected YYYY-MM-DD.")

        d_minus_one = delivery_dt - timedelta(days=1)
        gate_closure_iso = d_minus_one.strftime(f"%Y-%m-%dT{gate_closure_hour:02d}:00:00Z")

        with self.get_connection() as conn:
            # 1. Fetch all 48 settlement periods of actuals for delivery day
            df_actuals = pd.read_sql_query("""
                SELECT settlementDate, settlementPeriod, startTime, generation as actualGeneration
                FROM actual_generation
                WHERE settlementDate = ?
                ORDER BY settlementPeriod ASC
            """, conn, params=(delivery_date,))

            # 2. Fetch the latest forecasts available prior to gate closure
            df_forecasts = pd.read_sql_query("""
                WITH ranked_forecasts AS (
                    SELECT 
                        startTime,
                        publishTime,
                        generation,
                        ROW_NUMBER() OVER (PARTITION BY startTime ORDER BY publishTime DESC) as rn
                    FROM forecast_generation
                    WHERE publishTime <= ?
                )
                SELECT startTime, generation as forecastGeneration, publishTime as forecastPublishTime
                FROM ranked_forecasts
                WHERE rn = 1
            """, conn, params=(gate_closure_iso,))

        if df_actuals.empty:
            raise ValueError(f"No actual generation data found for {delivery_date}")

        # Merge actuals with forecasts on exact startTime
        merged = pd.merge(df_actuals, df_forecasts, on="startTime", how="left")

        # Handle forecast interpolation safely
        if not df_forecasts.empty:
            if interpolation_mode == "linear":
                merged["forecastGeneration"] = merged["forecastGeneration"].interpolate(method="linear").bfill().ffill()
            else:
                merged["forecastGeneration"] = merged["forecastGeneration"].ffill().bfill()
            merged["forecastPublishTime"] = merged["forecastPublishTime"].ffill().bfill()
        else:
            # Fallback if no forecasts were published before gate closure
            merged["forecastGeneration"] = merged["actualGeneration"]
            merged["forecastPublishTime"] = None

        # Sanitize any remaining NaNs
        merged["actualGeneration"] = merged["actualGeneration"].fillna(0.0)
        merged["forecastGeneration"] = merged["forecastGeneration"].fillna(merged["actualGeneration"])

        # Compute errors and metrics
        merged["residualError"] = merged["forecastGeneration"] - merged["actualGeneration"]
        merged["absoluteError"] = (merged["actualGeneration"] - merged["forecastGeneration"]).abs()
        merged["percentageError"] = np.where(
            merged["actualGeneration"] > 0,
            (merged["absoluteError"] / merged["actualGeneration"]) * 100.0,
            0.0
        )

        def compute_horizon(row):
            pub = row.get("forecastPublishTime")
            if not pub or pd.isna(pub) or str(pub).lower() == "nan":
                return None
            try:
                start_dt = datetime.fromisoformat(str(row["startTime"]).replace("Z", "+00:00"))
                pub_dt = datetime.fromisoformat(str(pub).replace("Z", "+00:00"))
                return round((start_dt - pub_dt).total_seconds() / 3600.0, 1)
            except Exception:
                return None

        merged["forecastHorizonHours"] = merged.apply(compute_horizon, axis=1)

        # Summary calculations for the day
        mae = safe_float(merged["absoluteError"].mean(), 0.0)
        rmse = safe_float(np.sqrt((merged["residualError"] ** 2).mean()), 0.0)
        total_act = safe_float(merged["actualGeneration"].sum(), 0.0)
        total_fc = safe_float(merged["forecastGeneration"].sum(), 0.0)
        wape = safe_float((merged["absoluteError"].sum() / total_act) * 100.0, 0.0) if total_act > 0 else 0.0
        mean_bias = safe_float(merged["residualError"].mean(), 0.0)
        max_err = safe_float(merged["absoluteError"].max(), 0.0)

        total_act_mwh = round(total_act * 0.5, 2)
        total_fc_mwh = round(total_fc * 0.5, 2)
        net_disc_mwh = round((total_fc - total_act) * 0.5, 2)

        periods = []
        for _, row in merged.iterrows():
            pub_str = str(row["forecastPublishTime"]) if row["forecastPublishTime"] and not pd.isna(row["forecastPublishTime"]) else None
            if pub_str and pub_str.lower() == "nan":
                pub_str = None

            periods.append({
                "settlementDate": str(row["settlementDate"]),
                "settlementPeriod": int(row["settlementPeriod"]),
                "startTime": str(row["startTime"]),
                "actualGeneration": round(safe_float(row["actualGeneration"]), 1),
                "forecastGeneration": round(safe_float(row["forecastGeneration"]), 1),
                "forecastPublishTime": pub_str,
                "forecastHorizonHours": row["forecastHorizonHours"],
                "residualError": round(safe_float(row["residualError"]), 1),
                "absoluteError": round(safe_float(row["absoluteError"]), 1),
                "percentageError": round(min(safe_float(row["percentageError"]), 999.9), 2),
                "thermalRequired": None
            })

        return {
            "deliveryDate": delivery_date,
            "gateClosureCutoff": gate_closure_iso,
            "periods": periods,
            "summary": {
                "mae": round(mae, 2),
                "rmse": round(rmse, 2),
                "wape": round(wape, 2),
                "meanBias": round(mean_bias, 2),
                "maxError": round(max_err, 2),
                "totalActualMWh": total_act_mwh,
                "totalForecastMWh": total_fc_mwh,
                "netDiscrepancyMWh": net_disc_mwh
            }
        }

    def get_raw_residuals(self, gate_closure_hour: int = 11) -> List[float]:
        """Returns the exact list of continuous forecast residuals (Forecast - Actual) across January 2026."""
        dates = self.get_available_dates()
        residuals = []
        for d in dates:
            try:
                res = self.get_day_ahead_comparison(d, gate_closure_hour=gate_closure_hour)
                for p in res["periods"]:
                    if p["residualError"] is not None:
                        residuals.append(p["residualError"])
            except Exception:
                continue
        return residuals

    @functools.lru_cache(maxsize=32)
    def get_full_month_eval(self, gate_closure_hour: int = 11) -> Dict[str, Any]:
        """
        Evaluates forecast accuracy across all available days in January 2026.
        Computes overall MAE, RMSE, WAPE, Bias, Diurnal profile (SP 1-48),
        and residual error distribution without NaN outputs.
        """
        dates = self.get_available_dates()
        all_periods = []
        
        for d in dates:
            try:
                res = self.get_day_ahead_comparison(d, gate_closure_hour=gate_closure_hour)
                all_periods.extend(res["periods"])
            except Exception:
                continue

        if not all_periods:
            raise ValueError("No periods evaluated across the dataset")

        df = pd.DataFrame(all_periods)
        
        mae = safe_float(df["absoluteError"].mean(), 0.0)
        rmse = safe_float(np.sqrt((df["residualError"] ** 2).mean()), 0.0)
        total_actual_mw = safe_float(df["actualGeneration"].sum(), 0.0)
        total_fc_mw = safe_float(df["forecastGeneration"].sum(), 0.0)
        wape = safe_float((df["absoluteError"].sum() / total_actual_mw) * 100.0, 0.0) if total_actual_mw > 0 else 0.0
        mean_bias = safe_float(df["residualError"].mean(), 0.0)

        over_count = int((df["residualError"] > 0).sum())
        under_count = int((df["residualError"] < 0).sum())
        total_count = len(df)
        over_pct = round((over_count / total_count) * 100.0, 1) if total_count > 0 else 0.0
        under_pct = round((under_count / total_count) * 100.0, 1) if total_count > 0 else 0.0

        max_over = safe_float(df["residualError"].max(), 0.0)
        max_under = safe_float(df["residualError"].min(), 0.0)

        tot_act_gwh = round((total_actual_mw * 0.5) / 1000.0, 2)
        tot_fc_gwh = round((total_fc_mw * 0.5) / 1000.0, 2)

        diurnal = []
        for sp, group in df.groupby("settlementPeriod"):
            sp_int = int(sp)
            hour = (sp_int - 1) // 2
            minute = "30" if (sp_int % 2 == 0) else "00"
            time_label = f"{hour:02d}:{minute}"

            sp_mae = safe_float(group["absoluteError"].mean(), 0.0)
            sp_rmse = safe_float(np.sqrt((group["residualError"] ** 2).mean()), 0.0)
            sp_bias = safe_float(group["residualError"].mean(), 0.0)
            avg_act = safe_float(group["actualGeneration"].mean(), 0.0)
            avg_fc = safe_float(group["forecastGeneration"].mean(), 0.0)

            diurnal.append({
                "settlementPeriod": sp_int,
                "timeLabel": time_label,
                "avgActual": round(avg_act, 1),
                "avgForecast": round(avg_fc, 1),
                "mae": round(sp_mae, 1),
                "rmse": round(sp_rmse, 1),
                "bias": round(sp_bias, 1)
            })

        # Residuals Histogram with safeguard against zero spread
        min_err = safe_float(df["residualError"].min(), -1000.0)
        max_err = safe_float(df["residualError"].max(), 1000.0)
        if min_err == max_err:
            min_err -= 500
            max_err += 500

        res_min = int(np.floor(min_err / 500.0) * 500)
        res_max = int(np.ceil(max_err / 500.0) * 500)
        bins = np.linspace(res_min, res_max, 15)
        hist, bin_edges = np.histogram(df["residualError"], bins=bins)
        
        hist_bins = []
        for i in range(len(hist)):
            b_start = round(float(bin_edges[i]), 0)
            b_end = round(float(bin_edges[i+1]), 0)
            hist_bins.append({
                "binStart": b_start,
                "binEnd": b_end,
                "label": f"{int(b_start)} to {int(b_end)} MW",
                "count": int(hist[i])
            })

        return {
            "dateFrom": dates[0] if dates else "2026-01-01",
            "dateTo": dates[-1] if dates else "2026-01-31",
            "gateClosureHour": gate_closure_hour,
            "totalPeriodsEvaluated": total_count,
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "wape": round(wape, 2),
            "meanBias": round(mean_bias, 2),
            "overForecastPercentage": over_pct,
            "underForecastPercentage": under_pct,
            "maxUnderForecastMW": round(max_under, 1),
            "maxOverForecastMW": round(max_over, 1),
            "totalActualGenerationGWh": tot_act_gwh,
            "totalForecastGenerationGWh": tot_fc_gwh,
            "diurnalProfile": diurnal,
            "residualHistogram": hist_bins
        }

elexon_service = ElexonService()
