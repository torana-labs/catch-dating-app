import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchTabBar, type CatchTabBarItem} from "./CatchTabBar";
import {CatchViewport} from "./CatchViewport";

afterEach(cleanup);

const items: CatchTabBarItem[] = [
  {value: "now", label: "Needs you", icon: "notifications", href: "/now", badge: 4, section: "Work", pinned: true},
  {value: "inbox", label: "Inbox", icon: "conversations", href: "/inbox", badge: 120, section: "Work", pinned: true},
  {value: "organizers", label: "Organizers", icon: "organizer", href: "/organizers", section: "Records"},
  {value: "system", label: "System", icon: "settings", href: "/system", section: "Settings"},
];

describe("CatchTabBar", () => {
  it("draws a sidebar with section headings, right-aligned counts and the current page", () => {
    render(<CatchTabBar active="inbox" header={{title: "Catch Admin", note: "Owner"}} items={items} layout="sidebar" />);
    const nav = screen.getByRole("navigation", {name: "Main"});
    expect(nav.dataset.layout).toBe("sidebar");
    expect(nav.textContent).toContain("Work");
    expect(nav.textContent).toContain("Records");
    expect(screen.getByRole("link", {name: /Inbox/u}).getAttribute("aria-current")).toBe("page");
    expect(within(screen.getByRole("link", {name: /Inbox/u})).getByText("99+")).toBeTruthy();
    expect(screen.getByText("Catch Admin")).toBeTruthy();
  });

  it("calls onChanged on a plain click instead of following the link, and lets modified clicks through", () => {
    const onChanged = vi.fn();
    render(<CatchTabBar active="now" items={items} layout="sidebar" onChanged={onChanged} />);
    const link = screen.getByRole("link", {name: /Organizers/u});
    expect(fireEvent.click(link)).toBe(false);
    expect(onChanged).toHaveBeenCalledWith("organizers");
    expect(fireEvent.click(link, {metaKey: true})).toBe(true);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("shows only pinned items and More on the phone bar, with More current off the pinned set", () => {
    render(<CatchTabBar active="system" items={items} layout="bottom" more={{href: "/more", badge: 2}} />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["4Needs you", "99+Inbox", "2More"]);
    expect(screen.getByRole("link", {name: /More/u}).getAttribute("aria-current")).toBe("page");
  });

  it("follows the viewport's size class when the layout is auto", () => {
    render(<CatchViewport sizeClass="medium" navigation={<CatchTabBar active="now" items={items} />} />);
    expect(screen.getByRole("navigation").dataset.layout).toBe("rail");
    cleanup();
    render(<CatchViewport sizeClass="compact" navigation={<CatchTabBar active="now" items={items} />} />);
    expect(screen.getByRole("navigation").dataset.layout).toBe("bottom");
  });
});
