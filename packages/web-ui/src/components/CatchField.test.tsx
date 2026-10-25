import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {useState} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchField} from "./CatchField";

afterEach(cleanup);

describe("CatchField input recipe", () => {
  it("labels a single-line input and reports values, not events", () => {
    const onChanged = vi.fn();
    render(<CatchField recipe="input" title="Email" inputHint="you@example.com"
      keyboardType="emailAddress" onChanged={onChanged} value="" />);

    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input.tagName).toBe("INPUT");
    expect(input.type).toBe("email");
    expect(input.getAttribute("inputmode")).toBe("email");
    expect(input.placeholder).toBe("you@example.com");
    fireEvent.change(input, {target: {value: "a@b.co"}});
    expect(onChanged).toHaveBeenCalledWith("a@b.co");
  });

  it("keeps digit codes as text and gives ranges a native number value", () => {
    render(
      <>
        <CatchField recipe="input" title="Code" keyboardType="number" maxLength={6} value="" />
        <CatchField recipe="input" title="Guests" keyboardType="number" min={1} max={50} value="2" />
      </>,
    );

    const code = screen.getByLabelText("Code") as HTMLInputElement;
    expect(code.type).toBe("text");
    expect(code.getAttribute("inputmode")).toBe("numeric");
    const guests = screen.getByLabelText("Guests") as HTMLInputElement;
    expect(guests.type).toBe("number");
    expect(guests.min).toBe("1");
    expect(guests.max).toBe("50");
  });

  it("renders a text area for multiple lines and counts characters while focused", () => {
    function Notes() {
      const [value, setValue] = useState("Hi");
      return <CatchField recipe="input" title="Notes" maxLines={4} maxLength={300}
        value={value} onChanged={setValue} />;
    }
    render(<Notes />);

    const notes = screen.getByLabelText("Notes") as HTMLTextAreaElement;
    expect(notes.tagName).toBe("TEXTAREA");
    expect(notes.rows).toBe(4);
    expect(screen.getByText("2 / 300").hasAttribute("data-visible")).toBe(false);
    fireEvent.focus(notes);
    expect(screen.getByText("2 / 300").hasAttribute("data-visible")).toBe(true);
    fireEvent.change(notes, {target: {value: "Hello"}});
    expect(screen.getByText("5 / 300").hasAttribute("data-visible")).toBe(true);
  });

  it("keeps the counter's row when focus leaves, so controls below do not move", () => {
    render(<CatchField recipe="input" title="Name" maxLength={80} value="Ada" />);

    const name = screen.getByLabelText("Name");
    fireEvent.focus(name);
    const counter = screen.getByText("3 / 80");
    fireEvent.blur(name);
    expect(screen.getByText("3 / 80")).toBe(counter);
    expect(counter.hasAttribute("data-visible")).toBe(false);
  });

  it("draws prefix and suffix text beside the value and describes the input with them", () => {
    render(<CatchField recipe="input" title="Your mobile number" prefixText="+91" suffixText="IN"
      helperText="Your pass comes by text." keyboardType="phone" value="" />);

    const input = screen.getByLabelText("Your mobile number");
    const described = input.getAttribute("aria-describedby")!.split(" ")
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(["+91", "IN", "Your pass comes by text."]);
    expect(input.previousElementSibling?.textContent).toBe("+91");
    expect(input.nextElementSibling?.textContent).toBe("IN");
  });

  it("ignores blank affixes", () => {
    render(<CatchField recipe="input" title="Name" prefixText=" " value="" />);
    const input = screen.getByLabelText("Name");
    expect(input.getAttribute("aria-describedby")).toBeNull();
    expect(input.previousElementSibling?.tagName).toBe("LABEL");
  });

  it("describes the field with its error before its helper", () => {
    const {rerender} = render(<CatchField recipe="input" title="Name" helperText="As on your ID"
      value="" />);

    const input = screen.getByLabelText("Name");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent)
      .toBe("As on your ID");

    rerender(<CatchField recipe="input" title="Name" helperText="As on your ID"
      errorText="Enter your name" value="" />);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent)
      .toBe("Enter your name");
    expect(screen.queryByText("As on your ID")).toBeNull();
    expect(screen.getByRole("alert").textContent).toBe("Enter your name");
  });

  it("maps input modes to read-only and disabled controls", () => {
    render(
      <>
        <CatchField recipe="input" title="Handle" inputMode="readOnly" value="@catch" />
        <CatchField recipe="input" title="Email" inputMode="inactive" value="team@catch" />
      </>,
    );

    expect((screen.getByLabelText("Handle") as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText("Email") as HTMLInputElement).disabled).toBe(true);
  });

  it("submits on Enter and passes the value on blur", () => {
    const onSubmitted = vi.fn();
    const onBlur = vi.fn();
    render(<CatchField recipe="input" title="Search" initialValue="run"
      onBlur={onBlur} onSubmitted={onSubmitted} />);

    const input = screen.getByLabelText("Search");
    fireEvent.keyDown(input, {key: "Enter"});
    fireEvent.blur(input);
    expect(onSubmitted).toHaveBeenCalledWith("run");
    expect(onBlur).toHaveBeenCalledWith("run");
  });

  it("places a leading glyph in the icon lane without naming it", () => {
    render(<CatchField recipe="input" title="City" leading={<svg data-testid="pin" />} value="" />);

    const field = screen.getByLabelText("City").closest("[data-recipe]")!;
    expect(field.hasAttribute("data-leading")).toBe(true);
    expect(screen.getByTestId("pin").parentElement?.getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps a hidden label as the accessible name", () => {
    render(<CatchField recipe="input" title="Filter" labelMode="hidden" value="" />);

    expect(screen.getByLabelText("Filter").tagName).toBe("INPUT");
  });
});

