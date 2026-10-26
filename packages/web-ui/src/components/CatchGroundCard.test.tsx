import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchGroundCard} from "./CatchGroundCard";

afterEach(cleanup);

describe("CatchGroundCard", () => {
  it("defaults to a regular white card without a line", () => {
    render(<CatchGroundCard data-testid="card">Body</CatchGroundCard>);
    const card = screen.getByTestId("card");
    expect(card.tagName).toBe("DIV");
    expect([card.dataset.ground, card.dataset.padding, card.dataset.outlined, card.dataset.catchTheme])
      .toEqual(["white", "regular", undefined, "light"]);
  });

  it("names a section card and resolves the ink ground through the dark theme", () => {
    render(<CatchGroundCard aria-label="Moments" as="section" ground="ink" outlined padding="roomy">Body</CatchGroundCard>);
    const card = screen.getByRole("region", {name: "Moments"});
    expect([card.dataset.ground, card.dataset.padding, card.dataset.outlined, card.dataset.catchTheme])
      .toEqual(["ink", "roomy", "true", "dark"]);
  });
});
