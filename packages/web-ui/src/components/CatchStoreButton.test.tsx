import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchStoreButton, catchStoreBadgeAspect} from "./CatchStoreButton";

afterEach(cleanup);

const apple = "/assets/store-badges/app-store-download-on-the.svg";
const google = "/assets/store-badges/google-play-get-it-on.png";

describe("CatchStoreButton", () => {
  it("links to the store with the official badge, named by the badge's words", () => {
    render(<CatchStoreButton badgeSrc={apple} href="https://apps.apple.com/app/x" label="Download on the App Store" store="appStore" />);
    const link = screen.getByRole("link", {name: "Download on the App Store"});
    expect(link.getAttribute("href")).toBe("https://apps.apple.com/app/x");
    expect(link.dataset).toMatchObject({size: "l", store: "appStore"});
    const badge = screen.getByRole("img", {name: "Download on the App Store"});
    expect(badge.getAttribute("src")).toBe(apple);
    expect(badge.getAttribute("height")).toBe("48");
    expect(badge.getAttribute("width")).toBe(String(Math.round(48 * catchStoreBadgeAspect.appStore)));
  });

  it("stays on the page as a button while the store is not live, and reports the press", () => {
    const click = vi.fn();
    render(<CatchStoreButton badgeSrc={apple} label="Download on the App Store" onClick={click} store="appStore" />);
    const button = screen.getByRole("button", {name: "Download on the App Store"});
    expect(button.getAttribute("type")).toBe("button");
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(button);
    expect(click).toHaveBeenCalledOnce();
  });

  it("draws the medium badge at 40px and reports clicks", () => {
    const click = vi.fn();
    render(<CatchStoreButton badgeSrc={google} href="#" label="Get it on Google Play" onClick={click} size="m" store="googlePlay" />);
    const link = screen.getByRole("link", {name: "Get it on Google Play"});
    expect(link.dataset).toMatchObject({size: "m", store: "googlePlay"});
    const badge = screen.getByRole("img", {name: "Get it on Google Play"});
    expect(badge.getAttribute("height")).toBe("40");
    expect(badge.getAttribute("width")).toBe("134");
    fireEvent.click(link);
    expect(click).toHaveBeenCalledOnce();
  });

  it("draws no text or mark of its own over the artwork", () => {
    const {container} = render(<CatchStoreButton badgeSrc={google} href="#" label="Get it on Google Play" store="googlePlay" />);
    expect(container.querySelector("svg")).toBeNull();
    expect(container.textContent).toBe("");
  });
});
