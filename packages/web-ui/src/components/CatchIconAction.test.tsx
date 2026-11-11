import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchIconAction} from "./CatchIconAction";

afterEach(cleanup);

describe("CatchIconAction", () => {
  it("is a labelled outlined button that presses", () => {
    const press = vi.fn();
    render(<CatchIconAction icon="share" label="Share" onPressed={press} />);
    const button = screen.getByRole("button", {name: "Share"});
    expect(button.dataset).toMatchObject({variant: "outlined", size: "lg", shape: "round", on: "ground"});
    expect(button.getAttribute("title")).toBe("Share");
    fireEvent.click(button);
    expect(press).toHaveBeenCalledOnce();
  });

  it("toggles, disables with null and links with href", () => {
    render(<><CatchIconAction icon="bookmark" label="Save" onPressed={() => undefined} pressed /><CatchIconAction icon="close" label="Close" onPressed={null} /><CatchIconAction href="/back" icon="back" label="Back" /></>);
    expect(screen.getByRole("button", {name: "Save"}).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("button", {name: "Close"}) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("link", {name: "Back"}).getAttribute("href")).toBe("/back");
  });

  it("caps its badge at 99+", () => {
    render(<CatchIconAction badge={120} icon="notifications" label="Notifications" />);
    expect(screen.getByText("99+")).toBeTruthy();
    expect(screen.getByRole("button", {name: "Notifications 99+"})).toBeTruthy();
  });
});
