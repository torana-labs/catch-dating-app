import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {catchTextRoles, catchTextTones, catchTextVariants, type CatchSizeClass, type CatchTextVariant} from "./catchCoreVocabulary";
import {CatchRoot} from "./CatchRoot";
import {CatchText} from "./CatchText";

afterEach(cleanup);

describe("CatchText", () => {
  it("defaults to a span in the body role that inherits its colour", () => {
    render(<CatchText>Doors open at eight.</CatchText>);
    const text = screen.getByText("Doors open at eight.");
    expect(text.tagName).toBe("SPAN");
    expect(text.dataset).toMatchObject({variant: "body", tone: "inherit"});
    for (const attribute of ["data-align", "data-numeric", "data-clamp", "style"]) expect(text.hasAttribute(attribute)).toBe(false);
  });

  it("renders each of the 19 roles as itself", () => {
    for (const role of catchTextRoles) {
      render(<CatchText variant={role}>{role}</CatchText>);
      const text = screen.getByText(role);
      expect(text.dataset.variant).toBe(role);
      expect(text.tagName).toBe("SPAN");
    }
  });

  const responsive: Array<[CatchTextVariant, CatchSizeClass, string, string]> = [
    ["page-title", "compact", "display-title", "H1"],
    ["page-title", "medium", "display-section", "H1"],
    ["page-title", "expanded", "display-section", "H1"],
    ["section-title", "compact", "display-sm", "H2"],
    ["section-title", "medium", "display-sm", "H2"],
    ["section-title", "expanded", "display-section", "H2"],
    ["hero", "compact", "display-lg", "H1"],
    ["hero", "medium", "display-xl", "H1"],
    ["hero", "expanded", "display-hero", "H1"],
  ];
  for (const [variant, size, role, element] of responsive) {
    it(`resolves ${variant} to ${role} on ${size}, as an ${element.toLowerCase()}`, () => {
      render(<CatchRoot size={size}><CatchText variant={variant}>Tonight</CatchText></CatchRoot>);
      const text = screen.getByText("Tonight");
      expect(text.dataset.variant).toBe(role);
      expect(text.tagName).toBe(element);
    });
  }

  it("resolves the responsive roles as compact outside a root", () => {
    render(<CatchText variant="page-title">Tonight</CatchText>);
    expect(screen.getByRole("heading", {level: 1}).dataset.variant).toBe("display-title");
  });

  it("covers the 22 variants", () => {
    expect(catchTextVariants).toHaveLength(22);
  });

  it("renders the element the caller chooses", () => {
    render(<><CatchText as="p" variant="page-title">Paragraph</CatchText><CatchText as="label" htmlFor="name">Name</CatchText></>);
    expect(screen.getByText("Paragraph").tagName).toBe("P");
    expect(screen.getByText("Name").getAttribute("for")).toBe("name");
  });

  it("records tone, alignment, tabular figures and a clamp", () => {
    render(<CatchText align="center" className="extra" maxLines={2} numeric style={{minWidth: 10}} tone="danger">Payment failed</CatchText>);
    const text = screen.getByText("Payment failed");
    expect(text.dataset).toMatchObject({tone: "danger", align: "center", numeric: "", clamp: ""});
    expect(text.className).toContain("extra");
    expect(text.style.getPropertyValue("-webkit-line-clamp")).toBe("2");
    expect(text.style.minWidth).toBe("10px");
  });

  it("ignores a clamp that is not positive", () => {
    render(<CatchText maxLines={0}>Unclamped</CatchText>);
    expect(screen.getByText("Unclamped").hasAttribute("data-clamp")).toBe(false);
  });

  it("takes every tone", () => {
    for (const tone of catchTextTones) {
      render(<CatchText tone={tone}>{tone}</CatchText>);
      expect(screen.getByText(tone).dataset.tone).toBe(tone);
    }
  });
});
