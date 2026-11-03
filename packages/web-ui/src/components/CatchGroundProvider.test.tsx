import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {useCatch} from "./catchRootContext";
import {CatchGroundProvider, useGround} from "./CatchGroundProvider";
import {CatchRoot} from "./CatchRoot";

afterEach(cleanup);

/** Writes the context it reads, so a test can see what a component inside would get. */
function Probe() {
  const {theme, register, sizeClass, ground, format, reducedMotion} = useCatch();
  return <output data-testid="probe">{[theme, register, sizeClass, ground, format ?? "-", String(reducedMotion)].join(" ")}</output>;
}

function GroundProbe() {
  return <output data-testid="ground">{useGround()}</output>;
}

describe("CatchGroundProvider", () => {
  it("gives useGround the ground outside any root, under a root and under a provider", () => {
    render(<><GroundProbe /><CatchRoot theme="night"><GroundProbe /><CatchGroundProvider ground="night-tile"><GroundProbe /></CatchGroundProvider></CatchRoot></>);
    expect(screen.getAllByTestId("ground").map((element) => element.textContent)).toEqual(["ground", "night", "night-tile"]);
  });

  it("re-provides the ground and keeps the parent's theme and format", () => {
    render(<CatchRoot format="run" size="medium"><CatchGroundProvider ground="tile"><Probe /></CatchGroundProvider></CatchRoot>);
    const wrapper = screen.getByTestId("probe").parentElement!;
    expect(screen.getByTestId("probe").textContent).toBe("day app medium tile run false");
    expect(wrapper.dataset).toMatchObject({ground: "tile", format: "run"});
    expect(wrapper.hasAttribute("data-catch-theme")).toBe(false);
  });

  it("flips the theme attribute beneath it when the theme changes", () => {
    render(<CatchRoot><CatchGroundProvider format="games" ground="night" theme="night"><Probe /></CatchGroundProvider></CatchRoot>);
    const wrapper = screen.getByTestId("probe").parentElement!;
    expect(wrapper.dataset).toMatchObject({catchTheme: "dark", ground: "night", format: "games"});
    expect(screen.getByTestId("probe").textContent).toBe("night app compact night games false");
  });
});
