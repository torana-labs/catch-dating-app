import {cleanup, fireEvent, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchAvatar, catchAvatarInitialsOf} from "./CatchAvatar";
import {CatchAvatarRow} from "./CatchAvatarRow";

afterEach(cleanup);

const colors = {accent: "#F07A55", deep: "#B5451F", soft: "#FDE7DF"};
const root = (container: HTMLElement) => container.firstElementChild as HTMLElement;
const surface = (container: HTMLElement) => container.querySelector("[data-variant] > *") as HTMLElement;

describe("catchAvatarInitialsOf", () => {
  it("takes two letters of one word, else the first letters of the first two", () => {
    expect(catchAvatarInitialsOf("Riya")).toBe("RI");
    expect(catchAvatarInitialsOf("  Carter Road Runners ")).toBe("CR");
    expect(catchAvatarInitialsOf("anne-marie_lee")).toBe("AM");
    expect(catchAvatarInitialsOf("")).toBe("");
  });
});

describe("CatchAvatar", () => {
  it("is decorative and sized with its ring", () => {
    const {container} = render(<CatchAvatar borderColor="#FFF" borderWidth={4} name="Dev Malhotra" size={88} />);
    expect(root(container).getAttribute("aria-hidden")).toBe("true");
    expect(root(container).style.getPropertyValue("--catch-avatar-size")).toBe("88px");
    expect(root(container).style.getPropertyValue("--catch-avatar-inner")).toBe("80px");
    expect(surface(container).textContent).toBe("DM");
  });

  it("falls back from a failed photo to the activity initials", () => {
    const {container} = render(<CatchAvatar colors={colors} imageUrl="https://example.invalid/a.jpg" initials="RC" size={56} />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(surface(container).textContent).toBe("RC");
  });

  it("obscures photos and person initials, never an activity fallback, and shows the online dot", () => {
    const person = render(<CatchAvatar name="Private guest" obscured size={56} status="online" />);
    expect(person.container.querySelector("[data-obscured]")).toBeTruthy();
    expect(person.container.querySelectorAll(":scope > span > span")).toHaveLength(2);
    cleanup();
    const activity = render(<CatchAvatar colors={colors} name="Run club" obscured size={56} />);
    expect(activity.container.querySelector("[data-obscured]")).toBeNull();
  });

  it("formats counts, veils slots and keeps the circle for them", () => {
    const count = render(<CatchAvatar count={19} countLabelBuilder={(value) => `+${value}`} recipe="count" size={48} />);
    expect(count.container.textContent).toBe("+19");
    cleanup();
    const veiled = render(<CatchAvatar colors={colors} recipe="veiled" size={48} />);
    expect(veiled.container.querySelector("svg")).toBeTruthy();
    expect(veiled.container.querySelector("[data-variant]")!.getAttribute("data-variant")).toBe("circle");
  });

  it("sets a monogram on its ground and switches to the display voice from 24px initials", () => {
    const small = render(<CatchAvatar ground="pink" name="Riya S." recipe="monogram" size={36} />);
    const smallSurface = surface(small.container);
    expect(smallSurface.textContent).toBe("RS");
    expect(smallSurface.dataset).toMatchObject({ground: "pink"});
    expect(smallSurface.dataset.display).toBeUndefined();
    cleanup();
    const large = render(<CatchAvatar borderWidth={4} ground="coral" initials="CR" recipe="monogram" size={88} />);
    expect(surface(large.container).dataset.display).toBe("true");
  });
});

describe("CatchAvatarRow", () => {
  it("shows named slots up to the limit, then veiled slots, then the overflow", () => {
    const {container} = render(
      <CatchAvatarRow countLabelBuilder={(value) => `+${value}`} items={[{name: "Aanya Rao"}, {name: "Kabir Mehta"}]}
        limit={4} totalCount={24} veiledColors={colors} veiledCount={5} />,
    );
    const avatars = [...root(container).children] as HTMLElement[];
    expect(avatars.map((avatar) => avatar.dataset.recipe)).toEqual(["default", "default", "veiled", "veiled", "count"]);
    expect(avatars.at(-1)!.textContent).toBe("+20");
  });

  it("renders nothing when there is nothing to show", () => {
    const {container} = render(<CatchAvatarRow countLabelBuilder={String} items={[]} />);
    expect(container.childElementCount).toBe(0);
  });
});
