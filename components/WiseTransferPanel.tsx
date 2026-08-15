import React, { useState, useMemo } from "react";
import { useWiseQuoteQuery } from "../helpers/useWiseApi";
import { useDebounce } from "../helpers/useDebounce";
import { Input } from "./Input";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { Skeleton } from "./Skeleton";
import { DollarSign, Zap, RefreshCcw, ArrowRight } from "lucide-react";
import styles from "./WiseTransferPanel.module.css";

interface WiseTransferPanelProps {
  defaultAmount?: number;
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

const formatPayInMethod = (method: string) => {
  return method
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const WiseTransferPanel: React.FC<WiseTransferPanelProps> = ({
  defaultAmount = 90000,
}) => {
  const [amountInput, setAmountInput] = useState<string>(
    defaultAmount.toString()
  );
  const parsedAmount = parseFloat(amountInput);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const debouncedAmount = useDebounce(isValidAmount ? parsedAmount : 0, 800);

  const {
    data: quoteData,
    isFetching,
    isError,
    error,
    refetch,
  } = useWiseQuoteQuery(debouncedAmount);

  // Find optimal and target options
  const { balanceOption, filteredOptions, worstOption } = useMemo(() => {
    if (!quoteData || !quoteData.paymentOptions.length) {
      return { balanceOption: null, filteredOptions: [], worstOption: null };
    }

    const targetMethods = ["BALANCE", "BANK_TRANSFER", "DIRECT_DEBIT", "DEBIT", "CREDIT"];
    
    let filtered = quoteData.paymentOptions.filter(opt => 
      targetMethods.includes(opt.payIn)
    );

    // Ensure we have something if exact matches aren't found
    if (filtered.length === 0) {
      filtered = [...quoteData.paymentOptions].slice(0, 4);
    }

    const balanceOpt = quoteData.paymentOptions.find(opt => opt.payIn === "BALANCE") || filtered[0];
    const worstOpt = quoteData.paymentOptions.reduce((prev, curr) => 
      curr.targetAmount < prev.targetAmount ? curr : prev
    );

    return { 
      balanceOption: balanceOpt, 
      filteredOptions: filtered,
      worstOption: worstOpt 
    };
  }, [quoteData]);

  const gbpToUsdRate = quoteData ? 1 / quoteData.rate : 0;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={18} /> Wise Live Quote
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => refetch()}
          disabled={isFetching || !isValidAmount}
          title="Refresh Quote"
        >
          <RefreshCcw size={16} className={isFetching ? styles.spin : ""} />
        </Button>
      </div>

      <div className={styles.inputSection}>
        <div className={styles.statLabel}>Transfer Amount (USD)</div>
        <div className={styles.inputRow}>
          <div className={styles.inputWrapper}>
            <DollarSign size={16} className={styles.inputIcon} />
            <Input
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className={styles.monospaceInput}
              placeholder="e.g. 90000"
              min="1"
              step="1000"
            />
          </div>
        </div>
      </div>

      {isError && (
        <div className={styles.errorBox}>
          Failed to fetch quote:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      {isFetching && !quoteData && (
        <div className={styles.loadingState}>
          <Skeleton style={{ width: "100%", height: "8rem" }} />
          <Skeleton style={{ width: "100%", height: "4rem" }} />
          <Skeleton style={{ width: "100%", height: "10rem" }} />
        </div>
      )}

      {quoteData && !isFetching && balanceOption && worstOption && (
        <div className={styles.resultsSection}>
          
          <div className={styles.recommendedRoute}>
            <div className={styles.recommendedHeader}>
              <Badge variant="success">Recommended Route</Badge>
              <div className={styles.effectiveCost}>
                Effective Cost: {((balanceOption.fee.total / quoteData.sourceAmount) * 100).toFixed(2)}%
              </div>
            </div>

            <div className={styles.stepsList}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepTitle}>Fund Wise USD balance via bank transfer (ACH)</div>
                  <div className={styles.stepCost}>Free</div>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepTitle}>Convert USD <ArrowRight size={12} style={{display: 'inline'}} /> GBP within Wise</div>
                  <div className={styles.stepCost}>{formatCurrency(balanceOption.fee.total, "USD")}</div>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepTitle}>Send GBP to UK bank via Faster Payments</div>
                  <div className={styles.stepCost}>Free</div>
                </div>
              </div>
            </div>

            <div className={styles.breakdownBox}>
              <div className={styles.breakdownRow}>
                <span>Wise conversion fee</span>
                <span>{formatCurrency(balanceOption.fee.transferwise, "USD")}</span>
              </div>
              <div className={styles.breakdownRow}>
                <span>Payment-in fee</span>
                <span>{formatCurrency(balanceOption.fee.payIn, "USD")}</span>
              </div>
              <div className={styles.breakdownDivider} />
              <div className={styles.breakdownTotal}>
                <span>Total Fee</span>
                <span className={styles.feeText}>{formatCurrency(balanceOption.fee.total, "USD")}</span>
              </div>
            </div>
          </div>

          <div className={styles.comparisonSection}>
            <div className={styles.statLabel} style={{ marginBottom: "8px" }}>
              Compare Payment Methods
            </div>
            <div className={styles.comparisonTable}>
              {filteredOptions.map((opt, idx) => {
                const isBest = opt.payIn === balanceOption.payIn;
                const loss = balanceOption.targetAmount - opt.targetAmount;
                
                return (
                  <div key={idx} className={`${styles.comparisonRow} ${isBest ? styles.bestRow : ""}`}>
                    <div className={styles.colMethod}>
                      {formatPayInMethod(opt.payIn)}
                      {isBest && <span className={styles.bestLabel}> (Best)</span>}
                    </div>
                    <div className={styles.colFee}>
                      {formatCurrency(opt.fee.total * quoteData.rate, "GBP")}
                    </div>
                    <div className={styles.colReceive}>
                      {formatCurrency(opt.targetAmount, "GBP")}
                    </div>
                    <div className={styles.colSavings}>
                      {loss > 0 ? `-${formatCurrency(loss, "GBP")} less` : "-"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.summaryBox}>
            <div className={styles.summaryHeader}>
              Transfer Summary (Using Wise Balance)
            </div>
            <div className={styles.summaryRow}>
              <span>Exchange rate:</span>
              <span>1 GBP = {formatRate(gbpToUsdRate)} USD</span>
            </div>
            <div className={styles.summaryRow}>
              <span>You send:</span>
              <span>{formatCurrency(quoteData.sourceAmount, "USD")}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Wise fee:</span>
              <span className={styles.feeText}>
                -{formatCurrency(balanceOption.fee.total, "USD")}
              </span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryTotal}>
              <span>Recipient gets:</span>
              <span className={styles.totalText}>
                {formatCurrency(balanceOption.targetAmount, "GBP")}
              </span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};