import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, expectTypeOf, it} from "vitest";
import {CatchIconTile, type CatchIconTileProps} from "./CatchIconTile";
const glyph = <svg data-testid="supplied-glyph" aria-hidden="true" />;
type Keys<T> = T extends unknown ? keyof T : never;
afterEach(cleanup);
describe("CatchIconTile", () => {
  it("keeps the decided API closed to raw geometry and styling", () => {
    expectTypeOf<Keys<CatchIconTileProps>>().toEqualTypeOf<"recipe" | "icon" | "iconColor" | "variant">();
  });
  it("preserves the caller glyph as decorative material without an action", () => {
    const {container} = render(<CatchIconTile icon={glyph} iconColor="primary" />);
    const root = screen.getByTestId("supplied-glyph").closest('[data-recipe]')!;
    expect(root.getAttribute("data-recipe")).toBe("tile");
    expect(root.getAttribute("data-color")).toBe("primary");
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector('button,[role="button"],[tabindex]')).toBeNull();
  });
  for (const [variant, color] of [["plain", "ink3"], ["bubble", "primary"]] as const) {
    it(`retains the empty ${variant} recipe`, () => {
      render(<CatchIconTile recipe="empty" variant={variant} icon={glyph} />);
      const root = screen.getByTestId("supplied-glyph").closest('[data-recipe]')!;
      expect(root.getAttribute("data-variant")).toBe(variant); expect(root.getAttribute("data-color")).toBe(color);
    });
  }
  it("uses the canonical error glyph by default and preserves an override", () => {
    const {container, rerender} = render(<CatchIconTile recipe="error" />);
    expect(container.querySelector('[data-catch-icon-role="error"]')).not.toBeNull();
    expect(container.querySelector('[data-color="danger"]')).not.toBeNull();
    rerender(<CatchIconTile recipe="error" icon={glyph} />);
    expect(screen.getByTestId("supplied-glyph")).toBeDefined();
    expect(container.querySelector('[data-catch-icon-role="error"]')).toBeNull();
  });
  it("rejects raw CSS colors and invalid empty variants", () => {
    expect(() => CatchIconTile({icon: glyph, iconColor: "#ff0000" as never})).toThrow("theme role");
    expect(() => CatchIconTile({recipe: "empty", icon: glyph, variant: "tile" as never})).toThrow("plain or bubble");
  });
});
