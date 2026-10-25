import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, expectTypeOf, it} from "vitest";
import {CatchKickerText, CatchMetadataText, type CatchMetadataTextProps} from "./CatchKickerText";
afterEach(cleanup);
describe("CatchKickerText", () => {
  it("uppercases Unicode text without dropping the supplied content", () => {
    render(<CatchKickerText label="München · 5 km" />);
    expect(screen.getByText("MÜNCHEN · 5 KM")).toBeDefined();
  });
  it("keeps the default single line and md recipe", () => {
    render(<CatchKickerText label="Tonight" />);
    const element = screen.getByText("TONIGHT");
    expect(element.getAttribute("data-variant")).toBe("md");
    expect(element.hasAttribute("data-clamped")).toBe(true);
    expect(element.style.getPropertyValue("--catch-kicker-lines")).toBe("1");
  });
  it("accepts existing variants, explicit lines and native alignment", () => {
    render(<CatchKickerText label="Field section" variant="fieldSection" maxLines={2} textAlign="end" />);
    const element = screen.getByText("FIELD SECTION");
    expect(element.getAttribute("data-variant")).toBe("fieldSection");
    expect(element.style.getPropertyValue("--catch-kicker-lines")).toBe("2");
    expect(element.style.textAlign).toBe("end");
  });
  it("leaves null maxLines uncapped and preserves the complete label", () => {
    render(<CatchKickerText label="A long section label that is allowed to wrap" maxLines={null} />);
    expect(screen.getByText("A LONG SECTION LABEL THAT IS ALLOWED TO WRAP").hasAttribute("data-clamped")).toBe(false);
  });
  for (const maxLines of [0, -1, 1.5, Number.POSITIVE_INFINITY]) {
    it(`rejects invalid native line count ${maxLines}`, () => {
      expect(() => CatchKickerText({label: "Example", maxLines})).toThrow("positive integer or null");
    });
  }
  it("resolves named theme colours without accepting raw CSS", () => {
    render(<CatchKickerText label="Warning" color="danger" />);
    expect(screen.getByText("WARNING").style.color).toBe("var(--catch-theme-danger)");
    expect(() => CatchKickerText({label: "Bad", color: "#f00" as never})).toThrow("theme role");
  });
});
describe("CatchMetadataText fixed API", () => {
  it("keeps exactly the existing label, required color and uppercase props", () => {
    expectTypeOf<keyof CatchMetadataTextProps>().toEqualTypeOf<"label" | "color" | "uppercase">();
  });
  it("preserves sentence casing by default", () => {
    render(<CatchMetadataText label="18 guests · 5 km" color="ink2" />);
    expect(screen.getByText("18 guests · 5 km").hasAttribute("data-uppercase")).toBe(false);
  });
  it("uses the existing uppercase recipe on request", () => {
    render(<CatchMetadataText label="18 guests · 5 km" color="primary" uppercase />);
    expect(screen.getByText("18 GUESTS · 5 KM").hasAttribute("data-uppercase")).toBe(true);
  });
  it("keeps full content accessible without accepting extra wrapping/alignment props", () => {
    const label = "A very long factual label that remains in the document";
    render(<CatchMetadataText label={label} color="ink" />);
    const element = screen.getByText(label);
    expect(element.style.textAlign).toBe("");
    expect(element.hasAttribute("data-clamped")).toBe(false);
    expect(element.textContent).toBe(label);
  });
  it("requires a valid named colour", () => {
    expect(() => CatchMetadataText({label: "Bad", color: "red" as never})).toThrow("theme role");
  });
});
