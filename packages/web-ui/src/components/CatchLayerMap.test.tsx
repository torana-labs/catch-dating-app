import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchLayerMap, type CatchLayerMapProps} from "./CatchLayerMap";

afterEach(cleanup);

const labels: CatchLayerMapProps["labels"] = {
  on: "Catch runs this",
  off: "Stays on your own tools",
  everyLayer: "Every layer",
  fromLayer: (layer) => `From layer ${layer}`,
  newHere: "new here",
  youKeep: (yours) => `You keep ${yours}`,
};
const nodes: CatchLayerMapProps["nodes"] = [
  {label: "Get found", from: 2, yours: "Instagram and your own page"},
  {label: "Messages", from: 1, yours: "your WhatsApp groups"},
  {label: "Check-in", from: 0},
];

const card = (label: string) => screen.getByText(label).closest("li") as HTMLElement;

describe("CatchLayerMap", () => {
  it("shows the legend and one card per job", () => {
    render(<CatchLayerMap labels={labels} layer={0} nodes={nodes} />);
    expect(screen.getAllByText("Catch runs this").length).toBeGreaterThan(0);
    expect(screen.getByText("Stays on your own tools")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("runs only the jobs from the chosen layer down, and says what the host keeps", () => {
    render(<CatchLayerMap labels={labels} layer={0} nodes={nodes} />);
    expect(card("Check-in").hasAttribute("data-on")).toBe(true);
    expect(card("Check-in").textContent).toContain("Every layer");
    expect(card("Messages").hasAttribute("data-on")).toBe(false);
    expect(card("Messages").textContent).toContain("From layer 2");
    expect(card("Messages").textContent).toContain("You keep your WhatsApp groups");
  });

  it("marks the jobs the current layer brings in as new", () => {
    render(<CatchLayerMap labels={labels} layer={1} nodes={nodes} />);
    expect(card("Messages").dataset.new).toBe("true");
    expect(card("Messages").textContent).toContain("Catch runs this · new here");
    expect(card("Check-in").hasAttribute("data-new")).toBe(false);
    expect(card("Get found").hasAttribute("data-on")).toBe(false);
  });
});
