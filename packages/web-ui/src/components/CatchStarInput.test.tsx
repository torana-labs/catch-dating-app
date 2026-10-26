import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchStarInput} from "./CatchStarInput";

afterEach(cleanup);

const optionLabel = (stars: number) => `${stars} stars`;
const filled = () => [...document.querySelectorAll("svg")].filter((star) => star.dataset.filled === "true").length;

describe("CatchStarInput", () => {
  it("offers five named radios in one group", () => {
    render(<CatchStarInput label="How was it?" onChanged={() => undefined} optionLabel={optionLabel} value={0} />);
    expect(screen.getByRole("radiogroup", {name: "How was it?"})).toBeTruthy();
    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("aria-label")))
      .toEqual(["1 stars", "2 stars", "3 stars", "4 stars", "5 stars"]);
    expect(new Set(screen.getAllByRole("radio").map((radio) => (radio as HTMLInputElement).name)).size).toBe(1);
    expect(filled()).toBe(0);
  });

  it("checks the chosen value, fills up to it and reports a new choice", () => {
    const changed = vi.fn();
    render(<CatchStarInput labelledBy="heading" onChanged={changed} optionLabel={optionLabel} value={3} />);
    expect((screen.getByRole("radio", {name: "3 stars"}) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("radiogroup").getAttribute("aria-labelledby")).toBe("heading");
    expect(filled()).toBe(3);
    fireEvent.click(screen.getByRole("radio", {name: "5 stars"}));
    expect(changed).toHaveBeenCalledWith(5);
  });

  it("previews the hovered rating and restores the value on leave", () => {
    render(<CatchStarInput label="Rate" onChanged={() => undefined} optionLabel={optionLabel} value={2} />);
    fireEvent.mouseEnter(screen.getByRole("radio", {name: "4 stars"}).parentElement!);
    expect(filled()).toBe(4);
    fireEvent.mouseLeave(screen.getByRole("radiogroup"));
    expect(filled()).toBe(2);
  });

  it("disables every choice and ignores hover", () => {
    render(<CatchStarInput disabled label="Rate" onChanged={() => undefined} optionLabel={optionLabel} value={2} />);
    expect(screen.getAllByRole("radio").every((radio) => (radio as HTMLInputElement).disabled)).toBe(true);
    fireEvent.mouseEnter(screen.getByRole("radio", {name: "5 stars"}).parentElement!);
    expect(filled()).toBe(2);
  });
});
