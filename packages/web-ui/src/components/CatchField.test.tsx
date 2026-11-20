import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {useState} from "react";
import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
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

describe("CatchField toggle recipe", () => {
  it("names the switch with its title, describes it with its body, and flips from the title", () => {
    const onChanged = vi.fn();
    render(<CatchField body="Before each plan" onChanged={onChanged} recipe="toggle"
      title="Show reminders" value={false} />);
    const control = screen.getByRole("switch", {name: "Show reminders"});
    expect(control.getAttribute("aria-checked")).toBe("false");
    const body = screen.getByText("Before each plan");
    expect(control.getAttribute("aria-describedby")).toBe(body.id);
    fireEvent.click(screen.getByText("Show reminders"));
    expect(onChanged).toHaveBeenLastCalledWith(true);
  });

  it("disables the switch when onChanged is null or the field is not editable", () => {
    const {rerender} = render(<CatchField onChanged={null} recipe="toggle" title="Locked" value />);
    expect((screen.getByRole("switch") as HTMLButtonElement).disabled).toBe(true);
    rerender(<CatchField inputMode="readOnly" onChanged={() => {}} recipe="toggle" title="Locked" value />);
    expect((screen.getByRole("switch") as HTMLButtonElement).disabled).toBe(true);
  });

  it("describes the switch with an error after its body", () => {
    render(<CatchField body="Before each plan" errorText="Couldn't save" onChanged={() => {}}
      recipe="toggle" title="Show reminders" value />);
    const control = screen.getByRole("switch");
    const ids = control.getAttribute("aria-describedby")!.split(" ");
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[1])!.textContent).toBe("Couldn't save");
  });
});

describe("CatchField phone recipe", () => {
  // jsdom has no modal dialogs; on a phone width the list opens in the sheet's dialog.
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {this.setAttribute("open", "");};
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {this.removeAttribute("open");};
  });
  const copy = {
    country: "Country code", search: "Search countries", noMatches: "No country matches", close: "Close",
    problems: {tooShort: "Too short for {country}", tooLong: "Too long for {country}", notMobile: "Not a mobile number in {country}"},
  };
  function Phone({initial = "", onChanged}: {initial?: string; onChanged?: (value: string) => void}) {
    const [value, setValue] = useState(initial);
    return <CatchField copy={copy} countryCode="IN" onChanged={(next) => {setValue(next); onChanged?.(next);}}
      recipe="phone" title="Mobile number" value={value} />;
  }

  // The phone lane loads on first use, with an inert lane in its place until then; once loaded it renders at once.
  beforeAll(async () => {
    render(<Phone />);
    expect((screen.getByLabelText("Mobile number") as HTMLInputElement).readOnly).toBe(true);
    await screen.findByRole("button", {name: /Country code/u});
    cleanup();
  });

  it("shows the site's dialling code in a chip and reports the number dialling code first", () => {
    const onChanged = vi.fn();
    render(<Phone onChanged={onChanged} />);
    expect(screen.getByRole("button", {name: "Country code: India +91"}).textContent).toContain("+91");
    fireEvent.change(screen.getByLabelText("Mobile number"), {target: {value: "98765 43210"}});
    expect(onChanged).toHaveBeenLastCalledWith("+91 98765 43210");
    expect((screen.getByLabelText("Mobile number") as HTMLInputElement).value).toBe("98765 43210");
  });

  it("moves the chip to a pasted number's country", () => {
    const onChanged = vi.fn();
    render(<Phone onChanged={onChanged} />);
    fireEvent.change(screen.getByLabelText("Mobile number"), {target: {value: "+61 412 345 678"}});
    expect(onChanged).toHaveBeenLastCalledWith("+61 412 345 678");
    expect(screen.getByRole("button", {name: /Australia \+61/u})).toBeTruthy();
    expect((screen.getByLabelText("Mobile number") as HTMLInputElement).value).toBe("412 345 678");
  });

  it("says what is wrong only after the reader leaves the box, and clears it once the number is right", () => {
    render(<Phone />);
    const box = screen.getByLabelText("Mobile number");
    fireEvent.change(box, {target: {value: "98765"}});
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.blur(box);
    expect(screen.getByRole("alert").textContent).toBe("Too short for India");
    expect(box.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(box, {target: {value: "98765 43210"}});
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("picks another country from the list, from the keyboard", () => {
    const onChanged = vi.fn();
    render(<Phone initial="+91 98765 43210" onChanged={onChanged} />);
    fireEvent.click(screen.getByRole("button", {name: /Country code/u}));
    const search = screen.getByRole("combobox", {name: "Search countries"});
    // The site's own country heads the list, ticked.
    expect(screen.getAllByRole("option")[0].getAttribute("aria-selected")).toBe("true");
    fireEvent.change(search, {target: {value: "nep"}});
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Nepal+977"]);
    fireEvent.keyDown(search, {key: "Enter"});
    expect(onChanged).toHaveBeenLastCalledWith("+977 98765 43210");
    expect(screen.getByRole("button", {name: "Country code: Nepal +977"})).toBeTruthy();
  });

  it("finds a country by its dialling code and says when nothing matches", () => {
    render(<Phone />);
    fireEvent.click(screen.getByRole("button", {name: /Country code/u}));
    const search = screen.getByRole("combobox", {name: "Search countries"});
    fireEvent.change(search, {target: {value: "+44"}});
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toContain("United Kingdom+44");
    fireEvent.change(search, {target: {value: "zzz"}});
    expect(screen.getByText("No country matches")).toBeTruthy();
  });

  it("gives a FormData form the whole number under the field's name", () => {
    const {container} = render(<CatchField copy={copy} countryCode="IN" initialValue="+91 98765 43210" name="phone"
      recipe="phone" title="Mobile number" />);
    expect((container.querySelector("input[type=hidden][name=phone]") as HTMLInputElement).value).toBe("+91 98765 43210");
  });
});
