import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render as renderInto, screen, waitFor, within} from "@testing-library/react";
import {StrictMode, type ReactNode} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {tryItCopy} from "@content/tryIt";
import {eventFixtures, fixtureEventId, kitFixtures, organizerFixtures, scriptedTryItClient} from "../../stories/fixtures/tryItCommands";
import {loadPlaybookPage, resolvePlaybookPage} from "./playbookPages";
import {PlaybookPage} from "./PlaybookPage";
import {provideTryItDeps} from "../tryIt/useTryItToolController";

vi.mock("../../firebase", () => ({getWebsiteAppCheckToken: vi.fn(async () => "site-token")}));

afterEach(cleanup);

/** Both site shells mount the query client the sign-in sheet's controller uses; StrictMode mounts each tool twice, as in development. */
const render = (node: ReactNode) => renderInto(<StrictMode><QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider></StrictMode>);

const yourPage = (await loadPlaybookPage(resolvePlaybookPage("/product/your-page/")!))!;
const bookings = (await loadPlaybookPage(resolvePlaybookPage("/product/bookings-and-memberships/")!))!;
const messages = (await loadPlaybookPage(resolvePlaybookPage("/product/messages-and-growth/")!))!;
const eventTool = (await loadPlaybookPage(resolvePlaybookPage("/tools/event-page-from-link/")!))!;

