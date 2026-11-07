import {act, cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {hostLandingCopy as copy} from "@content/hostLanding";
import {HostPage} from "./HostPage";
import {catchFee, effectiveRate, pipelineStages} from "./useHostLandingController";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("host landing", {timeout: 20_000}, () => {
  it("renders the board's bands in order, with the header naming the product and its sections", () => {
    render(<HostPage />);
    const banner = within(screen.getByRole("banner"));
    expect(banner.getByRole("link", {name: copy.header.title}).getAttribute("href")).toBe("/");
    const nav = within(screen.getByRole("navigation", {name: "Primary"}));
    expect(nav.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["#night", "#layers", "#pricing"]);
    expect(banner.getAllByRole("link", {name: copy.header.apply})[0].getAttribute("href")).toBe("#apply");
    const bands: string[] = [copy.kinds.title, copy.night.title, copy.ipad.title, copy.pipeline.title, copy.guests.title, copy.growth.title,
      copy.layers.title, copy.pricing.rate, copy.faq.title, copy.apply.title];
    const headings = screen.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent ?? "");
    expect(headings.filter((heading) => bands.includes(heading))).toEqual(bands);
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe(copy.hero.title);
    expect(screen.getByText(copy.footer.tagline)).toBeTruthy();
  });

  it("keeps the retired host routes' anchors on the bands that carry their content", () => {
    const {container} = render(<HostPage />);
    for (const id of ["features", "use-cases", "how-it-works", "night", "layers", "existing-tools", "pricing", "apply"]) {
      expect(container.querySelector(`#${id}`), id).toBeTruthy();
    }
  });

  it("follows the night chapter by chapter, joined as a timeline", () => {
    render(<HostPage />);
    expect(screen.getByText("01 / 05 · 6:00 PM")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: /The reveal/}));
    expect(screen.getByText("04 / 05 · 8:24 PM")).toBeTruthy();
    expect(screen.getByRole("button", {name: /The reveal/}).getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("button", {name: /Round two/}).querySelector('[data-tone="muted"]')).not.toBeNull();
  });

  it("prices the month on the slider: 5%, capped at ₹10,000", () => {
    render(<HostPage />);
    const pricing = within(screen.getByRole("region", {name: copy.pricing.rate}));
    expect(pricing.getAllByText("₹6,000").length).toBeGreaterThan(0);
    fireEvent.change(pricing.getByRole("slider", {name: copy.pricing.sales}), {target: {value: "300000"}});
    expect(pricing.getByText("₹10,000")).toBeTruthy();
    expect(pricing.getByText(copy.pricing.capped)).toBeTruthy();
    expect(pricing.getByText("3.3%")).toBeTruthy();
    expect([catchFee(0), catchFee(100_000), catchFee(500_000)]).toEqual([0, 5_000, 10_000]);
    expect([effectiveRate(0), effectiveRate(400_000)]).toEqual(["5%", "2.5%"]);
  });

  it("shows what Catch runs at each layer", () => {
    render(<HostPage />);
    const table = within(screen.getByRole("table", {name: copy.layers.tableLabel}));
    // The column header carries the same words as each badge.
    expect(table.getAllByText(copy.layers.runs)).toHaveLength(1 + 6);
    fireEvent.click(screen.getByRole("tab", {name: copy.layers.options[0].label}));
    expect(table.getAllByText(copy.layers.runs)).toHaveLength(1 + 3);
  });

  it("replays ten applications through the board", () => {
    vi.useFakeTimers();
    render(<HostPage />);
    const board = within(screen.getByRole("region", {name: copy.pipeline.title}));
    expect(board.getByRole("heading", {name: /1 · They apply/}).textContent).toContain("10");
    fireEvent.click(board.getByRole("button", {name: copy.pipeline.replay}));
    for (let step = 0; step < 20; step++) act(() => {vi.advanceTimersByTime(450);});
    expect(board.getByRole("heading", {name: /4 · They show up/}).textContent).toContain("10");
    expect(pipelineStages(3, 10, 4).slice(0, 4)).toEqual([1, 1, 0, 0]);
  });

  it("draws the first application step and sends Continue to the application, unchanged", () => {
    render(<HostPage />);
    const apply = within(screen.getByRole("region", {name: copy.apply.title}));
    fireEvent.click(apply.getByRole("radio", {name: "Pub crawl"}));
    expect(apply.getByRole("radio", {name: "Pub crawl"}).getAttribute("aria-checked")).toBe("true");
    expect(apply.getByRole("textbox", {name: copy.apply.card.city})).toBeTruthy();
    expect(apply.getByRole("progressbar", {name: copy.apply.card.step})).toBeTruthy();
    expect(apply.getByRole("link", {name: copy.apply.card.continue}).getAttribute("href")).toBe("/host/apply/");
  });

  it("answers the FAQ in place", () => {
    const {container} = render(<HostPage />);
    expect(screen.getByText(copy.faq.items[1].title).closest("details")?.open).toBe(false);
    expect(container.querySelectorAll('details[name="host-faq"]')).toHaveLength(copy.faq.items.length);
  });
});
