from typing import List, Optional
from pydantic import BaseModel, Field

class SettlementPeriodData(BaseModel):
    settlementDate: str
    settlementPeriod: int
    startTime: str
    actualGeneration: Optional[float] = None
    forecastGeneration: Optional[float] = None
    forecastPublishTime: Optional[str] = None
    forecastHorizonHours: Optional[float] = None
    residualError: Optional[float] = None  # Forecast - Actual (>0 is Over-forecast, <0 is Under-forecast)
    absoluteError: Optional[float] = None  # |Actual - Forecast|
    percentageError: Optional[float] = None  # (|Actual - Forecast| / Actual) * 100
    thermalRequired: Optional[float] = None  # Demand - Forecast

class DaySummaryMetrics(BaseModel):
    mae: float
    rmse: float
    wape: float
    meanBias: float
    maxError: float
    totalActualMWh: float
    totalForecastMWh: float
    netDiscrepancyMWh: float

class DayAheadComparisonResponse(BaseModel):
    deliveryDate: str
    gateClosureCutoff: str
    periods: List[SettlementPeriodData]
    summary: DaySummaryMetrics

class DiurnalPeriodMetric(BaseModel):
    settlementPeriod: int
    timeLabel: str
    avgActual: float
    avgForecast: float
    mae: float
    rmse: float
    bias: float

class HistogramBin(BaseModel):
    binStart: float
    binEnd: float
    label: str
    count: int

class AccuracyMetricsResponse(BaseModel):
    dateFrom: str
    dateTo: str
    gateClosureHour: int
    totalPeriodsEvaluated: int
    mae: float
    rmse: float
    wape: float
    meanBias: float
    overForecastPercentage: float
    underForecastPercentage: float
    maxUnderForecastMW: float
    maxOverForecastMW: float
    totalActualGenerationGWh: float
    totalForecastGenerationGWh: float
    diurnalProfile: List[DiurnalPeriodMetric]
    residualHistogram: List[HistogramBin]

class ProcurementPlanRequest(BaseModel):
    deliveryDate: str
    gateClosureHour: int = 11
    baselineDemandMW: float = 25000.0
    riskPercentile: str = "P90"  # P50, P75, P90, P95
    thermalHeatRateCostGBP: float = 85.0  # GBP / MWh
    imbalancePenaltySpreadGBP: float = 45.0  # GBP / MWh penalty for under-delivery

class ProcurementScheduleItem(BaseModel):
    settlementPeriod: int
    startTime: str
    demandMW: float
    windForecastMW: float
    actualWindMW: Optional[float]
    recommendedThermalMW: float
    safetyBufferMW: float
    unhedgedExposureMW: float

class ProcurementPlanResponse(BaseModel):
    deliveryDate: str
    riskPercentile: str
    recommendedBufferMW: float
    totalDemandMWh: float
    forecastWindMWh: float
    procuredThermalMWh: float
    estimatedProcurementCostGBP: float
    estimatedRiskSavingsGBP: float
    schedule: List[ProcurementScheduleItem]
