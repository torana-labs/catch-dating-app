import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchGroundCard} from "./CatchGroundCard";

afterEach(cleanup);

describe("CatchGroundCard", () => {
  it("holds its children on paper at the regular padding by default", () => {
    render(<CatchGroundCard>Share this page</CatchGroundCard>);
    const card = screen.getByText("Share this page");
    expect(card.dataset).toMatchObject({ground: "paper", padding: "regular", catchTheme: "light"});
  });

  it("takes any ground, element and padding, and resolves the ink ground through the dark theme", () => {
    const {rerender} = render(
      <CatchGroundCard aria-labelledby="title" as="section" ground="indigo" padding="spacious"><h2 id="title">Claim it</h2></CatchGroundCard>,
    );
    const region = screen.getByRole("region", {name: "Claim it"});
    expect(region.dataset).toMatchObject({ground: "indigo", padding: "spacious"});
    rerender(<CatchGroundCard ground="ink" padding="compact">Next up</CatchGroundCard>);
    expect(screen.getByText("Next up").dataset).toMatchObject({ground: "ink", catchTheme: "dark", padding: "compact"});
  });

  it("outlines a card only when asked, such as a white card on a white page", () => {
    const {rerender} = render(<CatchGroundCard ground="white">Organiser</CatchGroundCard>);
    expect(screen.getByText("Organiser").dataset.outlined).toBeUndefined();
    rerender(<CatchGroundCard ground="white" outlined>Organiser</CatchGroundCard>);
    expect(screen.getByText("Organiser").dataset).toMatchObject({ground: "white", outlined: "true"});
  });
});
