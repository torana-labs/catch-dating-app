import {CatchFeeCalculator} from "@catch/web-ui";
import {hostFeeCalculatorCopy as copy, hostFeeSalesRange as range} from "@content/pricing";
import {usePricingFeeCalculator} from "./usePricingFeeCalculator";

export interface PricingFeeCalculatorProps {
  /** The sales the slider starts at, in rupees; defaults to the shared model's starting point. */
  initialSales?: number;
}

/**
 * The host fee calculator: one billing cycle's ticket sales on a slider, the
 * fee and the effective rate after the trial, the cap line once the fee
 * reaches it, and the trial and gateway lines. It owns its state and reads
 * every figure from the shared fee model, so /host/'s fee band and /pricing/
 * show the same calculator in CatchFeeSection's second column.
 */
export function PricingFeeCalculator({initialSales}: PricingFeeCalculatorProps) {
  const calculator = usePricingFeeCalculator(initialSales);
  return (
    <CatchFeeCalculator
      fine={[copy.trial, copy.gateway]}
      label={copy.sales}
      max={range.max}
      maxLabel={copy.max}
      min={range.min}
      minLabel={copy.min}
      onChange={calculator.setSales}
      status={calculator.capped ? copy.capped : undefined}
      step={range.step}
      tiles={[
        {label: copy.fee, value: calculator.feeText, note: copy.feeNote},
        {label: copy.effective, value: calculator.rateText, note: copy.effectiveNote},
      ]}
      value={calculator.sales}
      valueText={calculator.salesText}
    />
  );
}
