import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {applyBrand} from "@content/brand";
import page from "@content/playbook/pages/product/reports.json";
import {validatedPlaybookPage} from "@content/playbook/playbookContract";
import {hostFeeCalculatorCopy, hostFeeQuote, hostPricing} from "@content/pricing";
import {LastEventReport, lastEventReportLabelKeys} from "./LastEventReport";
import {formatLastEventMoney as money} from "./lastEventReportModel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const section = applyBrand(validatedPlaybookPage(page)).sections.find((item) => item.type === "custom" && item.component === "lastEventReport");
const labels = Object.fromEntries((section?.type === "custom" ? section.labels ?? [] : []).map((label) => [label.key, label.text]));

function type(label: string, value: string) {
  fireEvent.change(screen.getByRole("textbox", {name: label}), {target: {value}});
}

function enterEvent(sold: string, price: string, came: string) {
  type(labels.sold, sold);
  type(labels.price, price);
  type(labels.came, came);
}

describe("LastEventReport", () => {
  it("has every word it shows in the page's labels", () => {
    expect(Object.keys(labels).sort()).toEqual([...lastEventReportLabelKeys].sort());
  });

  it("shows no figure until the host enters their own numbers", () => {
    render(<LastEventReport ground="paper" id="numbers" labels={labels} title="See it" />);
    expect(screen.getByRole("status").textContent).toBe(labels.emptyResults);
    expect(screen.queryByText(hostFeeCalculatorCopy.fee)).toBeNull();
  });

  it("builds the report from the three numbers, then compares the fee the host enters", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<LastEventReport ground="paper" id="numbers" labels={labels} title="See it" />);
    enterEvent("52", "400", "46");
    const fee = hostFeeQuote(20_800).fee;
    expect(screen.getByRole("status").textContent).toBe(`46 of 52 came. On ₹20,800 of ticket sales, Catch’s fee would have been ${money(fee)}.`);
    expect(screen.getByText("₹20,800")).toBeTruthy();
    expect(screen.getByText("88%")).toBeTruthy();
    expect(screen.getByText(hostFeeCalculatorCopy.feeNote)).toBeTruthy();
    expect(screen.getByText(hostFeeCalculatorCopy.trial)).toBeTruthy();
    expect(screen.getByText(hostFeeCalculatorCopy.gateway)).toBeTruthy();
    expect(screen.getByText(labels.currentFeeMissing)).toBeTruthy();
    type(labels.feePercent, "8");
    expect(screen.getByText("₹1,664")).toBeTruthy();
    expect(screen.getByText(money(1_664 - fee))).toBeTruthy();
    expect(screen.getByText("less with Catch")).toBeTruthy();
    type(labels.feePercent, "1");
    expect(screen.getByText(money(fee - 208))).toBeTruthy();
    expect(screen.getByText("more with Catch")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses more who came than tickets sold, and shows no report until it is fixed", () => {
    render(<LastEventReport ground="paper" id="numbers" labels={labels} />);
    enterEvent("52", "400", "60");
    expect(screen.getByText(labels.errorCameMoreThanSold)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(labels.fixResults);
    expect(screen.queryByText("₹20,800")).toBeNull();
    type(labels.came, "52");
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("states the maximum when a number is too large", () => {
    render(<LastEventReport ground="paper" id="numbers" labels={labels} />);
    enterEvent("52", "400", "46");
    type(labels.feePercent, "120");
    expect(screen.getByText("Enter 100% or less.")).toBeTruthy();
  });

  it("says a free event stays free, and uses the cap's words once the fee reaches it", () => {
    render(<LastEventReport ground="paper" id="numbers" labels={labels} />);
    enterEvent("40", "0", "35");
    expect(screen.getByText(labels.freeNote)).toBeTruthy();
    enterEvent("500", "1000", "480");
    expect(screen.getByText(hostFeeCalculatorCopy.capped)).toBeTruthy();
    expect(screen.getAllByText(money(hostPricing.cap)).length).toBeGreaterThan(0);
  });

  it("states no figure, rate or saving of its own", () => {
    // The field hints are the try card's placeholders, never worked into a sum; "Put 0 for a free event" is the only other number.
    const words = Object.entries(labels).filter(([key]) => !key.endsWith("Hint") && key !== "priceHelp").map(([, text]) => text).join(" ");
    expect(words).not.toMatch(/\d/u);
    expect(words).not.toMatch(/\b(save|saving|savings|average|typical|industry|benchmark|cheaper|guarantee)\b/iu);
    expect(words).not.toMatch(/\b(upload|export)\b/iu);
  });
});
