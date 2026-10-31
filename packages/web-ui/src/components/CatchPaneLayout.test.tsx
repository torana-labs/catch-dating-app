import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchPaneLayout} from "./CatchPaneLayout";

afterEach(cleanup);

describe("CatchPaneLayout", () => {
  it("places main and detail in their slots for the queue pattern", () => {
    const {container} = render(<CatchPaneLayout detail={<p>Inspector</p>} detailOpen main={<p>Table</p>} pattern="queue" />);
    const panes = container.firstElementChild as HTMLElement;
    expect(panes.dataset.pattern).toBe("queue");
    expect(panes.dataset.detailOpen).toBe("");
    expect(screen.getByText("Table").parentElement?.dataset.slot).toBe("main");
    expect(screen.getByText("Inspector").parentElement?.dataset.slot).toBe("detail");
  });

  it("uses the aside for feed and reading, and never splits a wide table", () => {
    const {container, rerender} = render(<CatchPaneLayout aside={<p>Numbers</p>} main={<p>Feed</p>} pattern="feed" />);
    expect(screen.getByText("Numbers").parentElement?.dataset.slot).toBe("aside");
    rerender(<CatchPaneLayout main={<p>Rows</p>} pattern="wide-table" />);
    const panes = container.firstElementChild as HTMLElement;
    expect(panes.dataset.split).toBeUndefined();
    expect(panes.children).toHaveLength(1);
  });
});