describe("try-it tool on a product page", () => {
  it("draws Your page's tool in the try band and the closing band, and links the hero to it", () => {
    render(<PlaybookPage captures={{}} page={yourPage} />);
    const band = within(document.getElementById("try")!);
    expect(band.getByRole("heading", {name: tryItCopy.tools.organizer.title})).toBeTruthy();
    expect(band.getByRole("form", {name: tryItCopy.tools.organizer.title})).toBeTruthy();
    expect(within(document.getElementById("start")!).getByRole("form", {name: "Build my page"})).toBeTruthy();
    expect(within(document.getElementById("top")!).getByRole("link", {name: "Build it from your Instagram"}).getAttribute("href")).toBe("#try");
  });

  it.each([["Bookings", bookings], ["the event page tool", eventTool]] as const)("draws the event tool in %s' try band, with no other tool", (_name, page) => {
    render(<PlaybookPage captures={{}} page={page} />);
    const band = within(document.getElementById("try")!);
    expect(band.getByRole("form", {name: tryItCopy.tools.event.title})).toBeTruthy();
    expect(screen.queryByRole("form", {name: tryItCopy.tools.organizer.title})).toBeNull();
    expect(within(document.getElementById("top")!).getAllByRole("link").some((link) => link.getAttribute("href") === "#try")).toBe(true);
  });

  it("runs Bookings' event import to a private draft, and its closing band holds the same tool", async () => {
    const client = scriptedTryItClient({"event.import-from-link": {preview: [eventFixtures.previewed], apply: [eventFixtures.applied]}});
    render(provideTryItDeps({client, wait: async () => undefined}, <PlaybookPage captures={{}} page={bookings} />));
    expect(within(document.getElementById("start")!).getByRole("form", {name: "Build my event page"})).toBeTruthy();
    const band = within(document.getElementById("try")!);
    fireEvent.change(band.getByRole("textbox", {name: /Link to an event/u}), {target: {value: "events.example/salt-air-social-run"}});
    fireEvent.click(band.getByRole("button", {name: "Build my event page"}));
    expect(await band.findByText(eventFixtures.previewed.summary.headline)).toBeTruthy();
    fireEvent.click(band.getByRole("button", {name: tryItCopy.tools.event.confirm}));
    expect(await band.findByText(eventFixtures.applied.summary.headline)).toBeTruthy();
    expect(band.getByText(tryItCopy.tools.event.draft.status)).toBeTruthy();
    expect(client.calls.map((call) => call.input)).toEqual([0, 1].map(() => ({link: "https://events.example/salt-air-social-run"})));
  });

  it("brings the event over before Messages' kit makes a tracked link for each place", async () => {
    const client = scriptedTryItClient({
      "event.import-from-link": {preview: [eventFixtures.previewed], apply: [eventFixtures.applied]},
      "promotion.create-kit": {preview: [kitFixtures.previewed], apply: [kitFixtures.applied]},
    });
    render(provideTryItDeps({client, wait: async () => undefined}, <PlaybookPage captures={{}} page={messages} />));
    const band = within(document.getElementById("try")!);
    fireEvent.change(band.getByRole("textbox", {name: /Your event link/u}), {target: {value: "events.example/salt-air-social-run"}});
    fireEvent.change(band.getByRole("textbox", {name: new RegExp(tryItCopy.tools.kit.channels, "u")}), {target: {value: "Instagram, run club WhatsApp, Kabir"}});
    fireEvent.click(band.getByRole("button", {name: "Make my links"}));
    fireEvent.click(await band.findByRole("button", {name: tryItCopy.tools.event.confirm}));
    fireEvent.click(await band.findByRole("button", {name: tryItCopy.tools.kit.makeLinks}));
    expect(await band.findByText(kitFixtures.previewed.summary.headline)).toBeTruthy();
    fireEvent.click(band.getByRole("button", {name: tryItCopy.tools.kit.confirm}));
    expect(await band.findByText(kitFixtures.applied.summary.headline)).toBeTruthy();
    expect(client.calls.map((call) => call.commandId)).toEqual(["event.import-from-link", "event.import-from-link", "promotion.create-kit", "promotion.create-kit"]);
    expect(client.calls[2].input).toMatchObject({eventId: fixtureEventId});
    for (const link of kitFixtures.applied.result.links) expect(band.getByText(link.url)).toBeTruthy();
  });

  it("runs the organiser import from the try band: preview, the summary, then apply and the claim step", async () => {
    const client = scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.previewed], apply: [organizerFixtures.applied]}});
    render(provideTryItDeps({client, newKey: () => "web_key000000000001", wait: async () => undefined}, <PlaybookPage captures={{}} page={yourPage} />));
    const band = within(document.getElementById("try")!);
    fireEvent.change(band.getByRole("textbox", {name: /Your Instagram, Luma or website/u}), {target: {value: "@driftwoodbayrunners"}});
    fireEvent.click(band.getByRole("button", {name: "Build my page"}));
    expect(await band.findByText(organizerFixtures.previewed.summary.headline)).toBeTruthy();
    expect(band.getByText(tryItCopy.review.note)).toBeTruthy();
    fireEvent.click(band.getByRole("button", {name: tryItCopy.tools.organizer.confirm}));
    expect(await band.findByText(organizerFixtures.applied.summary.headline)).toBeTruthy();
    expect(band.getByText(tryItCopy.nothingLive)).toBeTruthy();
    expect(band.getByRole("heading", {name: tryItCopy.claimInHost.title})).toBeTruthy();
    await waitFor(() => expect(client.calls).toHaveLength(2));
    expect(client.calls[0].input).toEqual({link: "https://www.instagram.com/driftwoodbayrunners/"});
  });

  it("sends an already listed organiser to the claim page", async () => {
    const client = scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.listed]}});
    render(provideTryItDeps({client, wait: async () => undefined}, <PlaybookPage captures={{}} page={yourPage} />));
    const band = within(document.getElementById("try")!);
    fireEvent.change(band.getByRole("textbox", {name: /Your Instagram, Luma or website/u}), {target: {value: "lanternlane.example"}});
    fireEvent.click(band.getByRole("button", {name: "Build my page"}));
    const claim = await band.findByRole("link", {name: tryItCopy.listed.claim});
    expect(claim.getAttribute("href")).toBe("/claim/?organizerId=orgLanternLane");
  });

  it("asks a visitor with no verified phone for their brand and city first", async () => {
    const client = scriptedTryItClient({}, null);
    render(provideTryItDeps({client}, <PlaybookPage captures={{}} page={yourPage} />));
    const band = within(document.getElementById("try")!);
    fireEvent.change(band.getByRole("textbox", {name: /Your Instagram, Luma or website/u}), {target: {value: "driftwoodbayrunners.example"}});
    fireEvent.click(band.getByRole("button", {name: "Build my page"}));
    expect(await band.findByRole("heading", {name: tryItCopy.account.title})).toBeTruthy();
    expect(band.getByRole("textbox", {name: new RegExp(tryItCopy.account.brand, "u")})).toBeTruthy();
    expect(band.getByRole("combobox", {name: new RegExp(tryItCopy.account.city, "u")})).toBeTruthy();
    expect(band.getByRole("button", {name: tryItCopy.account.continueWithPhone})).toBeTruthy();
  });
});
