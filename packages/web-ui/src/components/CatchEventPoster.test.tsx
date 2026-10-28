import {cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchEventPoster} from "./CatchEventPoster";

afterEach(cleanup);

describe("CatchEventPoster", () => {
  it("sets the kicker, date, title and place on its ground, hidden from screen readers", () => {
    const {container} = render(<CatchEventPoster date="Sun 22 Nov" ground="indigo" kicker="Salt Air Run Club"
      place="Bandra West" title="15K training run" />);
    const poster = container.firstElementChild as HTMLElement;
    expect(poster.getAttribute("aria-hidden")).toBe("true");
    expect(poster.dataset.ground).toBe("indigo");
    expect(poster.dataset.catchTheme).toBe("light");
    expect(poster.textContent).toBe("Salt Air Run ClubSun 22 Nov15K training runBandra West");
    expect(poster.querySelector('[data-variant="displayXxl"]')?.textContent).toBe("15K training run");
  });

  it("defaults to coral and resolves the ink ground through the dark theme", () => {
    const {container, rerender} = render(<CatchEventPoster date="d" kicker="k" place="p" title="t" />);
    expect((container.firstElementChild as HTMLElement).dataset.ground).toBe("coral");
    rerender(<CatchEventPoster date="d" ground="ink" kicker="k" place="p" title="t" />);
    expect((container.firstElementChild as HTMLElement).dataset.catchTheme).toBe("dark");
  });
});
