import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {brand} from "@content/brand";
import {weddingsApplyPath, weddingsCopy as copy} from "@content/weddings";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {WeddingsApplicationPage} from "./WeddingsApplicationPage";
import {WeddingsPage} from "./WeddingsPage";
import type {WeddingsApplication, WeddingsStepOneDraft} from "./weddingsModel";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

const one = copy.stepOne;
const two = copy.stepTwo;
const stepOne: WeddingsStepOneDraft = {
  who: one.who.options[0], what: one.what.options[0], name: one.name.hint, company: one.company.hint, phone: one.phone.hint, date: "2026-12-12",
  destination: one.destination.hint, guests: one.guests.options[1], tools: [],
};

// The page's capture slots, as the website manifest records them (their page bindings are
// checked against capture_manifest.json in marketingCaptures.test.tsx).
const slots = ["wedding-rsvp", "wedding-itinerary", "wedding-whatsapp", "wedding-ids", "wedding-door", "wedding-departures", "wedding-driver",
  "wedding-message", "wedding-family", "wedding-guests", "wedding-rooms", "wedding-live", "wedding-reconcile", "wedding-hotel"];
const captures: CaptureSlots = Object.fromEntries(slots.map((id) => [id, {
  id, webPath: `/captures/${id}.png`, width: 980, height: 1924, alt: `Screen ${id}`, caption: `Caption ${id}`, walkthroughStep: "Set up", pages: ["/weddings/"],
}]));

function fillStepOne(scope: ReturnType<typeof within>) {
  fireEvent.click(scope.getByRole("radio", {name: stepOne.who}));
  fireEvent.click(scope.getByRole("radio", {name: stepOne.what}));
  fireEvent.change(scope.getByLabelText(one.name.label), {target: {value: stepOne.name}});
  fireEvent.change(scope.getByLabelText(one.phone.label), {target: {value: stepOne.phone}});
  fireEvent.change(scope.getByLabelText(one.date.label), {target: {value: stepOne.date}});
  fireEvent.change(scope.getByLabelText(one.destination.label), {target: {value: stepOne.destination}});
  fireEvent.click(scope.getByRole("radio", {name: stepOne.guests}));
}

describe("Catch for weddings", {timeout: 20_000}, () => {
  it("renders the board's bands in order under the site top bar naming the product", () => {
    const {container} = render(<WeddingsPage captures={captures} />);
    const banner = within(screen.getByRole("banner"));
    expect(banner.getByRole("link", {name: copy.header.title}).getAttribute("href")).toBe("/");
    expect(banner.getAllByRole("link", {name: copy.header.apply})[0].getAttribute("href")).toBe("#apply");
    // The short headline is the phone layout's; the test renderer reports a compact window.
    expect([copy.hero.title, copy.hero.titleShort]).toContain(screen.getByRole("heading", {level: 1}).textContent);
    const bands: string[] = [copy.order.title, copy.problem.title, copy.follow.title, copy.team.title, copy.messages.title, copy.family.title, copy.pricing.title,
      copy.pilot.title, copy.faq.title];
    const headings = screen.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent ?? "");
    expect(headings.filter((heading) => bands.includes(heading))).toEqual(bands);
    for (const link of copy.header.nav) expect(container.querySelector(link.href), link.href).toBeTruthy();
    expect(screen.getByText(copy.foot.body)).toBeTruthy();
    expect(screen.getByText(copy.order.illustrative)).toBeTruthy();
  });

  it("follows one wedding in real programme screens: desktops in a browser window, phones with their captions", () => {
    render(<WeddingsPage captures={captures} />);
    expect(screen.getAllByRole("img", {name: "Screen wedding-guests"}).length).toBe(1);
    expect(screen.getByText(`${brand.web.domain}${copy.follow.setUp.screen.address}`)).toBeTruthy();
    expect(screen.getByText(copy.follow.invite.screens[1].caption)).toBeTruthy();
    expect(screen.getByText(copy.follow.weekend.staff[2].detail ?? "")).toBeTruthy();
  });

  it("prices without numbers: headcount tiers, one marked, and Apply for a quote", () => {
    render(<WeddingsPage captures={captures} />);
    const pricing = within(screen.getByRole("region", {name: copy.pricing.title}));
    expect(pricing.getAllByText("Most pilots")).toHaveLength(1);
    expect(pricing.getByRole("link", {name: copy.pricing.action}).getAttribute("href")).toBe("#apply");
    expect(pricing.queryByText(/₹/u)).toBeNull();
  });

  it("shows step 1's errors on Continue, and hands it to the application page once complete", () => {
    render(<WeddingsPage captures={captures} />);
    const card = within(screen.getByRole("region", {name: one.title}));
    fireEvent.click(card.getByRole("button", {name: one.continue}));
    expect(card.getByText(one.who.error)).toBeTruthy();
    expect(card.getByText(one.name.error)).toBeTruthy();
    fillStepOne(card);
    const next = card.getByRole("link", {name: one.continue});
    expect(next.getAttribute("href")).toBe(weddingsApplyPath);
    fireEvent.click(next);
    expect(JSON.parse(window.sessionStorage.getItem("catch_weddings_application_step_one_v2") ?? "{}")).toMatchObject({who: stepOne.who, name: stepOne.name});
  });

  it("points regular hosts to the Catch Host free trial", () => {
    render(<WeddingsPage captures={captures} />);
    expect(screen.getByRole("link", {name: copy.pilot.hostingAction}).getAttribute("href")).toBe("/host/#start");
  });
});

