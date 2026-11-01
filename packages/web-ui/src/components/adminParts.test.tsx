import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchBarIndicator} from "./CatchBarIndicator";
import {CatchDialog} from "./CatchDialog";
import {CatchDock} from "./CatchDock";
import {CatchEmptyState} from "./CatchEmptyState";
import {CatchIndexRow} from "./CatchIndexRow";
import {CatchMetaRow} from "./CatchMetaRow";
import {CatchMetricSection} from "./CatchMetricSection";
import {CatchSection} from "./CatchSection";

afterEach(cleanup);

describe("CatchSection", () => {
  it("titles a group of rows with a count and action, and drops its lines once a row is chosen", () => {
    const onAll = vi.fn();
    const {container} = render(
      <CatchSection action={{label: "All 14", onPressed: onAll}} count={14} title="Oldest first">
        <CatchIndexRow onTap={() => undefined} title="Afterfly" />
        <CatchIndexRow onTap={() => undefined} selected title="Bhag Club" />
      </CatchSection>,
    );
    expect(screen.getByRole("heading", {level: 2}).textContent).toBe("Oldest first 14");
    fireEvent.click(screen.getByRole("button", {name: "All 14"}));
    expect(onAll).toHaveBeenCalledOnce();
    expect(container.querySelector("[data-dividers='between']")).not.toBeNull();
  });

  it("draws a journey as a timeline that reads each step's state", () => {
    render(
      <CatchSection
        timeline={[
          {title: "Riya sent a link", meta: "9:41 PM", state: "done"},
          {title: "Waiting for a review", meta: "Now", state: "current", tone: "warning"},
          {title: "Published unclaimed", meta: "Next", state: "next"},
        ]}
        title="How it got here"
      />,
    );
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Done: Riya sent a link9:41 PM",
      "Now: Waiting for a reviewNow",
      "Next: Published unclaimedNext",
    ]);
  });

  it("shows the empty state when it has no rows", () => {
    render(<CatchSection empty={<p>Nothing here</p>} title="Claims" />);
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });
});

describe("CatchMetaRow", () => {
  it("sets labels over values with tones and links, or one dot-separated line", () => {
    render(<CatchMetaRow entries={[{label: "City", value: "Mumbai"}, {label: "Waiting", value: "3 days", tone: "danger"}, {label: "Nominated by", value: "Riya", href: "/people/riya"}]} />);
    expect(screen.getByText("Waiting").nextElementSibling?.getAttribute("data-tone")).toBe("danger");
    expect(screen.getByRole("link", {name: "Riya"}).getAttribute("href")).toBe("/people/riya");
    cleanup();
    const {container} = render(<CatchMetaRow entries={[{label: "Kind", value: "Listing"}, {label: "City", value: "Mumbai"}]} recipe="flow" />);
    expect(container.textContent).toBe("ListingMumbai");
    expect(container.querySelectorAll("span")).toHaveLength(2);
  });
});

describe("CatchMetricSection and CatchBarIndicator", () => {
  it("lists metrics as terms with values and notes", () => {
    render(<CatchMetricSection label="This week" metrics={[{label: "Waiting on you", value: "14", note: "3 over 2 days", noteTone: "warning"}]} />);
    const strip = screen.getByRole("term").closest("dl")!;
    expect(strip.getAttribute("aria-label")).toBe("This week");
    expect(screen.getByText("3 over 2 days").dataset.tone).toBe("warning");
  });

  it("reads a bar chart aloud with every value, and one bar as a meter", () => {
    render(<CatchBarIndicator bars={[{label: "Mon", value: 12}, {label: "Tue", value: 4, partial: true}]} label="Bookings" recipe="chart" />);
    expect(screen.getByRole("img", {name: "Bookings: Mon 12; Tue 4, still going"})).toBeTruthy();
    cleanup();
    render(<CatchBarIndicator label="Pages read" maxValue={2000} value={812} />);
    expect(screen.getByRole("meter", {name: "Pages read"}).getAttribute("aria-valuenow")).toBe("812");
  });
});

describe("CatchDock pane, CatchEmptyState done and CatchDialog", () => {
  it("draws the decision bar with a note, the next line and its actions", () => {
    const approve = vi.fn();
    const reject = vi.fn();
    const onNote = vi.fn();
    render(
      <CatchDock
        danger={{label: "Reject", onPressed: reject}}
        next="Then: Harbor Social · 3 left"
        note={{label: "Why?", value: "", onChanged: onNote}}
        primary={{label: "Approve", onPressed: approve}}
        recipe="pane"
        secondary={{label: "Snooze", onPressed: () => undefined}}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", {name: "Why?"}), {target: {value: "Real organizer"}});
    expect(onNote).toHaveBeenCalledWith("Real organizer");
    fireEvent.click(screen.getByRole("button", {name: "Reject"}));
    fireEvent.click(screen.getByRole("button", {name: "Approve"}));
    expect(reject).toHaveBeenCalledOnce();
    expect(approve).toHaveBeenCalledOnce();
    expect(screen.getByText("Then: Harbor Social · 3 left")).toBeTruthy();
  });

  it("marks a cleared queue as done with a success mark", () => {
    const {container} = render(<CatchEmptyState kind="done" message="Nothing is waiting on you." title="All caught up" />);
    expect((container.firstElementChild as HTMLElement).dataset.kind).toBe("done");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("confirms or cancels a risky action", () => {
    const onClose = vi.fn();
    const ban = vi.fn();
    render(<CatchDialog confirm={{label: "Ban", onPressed: ban, tone: "danger"}} message="They cannot sign up again." onClose={onClose} open title="Ban this account?" />);
    const dialog = screen.getByRole("dialog", {name: "Ban this account?"});
    fireEvent.click(within(dialog).getByRole("button", {name: "Ban"}));
    fireEvent.click(within(dialog).getByRole("button", {name: "Cancel"}));
    expect(ban).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
