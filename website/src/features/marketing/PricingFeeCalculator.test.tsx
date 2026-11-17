import {act, cleanup, fireEvent, render, renderHook, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {hostFeeCalculatorCopy as copy, hostFeeSalesRange} from "@content/pricing";
import {PricingFeeCalculator} from "./PricingFeeCalculator";
import {usePricingFeeCalculator} from "./usePricingFeeCalculator";

afterEach(cleanup);

describe("usePricingFeeCalculator", () => {
  it("starts at the shared model's sales and works the fee out from them", () => {
    const {result} = renderHook(() => usePricingFeeCalculator());
    expect(result.current.sales).toBe(hostFeeSalesRange.initial);
    expect([result.current.salesText, result.current.feeText, result.current.rateText, result.current.capped]).toEqual(["₹1,20,000", "₹6,000", "5%", false]);
  });

  it("keeps the sales inside the slider's range and caps the fee", () => {
    const {result} = renderHook(() => usePricingFeeCalculator(0));
    act(() => result.current.setSales(900_000));
    expect([result.current.sales, result.current.feeText, result.current.rateText, result.current.capped]).toEqual([500_000, "₹10,000", "2%", true]);
    act(() => result.current.setSales([0, 300_000]));
    expect([result.current.feeText, result.current.rateText]).toEqual(["₹10,000", "3.3%"]);
    act(() => result.current.setSales(-10));
    expect([result.current.sales, result.current.feeText]).toEqual([0, "₹0"]);
  });
});

describe("PricingFeeCalculator", () => {
  it("prices a billing cycle on the slider: 5% after the trial, capped at ₹10,000", () => {
    render(<PricingFeeCalculator />);
    expect(screen.getAllByText("₹6,000").length).toBeGreaterThan(0);
    expect(screen.queryByText(copy.capped)).toBeNull();
    expect(screen.getByText(copy.trial)).toBeTruthy();
    expect(screen.getByText(copy.gateway)).toBeTruthy();
    fireEvent.change(screen.getByRole("slider", {name: copy.sales}), {target: {value: "300000"}});
    expect(screen.getByText("₹10,000")).toBeTruthy();
    expect(screen.getByText("3.3%")).toBeTruthy();
    expect(screen.getByText(copy.capped)).toBeTruthy();
  });

  it("says billing cycle, not month", () => {
    const {container} = render(<PricingFeeCalculator initialSales={40_000} />);
    expect(container.textContent).toContain("billing cycle");
    expect(container.textContent).not.toMatch(/month/iu);
    expect(screen.getByText("₹2,000")).toBeTruthy();
  });
});
