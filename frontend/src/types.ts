export interface SettlementPeriodData {
  settlementDate: string;
  settlementPeriod: number;
  startTime: string;
  actualGeneration: number;
  forecastGeneration: number;
  forecastPublishTime: string;
  forecastHorizonHours: number | null;
  residualError: number;
  absoluteError: number;
  percentageError: number;
  thermalRequired?: number | null;
}

export interface DaySummaryMetrics {
  mae: number;
  rmse: number;
  wape: number;
  meanBias: number;
  maxError: number;
  totalActualMWh: number;
  totalForecastMWh: number;
  netDiscrepancyMWh: number;
}

export interface DayAheadResponse {
  deliveryDate: string;
  gateClosureCutoff: string;
  periods: SettlementPeriodData[];
  summary: DaySummaryMetrics;
}

export interface DiurnalPeriodMetric {
  settlementPeriod: number;
  timeLabel: string;
  avgActual: number;
  avgForecast: number;
  mae: number;
  rmse: number;
  bias: number;
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  label: string;
  count: number;
}

export interface AccuracyMetricsResponse {
  dateFrom: string;
  dateTo: string;
  gateClosureHour: number;
  totalPeriodsEvaluated: number;
  mae: number;
  rmse: number;
  wape: number;
  meanBias: number;
  overForecastPercentage: number;
  underForecastPercentage: number;
  maxUnderForecastMW: number;
  maxOverForecastMW: number;
  totalActualGenerationGWh: number;
  totalForecastGenerationGWh: number;
  diurnalProfile: DiurnalPeriodMetric[];
  residualHistogram: HistogramBin[];
}

export interface ProcurementScheduleItem {
  settlementPeriod: number;
  startTime: string;
  demandMW: number;
  windForecastMW: number;
  actualWindMW: number | null;
  recommendedThermalMW: number;
  safetyBufferMW: number;
  unhedgedExposureMW: number;
}

export interface ProcurementPlanResponse {
  deliveryDate: string;
  riskPercentile: string;
  recommendedBufferMW: number;
  totalDemandMWh: number;
  forecastWindMWh: number;
  procuredThermalMWh: number;
  estimatedProcurementCostGBP: number;
  estimatedRiskSavingsGBP: number;
  schedule: ProcurementScheduleItem[];
}
