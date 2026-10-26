import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {useState} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {CatchStepper, stepperNextValue} from "./CatchStepper";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const labels = {decreaseSemanticLabel: "Fewer", increaseSemanticLabel: "More"};
// One act per interval, so React renders between repeats as a browser would.
const advance = (ms: number, times = 1) => {
  for (let index = 0; index < times; index += 1) act(() => vi.advanceTimersByTime(ms));
};
const fewer = () => screen.getByRole("button", {name: "Fewer"}) as HTMLButtonElement;
const more = () => screen.getByRole("button", {name: "More"}) as HTMLButtonElement;

function Bounded({initial, ...props}: {initial: number; max?: number; min?: number; step?: number}) {
  const [value, setValue] = useState(initial);
  return <CatchStepper {...labels} {...props} onChanged={setValue} value={value} />;
}

describe("stepperNextValue", () => {
  it("keeps the caller's decimal precision and clamps the final partial step", () => {
    expect(stepperNextValue(0.1, 0.2)).toBe(0.3);
    expect(stepperNextValue(1.25, 0.05)).toBe(1.3);
    expect(stepperNextValue(41.9, 0.5, 0, 42.2)).toBe(42.2);
    expect(stepperNextValue(0.2, -0.5, 0)).toBe(0);
    expect(stepperNextValue(3, 1)).toBe(4);
  });
});

describe("CatchStepper", () => {
  it("steps once per keyboard activation and disables each direction at its bound", () => {
    render(<Bounded initial={1} max={2} min={1} />);
    expect(fewer().disabled).toBe(true);
    fireEvent.click(more(), {detail: 0});
    expect(screen.getByText("2")).toBeTruthy();
    expect(more().disabled).toBe(true);
    expect(fewer().disabled).toBe(false);
  });

  it("steps on press, repeats while held and accelerates after ten repeats", () => {
    render(<Bounded initial={0} />);
    fireEvent.pointerDown(more(), {button: 0});
    expect(screen.getByText("1")).toBeTruthy();
    advance(399);
    expect(screen.getByText("1")).toBeTruthy();
    advance(1);
    expect(screen.getByText("2")).toBeTruthy();
    advance(110, 10);
    expect(screen.getByText("12")).toBeTruthy();
    advance(55);
    expect(screen.getByText("13")).toBeTruthy();
    fireEvent.pointerUp(more());
    advance(1000);
    expect(screen.getByText("13")).toBeTruthy();
  });

  it("ignores the click that ends a pointer press, so a tap steps once", () => {
    render(<Bounded initial={0} />);
    fireEvent.pointerDown(more(), {button: 0});
    fireEvent.pointerUp(more());
    fireEvent.click(more(), {detail: 1});
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("stops repeating when a bound disables the held button", () => {
    render(<Bounded initial={0} max={3} />);
    fireEvent.pointerDown(more(), {button: 0});
    advance(400);
    advance(110, 5);
    expect(screen.getByText("3")).toBeTruthy();
    expect(more().disabled).toBe(true);
  });

  it("hands each direction to the caller in the actions recipe", () => {
    const increase = vi.fn();
    render(<CatchStepper {...labels} onIncrease={increase} recipe="actions" unit="km" value={5}
      valueLabelBuilder={(value) => value.toFixed(1)} />);
    expect(screen.getByText("5.0 km")).toBeTruthy();
    expect(fewer().disabled).toBe(true);
    fireEvent.click(more(), {detail: 0});
    expect(increase).toHaveBeenCalledOnce();
  });

  it("disables both directions when not enabled, and groups under a visible label", () => {
    render(<><span id="places">Places</span>
      <CatchStepper {...labels} enabled={false} labelledBy="places" onChanged={() => undefined} value={2} /></>);
    expect(fewer().disabled && more().disabled).toBe(true);
    expect(screen.getByRole("group", {name: "Places"})).toBeTruthy();
  });
});
