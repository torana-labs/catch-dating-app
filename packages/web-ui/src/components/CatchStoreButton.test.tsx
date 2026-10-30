import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchStoreButton} from "./CatchStoreButton";

afterEach(cleanup);

describe("CatchStoreButton", () => {
  it("is a large link named by its full label, with the kicker shown", () => {
    render(<CatchStoreButton accessibleLabel="Download on the App Store" href="https://apps.apple.com/app/x" kicker="Download on the" label="App Store" store="appStore" />);
    const link = screen.getByRole("link", {name: "Download on the App Store"});
    expect(link.getAttribute("href")).toBe("https://apps.apple.com/app/x");
    expect(link.dataset).toMatchObject({size: "l", store: "appStore"});
    expect(link.textContent).toBe("Download on the App Store");
  });

  it("stays on the page as a button while the store is not live, and reports the press", () => {
    const click = vi.fn();
    render(<CatchStoreButton accessibleLabel="Download on the App Store" label="App Store" onClick={click} store="appStore" />);
    const button = screen.getByRole("button", {name: "Download on the App Store"});
    expect(button.getAttribute("type")).toBe("button");
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(button);
    expect(click).toHaveBeenCalledOnce();
  });

  it("falls back to its visible label and reports clicks", () => {
    const click = vi.fn();
    render(<CatchStoreButton href="#" label="Google Play" onClick={click} size="m" store="googlePlay" />);
    const link = screen.getByRole("link", {name: "Google Play"});
    expect(link.dataset).toMatchObject({size: "m", store: "googlePlay"});
    fireEvent.click(link);
    expect(click).toHaveBeenCalledOnce();
  });
});
