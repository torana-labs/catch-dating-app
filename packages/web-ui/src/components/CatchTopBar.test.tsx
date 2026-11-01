import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchTopBar} from "./CatchTopBar";
import {CatchViewport} from "./CatchViewport";

afterEach(cleanup);

describe("CatchTopBar", () => {
  it("is one wide row with the kicker as a breadcrumb on desktops", () => {
    const onBack = vi.fn();
    render(
      <CatchViewport sizeClass="expanded" topBar={<CatchTopBar action={{label: "Preview", href: "#preview"}} back={{label: "Back", onPressed: onBack}} kicker="Settings" title="Intake" />} />,
    );
    const header = screen.getByRole("banner");
    expect(header.dataset.wide).toBe("");
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe("Intake");
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByRole("link", {name: "Preview"})).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Back"}));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("keeps the phone shapes: a step counter with segments, and close only for a moment", () => {
    render(<CatchViewport sizeClass="compact" topBar={<CatchTopBar step={{index: 2, total: 4}} title="Your page" variant="step" />} />);
    expect(screen.getByRole("img", {name: "Step 2 of 4"}).children).toHaveLength(4);
    cleanup();
    render(<CatchTopBar back={{label: "Close", onPressed: () => undefined}} title="Ignored" variant="moment" />);
    expect(screen.getByRole("button", {name: "Close"})).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
