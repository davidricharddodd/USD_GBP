import React, { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useRateHistory } from "../helpers/useRatesApi";
import { useForecast } from "../helpers/useForecastApi";
import { Tabs, TabsList, TabsTrigger } from "./Tabs";
import { Skeleton } from "./Skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./Chart";
import { Badge } from "./Badge";
import { ForecastPanel } from "./ForecastPanel";
import styles from "./RateChart.module.css";

interface RateChartProps {
  calcUsd: number | "";
}

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);

const formatRate = (rate: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(rate);

export const RateChart: React.FC<RateChartProps> = ({ calcUsd }) => {
  const [activeTab, setActiveTab] = useState("7");
  const isForecastMode = activeTab === "forecast";
  
  // Base history days for standard tabs. If forecast is active, we need 30 days of history to join with the 30-day forecast.
  const historyDays = isForecastMode ? 30 : Number(activeTab);

  const { data: historyData, isFetching: isFetchingHistory } = useRateHistory(historyDays);
  const { data: forecastData, isFetching: isFetchingForecast } = useForecast(isForecastMode);

  const chartData = useMemo(() => {
    const data: any[] = [];
    
    if (historyData?.rates) {
      const historyPoints = historyData.rates.map((r) => ({
        date: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(new Date(r.fetchedAt)),
        fullDate: new Date(r.fetchedAt),
        rate: 1 / r.rate, // Convert USD->GBP to GBP->USD
        timestamp: new Date(r.fetchedAt).getTime(),
      }));
      data.push(...historyPoints);
    }

    if (isForecastMode && forecastData?.ratePath) {
      const forecastPoints = forecastData.ratePath.map((r) => {
        const d = new Date(r.date);
        return {
          date: new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
          }).format(d),
          fullDate: d,
          forecastRate: r.rate,
          lower: r.lower,
          upper: r.upper,
          timestamp: d.getTime(),
        };
      });
      
      // Connect the last historical point to the forecast path for a continuous line
      if (data.length > 0 && forecastPoints.length > 0) {
        data[data.length - 1].forecastRate = data[data.length - 1].rate;
      }
      data.push(...forecastPoints);
    }

    return data;
  }, [historyData, forecastData, isForecastMode]);

  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    
    let ratesToConsider: number[] = [];
    if (isForecastMode && forecastData) {
      // Show stats based on the forecast range when in forecast mode
      ratesToConsider = forecastData.ratePath.map((d) => d.rate);
    } else {
      ratesToConsider = chartData.map((d) => d.rate).filter((r) => r !== undefined);
    }
    
    if (ratesToConsider.length === 0) return null;
    
    const min = Math.min(...ratesToConsider);
    const max = Math.max(...ratesToConsider);
    const avg = ratesToConsider.reduce((a, b) => a + b, 0) / ratesToConsider.length;
    return { min, max, avg };
  }, [chartData, isForecastMode, forecastData]);

  const isLoading = isForecastMode ? (isFetchingHistory || isFetchingForecast) : isFetchingHistory;

  const xAxisTicks = useMemo(() => {
    if (!chartData || chartData.length === 0) return undefined;
    
    const minTime = chartData[0].timestamp;
    const maxTime = chartData[chartData.length - 1].timestamp;
    
    let intervalDays = 1;
    if (activeTab === "14") intervalDays = 2;
    else if (activeTab === "30") intervalDays = 5;
    else if (activeTab === "forecast") intervalDays = 10;
    
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
    const ticks = [];
    
    let current = minTime;
    while (current <= maxTime) {
      ticks.push(current);
      current += intervalMs;
    }
    
    return ticks;
  }, [chartData, activeTab]);

  return (
    <div className={styles.wrapper}>
      <section className={`${styles.card} ${styles.chartCard}`}>
        <div className={styles.cardHeader}>
          <div className={styles.headerTitle}>
            Rate History
            {isForecastMode && forecastData && (
              <Badge className={styles.forecastBadge}>
                🔮 AI FORECAST · {forecastData.confidencePct}% CONFIDENCE
              </Badge>
            )}
          </div>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList data-variant="pill">
              <TabsTrigger value="7">7D</TabsTrigger>
              <TabsTrigger value="14">14D</TabsTrigger>
              <TabsTrigger value="30">30D</TabsTrigger>
              <TabsTrigger value="forecast" className={styles.forecastTab}>30D + Forecast</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={styles.statLabel}>{isForecastMode ? "Proj. High:" : "Period High:"}</div>
            <div className={styles.statValue}>
              {stats ? formatRate(stats.max) : "--"}
            </div>
            {stats && Number(calcUsd) > 0 && (
              <div className={styles.statSubValue}>
                ({formatCurrency(Number(calcUsd) / stats.max, "GBP")})
              </div>
            )}
          </div>
          <div className={styles.statBox}>
            <div className={styles.statLabel}>{isForecastMode ? "Proj. Low:" : "Period Low:"}</div>
            <div className={styles.statValue}>
              {stats ? formatRate(stats.min) : "--"}
            </div>
            {stats && Number(calcUsd) > 0 && (
              <div className={styles.statSubValue}>
                ({formatCurrency(Number(calcUsd) / stats.min, "GBP")})
              </div>
            )}
          </div>
          <div className={styles.statBox}>
            <div className={styles.statLabel}>{isForecastMode ? "Proj. Avg:" : "Period Avg:"}</div>
            <div className={styles.statValue}>
              {stats ? formatRate(stats.avg) : "--"}
            </div>
            {stats && Number(calcUsd) > 0 && (
              <div className={styles.statSubValue}>
                ({formatCurrency(Number(calcUsd) / stats.avg, "GBP")})
              </div>
            )}
          </div>
        </div>

        <div className={styles.chartWrapper}>
          {isLoading && chartData.length === 0 ? (
            <Skeleton style={{ height: "100%", width: "100%" }} />
          ) : (
            <ChartContainer
              config={{
                rate: {
                  label: "GBP/USD",
                  color: "var(--primary)",
                },
                forecastRate: {
                  label: "Forecast GBP/USD",
                  color: "var(--accent)",
                },
                upper: {
                  label: "Upper Bound",
                  color: "var(--accent)",
                },
                lower: {
                  label: "Lower Bound",
                  color: "var(--accent)",
                }
              }}
            >
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBands" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  dataKey="timestamp"
                  domain={["dataMin", "dataMax"]}
                  scale="time"
                  tickLine={false}
                  axisLine={false}
                  ticks={xAxisTicks}
                  tickFormatter={(val) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(val)}
                  tick={{ fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.toFixed(4)}
                  tick={{ fill: "var(--muted-foreground)" }}
                  width={60}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const rateItem = payload.find(p => p.dataKey === 'rate' || p.dataKey === 'forecastRate');
                      if (!rateItem) return null;
                      
                      const rate = rateItem.value as number;
                      const isForecastPoint = rateItem.dataKey === 'forecastRate';
                      const converted = Number(calcUsd) > 0 ? Number(calcUsd) / rate : null;
                      
                      return (
                        <div className={styles.customTooltip}>
                          <div className={styles.tooltipDate}>
                            {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(label as number))} {isForecastPoint && <span className={styles.tooltipForecastTag}>(Forecast)</span>}
                          </div>
                          <div className={styles.tooltipRate}>
                            GBP/USD: {formatRate(rate)}
                          </div>
                          {isForecastPoint && payload.find(p => p.dataKey === 'upper') && (
                            <div className={styles.tooltipBands}>
                              Range: {formatRate(payload.find(p => p.dataKey === 'lower')?.value as number)} - {formatRate(payload.find(p => p.dataKey === 'upper')?.value as number)}
                            </div>
                          )}
                          {converted !== null && (
                            <div className={styles.tooltipConversion}>
                              {new Intl.NumberFormat("en-US").format(Number(calcUsd))} USD ≈ {formatCurrency(converted, "GBP")}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                {stats && !isForecastMode && (
                  <ReferenceLine y={stats.max} stroke="var(--secondary)" strokeDasharray="3 3" strokeOpacity={0.5} />
                )}
                {stats && !isForecastMode && (
                  <ReferenceLine y={stats.min} stroke="var(--error)" strokeDasharray="3 3" strokeOpacity={0.5} />
                )}

                {isForecastMode && historyData?.rates && (
                  <ReferenceLine 
                    x={new Date(historyData.rates[historyData.rates.length - 1].fetchedAt).getTime()} 
                    stroke="var(--muted-foreground)" 
                    strokeDasharray="3 3"
                    label={{ position: 'insideTopLeft', value: 'TODAY', fill: 'var(--muted-foreground)', fontSize: 10, fontFamily: 'var(--font-family-monospace)' }}
                  />
                )}

                {isForecastMode && (
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="url(#colorBands)"
                  />
                )}
                {isForecastMode && (
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill="var(--background)"
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRate)"
                  isAnimationActive={false}
                />
                
                {isForecastMode && (
                  <Area
                    type="monotone"
                    dataKey="forecastRate"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fillOpacity={1}
                    fill="url(#colorForecast)"
                    isAnimationActive={false}
                  />
                )}
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </section>

      {isForecastMode && (
        <ForecastPanel forecastData={forecastData} isLoading={isFetchingForecast} />
      )}
    </div>
  );
};