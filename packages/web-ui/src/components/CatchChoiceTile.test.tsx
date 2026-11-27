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

describe("CatchChoiceTile system card", () => {
  it("draws a row as one checked radio with its radio mark at the end", () => {
    const tap = vi.fn();
    render(<CatchChoiceTile variant="row" title="Anyone can book" subtitle="Paid places are confirmed straight away" meta="12 left" selected onTap={tap} />);
    const target = screen.getByRole("radio", {name: "Anyone can book", description: "Paid places are confirmed straight away 12 left"});
    expect(target.getAttribute("aria-checked")).toBe("true");
    expect(target.dataset.variant).toBe("row");
    expect(target.dataset.selected).toBe("true");
    fireEvent.click(screen.getByText("12 left")); expect(tap).toHaveBeenCalledOnce();
  });
  it("gives a selected tile its corner tick and an unselected one none", () => {
    const {container} = render(<>
      <CatchChoiceTile variant="tile" title="Table 4" subtitle="Courtyard" meta="4 of 4" selected onTap={vi.fn()} />
      <CatchChoiceTile variant="tile" title="Table 5" onTap={vi.fn()} />
    </>);
    const [chosen, other] = screen.getAllByRole("radio");
    expect(chosen.getAttribute("aria-checked")).toBe("true");
    expect(other.getAttribute("aria-checked")).toBe("false");
    expect(chosen.querySelectorAll("svg").length).toBe(1);
    expect(other.querySelector("svg")).toBeNull();
    expect(container.querySelectorAll("[data-format]").length).toBe(0);
  });
  it("names a day by weekday and date and fills the chosen day", () => {
    render(<div role="radiogroup" aria-label="Dates">
      <CatchChoiceTile variant="day" title="Mon" subtitle="26" onTap={vi.fn()} />
      <CatchChoiceTile variant="day" title="Tue" subtitle="27" selected onTap={vi.fn()} />
    </div>);
    const tuesday = screen.getByRole("radio", {name: "Tue 27"});
    expect(tuesday.getAttribute("aria-checked")).toBe("true");
    expect(tuesday.dataset.dayFill).toBe("true");
    expect(screen.getByRole("radio", {name: "Mon 26"}).dataset.dayFill).toBeUndefined();
  });
  it("makes an add card a plain dashed button with no checked state", () => {
    const tap = vi.fn();
    const {container} = render(<CatchChoiceTile variant="add" title="Add a step" selected onTap={tap} />);
    expect(screen.queryByRole("radio")).toBeNull();
    const target = screen.getByRole("button", {name: "Add a step"});
    expect(target.hasAttribute("aria-checked")).toBe(false);
    expect(target.dataset.selected).toBeUndefined();
    expect(container.querySelector("rect")).not.toBeNull();
    fireEvent.click(target); expect(tap).toHaveBeenCalledOnce();
  });
  it("fills a selected card with its format and leaves an unselected one outlined", () => {
    render(<>
      <CatchChoiceTile variant="tile" title="Supper" format="dinner" selected onTap={vi.fn()} />
      <CatchChoiceTile variant="tile" title="Brunch" format="dinner" onTap={vi.fn()} />
    </>);
    expect(screen.getByRole("radio", {name: "Supper"}).dataset.format).toBe("dinner");
    expect(screen.getByRole("radio", {name: "Brunch"}).dataset.format).toBeUndefined();
  });
  it("marks attention and draws vacant dashed until it is selected", () => {
    const {container, rerender} = render(<>
      <CatchChoiceTile variant="tile" title="216" subtitle="Ravi · Asha" meta="Twin" emphasis="attention" onTap={vi.fn()} />
      <CatchChoiceTile variant="tile" title="222" subtitle="Free" meta="King" emphasis="vacant" onTap={vi.fn()} />
    </>);
    expect(screen.getByRole("radio", {name: "216", description: "Ravi · Asha Twin"}).dataset.emphasis).toBe("attention");
    expect(screen.getByRole("radio", {name: "222"}).dataset.emphasis).toBe("vacant");
    expect(container.querySelectorAll("rect").length).toBe(1);
    rerender(<CatchChoiceTile variant="tile" title="222" emphasis="vacant" selected onTap={vi.fn()} />);
    expect(container.querySelector("rect")).toBeNull();
  });
  it("disables every variant with a null action and keeps its checked state", () => {
    render(<>
      <CatchChoiceTile variant="row" title="Row" selected />
      <CatchChoiceTile variant="tile" title="Tile" onTap={null} />
      <CatchChoiceTile variant="day" title="Wed" subtitle="28" />
      <CatchChoiceTile variant="add" title="Add a photo" />
    </>);
    const radios = screen.getAllByRole("radio") as HTMLButtonElement[];
    expect(radios.map((radio) => radio.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
    expect([...radios, screen.getByRole("button", {name: "Add a photo"}) as HTMLButtonElement].every((target) => target.disabled)).toBe(true);
  });
  it("keeps the leading-radio tile when no variant is given", () => {
    const {container} = render(<CatchChoiceTile title="Public" onTap={vi.fn()} />);
    expect(screen.getByRole("radio").dataset.variant).toBeUndefined();
    expect(container.querySelector("circle")).not.toBeNull();
  });
});
