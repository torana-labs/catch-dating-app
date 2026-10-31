import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchPaneLayout} from "./CatchPaneLayout";
import {CatchWorkspaceHeader} from "./CatchWorkspaceHeader";

afterEach(cleanup);

describe("CatchWorkspaceHeader", () => {
  it("heads a pane with its count, note, views and filters as data", () => {
    const onView = vi.fn();
    const onChip = vi.fn();
    const onSearch = vi.fn();
    render(
      <CatchWorkspaceHeader
        count={23}
        filters={{chips: [{label: "Listings", count: 12, selected: true}, {label: "Claims", count: 4, onPressed: onChip}], search: {placeholder: "Search the inbox", onChanged: onSearch}}}
        note="oldest 3 days"
        title="Inbox"
        views={{items: [{value: "waiting", label: "Waiting", count: 23}, {value: "done", label: "Done"}], value: "waiting", onChanged: onView}}
      />,
    );
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe("Inbox 23");
    expect(screen.getByText("oldest 3 days")).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", {name: "Show"}), {target: {value: "done"}});
    expect(onView).toHaveBeenCalledWith("done");
    expect(screen.getByRole("button", {name: "Listings 12"}).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", {name: "Claims 4"}));
    expect(onChip).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByRole("searchbox", {name: "Search the inbox"}), {target: {value: "harbor"}});
    expect(onSearch).toHaveBeenCalledWith("harbor");
  });

  it("drops back and breadcrumb beside its list, and keeps them when the detail stands alone", () => {
    const header = <CatchWorkspaceHeader back={{label: "Back to the inbox", onPressed: () => undefined}} kicker="Inbox" position={{label: "1 of 23"}} title="Harbor Social" />;
    render(<CatchPaneLayout detail={header} main={<p>Queue</p>} pattern="queue" />);
    expect(screen.queryByRole("button", {name: "Back to the inbox"})).toBeNull();
    expect(screen.queryByText("Inbox")).toBeNull();
    expect(screen.getByText("1 of 23")).toBeTruthy();
    cleanup();
    render(header);
    expect(screen.getByRole("button", {name: "Back to the inbox"})).toBeTruthy();
    expect(screen.getByText("Inbox")).toBeTruthy();
  });
});