describe("CatchField select recipe", () => {
  it("selects string values by label", () => {
    const onChanged = vi.fn();
    render(<CatchField recipe="select" title="City" values={["delhi", "mumbai"]}
      itemLabelBuilder={(city) => city.toUpperCase()} value="delhi" onChanged={onChanged} />);

    const select = screen.getByLabelText("City") as HTMLSelectElement;
    expect([...select.options].map((option) => option.textContent)).toEqual(["DELHI", "MUMBAI"]);
    fireEvent.change(select, {target: {value: "mumbai"}});
    expect(onChanged).toHaveBeenCalledWith("mumbai");
  });

  it("keys object values and offers an empty hint that selects null", () => {
    const onChanged = vi.fn();
    const roles = [{id: "owner", label: "Owner"}, {id: "staff", label: "Staff"}];
    render(<CatchField recipe="select" title="Role" values={roles} hintText="Choose a role"
      itemLabelBuilder={(role) => role.label} itemValueBuilder={(role) => role.id}
      value={roles[1]} onChanged={onChanged} />);

    const select = screen.getByLabelText("Role") as HTMLSelectElement;
    expect(select.value).toBe("staff");
    expect(select.options[0].textContent).toBe("Choose a role");
    fireEvent.change(select, {target: {value: ""}});
    expect(onChanged).toHaveBeenCalledWith(null);
    fireEvent.change(select, {target: {value: "owner"}});
    expect(onChanged).toHaveBeenLastCalledWith(roles[0]);
  });

  it("starts an uncontrolled select from its initial value", () => {
    const onChanged = vi.fn();
    render(<CatchField recipe="select" title="Role" name="role" values={["guest", "host"]}
      itemLabelBuilder={(role) => role} initialValue="host" onChanged={onChanged} />);

    const select = screen.getByLabelText("Role") as HTMLSelectElement;
    expect(select.value).toBe("host");
    expect(select.name).toBe("role");
    fireEvent.change(select, {target: {value: "guest"}});
    expect(onChanged).toHaveBeenCalledWith("guest");
  });

  it("does not add a second empty choice when a value is empty", () => {
    render(<CatchField recipe="select" title="Contact" values={["", "whatsapp"]}
      itemLabelBuilder={(value) => value || "Choose contact"} value="" />);

    const select = screen.getByLabelText("Contact") as HTMLSelectElement;
    expect([...select.options].map((option) => option.textContent))
      .toEqual(["Choose contact", "whatsapp"]);
  });
});
