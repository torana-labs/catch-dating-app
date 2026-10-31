import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {useCatchViewport} from "./catchViewportContext";
import {CatchViewport} from "./CatchViewport";

afterEach(cleanup);

function Probe() {
  const {register, sizeClass, inShell} = useCatchViewport();
  return <p>{`${register} ${sizeClass} ${inShell}`}</p>;
}

describe("CatchViewport", () => {
  it("sets the register once for every part inside and provides the size class", () => {
    const {container} = render(<CatchViewport register="quiet" sizeClass="medium"><Probe /></CatchViewport>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.register).toBe("quiet");
    expect(root.dataset.size).toBe("medium");
    expect(screen.getByText("quiet medium true")).toBeTruthy();
  });

  it("lays out the navigation, top bar, body and dock in their slots", () => {
    render(
      <CatchViewport dock={<p>Dock</p>} navigation={<nav>Nav</nav>} topBar={<header>Top</header>}>
        <p>Body</p>
      </CatchViewport>,
    );
    expect(screen.getByText("Body").parentElement?.dataset.catchViewportBody).toBe("");
    expect(screen.getByText("Nav")).toBeTruthy();
    expect(screen.getByText("Top")).toBeTruthy();
    expect(screen.getByText("Dock")).toBeTruthy();
  });
});
