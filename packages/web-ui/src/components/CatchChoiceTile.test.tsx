import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchChoiceTile} from "./CatchChoiceTile";
afterEach(cleanup);
describe("CatchChoiceTile", () => {
  it("makes title and full description one checked target", () => {
    const action = vi.fn();
    render(<CatchChoiceTile title="Public" subtitle="Anyone can request a place" selected onTap={action} />);
    const target = screen.getByRole("radio", {name: "Public", description: "Anyone can request a place"});
    expect(target.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByText("Anyone can request a place")); expect(action).toHaveBeenCalledOnce();
    expect(target.getAttribute("aria-checked")).toBe("true");
  });
  it("keeps both disabled states visible and does not activate them", () => {
    render(<><CatchChoiceTile title="Open" onTap={null} /><CatchChoiceTile title="Private" selected /></>);
    const targets = screen.getAllByRole("radio") as HTMLButtonElement[];
    expect(targets.every((target) => target.disabled)).toBe(true);
    expect(targets.map((target) => target.getAttribute("aria-checked"))).toEqual(["false", "true"]);
  });
  it("does not submit a surrounding form and drops an empty subtitle", () => {
    const submit = vi.fn((event) => event.preventDefault()); const tap = vi.fn();
    render(<form onSubmit={submit}><CatchChoiceTile title="Invite only" subtitle="" onTap={tap} /></form>);
    const target = screen.getByRole("radio"); fireEvent.click(target);
    expect(tap).toHaveBeenCalledOnce(); expect(submit).not.toHaveBeenCalled();
    expect(target.hasAttribute("aria-describedby")).toBe(false);
  });
});
