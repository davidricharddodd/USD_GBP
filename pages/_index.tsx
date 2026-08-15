import React, { useState, useMemo, useEffect } from "react";
import {
  useCurrentRate,
  useAlerts,
  useCreateAlert,
  useDeleteAlert,
} from "../helpers/useRatesApi";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Badge } from "../components/Badge";
import { RateChart } from "../components/RateChart";
import { Tabs, TabsList, TabsTrigger } from "../components/Tabs";
import { WiseTransferPanel } from "../components/WiseTransferPanel";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { toast } from "sonner";
import {
  Activity,
  RefreshCcw,
  Bell,
  Trash2,
  Clock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import styles from "./_index.module.css";

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

const formatDateTime = (dateStr: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));

const formatRelativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} days ago`;
};

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calcUsd, setCalcUsd] = useState<number | "">(90000);
  const [alertTargetRate, setAlertTargetRate] = useState("");
  const [alertDirection, setAlertDirection] = useState("at_or_below");
  const [activeMainTab, setActiveMainTab] = useState("dashboard");

  // Fetch data
  const {
    data: currentRateData,
    isFetching: isFetchingCurrentRate,
    refetch: refetchCurrentRate,
  } = useCurrentRate();

  const { data: alertsData, isFetching: isFetchingAlerts } = useAlerts();

  // Mutations
  const createAlertMutation = useCreateAlert();
  const deleteAlertMutation = useDeleteAlert();

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    void refetchCurrentRate();
    toast("Refreshing rate...");
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(alertTargetRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error("Please enter a valid target rate");
      return;
    }
    createAlertMutation.mutate(
      { targetRate: rate, direction: alertDirection as any },
      {
        onSuccess: () => {
          toast.success("Alert created successfully");
          setAlertTargetRate("");
        },
        onError: (err: unknown) => {
          if (err instanceof Error) {
            toast.error("Failed to create alert", { description: err.message });
          }
        },
      }
    );
  };

  const handleDeleteAlert = (id: number) => {
    deleteAlertMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Alert deleted");
      },
    });
  };

  // Computed Values
  // currentRateData.rate is USD→GBP (e.g. 0.7471), invert for GBP→USD display
  const gbpToUsdRate = currentRateData ? 1 / currentRateData.rate : null;

  // Conversion calculator: user enters USD, result is GBP (uses raw USD→GBP rate)
  const currentGbp =
    currentRateData && calcUsd ? Number(calcUsd) * currentRateData.rate : null;

  const activeAlerts =
    alertsData?.alerts.filter((a) => a.isActive).sort((a, b) => b.id - a.id) ||
    [];
  const triggeredAlerts =
    alertsData?.alerts
      .filter((a) => !a.isActive)
      .sort((a, b) => b.id - a.id) || [];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Activity size={24} /> GBP/USD Terminal
        </h1>
        <div className={styles.time}>
          {new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(currentTime)}
        </div>
      </header>

      <div className={styles.tabsContainer}>
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
          <TabsList>
            <TabsTrigger value="dashboard" className={styles.mainTab}>Dashboard</TabsTrigger>
            <TabsTrigger value="wise" className={styles.mainTab}>Wise Transfer</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <main className={styles.main}>
        {activeMainTab === "dashboard" ? (
          <div className={styles.grid}>
            {/* LEFT COLUMN: Current Rate & Calculator */}
          <div className={styles.columnLeft}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                Current Spot Rate
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleRefresh}
                  disabled={isFetchingCurrentRate}
                  title="Refresh Rate"
                >
                  <RefreshCcw
                    size={16}
                    className={isFetchingCurrentRate ? styles.spin : ""}
                  />
                </Button>
              </div>

              <div className={styles.rateDisplay}>
                {isFetchingCurrentRate && !currentRateData ? (
                  <>
                    <Skeleton style={{ width: "200px", height: "3rem" }} />
                    <Skeleton style={{ width: "180px", height: "1rem" }} />
                    <Skeleton style={{ width: "140px", height: "0.875rem" }} />
                  </>
                ) : (
                  <>
                    <div className={styles.rateSub} style={{ fontSize: "0.7rem", letterSpacing: "0.08em" }}>
                      1 GBP =
                    </div>
                    <div className={styles.rateValue}>
                      {formatRate(gbpToUsdRate || 0)}
                    </div>
                    <div className={styles.rateSub}>
                      USD
                    </div>
                    <div className={styles.rateSub} style={{ marginTop: "var(--spacing-2)" }}>
                      <Clock size={12} style={{ display: "inline", marginRight: 4 }} />
                      USD→GBP: {currentRateData ? formatRate(currentRateData.rate) : "--"} · Last fetched:{" "}
                      {currentRateData
                        ? formatRelativeTime(currentRateData.fetchedAt)
                        : "--"}
                    </div>
                  </>
                )}
              </div>

              <div className={styles.calcSection}>
                <div className={styles.statLabel}>Conversion Calculator</div>
                <div className={styles.calcInputRow}>
                  <Input
                    type="number"
                    value={calcUsd}
                    onChange={(e) =>
                      setCalcUsd(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder="Enter USD amount"
                    className={styles.monospaceInput}
                  />
                  <span className={styles.currencyLabel}>USD</span>
                </div>
                <div className={styles.calcResult}>
                  {isFetchingCurrentRate && !currentRateData ? (
                    <Skeleton
                      style={{ height: "2rem", width: "150px", marginLeft: "auto" }}
                    />
                  ) : (
                    <>
                      {calcUsd === ""
                        ? "£0.00"
                        : `≈ ${formatCurrency(currentGbp || 0, "GBP")}`}
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* ALERTS SECTION */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Bell size={18} /> Rate Alerts
                </span>
              </div>

              <form onSubmit={handleCreateAlert} className={styles.alertForm}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Target Rate</label>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 1.2900"
                    value={alertTargetRate}
                    onChange={(e) => setAlertTargetRate(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Condition</label>
                  <Select
                    value={alertDirection}
                    onValueChange={setAlertDirection}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="at_or_below">
                        At or Below (Drop)
                      </SelectItem>
                      <SelectItem value="at_or_above">
                        At or Above (Rise)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={createAlertMutation.isPending}
                  style={{ alignSelf: "flex-end" }}
                >
                  Add
                </Button>
              </form>

              <div className={styles.alertsList}>
                <div className={styles.statLabel}>Active Alerts</div>
                {isFetchingAlerts && !alertsData ? (
                  <Skeleton style={{ height: "3rem", width: "100%" }} />
                ) : activeAlerts.length === 0 ? (
                  <div className={styles.emptyState}>No active alerts set.</div>
                ) : (
                  activeAlerts.map((alert) => (
                    <div key={alert.id} className={styles.alertItem}>
                      <div className={styles.alertInfo}>
                        <div className={styles.alertTarget}>
                          {alert.direction === "at_or_below" ? (
                            <TrendingDown
                              size={14}
                              className={styles.iconDrop}
                            />
                          ) : (
                            <TrendingUp size={14} className={styles.iconRise} />
                          )}
                          {formatRate(alert.targetRate)}
                        </div>
                        <div className={styles.alertMeta}>
                          Created{" "}
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(alert.createdAt))}
                        </div>
                      </div>
                      <div className={styles.alertActions}>
                        <Badge variant="outline">Active</Badge>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteAlert(alert.id)}
                          disabled={deleteAlertMutation.isPending}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}

                {triggeredAlerts.length > 0 && (
                  <>
                    <div
                      className={styles.statLabel}
                      style={{ marginTop: "1rem" }}
                    >
                      Recent Triggers
                    </div>
                    {triggeredAlerts.slice(0, 3).map((alert) => (
                      <div
                        key={alert.id}
                        className={`${styles.alertItem} ${styles.triggered}`}
                      >
                        <div className={styles.alertInfo}>
                          <div className={styles.alertTarget}>
                            Target: {formatRate(alert.targetRate)}
                          </div>
                          <div className={styles.alertMeta}>
                            Triggered{" "}
                            {alert.triggeredAt
                              ? formatDateTime(alert.triggeredAt)
                              : ""}
                          </div>
                        </div>
                        <Badge variant="secondary">Triggered</Badge>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </section>
          </div>

            {/* RIGHT COLUMN: Chart & Stats */}
            <div className={styles.columnRight}>
              <RateChart calcUsd={calcUsd} />
            </div>
          </div>
        ) : (
          <WiseTransferPanel defaultAmount={typeof calcUsd === 'number' ? calcUsd : 90000} />
        )}
      </main>
    </div>
  );
}