import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchVideoEmbed} from "./CatchVideoEmbed";

afterEach(cleanup);

const props = {
  title: "Last Tuesday’s final round",
  caption: "Every final round goes up a week later.",
  still: {src: "/still.png", alt: "Teams at their tables during the final round"},
  source: "YouTube · Lantern Lane Social",
  duration: "6:12",
  embedSrc: "https://www.youtube-nocookie.com/embed/abc?autoplay=1",
};

describe("CatchVideoEmbed", () => {
  it("shows the still, its source, running time and title, with no player loaded", () => {
    const {container} = render(<CatchVideoEmbed {...props} />);
    expect(screen.getByRole("img", {name: props.still.alt})).toBeTruthy();
    expect(screen.getByText(props.source)).toBeTruthy();
    expect(screen.getByText("6:12")).toBeTruthy();
    expect(screen.getByText(props.title)).toBeTruthy();
    expect(screen.getByText(props.caption)).toBeTruthy();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("plays in place: the play button swaps the still for the player titled with the video", () => {
    render(<CatchVideoEmbed {...props} />);
    fireEvent.click(screen.getByRole("button", {name: `Play ${props.title}`}));
    const player = screen.getByTitle(props.title);
    expect(player.tagName).toBe("IFRAME");
    expect(player.getAttribute("src")).toBe(props.embedSrc);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(props.title)).toBeTruthy();
  });

  it("takes a play label and leaves out what it is not given", () => {
    render(<CatchVideoEmbed {...props} caption={undefined} duration={undefined} playLabel="Watch the final round" />);
    expect(screen.getByRole("button", {name: "Watch the final round"})).toBeTruthy();
    expect(screen.queryByText("6:12")).toBeNull();
    expect(screen.queryByText(props.caption)).toBeNull();
  });
});
