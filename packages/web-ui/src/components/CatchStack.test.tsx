import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";

afterEach(cleanup);

describe("CatchStack", () => {
  it("defaults to a column div with the 12 gap", () => {
    render(<CatchStack data-testid="stack"><span>A</span></CatchStack>);
    const stack = screen.getByTestId("stack");
    expect(stack.tagName).toBe("DIV");
    expect(stack.dataset).toMatchObject({direction: "column", gap: "12"});
    for (const attribute of ["data-align", "data-justify", "data-wrap", "data-equal"]) expect(stack.hasAttribute(attribute)).toBe(false);
  });

  it("carries direction, gap, alignment, justification, wrap, equal and element", () => {
    render(<CatchStack align="baseline" as="ul" className="extra" data-testid="stack" direction="row" equal gap="section" justify="between" wrap><li>One</li></CatchStack>);
    const stack = screen.getByTestId("stack");
    expect(stack.tagName).toBe("UL");
    expect(stack.className).toContain("extra");
    expect(stack.dataset).toMatchObject({align: "baseline", direction: "row", equal: "", gap: "section", justify: "between", wrap: ""});
  });

  it("stacks a row into a column below collapseBelow, keeping only a center or end alignment", () => {
    render(
      <CatchRoot size="compact">
        <CatchStack align="center" collapseBelow="medium" data-testid="centered" direction="row" equal />
        <CatchStack align="stretch" collapseBelow="medium" data-testid="stretched" direction="row" equal />
      </CatchRoot>,
    );
    expect(screen.getByTestId("centered").dataset).toMatchObject({direction: "column", align: "center"});
    expect(screen.getByTestId("centered").hasAttribute("data-equal")).toBe(false);
    expect(screen.getByTestId("stretched").hasAttribute("data-align")).toBe(false);
  });

  it("keeps the row at and above collapseBelow", () => {
    render(
      <CatchRoot size="medium">
        <CatchStack collapseBelow="medium" data-testid="medium" direction="row" equal />
        <CatchStack collapseBelow="expanded" data-testid="expanded" direction="row" equal />
      </CatchRoot>,
    );
    expect(screen.getByTestId("medium").dataset).toMatchObject({direction: "row", equal: ""});
    expect(screen.getByTestId("expanded").dataset.direction).toBe("column");
  });

  it("collapses outside a root, which is compact", () => {
    render(<CatchStack collapseBelow="medium" data-testid="stack" direction="row" />);
    expect(screen.getByTestId("stack").dataset.direction).toBe("column");
  });

  it("never collapses a column", () => {
    render(<CatchRoot size="compact"><CatchStack align="stretch" collapseBelow="expanded" data-testid="stack" /></CatchRoot>);
    expect(screen.getByTestId("stack").dataset).toMatchObject({direction: "column", align: "stretch"});
  });

  it("keeps a fixed rail beside the rest of a row (E1), on the end by default", () => {
    render(
      <CatchRoot size="expanded">
        <CatchStack collapseBelow="expanded" data-testid="booking" direction="row" railWidth="narrow" stickyRail><main /><aside /></CatchStack>
        <CatchStack data-testid="organiser" direction="row" railSide="start" railWidth="wide"><aside /><main /></CatchStack>
      </CatchRoot>,
    );
    expect(screen.getByTestId("booking").dataset).toMatchObject({rail: "narrow", railSide: "end", stickyRail: ""});
    expect(screen.getByTestId("organiser").dataset).toMatchObject({rail: "wide", railSide: "start"});
    expect(screen.getByTestId("organiser").hasAttribute("data-sticky-rail")).toBe(false);
  });

  it("drops the rail when the row stacks, and on a column", () => {
    render(
      <CatchRoot size="medium">
        <CatchStack collapseBelow="expanded" data-testid="stacked" direction="row" railWidth="narrow" stickyRail />
        <CatchStack data-testid="column" railWidth="narrow" />
      </CatchRoot>,
    );
    for (const id of ["stacked", "column"]) {
      for (const attribute of ["data-rail", "data-rail-side", "data-sticky-rail"]) expect(screen.getByTestId(id).hasAttribute(attribute)).toBe(false);
    }
  });
});
