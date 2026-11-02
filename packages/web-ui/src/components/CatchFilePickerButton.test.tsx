import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchFilePickerButton} from "./CatchFilePickerButton";

afterEach(cleanup);

const input = (name: string) => screen.getByLabelText(name, {selector: "input"}) as HTMLInputElement;

describe("CatchFilePickerButton", () => {
  it("opens the file chooser from the button and reports the file", () => {
    const onChanged = vi.fn();
    render(<CatchFilePickerButton accept=".csv" label="Choose CSV" onChanged={onChanged} />);
    const click = vi.spyOn(input("Choose CSV"), "click");
    fireEvent.click(screen.getByRole("button", {name: "Choose CSV"}));
    expect(click).toHaveBeenCalledTimes(1);
    expect(input("Choose CSV").accept).toBe(".csv");
    const file = new File(["a,b"], "hosts.csv", {type: "text/csv"});
    fireEvent.change(input("Choose CSV"), {target: {files: [file]}});
    expect(onChanged).toHaveBeenCalledWith(file);
  });

  it("reports a cleared choice as null", () => {
    const onChanged = vi.fn();
    render(<CatchFilePickerButton label="Choose CSV" onChanged={onChanged} />);
    fireEvent.change(input("Choose CSV"), {target: {files: []}});
    expect(onChanged).toHaveBeenCalledWith(null);
  });

  it("names the button and the input from semanticsLabel when the label isn't enough", () => {
    render(<CatchFilePickerButton label="Choose image" onChanged={() => undefined} semanticsLabel="Choose image for slide 2" />);
    expect(screen.getByRole("button", {name: "Choose image for slide 2"})).toBeTruthy();
    expect(input("Choose image for slide 2")).toBeTruthy();
  });

  it("disables both the button and the input without a handler", () => {
    render(<CatchFilePickerButton label="Choose CSV" onChanged={null} />);
    expect((screen.getByRole("button", {name: "Choose CSV"}) as HTMLButtonElement).disabled).toBe(true);
    expect(input("Choose CSV").disabled).toBe(true);
  });
});
