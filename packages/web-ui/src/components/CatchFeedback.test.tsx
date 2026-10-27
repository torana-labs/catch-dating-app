import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchEmptyState} from "./CatchEmptyState";
import {CatchLoadingIndicator} from "./CatchLoadingIndicator";
import {CatchSkeleton} from "./CatchSkeleton";

afterEach(cleanup);

const root = (container: HTMLElement) => container.firstElementChild as HTMLElement;

describe("CatchLoadingIndicator", () => {
  it("is a named progressbar with a label and decorative without one", () => {
    render(<CatchLoadingIndicator label="Loading events" />);
    expect(screen.getByRole("progressbar", {name: "Loading events"}).dataset.recipe).toBe("circular");
    cleanup();
    const {container} = render(<CatchLoadingIndicator color="#fff" recipe="dots" />);
    expect(root(container).getAttribute("aria-hidden")).toBe("true");
    expect(root(container).querySelectorAll("span")).toHaveLength(3);
    expect(root(container).style.getPropertyValue("--catch-loading-color")).toBe("#fff");
  });

  it("sizes the inline glyph and the circular stroke", () => {
    const {container} = render(<><CatchLoadingIndicator recipe="inline" size={12} /><CatchLoadingIndicator strokeWidth={3} /></>);
    const [inline, circular] = [...container.children] as HTMLElement[];
    expect(inline.style.getPropertyValue("--catch-loading-size")).toBe("12px");
    expect(circular.style.getPropertyValue("--catch-loading-stroke")).toBe("3px");
  });
});

describe("CatchSkeleton", () => {
  it("draws hidden shapes, a text block ending short, and sized boxes", () => {
    const {container} = render(
      <>
        <CatchSkeleton lines={4} shape="textBlock" />
        <CatchSkeleton height={72} radius={14} shape="box" width="50%" />
        <CatchSkeleton shape="circle" size={36} />
      </>,
    );
    const [block, box, circle] = [...container.children] as HTMLElement[];
    expect(block.children).toHaveLength(4);
    expect(block.getAttribute("aria-hidden")).toBe("true");
    expect(box.style.cssText).toContain("height: 72px");
    expect(box.style.cssText).toContain("width: 50%");
    expect(box.style.cssText).toContain("border-radius: 14px");
    expect(circle.style.cssText).toContain("width: 36px");
  });

  it("derives paint from content while loading and restores it when done", () => {
    const loading = render(<CatchSkeleton shape="content"><button type="button">Book</button></CatchSkeleton>);
    expect(screen.queryByRole("button")).toBeNull();
    expect(root(loading.container).hasAttribute("inert")).toBe(true);
    cleanup();
    render(<CatchSkeleton enabled={false} shape="content"><button type="button">Book</button></CatchSkeleton>);
    expect(screen.getByRole("button", {name: "Book"})).toBeTruthy();
  });
});

describe("CatchEmptyState", () => {
  it("stacks the icon tile, title, message and actions", () => {
    const {container} = render(<CatchEmptyState actions={[<button key="a" type="button">Follow</button>]} icon={<svg />} message="Follow to hear about the next one." title="No upcoming runs" />);
    expect(root(container).dataset.variant).toBe("stacked");
    expect(root(container).querySelector("[data-recipe='empty']")).toBeTruthy();
    expect(root(container).textContent).toBe("No upcoming runsFollow to hear about the next one.Follow");
    expect(root(container).getAttribute("role")).toBeNull();
  });

  it("puts an inline icon in the title line, drops empty text, and announces on request", () => {
    render(<CatchEmptyState announce="polite" icon={<svg />} message="" title="Nothing here yet" variant="inline" />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.querySelector("[data-recipe='empty']")).toBeNull();
    expect(status.querySelector("p")).toBeNull();
  });
});
