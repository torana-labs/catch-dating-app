import {act, cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchIcon} from "../components/CatchIcon";
import {CatchLegacyIcon} from "../components/CatchLegacyIcon";
import {loadCatchIconGlyphs} from "./catchIconGlyphLoader";

afterEach(cleanup);

// Vitest gives each file its own modules, so the glyph map starts unloaded here.
describe("lazy icon glyphs", () => {
  it("draws an empty box of the final size until the glyph map loads, then the glyph", async () => {
    const {container} = render(<CatchIcon label="Back" name="back" size={24} />);
    const pending = container.querySelector("svg")!;
    expect(pending.childElementCount).toBe(0);
    expect(pending.getAttribute("class")).not.toContain("lucide-arrow-left");
    expect(pending.getAttribute("width")).toBe("24");
    expect(pending.getAttribute("height")).toBe("24");
    expect(pending.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(pending.getAttribute("stroke-width")).toBe("1.75");
    expect(pending.getAttribute("role")).toBe("img");
    expect(pending.getAttribute("aria-label")).toBe("Back");

    await act(() => loadCatchIconGlyphs());

    const drawn = container.querySelector("svg")!;
    expect(drawn.getAttribute("class")).toContain("lucide-arrow-left");
    expect(drawn.childElementCount).toBeGreaterThan(0);
    expect(drawn.getAttribute("width")).toBe("24");
  });

  it("draws at once when the glyph map has already loaded", async () => {
    await loadCatchIconGlyphs();
    const svg = render(<CatchLegacyIcon icon="close" />).container.querySelector("svg")!;
    expect(svg.getAttribute("class")).toContain("lucide-x");
  });

  it("loads the glyph map once", async () => {
    expect(await loadCatchIconGlyphs()).toBe(await loadCatchIconGlyphs());
  });
});
