import os
import sqlite3
import functools
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
DB_PATH = os.path.join(DATA_DIR, "elexon_wind_jan2026.db")

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
        interpolation_mode: str = "linear"  # "linear" or "forward_fill"
    ) -> Dict[str, Any]:
        """
        Retrieves Day-Ahead actual generation vs. latest usable forecast.
        Gate closure occurs on delivery_date - 1 day at gate_closure_hour:00:00Z.
        """
        delivery_dt = datetime.strptime(delivery_date, "%Y-%m-%d")
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
            # Elexon WINDFOR is published at hourly intervals
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

        # In WINDFOR, forecasts are provided hourly (e.g. 00:00, 01:00).
        # We perform interpolation so all 48 half-hourly settlement periods have a continuous forecast
        if interpolation_mode == "linear":
            merged["forecastGeneration"] = merged["forecastGeneration"].interpolate(method="linear").bfill().ffill()
        else:
            merged["forecastGeneration"] = merged["forecastGeneration"].ffill().bfill()

        # Fill publishTime for interpolated periods from the preceding hourly forecast
        merged["forecastPublishTime"] = merged["forecastPublishTime"].ffill().bfill()

        # Compute errors and metrics
        merged["residualError"] = merged["forecastGeneration"] - merged["actualGeneration"]
        merged["absoluteError"] = (merged["actualGeneration"] - merged["forecastGeneration"]).abs()
        merged["percentageError"] = np.where(
            merged["actualGeneration"] > 0,
            (merged["absoluteError"] / merged["actualGeneration"]) * 100.0,
            0.0
        )

        # Compute forecast horizon (hours from publishTime to target startTime)
        def compute_horizon(row):
            try:
                start_dt = datetime.fromisoformat(row["startTime"].replace("Z", "+00:00"))
                pub_dt = datetime.fromisoformat(row["forecastPublishTime"].replace("Z", "+00:00"))
                return round((start_dt - pub_dt).total_seconds() / 3600.0, 1)
            except Exception:
                return None

        merged["forecastHorizonHours"] = merged.apply(compute_horizon, axis=1)

        # Summary calculations for the day
        mae = float(merged["absoluteError"].mean())
        rmse = float(np.sqrt((merged["residualError"] ** 2).mean()))
        total_act = float(merged["actualGeneration"].sum())
        total_fc = float(merged["forecastGeneration"].sum())
        wape = float((merged["absoluteError"].sum() / total_act) * 100.0) if total_act > 0 else 0.0
        mean_bias = float(merged["residualError"].mean())
        max_err = float(merged["absoluteError"].max())

        # Convert half-hour power (MW) to Energy (MWh): Generation MW * 0.5 hours
        total_act_mwh = round(total_act * 0.5, 2)
        total_fc_mwh = round(total_fc * 0.5, 2)
        net_disc_mwh = round((total_fc - total_act) * 0.5, 2)

        periods = []
        for _, row in merged.iterrows():
            periods.append({
                "settlementDate": row["settlementDate"],
                "settlementPeriod": int(row["settlementPeriod"]),
                "startTime": row["startTime"],
                "actualGeneration": round(float(row["actualGeneration"]), 1),
                "forecastGeneration": round(float(row["forecastGeneration"]), 1),
                "forecastPublishTime": str(row["forecastPublishTime"]),
                "forecastHorizonHours": row["forecastHorizonHours"],
                "residualError": round(float(row["residualError"]), 1),
                "absoluteError": round(float(row["absoluteError"]), 1),
                "percentageError": round(float(row["percentageError"]), 2),
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

    @functools.lru_cache(maxsize=32)
    def get_full_month_eval(self, gate_closure_hour: int = 11) -> Dict[str, Any]:
        """
        Evaluates forecast accuracy across all available days in January 2026.
        Computes overall MAE, RMSE, WAPE, Bias, Diurnal profile (SP 1-48),
        and residual error distribution.
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
        
        mae = float(df["absoluteError"].mean())
        rmse = float(np.sqrt((df["residualError"] ** 2).mean()))
        total_actual_mw = float(df["actualGeneration"].sum())
        total_fc_mw = float(df["forecastGeneration"].sum())
        wape = float((df["absoluteError"].sum() / total_actual_mw) * 100.0) if total_actual_mw > 0 else 0.0
        mean_bias = float(df["residualError"].mean())

        # Over / Under forecast counts
        over_count = int((df["residualError"] > 0).sum())
        under_count = int((df["residualError"] < 0).sum())
        total_count = len(df)
        over_pct = round((over_count / total_count) * 100.0, 1)
        under_pct = round((under_count / total_count) * 100.0, 1)

        max_over = float(df["residualError"].max())
        max_under = float(df["residualError"].min())

        # Total energy in GWh (MW * 0.5h / 1000)
        tot_act_gwh = round((total_actual_mw * 0.5) / 1000.0, 2)
        tot_fc_gwh = round((total_fc_mw * 0.5) / 1000.0, 2)

        # Diurnal profile: Average error and generation per settlement period (1 to 48)
        diurnal = []
        for sp, group in df.groupby("settlementPeriod"):
            sp_int = int(sp)
            # Calculate human-readable time e.g. SP 1 -> 00:00, SP 2 -> 00:30, SP 3 -> 01:00
            hour = (sp_int - 1) // 2
            minute = "30" if (sp_int % 2 == 0) else "00"
            time_label = f"{hour:02d}:{minute}"

            sp_mae = float(group["absoluteError"].mean())
            sp_rmse = float(np.sqrt((group["residualError"] ** 2).mean()))
            sp_bias = float(group["residualError"].mean())
            avg_act = float(group["actualGeneration"].mean())
            avg_fc = float(group["forecastGeneration"].mean())

            diurnal.append({
                "settlementPeriod": sp_int,
                "timeLabel": time_label,
                "avgActual": round(avg_act, 1),
                "avgForecast": round(avg_fc, 1),
                "mae": round(sp_mae, 1),
                "rmse": round(sp_rmse, 1),
                "bias": round(sp_bias, 1)
            })

        # Residuals Histogram (e.g. 10 bins between -6000 MW and +6000 MW)
        res_min = int(np.floor(df["residualError"].min() / 500.0) * 500)
        res_max = int(np.ceil(df["residualError"].max() / 500.0) * 500)
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
