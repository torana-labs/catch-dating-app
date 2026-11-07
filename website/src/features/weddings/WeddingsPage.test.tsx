import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {weddingsApplyPath, weddingsCopy as copy} from "@content/weddings";
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
  name: one.name.hint, company: one.company.hint, phone: one.phone.hint, date: "2026-12-12",
  destination: one.destination.hint, guests: one.guests.initial, tools: one.tools.initial,
};

function fillStepOne(scope: ReturnType<typeof within>) {
  fireEvent.change(scope.getByLabelText(one.name.label), {target: {value: stepOne.name}});
  fireEvent.change(scope.getByLabelText(one.company.label), {target: {value: stepOne.company}});
  fireEvent.change(scope.getByLabelText(one.phone.label), {target: {value: stepOne.phone}});
  fireEvent.change(scope.getByLabelText(one.date.label), {target: {value: stepOne.date}});
  fireEvent.change(scope.getByLabelText(one.destination.label), {target: {value: stepOne.destination}});
}

describe("Catch for weddings", {timeout: 20_000}, () => {
  it("renders the board's bands in order under the site top bar naming the product", () => {
    const {container} = render(<WeddingsPage />);
    const banner = within(screen.getByRole("banner"));
    expect(banner.getByRole("link", {name: copy.header.title}).getAttribute("href")).toBe("/");
    expect(banner.getAllByRole("link", {name: copy.header.apply})[0].getAttribute("href")).toBe("#apply");
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe(copy.hero.title);
    const bands: string[] = [copy.problem.title, copy.follow.title, copy.team.title, copy.messages.title, copy.family.title, copy.pricing.title,
      copy.pilot.title, copy.faq.title];
    const headings = screen.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent ?? "");
    expect(headings.filter((heading) => bands.includes(heading))).toEqual(bands);
    for (const link of copy.header.nav) expect(container.querySelector(link.href), link.href).toBeTruthy();
    expect(screen.getByText(copy.foot.body)).toBeTruthy();
    expect(screen.getByText(copy.hero.illustrative)).toBeTruthy();
  });

  it("marks the most common pricing tier and draws every household's replies", () => {
    render(<WeddingsPage />);
    expect(screen.getAllByText(copy.pricing.popular)).toHaveLength(1);
    const table = within(screen.getByRole("table", {name: copy.follow.setUp.card.tableLabel}));
    expect(table.getByText("The Kapoors")).toBeTruthy();
    expect(table.getAllByText(copy.follow.setUp.card.replies.maybe)).toHaveLength(2);
  });

  it("hands step 1 to the application page only once it is complete", () => {
    render(<WeddingsPage />);
    const card = within(screen.getByRole("region", {name: one.title}));
    expect(card.queryByRole("link", {name: one.continue})).toBeNull();
    fillStepOne(card);
    const next = card.getByRole("link", {name: one.continue});
    expect(next.getAttribute("href")).toBe(weddingsApplyPath);
    fireEvent.click(next);
    expect(JSON.parse(window.sessionStorage.getItem("catch_weddings_application_step_one_v1") ?? "{}")).toMatchObject({name: stepOne.name, phone: stepOne.phone});
  });
});

describe("Catch for weddings application", {timeout: 20_000}, () => {
  it("asks for step 1 again when nothing was handed over, then moves to step 2", () => {
    render(<WeddingsApplicationPage initialStepOne={null} />);
    fillStepOne(within(screen.getByRole("region", {name: one.title})));
    fireEvent.click(screen.getByRole("button", {name: one.continue}));
    expect(screen.getByRole("heading", {level: 1, name: two.title})).toBeTruthy();
    expect(screen.getByText("Udaipur · from 12 Dec · 150 to 400 guests")).toBeTruthy();
  });

  it("keeps Send disabled while no intake front door is wired", () => {
    render(<WeddingsApplicationPage initialStepOne={stepOne} />);
    expect((screen.getByRole("button", {name: two.send}) as HTMLButtonElement).disabled).toBe(true);
  });

  it("sends both steps through the submitter and shows what happens next", async () => {
    const sent: WeddingsApplication[] = [];
    render(<WeddingsApplicationPage initialStepOne={stepOne} submit={async (application) => {sent.push(application);}} />);
    fireEvent.click(screen.getByRole("button", {name: copy.stepTwo.fewer.replace("{unit}", two.functions.unit)}));
    fireEvent.click(screen.getByRole("button", {name: two.wants.options[5]}));
    fireEvent.click(screen.getByRole("button", {name: two.send}));
    expect(await screen.findByText(copy.sent.badge)).toBeTruthy();
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe("Thanks, Meher.");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({name: stepOne.name, destination: stepOne.destination, functions: 4, hotels: two.hotels.initial});
    expect(sent[0].wants).toContain(two.wants.options[5]);
  });

  it("shows the submitter's error and stays on step 2", async () => {
    render(<WeddingsApplicationPage initialStepOne={stepOne} submit={() => Promise.reject(new Error("Try again in a minute."))} />);
    fireEvent.click(screen.getByRole("button", {name: two.send}));
    expect((await screen.findByRole("alert")).textContent).toBe("Try again in a minute.");
    expect(screen.getByRole("heading", {level: 1, name: two.title})).toBeTruthy();
  });
});
