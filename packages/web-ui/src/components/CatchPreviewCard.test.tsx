import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchPreviewCard} from "./CatchPreviewCard";

afterEach(cleanup);

describe("CatchPreviewCard", () => {
  it("is one link that reads its label, title and meta", () => {
    const onClick = vi.fn();
    render(<CatchPreviewCard ground="indigo" href="/events/rave" label="Sat 15 Nov · 5:30 PM" meta="₹799 · Luma" onClick={onClick} title="Run & Rave" />);
    const link = screen.getByRole("link");
    expect(link.textContent).toBe("Sat 15 Nov · 5:30 PM Run & Rave ₹799 · Luma");
    expect(link.getAttribute("href")).toBe("/events/rave");
    expect(link.dataset.ground).toBe("indigo");
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("defaults to paper and drops an empty meta line", () => {
    render(<CatchPreviewCard href="#" label="Sun 2 Nov" title="Sunday Social Run" />);
    const link = screen.getByRole("link");
    expect(link.dataset.ground).toBe("paper");
    expect(link.textContent).toBe("Sun 2 Nov Sunday Social Run");
  });
});