describe("Catch for weddings application", {timeout: 20_000}, () => {
  it("asks for step 1 again when nothing was handed over, then moves to step 2 with the summary", () => {
    render(<WeddingsApplicationPage initialStepOne={null} />);
    expect(screen.getByRole("heading", {level: 1, name: one.title})).toBeTruthy();
    fillStepOne(within(screen.getByRole("region", {name: one.title})));
    fireEvent.click(screen.getByRole("button", {name: one.continue}));
    expect(screen.getByRole("heading", {level: 1, name: two.heading})).toBeTruthy();
    expect(screen.getByText("Udaipur · from 12 Dec · 150 to 400 guests")).toBeTruthy();
  });

  it("starts step 2 empty, shows what is required on Send, and keeps the consent line", () => {
    const sent: WeddingsApplication[] = [];
    render(<WeddingsApplicationPage initialStepOne={stepOne} submit={async (application) => {sent.push(application);}} />);
    for (const option of [...two.flying.options, ...two.heard.options]) {
      expect(screen.getByRole("radio", {name: option}).getAttribute("aria-checked")).toBe("false");
    }
    fireEvent.click(screen.getByRole("button", {name: two.send}));
    expect(screen.getByText(two.flying.error)).toBeTruthy();
    expect(screen.getByText(two.wants.error)).toBeTruthy();
    expect(screen.getByText(two.heard.error)).toBeTruthy();
    expect(sent).toHaveLength(0);
    expect(screen.getByText(two.consent)).toBeTruthy();
  });

  it("sends both steps through the submitter and shows the thanks, what was sent and the way back", async () => {
    const sent: WeddingsApplication[] = [];
    render(<WeddingsApplicationPage initialStepOne={stepOne} submit={async (application) => {sent.push(application);}} />);
    fireEvent.click(screen.getByRole("button", {name: two.fewer.replace("{unit}", two.functions.one)}));
    fireEvent.click(screen.getByRole("radio", {name: two.flying.options[2]}));
    fireEvent.click(screen.getByRole("button", {name: two.wants.options[5]}));
    fireEvent.click(screen.getByRole("radio", {name: two.heard.options[1]}));
    fireEvent.click(screen.getByRole("button", {name: two.send}));
    expect(await screen.findByRole("heading", {level: 1, name: copy.sent.heading})).toBeTruthy();
    expect(screen.getByRole("heading", {level: 2, name: "Thanks, Meher."})).toBeTruthy();
    expect(screen.getByText("4 functions · 2 hotels · a team of 24 · more than half flying in · wants: Door check-in")).toBeTruthy();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({who: stepOne.who, name: stepOne.name, destination: stepOne.destination, functions: 4, flying: two.flying.options[2]});
    fireEvent.click(screen.getByRole("button", {name: copy.sent.edit}));
    expect(screen.getByRole("heading", {level: 1, name: two.heading})).toBeTruthy();
  });

  it("shows the submitter's error and stays on step 2", async () => {
    render(<WeddingsApplicationPage initialStepOne={stepOne} submit={() => Promise.reject(new Error("Try again in a minute."))} />);
    fireEvent.click(screen.getByRole("radio", {name: two.flying.options[0]}));
    fireEvent.click(screen.getByRole("button", {name: two.wants.options[0]}));
    fireEvent.click(screen.getByRole("radio", {name: two.heard.options[0]}));
    fireEvent.click(screen.getByRole("button", {name: two.send}));
    expect((await screen.findByRole("alert")).textContent).toBe("Try again in a minute.");
    expect(screen.getByRole("heading", {level: 1, name: two.heading})).toBeTruthy();
  });
});
