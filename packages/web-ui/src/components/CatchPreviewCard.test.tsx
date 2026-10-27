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

  it("adds a tag, a detail line and a button-shaped action while staying one link", () => {
    render(<CatchPreviewCard action="Book" actionAccent="coral" detail="Sun 2 Nov, 6:30 AM · Lantern Lane jetty" ground="ink" href="/events/run"
      label="Next up · in 2 days" labelAccent="coral" meta="Free · 31 spots left" size="feature" tag="On Catch" title="Sunday Social Run" />);
    const link = screen.getByRole("link");
    expect(link.textContent).toBe("Next up · in 2 days On Catch Sunday Social Run Sun 2 Nov, 6:30 AM · Lantern Lane jetty Free · 31 spots left Book");
    expect(link.dataset).toMatchObject({catchTheme: "dark", ground: "ink", size: "feature"});
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Next up · in 2 days").dataset.color).toBe("coral");
  });
});
