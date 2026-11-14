import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {brand} from "@catch/brand";
import {hostLandingCopy as copy, hostNightCaptureScreen, hostNightFocus, hostNightFormats} from "@content/hostLanding";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {HostPage} from "./HostPage";
import {catchFee, effectiveRate} from "./useHostLandingController";

afterEach(cleanup);

// The page's capture slots, as the website manifest records them (the real
// bindings are checked against capture_manifest.json in marketingCaptures.test.tsx).
const slotIds = ["host-today", "host-live-tablet", "guest-explore", ...new Set(hostNightFormats.flatMap((format) => format.moments.map((moment) => moment.slot)))];
const marketingCaptures: CaptureSlots = Object.fromEntries(slotIds.map((id) => [id, {
  id, audience: "host", surface: id, device: "generic-phone", webPath: `/captures/${id}.png`, width: 980, height: 1924,
  alt: `Screen ${id}`, caption: `Caption ${id}`, walkthroughStep: "Run the night", pages: ["/host/"],
}]));

const renderPage = () => render(<HostPage captures={marketingCaptures} />);

describe("host landing", {timeout: 20_000}, () => {
  it("renders the board's bands in order, with the header naming the product, its sections and the free trial", () => {
    renderPage();
    const banner = within(screen.getByRole("banner"));
    expect(banner.getByRole("link", {name: copy.header.title}).getAttribute("href")).toBe("/");
    const nav = within(screen.getByRole("navigation", {name: "Primary"}));
    expect(nav.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["#night", "#ways", "#pricing"]);
    expect(banner.getAllByRole("link", {name: copy.header.start})[0].getAttribute("href")).toBe("#start");
    const bands: string[] = [copy.kinds.title, copy.night.title, copy.tablet.title, copy.pipeline.title, copy.guests.title, copy.growth.title,
      copy.layers.title, copy.pricing.rate, copy.faq.title, copy.start.title];
    const headings = screen.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent ?? "");
    expect(headings.filter((heading) => bands.includes(heading))).toEqual(bands);
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe(copy.hero.title);
    expect(screen.getByText(copy.footer.tagline)).toBeTruthy();
  });

  it("states the trial terms in the hero and links Catch Host's App Store and Google Play listings", () => {
    renderPage();
    expect(screen.getByText(copy.hero.terms)).toBeTruthy();
    const apple = screen.getAllByRole("link", {name: "Download on the App Store"});
    expect(apple).toHaveLength(2);
    expect(apple.map((link) => link.getAttribute("href"))).toEqual([brand.stores.host.ios, brand.stores.host.ios]);
    expect(within(apple[0]).getByRole("img").getAttribute("src")).toBe("/assets/store-badges/app-store-download-on-the.svg");
    const play = screen.getAllByRole("link", {name: "Get it on Google Play"});
    expect(play.map((link) => link.getAttribute("href"))).toEqual([brand.stores.host.android, brand.stores.host.android]);
    expect(screen.queryByRole("button", {name: "Coming soon on Google Play"})).toBeNull();
  });

  it("keeps the retired host routes' anchors on the bands that carry their content", () => {
    const {container} = renderPage();
    for (const id of ["features", "use-cases", "how-it-works", "night", "ways", "layers", "existing-tools", "pricing", "faq", "start", "apply"]) {
      expect(container.querySelector(`#${id}`), id).toBeTruthy();
    }
  });

  it("shares the picked format between the tiles, the matrix and the night scene", () => {
    renderPage();
    const scene = within(screen.getByRole("group", {name: `${hostNightFormats[0].event}, moment by moment`}));
    expect(scene.getByRole("button", {name: new RegExp(hostNightFormats[0].moments[0].title)}).getAttribute("aria-current")).toBe("step");
    fireEvent.click(within(screen.getByRole("table", {name: copy.matrix.heading})).getByRole("button", {name: "Pickleball"}));
    const courts = within(screen.getByRole("group", {name: "Pickleball Social, moment by moment"}));
    expect(courts.getByRole("button", {name: /Levels in, courts balanced/}).getAttribute("aria-current")).toBe("step");
    expect(courts.getAllByText("Doubles on three courts").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", {name: /Pickleball.*Courts and partners/}).getAttribute("aria-pressed")).toBe("true");
  });

  it("shows each moment's screen from the capture pipeline", () => {
    renderPage();
    const scene = within(screen.getByRole("group", {name: `${hostNightFormats[0].event}, moment by moment`}));
    expect(scene.getByRole("img", {name: marketingCaptures["host-formats-pods"].alt})).toBeTruthy();
  });

  it("crops every night moment's capture to a focus box inside the app screen, so phones read the app at about 14 px", () => {
    const screenBox = hostNightCaptureScreen;
    for (const format of hostNightFormats) {
      for (const moment of format.moments) {
        const box = hostNightFocus[moment.slot];
        expect(box, moment.slot).toBeTruthy();
        expect(box.x >= screenBox.x && box.y >= screenBox.y, moment.slot).toBe(true);
        expect(box.x + box.width <= screenBox.x + screenBox.width, moment.slot).toBe(true);
        expect(box.y + box.height <= screenBox.y + screenBox.height, moment.slot).toBe(true);
        // At a 390 px phone (350 px of band), 15 pt body text in a 2x capture reads at 30 × 350 / width px.
        expect(30 * 350 / box.width, moment.slot).toBeGreaterThanOrEqual(13.5);
      }
    }
    expect(Object.keys(hostNightFocus).sort()).toEqual([...new Set(hostNightFormats.flatMap((format) => format.moments.map((moment) => moment.slot)))].sort());
  });

  it("prices the month on the slider: 5% after the trial, capped at ₹10,000", () => {
    renderPage();
    const pricing = within(screen.getByRole("region", {name: copy.pricing.rate}));
    expect(pricing.getAllByText("₹6,000").length).toBeGreaterThan(0);
    expect(pricing.getByText(copy.pricing.trial)).toBeTruthy();
    fireEvent.change(pricing.getByRole("slider", {name: copy.pricing.sales}), {target: {value: "300000"}});
    expect(pricing.getByText("₹10,000")).toBeTruthy();
    expect(pricing.getByText(copy.pricing.capped)).toBeTruthy();
    expect(pricing.getByText("3.3%")).toBeTruthy();
    expect([catchFee(0), catchFee(100_000), catchFee(500_000)]).toEqual([0, 5_000, 10_000]);
    expect([effectiveRate(0), effectiveRate(400_000)]).toEqual(["5%", "2.5%"]);
  });

  it("shows what Catch runs at each layer", () => {
    renderPage();
    const ways = within(screen.getByRole("region", {name: copy.layers.title}));
    expect(ways.getAllByText(copy.layers.map.on)).toHaveLength(1 + 3);
    fireEvent.click(ways.getByRole("tab", {name: copy.layers.options[2].label}));
    // Every job runs on Catch now; Get found is new at this layer.
    expect(ways.getAllByText(copy.layers.map.on)).toHaveLength(1 + 5);
    expect(ways.getByText(`${copy.layers.map.on} · ${copy.layers.map.newHere}`)).toBeTruthy();
    expect(ways.getByText(copy.layers.options[2].body)).toBeTruthy();
  });

  it("follows a growth link from visits to bookings", () => {
    renderPage();
    const growth = within(screen.getByRole("region", {name: copy.growth.title}));
    fireEvent.click(growth.getByRole("button", {name: /Instagram bio/}));
    expect(growth.getByText(`${copy.growth.linkBase}instagram`)).toBeTruthy();
    expect(growth.getByText("5%")).toBeTruthy();
  });

  it("closes with three steps, Catch Host's badges and no QR code, and a link to Catch for weddings", () => {
    renderPage();
    const start = within(screen.getByRole("region", {name: copy.start.title}));
    expect(start.getAllByRole("listitem")).toHaveLength(3);
    expect(start.getByRole("link", {name: "Download on the App Store"}).getAttribute("href")).toBe(brand.stores.host.ios);
    expect(start.queryByRole("img", {name: /QR/i})).toBeNull();
    expect(start.getByRole("link", {name: copy.start.weddings}).getAttribute("href")).toBe("/weddings/");
  });

  it("answers the FAQ in place, one item open at a time, trial questions included", () => {
    const {container} = renderPage();
    expect(screen.getByText(copy.faq.items[1].title).closest("details")?.open).toBe(false);
    expect(container.querySelectorAll('details[name="host-faq"]')).toHaveLength(copy.faq.items.length);
    for (const title of ["What does the free trial include?", "What happens when the trial ends?", "Do I need to talk to anyone to start?"]) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });

  it("uses no dating language", () => {
    const {container} = renderPage();
    expect(container.textContent).not.toMatch(/\b(dating|singles?|matches|matching|romance)\b/iu);
  });
});
