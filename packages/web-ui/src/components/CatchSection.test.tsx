import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchIndexRow} from "./CatchIndexRow";
import {CatchSection} from "./CatchSection";

afterEach(cleanup);

describe("CatchSection", () => {
  it("joins CatchIndexRow children with timeline={true}", () => {
    const {container} = render(
      <CatchSection count={2} timeline title="Run of show">
        <CatchIndexRow density="regular" marker={{tone: "muted"}} time="6:00 PM" title="Before doors" />
        <CatchIndexRow density="regular" marker={{kind: "ring"}} time="6:30 PM" title="Doors open" />
      </CatchSection>,
    );
    const list = container.querySelector("[data-timeline]") as HTMLElement;
    expect(list.dataset.timeline).toBe("rows");
    expect(list.hasAttribute("role")).toBe(false);
    expect(list.children).toHaveLength(2);
    expect(screen.getByRole("heading", {name: /Run of show/})).toBeTruthy();
  });

  it("still draws a list of steps itself", () => {
    const {container} = render(<CatchSection timeline={[{title: "Applied", state: "done"}, {title: "Paid", state: "next"}]} />);
    expect((container.querySelector("[data-timeline]") as HTMLElement).dataset.timeline).toBe("");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows the empty slot without children", () => {
    render(<CatchSection empty="Nothing here yet" title="2 · You approve" />);
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
  });
});
