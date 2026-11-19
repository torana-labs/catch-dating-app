import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render as renderInto, screen, waitFor, within} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {tryItCopy} from "@content/tryIt";
import {organizerFixtures, scriptedTryItClient} from "../../stories/fixtures/tryItCommands";
import {loadPlaybookPage, resolvePlaybookPage} from "./playbookPages";
import {PlaybookPage} from "./PlaybookPage";
import {provideTryItDeps} from "../tryIt/useTryItToolController";

vi.mock("../../firebase", () => ({getWebsiteAppCheckToken: vi.fn(async () => "site-token")}));

afterEach(cleanup);

/** Both site shells mount the query client the sign-in sheet's controller uses. */
const render = (node: ReactNode) => renderInto(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>);

const yourPage = (await loadPlaybookPage(resolvePlaybookPage("/product/your-page/")!))!;
const bookings = (await loadPlaybookPage(resolvePlaybookPage("/product/bookings-and-memberships/")!))!;

describe("try-it tool on a product page", () => {
  it("draws Your page's tool in the try band and the closing band, and links the hero to it", () => {
    render(<PlaybookPage captures={{}} page={yourPage} />);
    const band = within(document.getElementById("try")!);
    expect(band.getByRole("heading", {name: tryItCopy.tools.organizer.title})).toBeTruthy();
    expect(band.getByRole("form", {name: tryItCopy.tools.organizer.title})).toBeTruthy();
    expect(within(document.getElementById("start")!).getByRole("form", {name: "Build my page"})).toBeTruthy();
    expect(within(document.getElementById("top")!).getByRole("link", {name: "Build it from your Instagram"}).getAttribute("href")).toBe("#try");
  });

  it("keeps Bookings' tool hidden until its command is in production", () => {
    render(<PlaybookPage captures={{}} page={bookings} />);
    expect(document.getElementById("try")).toBeNull();
    expect(screen.queryByRole("form", {name: "Build my event page"})).toBeNull();
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
