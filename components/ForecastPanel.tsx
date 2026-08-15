import React from "react";
import { Badge } from "./Badge";
import { Skeleton } from "./Skeleton";
import { OutputType as ForecastData } from "../endpoints/rates/forecast_GET.schema";
import { AlertTriangle, TrendingDown, TrendingUp, Minus } from "lucide-react";
import styles from "./ForecastPanel.module.css";

interface ForecastPanelProps {
  forecastData?: ForecastData;
  isLoading: boolean;
}

export const ForecastPanel: React.FC<ForecastPanelProps> = ({ forecastData, isLoading }) => {
  if (isLoading) {
    return (
      <section className={styles.card}>
        <div className={styles.cardHeader}>🔮 AI FX OUTLOOK</div>
        <div className={styles.loadingContainer}>
          <Skeleton style={{ height: "2rem", width: "40%" }} />
          <Skeleton style={{ height: "6rem", width: "100%" }} />
          <Skeleton style={{ height: "4rem", width: "100%" }} />
        </div>
      </section>
    );
  }

  if (!forecastData) return null;

  const getDirectionIcon = () => {
    switch (forecastData.direction) {
      case "bullish": return <TrendingUp size={16} />;
      case "bearish": return <TrendingDown size={16} />;
      default: return <Minus size={16} />;
    }
  };

  const getDirectionVariant = () => {
    switch (forecastData.direction) {
      case "bullish": return "success";
      case "bearish": return "destructive";
      default: return "warning";
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        🔮 AI FX OUTLOOK
      </div>
      
      <div className={styles.topSection}>
        <div className={styles.confidenceBlock}>
          <div className={styles.confidenceLabel}>Model Confidence</div>
          <div className={styles.confidenceValue}>{forecastData.confidencePct}%</div>
        </div>
        <div className={styles.metaBlock}>
          <Badge variant={getDirectionVariant()} className={styles.directionBadge}>
            {getDirectionIcon()}
            {forecastData.direction.toUpperCase()}
          </Badge>
          <div className={styles.targetRange}>
            Target: {forecastData.targetRangeLow.toFixed(4)} — {forecastData.targetRangeHigh.toFixed(4)}
          </div>
        </div>
      </div>

      <div className={styles.summarySection}>
        {forecastData.summary.split('\n\n').map((paragraph, idx) => (
          <p key={idx} className={styles.summaryText}>{paragraph}</p>
        ))}
      </div>

      <div className={styles.eventsSection}>
        <div className={styles.eventsHeader}>
          <AlertTriangle size={16} /> TOP 3 RISK EVENTS
        </div>
        <div className={styles.eventsList}>
          {forecastData.keyEvents.map((event, idx) => (
            <div 
              key={idx} 
              className={`${styles.eventCard} ${event.direction === "gbp_positive" ? styles.eventPositive : styles.eventNegative}`}
            >
              <div className={styles.eventHeader}>
                <span className={styles.eventName}>{event.event}</span>
                <span className={styles.eventDate}>{event.dateWindow}</span>
              </div>
              <p className={styles.eventImpact}>{event.impact}</p>
              <div className={styles.eventFooter}>
                <Badge variant={event.direction === "gbp_positive" ? "success" : "destructive"} className={styles.eventDirectionBadge}>
                  {event.direction === "gbp_positive" ? "GBP Positive ▲" : "GBP Negative ▼"}
                </Badge>
                <span className={styles.eventMagnitude}>Impact: {event.magnitude}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};