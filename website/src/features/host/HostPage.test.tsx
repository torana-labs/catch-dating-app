import {act, cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {brand} from "@catch/brand";
import {hostLandingCopy as copy, hostNightFormats} from "@content/hostLanding";
import {hostFeeCalculatorCopy, hostPricingFacts} from "@content/pricing";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {HostPage} from "./HostPage";
import {hostLandingHref, hostNightHref} from "./useHostLandingController";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

// The page's capture slots, as the website manifest records them (the real
// bindings are checked against capture_manifest.json in marketingCaptures.test.tsx).
const slotIds = ["host-today", "host-live-tablet", "guest-explore", ...new Set(hostNightFormats.flatMap((format) => format.moments.map((moment) => moment.slot)))];
const marketingCaptures: CaptureSlots = Object.fromEntries(slotIds.map((id) => [id, {
  id, audience: "host", surface: id, device: "generic-phone", webPath: `/captures/${id}.png`, width: 980, height: 1924,
  alt: `Screen ${id}`, caption: `Caption ${id}`, walkthroughStep: "Run the night", pages: ["/host/"],
}]));

const renderPage = () => render(<HostPage captures={marketingCaptures} />);
const whatsappPrefix = `https://wa.me/${brand.support.whatsapp.replace(/\D/gu, "")}?text=`;
const typed = (href: string | null) => decodeURIComponent((href ?? "").split("?text=")[1] ?? "");

describe("host landing", {timeout: 20_000}, () => {
  it("renders the board's bands in order, under the site top bar and the page's own sections bar with the free trial", () => {
    const {container} = renderPage();
    const banner = within(screen.getByRole("banner"));
    expect(banner.getByRole("link", {name: brand.name}).getAttribute("href")).toBe("/");
    // A host page's primary action is the trial, never the guest app.
    expect(banner.getByRole("link", {name: copy.sections.start}).getAttribute("href")).toBe("#start");
    expect(banner.queryByRole("link", {name: /Get the app|Get notified/u})).toBeNull();
    // The site top bar opens pages, Pricing among them (/pricing/); the page's sections live in their own bar.
    const nav = within(screen.getByRole("navigation", {name: "Primary"}));
    expect(nav.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/explore/", "/pricing/", "/help/"]);
    // The host header: the For hosts dropdown and WhatsApp before the free trial; the host footer.
    expect(banner.getByRole("button", {name: "For hosts"}).getAttribute("aria-expanded")).toBe("false");
    expect(banner.getByRole("link", {name: /WhatsApp/u}).getAttribute("href")).toMatch(/^https:\/\/wa\.me\//u);
    expect(within(screen.getByRole("navigation", {name: "Footer"})).getAllByRole("heading", {level: 2}).map((heading) => heading.textContent))
      .toEqual(["Product", "Get started", brand.name, "Legal"]);
    const sections = within(screen.getByRole("navigation", {name: copy.sections.label, hidden: true}));
    const sectionLinks = sections.getAllByRole("link", {hidden: true}).map((link) => link.getAttribute("href"));
    expect(sectionLinks).toEqual(["#ways", "#night", "#pricing", "#faq", "#start"]);
    for (const href of sectionLinks) expect(container.querySelector(href!), href!).toBeTruthy();
    expect(sections.getByRole("link", {name: copy.sections.start, hidden: true}).getAttribute("href")).toBe("#start");
    const bands: string[] = [copy.ways.title, copy.ways.stagesTitle, copy.night.title, copy.compare.title, copy.pricing.title,
      copy.talk.title, copy.faq.title, copy.start.title];
    const headings = screen.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent ?? "");
    expect(headings.filter((heading) => bands.includes(heading))).toEqual(bands);
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe(copy.hero.title);
    expect(screen.getByText(copy.footer.tagline)).toBeTruthy();
    expect(screen.getByRole("heading", {level: 2, name: copy.footer.helpTitle})).toBeTruthy();
  });

  it("states the trial terms per billing cycle in the hero (no laptop QR card at phone width) and links Catch Host's App Store and Google Play listings", () => {
    renderPage();
    const hero = within(screen.getByRole("region", {name: copy.hero.title}));
    expect(hero.getByText(copy.hero.terms)).toBeTruthy();
    expect(hero.queryByRole("img", {name: copy.start.qrLabel})).toBeNull();
    expect(copy.hero.terms).toContain(`${hostPricingFacts.cap} per billing cycle`);
    const apple = screen.getAllByRole("link", {name: "Download on the App Store"});
    expect(apple.map((link) => link.getAttribute("href"))).toEqual([brand.stores.host.ios]);
    expect(within(apple[0]).getByRole("img").getAttribute("src")).toBe("/assets/store-badges/app-store-download-on-the.svg");
    const play = screen.getAllByRole("link", {name: "Get it on Google Play"});
    expect(play.map((link) => link.getAttribute("href"))).toEqual([brand.stores.host.android]);
    expect(screen.queryByRole("button", {name: "Coming soon on Google Play"})).toBeNull();
  });

  it("keeps the retired host routes' anchors on the bands that carry their content", () => {
    const {container} = renderPage();
    for (const id of ["features", "use-cases", "how-it-works", "night", "ways", "layers", "existing-tools", "compare", "pricing", "faq", "start", "apply"]) {
      expect(container.querySelector(`#${id}`), id).toBeTruthy();
    }
  });

  it("links each format card to its night, which the night band follows moment by moment", () => {
    renderPage();
    const ways = within(screen.getByRole("region", {name: copy.ways.title}));
    expect(ways.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(hostNightFormats.map((item) => hostNightHref(item.format)));
    const timeline = within(screen.getByRole("list", {name: `${hostNightFormats[0].event}, moment by moment`}));
    expect(timeline.getByRole("button", {name: new RegExp(hostNightFormats[0].moments[0].title)}).getAttribute("aria-current")).toBe("step");
    expect(timeline.getByText(hostNightFormats[0].moments[0].body)).toBeTruthy();
    // A card's hash picks its format.
    act(() => {
      window.history.replaceState(null, "", hostNightHref("courts"));
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    const courts = within(screen.getByRole("list", {name: "Pickleball Social, moment by moment"}));
    expect(courts.getByRole("button", {name: /Levels in, courts planned/u}).getAttribute("aria-current")).toBe("step");
    expect(screen.getByRole("radio", {name: "Pickleball"}).getAttribute("aria-checked")).toBe("true");
  });

  it("picks a format and a moment in the night band, and shows that moment's screen from the capture pipeline", () => {
    renderPage();
    const night = within(screen.getByRole("region", {name: copy.night.title}));
    expect(night.getByRole("img", {name: marketingCaptures["host-formats-pods"].alt})).toBeTruthy();
    fireEvent.click(night.getByRole("button", {name: /Nobody left on the road/u}));
    expect(night.getByRole("button", {name: /Nobody left on the road/u}).getAttribute("aria-current")).toBe("step");
    expect(night.getByRole("img", {name: marketingCaptures["host-live-console"].alt})).toBeTruthy();
    fireEvent.click(night.getByRole("radio", {name: "Dinners"}));
    const dinner = within(screen.getByRole("list", {name: "Long Table Supper, moment by moment"}));
    expect(dinner.getByRole("button", {name: /Tables planned/u}).getAttribute("aria-current")).toBe("step");
  });

  it("names a screen for every moment of every night", () => {
    for (const format of hostNightFormats) {
      for (const moment of format.moments) expect(marketingCaptures[moment.slot], `${format.format} ${moment.slot}`).toBeTruthy();
    }
  });

  it("leads each way in to its band or to a person, from where the host is today", () => {
    renderPage();
    const stages = within(screen.getByRole("region", {name: copy.ways.stagesTitle}));
    expect(stages.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(copy.ways.stages.map((stage) => hostLandingHref(stage.to)));
  });

  it("prices a billing cycle on the shared calculator: 5% after the trial, capped at ₹10,000, with worked examples", () => {
    renderPage();
    const pricing = within(screen.getByRole("region", {name: copy.pricing.title}));
    expect(pricing.getAllByText(copy.pricing.rate).length).toBeGreaterThan(0);
    for (const example of copy.pricing.examples) expect(pricing.getAllByText(example.value).length).toBeGreaterThan(0);
    expect(pricing.getAllByText("₹6,000").length).toBeGreaterThan(0);
    expect(pricing.getByText(hostFeeCalculatorCopy.trial)).toBeTruthy();
    fireEvent.change(pricing.getByRole("slider", {name: hostFeeCalculatorCopy.sales}), {target: {value: "300000"}});
    expect(pricing.getByText("₹10,000")).toBeTruthy();
    expect(pricing.getByText(hostFeeCalculatorCopy.capped)).toBeTruthy();
    expect(pricing.getByText("3.3%")).toBeTruthy();
    for (const label of copy.pricing.included) expect(pricing.getByText(label)).toBeTruthy();
    expect(pricing.getByText(copy.pricing.organisations)).toBeTruthy();
    expect(typed(pricing.getByRole("link", {name: copy.pricing.talk}).getAttribute("href"))).toBe(copy.pricing.talkMessage);
    expect(pricing.getByRole("link", {name: copy.pricing.full}).getAttribute("href")).toBe("/pricing/");
  });

  it("compares only the tools the owner allows, with the fee per billing cycle", () => {
    renderPage();
    const table = within(screen.getByRole("table"));
    expect(table.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([copy.compare.rowHeader, ...copy.compare.columns]);
    const allowed = /^(WhatsApp, Forms and UPI|Luma|District|Meetup)$/u;
    for (const column of copy.compare.columns.slice(1)) expect(column).toMatch(allowed);
    expect(table.getByText(`${hostPricingFacts.rate}, never more than ${hostPricingFacts.cap} per billing cycle`)).toBeTruthy();
  });

  it("sends the walkthrough and every person to WhatsApp, with the message already typed", () => {
    renderPage();
    const hero = within(screen.getByRole("region", {name: copy.hero.title}));
    const talk = hero.getByRole("link", {name: copy.hero.talk});
    expect(talk.getAttribute("href")!.startsWith(whatsappPrefix)).toBe(true);
    expect(talk.getAttribute("target")).toBe("_blank");
    expect(typed(talk.getAttribute("href"))).toContain("question about hosting");
    expect(typed(hero.getByRole("link", {name: copy.hero.walkthrough}).getAttribute("href"))).toContain("walkthrough");
    const ways = within(screen.getByRole("region", {name: copy.talk.title}));
    expect(ways.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(copy.talk.paths.map((path) => hostLandingHref(path.to)));
    expect(ways.getByText(/usually within an hour/u)).toBeTruthy();
    // The "see it" route shows the live console on the iPad.
    expect(ways.getByRole("img", {name: marketingCaptures["host-live-tablet"].alt})).toBeTruthy();
    const dock = within(screen.getByRole("group", {name: copy.dock.label}));
    expect(dock.getByRole("link", {name: copy.dock.start}).getAttribute("href")).toBe("#start");
    expect(dock.getByRole("link", {name: copy.dock.whatsapp}).getAttribute("href")!.startsWith(whatsappPrefix)).toBe(true);
  });

  it("closes with three steps, Catch Host's badges, a person and a link to Catch for weddings", () => {
    renderPage();
    const start = within(screen.getByRole("region", {name: copy.start.title}));
    expect(start.getByText(copy.start.steps[2].title)).toBeTruthy();
    expect(start.getByRole("link", {name: "Download on the App Store"}).getAttribute("href")).toBe(brand.stores.host.ios);
    expect(start.getByRole("link", {name: copy.start.personWhatsapp}).getAttribute("href")!.startsWith(whatsappPrefix)).toBe(true);
    expect(start.getByRole("link", {name: copy.start.weddings}).getAttribute("href")).toBe("/weddings/");
  });

  it("answers the FAQ in place, trial and reminder questions included", () => {
    renderPage();
    const faq = within(screen.getByRole("region", {name: copy.faq.title}));
    for (const title of ["What does the free trial include?", "What happens when the trial ends?", "Do I need to talk to anyone to start?", "Do guests get a reminder before the event?"]) {
      expect(faq.getByText(title)).toBeTruthy();
    }
    expect(faq.getByText(copy.faq.items[0].title).closest("details")?.open).toBe(false);
    expect(faq.getByRole("link", {name: copy.faq.ask}).getAttribute("href")!.startsWith(whatsappPrefix)).toBe(true);
  });

  it("promises nothing the product does not do: no day-before reminder, no place count, no month", () => {
    const {container} = renderPage();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/day before|places left|of 50\b/iu);
    expect(text).not.toMatch(/\b(a|per|this|in a) month\b|monthly/iu);
  });

  it("uses no dating language", () => {
    const {container} = renderPage();
    expect(container.textContent).not.toMatch(/\b(dating|singles?|matches|matching|romance)\b/iu);
  });
});
