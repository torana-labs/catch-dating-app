import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchPageTabBar} from "./CatchPageTabBar";

afterEach(cleanup);

describe("CatchPageTabBar", () => {
  it("marks the chosen view and reports the next one with its count", () => {
    const onChanged = vi.fn();
    render(
      <CatchPageTabBar
        selected="bills"
        options={[{value: "bills", label: "Bills", count: 4}, {value: "bookings", label: "Bookings"}, {value: "refunds", label: "Refunds", count: 1}]}
        label="Money"
        onChanged={onChanged}
      />,
    );
    expect(screen.getByRole("tablist", {name: "Money"})).toBeTruthy();
    expect(screen.getByRole("tab", {name: "Bills 4"}).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", {name: "Refunds 1"}));
    expect(onChanged).toHaveBeenCalledWith("refunds");
  });

  it("renders views that open other screens as links and slides one pill when filled", () => {
    const onChanged = vi.fn();
    const {container} = render(
      <CatchPageTabBar selected="overview" fill options={[{value: "overview", label: "Overview"}, {value: "events", label: "Events", href: "/organizers/afterfly/events"}]} label="Organizer" onChanged={onChanged} />,
    );
    const link = screen.getByRole("tab", {name: "Events"});
    expect(link.getAttribute("href")).toBe("/organizers/afterfly/events");
    expect(fireEvent.click(link)).toBe(false);
    expect(onChanged).toHaveBeenCalledWith("events");
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
  });
});
