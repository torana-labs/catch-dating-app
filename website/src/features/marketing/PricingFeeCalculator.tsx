import {CatchMeter, CatchMetricTile, CatchRangeInput, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {hostFeeCalculatorCopy as copy, hostFeeSalesRange as range, hostPricing} from "@content/pricing";
import {usePricingFeeCalculator} from "./usePricingFeeCalculator";

export interface PricingFeeCalculatorProps {
  /** The sales the slider starts at, in rupees; defaults to the shared model's starting point. */
  initialSales?: number;
}

/**
 * The host fee calculator: one billing cycle's ticket sales on a slider, the
 * fee and the effective rate after the trial, the fee against the cap, and
 * the trial and gateway lines. It owns its state and reads every figure from
 * the shared fee model, so /host/'s pricing band and /pricing/ drop the same
 * calculator into CatchPricingSection's calculator slot.
 */
export function PricingFeeCalculator({initialSales}: PricingFeeCalculatorProps) {
  const calculator = usePricingFeeCalculator(initialSales);
  return (
    <CatchSurface block="floating" padding="lg">
      <CatchText tone="secondary" variant="label-action">{copy.sales}</CatchText>
      <CatchText aria-live="polite" numeric variant="display-lg">{calculator.salesText}</CatchText>
      <CatchRangeInput label={copy.sales} max={range.max} min={range.min} onChange={calculator.setSales} step={range.step} value={calculator.sales} />
      <CatchStack direction="row" justify="between">
        <CatchText tone="secondary" variant="body-meta">{copy.min}</CatchText>
        <CatchText tone="secondary" variant="body-meta">{copy.max}</CatchText>
      </CatchStack>
      <CatchStack collapseBelow="medium" direction="row" equal gap={12}>
        <CatchMetricTile label={copy.fee} note={copy.feeNote} value={calculator.feeText} />
        <CatchMetricTile label={copy.effective} note={copy.effectiveNote} value={calculator.rateText} />
      </CatchStack>
      <CatchMeter kind="cap" label={copy.capLabel} max={hostPricing.cap} thickness={8} value={calculator.fee} />
      <CatchText tone={calculator.capped ? "success" : "secondary"} variant="label-action">{calculator.capped ? copy.capped : copy.uncapped}</CatchText>
      <CatchText variant="body-small">{copy.trial}</CatchText>
      <CatchText tone="secondary" variant="body-meta">{copy.gateway}</CatchText>
    </CatchSurface>
  );
}
