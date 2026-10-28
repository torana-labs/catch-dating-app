import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchHeroShowcase} from "./CatchHeroShowcase";

afterEach(cleanup);

const sticker = (title: string) => ({label: "Run club · Fri 6:30 AM", title, ground: "white" as const, labelAccent: "coral" as const});

describe("CatchHeroShowcase", () => {
  it("shows the device on its ground and hides at most three decorative stickers", () => {
    const {container} = render(
      <CatchHeroShowcase
        device={<img alt="The Catch app" src="/explore.png" />}
        ground="pink"
        stickers={[sticker("One"), sticker("Two"), sticker("Three"), sticker("Four")]}
      />,
    );
    expect(screen.getByRole("img", {name: "The Catch app"})).toBeTruthy();
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.dataset).toMatchObject({ground: "pink", catchTheme: "light"});
    const stickers = panel.querySelectorAll("[data-slot]");
    expect([...stickers].map((item) => item.getAttribute("aria-hidden"))).toEqual(["true", "true", "true"]);
    expect(screen.queryByText("Four")).toBeNull();
  });
});
