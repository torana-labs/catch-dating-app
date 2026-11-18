import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {catchBandActions, catchBandColor, catchBandFootnoteMark} from "./catchBandParts";
import {websiteGrounds} from "./palette";

afterEach(cleanup);

describe("catchBandParts", () => {
  it("maps every Website v2 ground onto a band colour", () => {
    expect(websiteGrounds.map((ground) => catchBandColor(ground))).toEqual([
      undefined, "tile", "ink", "run", "dinner", "games", "courts", "indigo", "nightsOut",
      "sky", "tile", "tile", "tile", "tile", "tile", "tile", "tile",
    ]);
    expect(catchBandColor(undefined)).toBeUndefined();
  });

  it("draws actions as D20 buttons, the first primary and the rest secondary unless named", () => {
    render(<>{catchBandActions([
      {label: "First", href: "/first"},
      {label: "Second", href: "/second"},
      {label: "Third", href: "/third", variant: "light"},
    ])}</>);
    expect(screen.getByRole("link", {name: "First"}).getAttribute("href")).toBe("/first");
    const variants = ["First", "Second", "Third"].map((name) => screen.getByRole("link", {name}).getAttribute("data-variant"));
    expect(variants).toEqual(["primary", "secondary", "light"]);
  });

  it("draws nothing for no actions and no footnote", () => {
    expect(catchBandActions(undefined)).toBeNull();
    expect(catchBandActions([])).toBeNull();
    expect(catchBandFootnoteMark(undefined)).toBeNull();
  });

  it("marks a footnote, linked when it has an href", () => {
    const {container} = render(<p>Claim{catchBandFootnoteMark({label: "1", href: "#footnote-1"})}</p>);
    expect(container.querySelector("sup a")!.getAttribute("href")).toBe("#footnote-1");
    const {container: plain} = render(<p>Claim{catchBandFootnoteMark({label: "2"})}</p>);
    expect(plain.querySelector("sup")!.textContent).toBe("2");
  });
});
