import {useState} from "react";
import {formatPricingMoney, formatPricingRate, hostFeeQuote, hostFeeSalesRange} from "@content/pricing";

/**
 * The fee calculator's state: one billing cycle's ticket sales on the
 * slider, and the fee on them worked out by the shared fee model
 * (content/pricing.ts), so every page that shows the calculator agrees with
 * every page that states the price.
 */
export function usePricingFeeCalculator(initialSales: number = hostFeeSalesRange.initial) {
  const [sales, setSalesValue] = useState(() => hostFeeQuote(initialSales).sales);
  const quote = hostFeeQuote(sales);
  /** Takes the slider's value; a range slider reports its upper thumb. */
  const setSales = (value: number | readonly number[]) => {
    const next = Array.isArray(value) ? value[value.length - 1] : value;
    setSalesValue(hostFeeQuote(Math.min(Math.max(Number(next), hostFeeSalesRange.min), hostFeeSalesRange.max)).sales);
  };
  return {
    sales: quote.sales,
    setSales,
    fee: quote.fee,
    capped: quote.capped,
    salesText: formatPricingMoney(quote.sales),
    feeText: formatPricingMoney(quote.fee),
    rateText: formatPricingRate(quote.effectiveRate),
  };
}

export type PricingFeeCalculatorState = ReturnType<typeof usePricingFeeCalculator>;
