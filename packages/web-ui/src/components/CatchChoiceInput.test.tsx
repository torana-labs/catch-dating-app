import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {useState} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchChoiceInput} from "./CatchChoiceInput";
const values = ["A", "B", "C"];
const label = (value: string) => value;
const copy = {optionalLabel: "Optional", optionalSuffix: " (optional)", optionalSemantics: (value: string) => `${value}, optional`};
afterEach(cleanup);
describe("CatchChoiceInput", () => {
  it("replaces a single selection without mutating caller state", () => {
    const selected = new Set(["A"]); const changed = vi.fn();
    render(<CatchChoiceInput values={values} selected={selected} mode="single" itemLabelBuilder={label} onChanged={changed} />);
    fireEvent.click(screen.getByRole("radio", {name: "B"}));
    expect(changed).toHaveBeenCalledWith(new Set(["B"])); expect(selected).toEqual(new Set(["A"]));
    expect(screen.getByRole("radio", {name: "A"}).getAttribute("aria-checked")).toBe("true");
  });
  for (const mode of ["single", "multiple"] as const) {
    it(`retains the final ${mode} selection unless clearing is explicitly allowed`, () => {
      const changed = vi.fn(); const props = {values, selected: new Set(["A"]), mode, itemLabelBuilder: label, onChanged: changed};
      const {rerender} = render(<CatchChoiceInput {...props} />);
      fireEvent.click(screen.getByRole(mode === "single" ? "radio" : "checkbox", {name: "A"}));
      if (mode === "single") expect(changed).toHaveBeenLastCalledWith(new Set(["A"]));
      else expect(changed).not.toHaveBeenCalled();
      rerender(<CatchChoiceInput {...props} allowEmptySelection />);
      fireEvent.click(screen.getByRole(mode === "single" ? "radio" : "checkbox", {name: "A"}));
      expect(changed).toHaveBeenLastCalledWith(new Set());
    });
  }
  it("adds and removes multiple values, filtering values removed by the caller", () => {
    const changed = vi.fn();
    render(<CatchChoiceInput values={values} selected={new Set(["A", "C", "old"])} mode="multiple" itemLabelBuilder={label} onChanged={changed} />);
    fireEvent.click(screen.getByRole("checkbox", {name: "B"})); expect(changed).toHaveBeenLastCalledWith(new Set(values));
    fireEvent.click(screen.getByRole("checkbox", {name: "C"})); expect(changed).toHaveBeenLastCalledWith(new Set(["A"]));
  });
  it("keeps checked and described controls disabled when onChanged is null", () => {
    render(<><CatchChoiceInput values={values} selected={new Set(["B"])} mode="multiple" itemLabelBuilder={label} onChanged={null} />
      <CatchChoiceInput recipe="described" values={values} selected={new Set(["B"])} itemLabelBuilder={label}
        itemSubtitleBuilder={(value) => `Description ${value}`} onChanged={null} /></>);
    for (const target of [...screen.getAllByRole("radio"), ...screen.getAllByRole("checkbox")]) expect((target as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("radio", {name: "B"}).getAttribute("aria-checked")).toBe("true");
  });
  it("handles keyboard selection and live value replacement", () => {
    function Example() {
      const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(["A"]));
      return <CatchChoiceInput values={values} selected={selected} mode="single" itemLabelBuilder={label} onChanged={setSelected} />;
    }
    render(<Example />); const first = screen.getByRole("radio", {name: "A"}); first.focus();
    fireEvent.keyDown(first, {key: "ArrowRight"});
    expect(screen.getByRole("radio", {name: "B"}).getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("radio", {name: "B"}));
    fireEvent.keyDown(document.activeElement!, {key: "End"}); expect(screen.getByRole("radio", {name: "C"}).getAttribute("aria-checked")).toBe("true");
  });
  it("keeps segmented scalar selection, disabled reasons and custom spoken labels", () => {
    const changed = vi.fn();
    render(<CatchChoiceInput recipe="segmented" options={[{value: "a", label: "Alpha"},
      {value: "b", label: "Beta", enabled: false, disabledReason: "Unavailable"},
      {value: "c", label: "C", semanticLabel: "Gamma"}]} selected="a" onChanged={changed} trailing={<span>3 choices</span>} />);
    fireEvent.click(screen.getByRole("button", {name: "Gamma"})); expect(changed).toHaveBeenCalledWith("c");
    const disabled = screen.getByRole("button", {name: "Beta"}) as HTMLButtonElement;
    expect(disabled.disabled).toBe(true); expect(disabled.title).toBe("Unavailable");
    fireEvent.click(disabled); expect(changed).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", {name: "Alpha"}).getAttribute("aria-pressed")).toBe("true");
  });
  it("supports nullable initial selection and a real null option", () => {
    const {rerender} = render(<CatchChoiceInput recipe="segmented" options={[{value: "a", label: "A"}]} selected={null} />);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("false");
    rerender(<CatchChoiceInput<string | null> recipe="segmented" options={[{value: null, label: "Any"}]} selected={null} />);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  });
  it("preserves mono copy and complete summary labels", () => {
    const {rerender} = render(<CatchChoiceInput recipe="segmented" variant="mono" options={[{value: 1, label: "This week"}]} selected={1} />);
    expect(screen.getByText("THIS WEEK")).toBeDefined();
    rerender(<CatchChoiceInput recipe="segmented" variant="summary" options={[{value: 1, label: "A complete explanation that must wrap"}]} selected={1} />);
    expect(screen.getByText("A complete explanation that must wrap")).toBeDefined();
  });
  it("validates a form before submission, then permits a valid selection", () => {
    const submit = vi.fn((event) => event.preventDefault());
    function Example() {
      const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(["removed option"]));
      return <form onSubmit={submit}><CatchChoiceInput recipe="form" values={values} selected={selected} mode="single"
        label="Activity" copy={copy} isOptional itemLabelBuilder={label} onChanged={setSelected}
        onValidate={(next) => next.size ? null : "Choose an activity"} /><button type="submit">Save</button></form>;
    }
    render(<Example />); fireEvent.click(screen.getByRole("button", {name: "Save"}));
    expect(screen.getByRole("alert").textContent).toBe("Choose an activity"); expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole("radiogroup").getAttribute("aria-invalid")).toBe("true");
    fireEvent.click(screen.getByRole("radio", {name: "A"})); expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Save"})); expect(submit).toHaveBeenCalledOnce();
    expect(screen.getByRole("radiogroup", {name: "Activity, optional"})).toBeDefined();
  });
});
