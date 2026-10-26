import numpy as np
import pandas as pd
from typing import Dict, Any, List
from .elexon_service import elexon_service

class ProcurementService:
    def __init__(self):
        # Diurnal demand curve multiplier (UK typical winter profile across 48 settlement periods)
        # Low at night (0.75x), morning peak around SP 16-18 (1.15x), afternoon plateau (1.05x), evening peak SP 34-38 (1.25x)
        self.diurnal_demand_weights = self._generate_demand_weights()

    def _generate_demand_weights(self) -> List[float]:
        weights = []
        for sp in range(1, 49):
            if sp <= 12:      # 00:00 - 06:00 (Night trough)
                w = 0.72 + (sp / 12.0) * 0.08
            elif sp <= 18:    # 06:00 - 09:00 (Morning ramp)
                w = 0.80 + ((sp - 12) / 6.0) * 0.35
            elif sp <= 32:    # 09:00 - 16:00 (Daytime plateau)
                w = 1.08 + np.sin((sp - 18) / 14.0 * np.pi) * 0.05
            elif sp <= 40:    # 16:00 - 20:00 (Winter evening peak)
                w = 1.15 + ((sp - 32) / 8.0) * 0.15 if sp <= 36 else 1.30 - ((sp - 36) / 4.0) * 0.12
            else:             # 20:00 - 24:00 (Night drop)
                w = 1.10 - ((sp - 40) / 8.0) * 0.35
            weights.append(round(w, 3))
        return weights

    def calculate_procurement_plan(
        self,
        delivery_date: str,
        gate_closure_hour: int = 11,
        baseline_demand_mw: float = 25000.0,
        risk_percentile: str = "P90",
        thermal_cost_gbp: float = 85.0,
        imbalance_spread_gbp: float = 45.0
    ) -> Dict[str, Any]:
        """
        Calculates the recommended Day-Ahead thermal procurement schedule for delivery_date.
        Uses historical error distribution to derive the optimal risk safety buffer.
        """
        # 1. Fetch Day-Ahead forecast & actuals for this delivery date
        day_data = elexon_service.get_day_ahead_comparison(delivery_date, gate_closure_hour)
        periods = day_data["periods"]

        # 2. Fetch full month metrics to compute historical error percentiles
        full_eval = elexon_service.get_full_month_eval(gate_closure_hour)
        hist_residuals = []
        for b in full_eval["residualHistogram"]:
            midpoint = (b["binStart"] + b["binEnd"]) / 2.0
            hist_residuals.extend([midpoint] * b["count"])
        
        # When wind forecast is higher than actual (residual > 0), the utility under-generates wind
        # and needs extra thermal to buffer.
        over_forecast_errors = [r for r in hist_residuals if r > 0]
        if not over_forecast_errors:
            over_forecast_errors = [1200.0]

        # Calculate buffer based on percentile
        percentile_map = {
            "P50": 50,
            "P75": 75,
            "P90": 90,
            "P95": 95
        }
        pct = percentile_map.get(risk_percentile, 90)
        safety_buffer_mw = float(np.percentile(over_forecast_errors, pct))
        safety_buffer_mw = round(safety_buffer_mw, 0)

        schedule = []
        total_demand_mwh = 0.0
        total_wind_fc_mwh = 0.0
        total_thermal_mwh = 0.0
        total_shortfall_mwh = 0.0
        total_hedged_shortfall_mwh = 0.0

        for p in periods:
            sp = p["settlementPeriod"]
            weight = self.diurnal_demand_weights[sp - 1]
            demand_mw = round(baseline_demand_mw * weight, 1)
            wind_fc_mw = p["forecastGeneration"]
            actual_wind_mw = p["actualGeneration"]

            # Recommended thermal procurement
            # Thermal = Demand - Wind Forecast + Safety Buffer
            # (capped at demand so thermal isn't negative or over demand)
            net_need_mw = demand_mw - wind_fc_mw
            rec_thermal_mw = max(0.0, net_need_mw + safety_buffer_mw)
            rec_thermal_mw = min(demand_mw, rec_thermal_mw)

            # Unhedged exposure = shortfall if we did NOT add buffer
            # If actual wind was lower than forecast, how much shortfall would occur?
            raw_shortfall_mw = 0.0
            if actual_wind_mw is not None:
                wind_deficit = max(0.0, wind_fc_mw - actual_wind_mw)
                raw_shortfall_mw = wind_deficit

            unhedged_exposure = max(0.0, raw_shortfall_mw - safety_buffer_mw)

            schedule.append({
                "settlementPeriod": sp,
                "startTime": p["startTime"],
                "demandMW": demand_mw,
                "windForecastMW": wind_fc_mw,
                "actualWindMW": actual_wind_mw,
                "recommendedThermalMW": round(rec_thermal_mw, 1),
                "safetyBufferMW": safety_buffer_mw,
                "unhedgedExposureMW": round(unhedged_exposure, 1)
            })

            # 0.5h energy conversions
            total_demand_mwh += demand_mw * 0.5
            total_wind_fc_mwh += wind_fc_mw * 0.5
            total_thermal_mwh += rec_thermal_mw * 0.5
            total_shortfall_mwh += raw_shortfall_mw * 0.5
            total_hedged_shortfall_mwh += min(safety_buffer_mw, raw_shortfall_mw) * 0.5

        estimated_procurement_cost = round(total_thermal_mwh * thermal_cost_gbp, 2)
        # Avoided punitive imbalance cash-out spread on the hedged shortfall
        estimated_risk_savings = round(total_hedged_shortfall_mwh * imbalance_spread_gbp, 2)

        return {
            "deliveryDate": delivery_date,
            "riskPercentile": risk_percentile,
            "recommendedBufferMW": safety_buffer_mw,
            "totalDemandMWh": round(total_demand_mwh, 2),
            "forecastWindMWh": round(total_wind_fc_mwh, 2),
            "procuredThermalMWh": round(total_thermal_mwh, 2),
            "estimatedProcurementCostGBP": estimated_procurement_cost,
            "estimatedRiskSavingsGBP": estimated_risk_savings,
            "schedule": schedule
        }

procurement_service = ProcurementService()
