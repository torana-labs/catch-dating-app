import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchFeeSection} from "./CatchFeeSection";

afterEach(cleanup);

describe("CatchFeeSection", () => {
  it("is a section named by the rate's headline, with the rate, lead, labels, actions, calculator, examples and foot", () => {
    render(
      <CatchFeeSection actions={[{label: "Start", href: "#start"}]} calculator={<p>Calculator</p>} examples={[{title: "A run", value: "[N] a run", body: "Free runs cost nothing."}]}
        foot={{text: "Running several nights?", action: {label: "Talk to us", href: "#talk"}}} id="pricing" kicker="Pricing" labels={["Your page", "Payments"]}
        lead="How it works." rate="[N]%" rateTitle="of ticket sales." />,
    );
    const band = within(screen.getByRole("region", {name: "of ticket sales."}));
    expect(band.getByRole("heading", {level: 2}).textContent).toBe("of ticket sales.");
    expect(band.getByText("[N]%").dataset.variant).toBe("display-giant");
    expect(band.getByText("Pricing")).toBeTruthy();
    expect(band.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Your page", "Payments", "A run[N] a runFree runs cost nothing."]);
    expect(band.getByRole("link", {name: "Start"}).getAttribute("href")).toBe("#start");
    expect(band.getByText("Calculator")).toBeTruthy();
    expect(band.getByRole("link", {name: "Talk to us"}).getAttribute("href")).toBe("#talk");
  });

  it("opens its page with a headline over the rate: the h1 names it and the rate's headline follows as an h2", () => {
    render(<CatchFeeSection level={1} rate="[N]%" rateTitle="of ticket sales." title="Free events stay free." />);
    expect(screen.getByRole("region", {name: "Free events stay free."})).toBeTruthy();
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe("Free events stay free.");
    expect(screen.getByRole("heading", {level: 2}).textContent).toBe("of ticket sales.");
  });
});
