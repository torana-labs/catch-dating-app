import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, expectTypeOf, it} from "vitest";
import {
  CatchAdminCommandRow,
  CatchAdminCommandStack,
  type CatchAdminCommandRowProps,
  type CatchAdminCommandStackProps,
} from "./CatchAdminCommandStack";
import {
  CatchAdminIntakeDecisionActions,
  CatchAdminIntakeDecisionState,
  type CatchAdminIntakeDecisionActionsProps,
  type CatchAdminIntakeDecisionStateProps,
} from "./CatchAdminIntakeDecision";
import {CatchAdminIntakeSourceList, type CatchAdminIntakeSourceListProps} from "./CatchAdminIntakeSourceList";
import {CatchAdminSearchCandidateHeader, type CatchAdminSearchCandidateHeaderProps} from "./CatchAdminSearchCandidateHeader";

afterEach(cleanup);

// Admin T4 parts (D18): each draws one container and passes its children and
// accessibility attributes through; the feature binds the content.
describe("Admin T4 parts", () => {
  it("renders a command stack of labelled command rows", () => {
    render(
      <CatchAdminCommandStack aria-label="Commands">
        <CatchAdminCommandRow>
          <span>Sync</span>
          <code>npm run marketing:sync</code>
        </CatchAdminCommandRow>
      </CatchAdminCommandStack>,
    );
    const stack = screen.getByLabelText("Commands");
    expect(stack.tagName).toBe("DIV");
    expect(stack.children).toHaveLength(1);
    expect(screen.getByText("npm run marketing:sync").tagName).toBe("CODE");
  });

  it("renders decision actions in order and a saved decision state", () => {
    const {rerender} = render(
      <CatchAdminIntakeDecisionActions aria-label="Decision">
        <button type="button">Approve</button>
        <button type="button">Hold</button>
      </CatchAdminIntakeDecisionActions>,
    );
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Approve", "Hold"]);
    rerender(
      <CatchAdminIntakeDecisionState role="status">
        <div>
          <strong>approved</strong>
          <span>reviewDecisions/afterfly</span>
        </div>
      </CatchAdminIntakeDecisionState>,
    );
    expect(screen.getByRole("status").textContent).toBe("approvedreviewDecisions/afterfly");
  });

  it("renders a section title, a source list and a header element", () => {
    render(
      <>
        <CatchAdminSearchCandidateHeader aria-label="Afterfly Social">
          <h3>Afterfly Social</h3>
        </CatchAdminSearchCandidateHeader>
        <CatchAdminIntakeSourceList aria-label="Sources">
          <p>Instagram</p>
          <p>Website</p>
        </CatchAdminIntakeSourceList>
      </>,
    );
    expect(screen.getByLabelText("Afterfly Social").tagName).toBe("HEADER");
    expect(screen.getByLabelText("Sources").children).toHaveLength(2);
  });

  it("takes no styling props", () => {
    type Styling = "className" | "style";
    expectTypeOf<Styling>().extract<keyof CatchAdminCommandStackProps>().toEqualTypeOf<never>();
    expectTypeOf<Styling>().extract<keyof CatchAdminCommandRowProps>().toEqualTypeOf<never>();
    expectTypeOf<Styling>().extract<keyof CatchAdminIntakeDecisionActionsProps>().toEqualTypeOf<never>();
    expectTypeOf<Styling>().extract<keyof CatchAdminIntakeDecisionStateProps>().toEqualTypeOf<never>();
    expectTypeOf<Styling>().extract<keyof CatchAdminIntakeSourceListProps>().toEqualTypeOf<never>();
    expectTypeOf<Styling>().extract<keyof CatchAdminSearchCandidateHeaderProps>().toEqualTypeOf<never>();
  });
});
