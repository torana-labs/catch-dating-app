import {act, cleanup, fireEvent, render, renderHook, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {applyBrand} from "@content/brand";
import page from "@content/playbook/pages/resources/tools-no-show-calculator.json";
import {validatedPlaybookPage} from "@content/playbook/playbookContract";
import {hostPricingLines} from "@content/pricing";
import {NoShowCalculator, noShowCalculatorLabelKeys} from "./NoShowCalculator";
import {useNoShowCalculator} from "./useNoShowCalculator";

afterEach(cleanup);

const section = applyBrand(validatedPlaybookPage(page)).sections.find((item) => item.type === "custom" && item.component === "noShowCalculator");
const labels = Object.fromEntries((section?.type === "custom" ? section.labels ?? [] : []).map((label) => [label.key, label.text]));

describe("useNoShowCalculator", () => {
  it("pulls the what-if down with today's rate and never lets it pass it", () => {
    const {result} = renderHook(() => useNoShowCalculator());
    act(() => result.current.setTarget(60));
    expect(result.current.figures.target).toBe(20);
    act(() => result.current.setRate([0, 8]));
    expect([result.current.figures.rate, result.current.figures.target]).toEqual([8, 8]);
    act(() => result.current.setPlaces(""));
    expect(result.current.figures.costPerMonth).toBe(0);
  });
});

describe("NoShowCalculator", () => {
  it("has every word it shows in the page's labels", () => {
    expect(Object.keys(labels).sort()).toEqual([...noShowCalculatorLabelKeys].sort());
  });

  it("shows what no-shows cost per event and per month, and the host's own what-if", () => {
    render(<NoShowCalculator ground="white" id="calculator" labels={labels} title="Work it out" />);
    expect(screen.getByRole("status").textContent).toBe("At 20%, no-shows cost you ₹16,000 a month.");
    expect(screen.getByText("₹4,000")).toBeTruthy();
    expect(screen.getAllByText("₹8,000").length).toBe(2);
    expect(screen.getByText(hostPricingLines.body)).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", {name: labels.places}), {target: {value: "100"}});
    expect(screen.getByRole("status").textContent).toBe("At 20%, no-shows cost you ₹40,000 a month.");
    fireEvent.change(screen.getByRole("slider", {name: labels.target}), {target: {value: "5"}});
    expect(screen.getByText("If your no-show rate fell to 5%")).toBeTruthy();
    expect(screen.getByText("₹30,000")).toBeTruthy();
  });

  it("asks a free event what each place costs, and costs it by that", () => {
    render(<NoShowCalculator ground="white" id="calculator" labels={labels} />);
    expect(screen.queryByRole("textbox", {name: labels.costPerHead})).toBeNull();
    fireEvent.change(screen.getByRole("textbox", {name: labels.price}), {target: {value: "0"}});
    expect(screen.getAllByText(labels.costPerHeadMissing).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("textbox", {name: labels.costPerHead}), {target: {value: "300"}});
    expect(screen.getByRole("status").textContent).toBe("At 20%, no-shows cost you ₹9,600 a month.");
    expect(screen.getByText(labels.freeNote)).toBeTruthy();
  });

  it("states no rate, benchmark or result of its own", () => {
    const words = Object.values(labels).join(" ");
    // The only percentages the calculator shows are the host's, filled in at {rate} and {target}.
    expect(words).not.toMatch(/\d+\s?%/u);
    expect(words).not.toMatch(/\b(average|typical|industry|benchmark|cuts?|reduces?|guarantee)\b/iu);
  });
});
