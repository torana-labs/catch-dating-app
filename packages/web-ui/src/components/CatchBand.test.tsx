import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, expectTypeOf, it} from "vitest";
import {CatchBand, type CatchBandProps} from "./CatchBand";
import {grounds} from "./palette";

afterEach(cleanup);

describe("CatchBand", () => {
  it("renders a white section at the content width with the regular rhythm by default", () => {
    render(<CatchBand aria-label="Coming up"><p>Runs this week</p></CatchBand>);
    const band = screen.getByRole("region", {name: "Coming up"});
    expect(band.tagName).toBe("SECTION");
    expect(band.dataset.ground).toBe("white");
    expect(band.dataset.catchTheme).toBe("light");
    const inner = screen.getByText("Runs this week").parentElement!;
    expect(inner.dataset).toMatchObject({pb: "regular", pt: "regular", width: "content"});
  });

  for (const ground of grounds) {
    it(`resolves the ${ground} ground through the ${ground === "ink" ? "dark" : "light"} theme`, () => {
      render(<CatchBand aria-label={ground} ground={ground}>Copy</CatchBand>);
      const band = screen.getByRole("region", {name: ground});
      expect(band.dataset.ground).toBe(ground);
      expect(band.dataset.catchTheme).toBe(ground === "ink" ? "dark" : "light");
    });
  }

  it("keeps the requested element, rhythm and width", () => {
    render(<CatchBand as="footer" pb="none" pt="spacious" width="full">Made with Catch</CatchBand>);
    const inner = screen.getByText("Made with Catch");
    expect(inner.parentElement!.tagName).toBe("FOOTER");
    expect(inner.dataset).toMatchObject({pb: "none", pt: "spacious", width: "full"});
  });

  it("takes no styling props", () => {
    expectTypeOf<"className" | "style" | "color">().extract<keyof CatchBandProps>().toEqualTypeOf<never>();
  });
});
