import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchTable, type CatchTableColumn} from "./CatchTable";
import {CatchViewport} from "./CatchViewport";

afterEach(cleanup);

interface Row {
  key: string;
  item: {title: string; subtitle: string};
  type: {label: string};
  reply: {label: string; tone: "success"};
  waiting: {text: string; tone: "danger"} | string;
}

const rows: Row[] = [
  {key: "afterfly", item: {title: "Afterfly", subtitle: "Weekly social nights"}, type: {label: "Listing"}, reply: {label: "Replied", tone: "success"}, waiting: {text: "3 days", tone: "danger"}},
  {key: "harbor", item: {title: "Harbor Social", subtitle: "Enquiry"}, type: {label: "Enquiry"}, reply: {label: "Replied", tone: "success"}, waiting: "1 day"},
];
const columns: CatchTableColumn<Row>[] = [
  {key: "item", label: "Item", kind: "title"},
  {key: "type", label: "Type", kind: "badge"},
  {key: "reply", label: "Reply", kind: "marker"},
  {key: "waiting", label: "Waiting", sort: "desc", align: "end"},
];

describe("CatchTable", () => {
  it("draws title, badge, marker and toned cells with a sort arrow and the selected row", () => {
    const onRowPressed = vi.fn();
    render(<CatchTable columns={columns} label="Inbox" onRowPressed={onRowPressed} rows={rows} selectedKey="afterfly" />);
    const table = screen.getByRole("table", {name: "Inbox"});
    expect(within(table).getByRole("columnheader", {name: /Waiting/u}).getAttribute("aria-sort")).toBe("descending");
    expect(within(table).getByText("Weekly social nights")).toBeTruthy();
    expect(within(table).getAllByRole("img", {name: "Replied"})).toHaveLength(2);
    expect(within(table).getByText("3 days").dataset.tone).toBe("danger");
    const [, first, second] = within(table).getAllByRole("row");
    expect(first!.getAttribute("aria-selected")).toBe("true");
    fireEvent.click(second!);
    fireEvent.keyDown(second!, {key: "Enter"});
    expect(onRowPressed).toHaveBeenCalledTimes(2);
    expect(onRowPressed).toHaveBeenCalledWith(rows[1]);
  });

  it("checks rows, selects all, and shows the bulk bar while rows are checked", () => {
    const onChecked = vi.fn();
    const approve = vi.fn();
    const {rerender} = render(
      <CatchTable bulk={[{label: "Approve", onPressed: approve, variant: "primary"}]} checked={[]} columns={columns} label="Inbox" onChecked={onChecked} rows={rows} selectable />,
    );
    expect(screen.queryByRole("toolbar")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", {name: "Select all"}));
    expect(onChecked).toHaveBeenLastCalledWith(["afterfly", "harbor"]);
    rerender(
      <CatchTable bulk={[{label: "Approve", onPressed: approve, variant: "primary"}]} checked={["harbor"]} columns={columns} label="Inbox" onChecked={onChecked} rows={rows} selectable />,
    );
    expect((screen.getByRole("checkbox", {name: "Select all"}) as HTMLInputElement).indeterminate).toBe(true);
    expect(screen.getByRole("toolbar", {name: "1 selected"})).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Approve"}));
    expect(approve).toHaveBeenCalledOnce();
    fireEvent.click(screen.getAllByRole("checkbox", {name: "Select row"})[1]!);
    expect(onChecked).toHaveBeenLastCalledWith([]);
  });

  it("folds into list rows on phones", () => {
    render(<CatchViewport sizeClass="compact"><CatchTable columns={columns} label="Inbox" rows={rows} /></CatchViewport>);
    expect(screen.queryByRole("table")).toBeNull();
    const list = screen.getByRole("list", {name: "Inbox"});
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("Afterfly")).toBeTruthy();
    expect(within(list).getByText("Weekly social nights")).toBeTruthy();
  });
});
