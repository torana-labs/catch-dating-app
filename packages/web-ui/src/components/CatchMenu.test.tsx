import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchMenu, type CatchMenuItem} from "./CatchMenu";

afterEach(cleanup);

const cities: CatchMenuItem<string>[] = [
  {label: "Mumbai", selected: true, sublabel: "Live now", value: "mumbai", variant: "choice"},
  {label: "Pune", sublabel: "Launching soon", value: "pune", variant: "choice"},
  {enabled: false, label: "Goa", value: "goa", variant: "choice"},
];

describe("CatchMenu panel", () => {
  it("is a listbox of options when every row is a choice, with one tabbable row", () => {
    render(<CatchMenu items={cities} label="Choose your city" />);
    const listbox = screen.getByRole("listbox", {name: "Choose your city"});
    const options = screen.getAllByRole("option");
    expect(listbox).toBeTruthy();
    expect(options.map((option) => option.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
    expect(options.map((option) => option.tabIndex)).toEqual([0, -1, -1]);
    expect((options[2] as HTMLButtonElement).disabled).toBe(true);
  });

  it("is a menu of items for actions, reports selection and moves with the arrow keys", () => {
    const onSelected = vi.fn();
    const itemSelected = vi.fn();
    render(
      <CatchMenu
        items={[
          {label: "Share", onSelected: itemSelected, value: "share"},
          {label: "Copy link", value: "copy"},
          {danger: true, label: "Report", startsSection: true, value: "report"},
        ]}
        label="Event actions"
        onSelected={onSelected}
      />,
    );
    const items = screen.getAllByRole("menuitem");
    expect(items[2].dataset).toMatchObject({danger: "true", section: "true"});
    items[0].focus();
    fireEvent.keyDown(items[0], {key: "ArrowDown"});
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], {key: "End"});
    expect(document.activeElement).toBe(items[2]);
    fireEvent.click(items[0]);
    expect(itemSelected).toHaveBeenCalledWith("share");
    expect(onSelected).toHaveBeenCalledWith("share", expect.objectContaining({label: "Share"}));
  });
});

describe("CatchMenu anchored", () => {
  it("opens from the caller's trigger, focuses the selection, and closes on choice or Escape", () => {
    const onSelected = vi.fn();
    render(
      <CatchMenu
        items={cities}
        label="Choose your city"
        onSelected={onSelected}
        recipe="anchored"
        builder={({triggerProps}) => <button type="button" {...triggerProps}>Mumbai</button>}
      />,
    );
    const trigger = screen.getByRole("button", {name: "Mumbai"});
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("option", {name: "Mumbai Live now"}));
    fireEvent.keyDown(document.activeElement!, {key: "Escape"});
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.keyDown(trigger, {key: "ArrowDown"});
    fireEvent.click(screen.getByRole("option", {name: "Pune Launching soon"}));
    expect(onSelected).toHaveBeenCalledWith("pune", expect.objectContaining({label: "Pune"}));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("moves the panel by Flutter's alignmentOffset", () => {
    render(
      <CatchMenu
        alignmentOffset={{x: 4, y: -2}}
        builder={({triggerProps}) => <button type="button" {...triggerProps}>Sort</button>}
        items={cities}
        label="Sort"
        recipe="anchored"
      />,
    );
    fireEvent.click(screen.getByRole("button", {name: "Sort"}));
    expect(screen.getByRole("listbox").style.transform).toBe("translate(4px, -2px)");
  });
});
