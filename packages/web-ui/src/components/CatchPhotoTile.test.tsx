import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchPhotoTile} from "./CatchPhotoTile";

afterEach(cleanup);

describe("CatchPhotoTile", () => {
  it("captions a photo with its title and caption", () => {
    render(<CatchPhotoTile caption="212 runners" imageAlt="Runners at the rave" imageUrl="/a.jpg" title="Run & Rave, October" />);
    const figure = screen.getByRole("figure");
    expect(figure.querySelector("figcaption")!.textContent).toBe("Run & Rave, October 212 runners");
    expect(figure.dataset.photo).toBe("true");
    expect(figure.dataset.ground).toBeUndefined();
    expect(screen.getByRole("img", {name: "Runners at the rave"})).toBeTruthy();
  });

  it("sits on its ground without a photo and shows the figure first", () => {
    render(<CatchPhotoTile figure="64" ground="yellow" title="runs since 2024" />);
    const figure = screen.getByRole("figure");
    expect(figure.dataset.ground).toBe("yellow");
    expect(figure.textContent).toBe("64 runs since 2024");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("marks an empty slot on white and ignores a photo", () => {
    render(<CatchPhotoTile caption="once the club claims the page" imageUrl="/a.jpg" placeholder title="Photos go here" />);
    const figure = screen.getByRole("figure");
    expect(figure.dataset).toMatchObject({ground: "white", placeholder: "true"});
    expect(figure.dataset.photo).toBeUndefined();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
