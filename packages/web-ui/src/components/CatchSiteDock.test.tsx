import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchSiteDock} from "./CatchSiteDock";

afterEach(cleanup);

describe("CatchSiteDock", () => {
  it("is a named group of the page's links: the filled main one, then the outlined second", () => {
    render(<CatchSiteDock label="Quick actions" primary={{label: "Get notified", href: "#app", accent: "pink"}} secondary={{label: "See plans", href: "#whats-on"}} />);
    const group = screen.getByRole("group", {name: "Quick actions"});
    const links = Array.from(group.querySelectorAll("a"));
    expect(links.map((link) => link.textContent)).toEqual(["Get notified", "See plans"]);
    expect(links[0].dataset).toMatchObject({kind: "primary", accent: "pink"});
    expect(links[1].dataset.kind).toBe("secondary");
    expect(links[0].getAttribute("href")).toBe("#app");
  });

  it("defaults the main pill to coral, and names the WhatsApp button, which opens a new tab", () => {
    render(<CatchSiteDock label="Quick actions" primary={{label: "Book", href: "/book"}} whatsapp={{label: "Chat on WhatsApp", href: "https://wa.me/1"}} />);
    expect(screen.getByRole("link", {name: "Book"}).dataset.accent).toBe("coral");
    const chat = screen.getByRole("link", {name: "Chat on WhatsApp"});
    expect(chat.getAttribute("target")).toBe("_blank");
    expect(chat.getAttribute("rel")).toBe("noopener noreferrer");
    expect(chat.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
