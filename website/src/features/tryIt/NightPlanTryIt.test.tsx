import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render as renderInto, screen, waitFor, within} from "@testing-library/react";
import {StrictMode} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {eventRuntimeSocialMissionCopy} from "@content/eventRuntime";
import {nightPlanTryItCopy as copy} from "@content/nightPlanTryIt";
import {tryItCopy} from "@content/tryIt";
import type {PlaybookLeadForm} from "../../content/playbook/playbookContract";
import {fixtureCaller, fixtureEventId, fixtureOrganizerId, scriptedTryItClient} from "../../stories/fixtures/tryItCommands";
import {fixtureRehearsalUrl, nightPlanFixtures} from "../../stories/fixtures/nightPlanCommands";
import type {NightRehearsalStart} from "./nightPlanFlow";
import {nightPlanTryItNode} from "./NightPlanTryIt";
import {provideNightPlanDeps, type NightPlanDeps} from "./useNightPlanController";

vi.mock("../../firebase", () => ({getWebsiteAppCheckToken: vi.fn(async () => "site-token")}));

afterEach(cleanup);

const form: PlaybookLeadForm = {id: "try_night", requestKind: "tool", input: "text", label: "Your format", submitLabel: "Plan my night",
  note: "Private to you. Takes a minute."};
const draft = {uid: fixtureCaller.uid, eventId: fixtureEventId, name: "Salt Air Social Run", localDate: "2026-11-23", localStartTime: "06:30"};

/** StrictMode mounts the tool twice, as in development; the sign-in sheet's controller needs the query client. */
function render(deps: NightPlanDeps): void {
  renderInto(<StrictMode><QueryClientProvider client={new QueryClient()}>
    {provideNightPlanDeps(deps, nightPlanTryItNode({form, pageId: "product_room", sectionId: "try"}))}
  </QueryClientProvider></StrictMode>);
}

async function planNight(format: string, guests: string) {
  fireEvent.change(screen.getByRole("combobox", {name: /Your format/u}), {target: {value: format}});
  fireEvent.change(screen.getByRole("textbox", {name: new RegExp(copy.guests, "u")}), {target: {value: guests}});
  fireEvent.click(screen.getByRole("button", {name: "Plan my night"}));
}

describe("plan-a-night tool", () => {
  it("asks for a format and a head count, with the form's words", () => {
    render({client: scriptedTryItClient({})});
    expect(screen.getByRole("heading", {name: copy.title})).toBeTruthy();
    expect(screen.getByRole("form", {name: copy.title})).toBeTruthy();
    expect(screen.getByText(form.note!)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Plan my night"}));
    expect(screen.getByText(copy.formatRequired)).toBeTruthy();
    expect(screen.getByText(copy.guestsInvalid)).toBeTruthy();
  });

  it("draws the plan of a refused preview: labels as sent, null paces, the run of show, the missions and why it can't be saved", async () => {
    render({client: scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.refusedNoDraft]}})});
    await planNight("run", "32");
    expect(await screen.findByRole("heading", {name: "Run for 32"})).toBeTruthy();
    expect(screen.getByText("4 pace groups")).toBeTruthy();
    expect(screen.getByText("~5:30/km · Pace group 2 · Pace group 3 · Pace group 4")).toBeTruthy();
    expect(screen.getByText(copy.groups.paceUnset)).toBeTruthy();
    expect(screen.getByText("15 minutes set aside for people to mix.")).toBeTruthy();
    expect(screen.getByText("The run")).toBeTruthy();
    expect(screen.getByText("80 minutes in all")).toBeTruthy();
    expect(screen.getByText(copy.missions.title)).toBeTruthy();
    expect(screen.getByText(eventRuntimeSocialMissionCopy.prompts["pacePods.light"])).toBeTruthy();
    expect(screen.getByText(copy.save.refusals.no_draft_event)).toBeTruthy();
    // No draft in this tab: nothing to save to.
    expect(screen.queryByRole("button", {name: copy.save.action})).toBeNull();
    expect(screen.getByRole("button", {name: copy.rehearsal.action})).toBeTruthy();
  });

  it("says when the plan hit its 200-group limit, and leaves out a mission with no words here", async () => {
    render({client: scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.courtsLimited]}})});
    await planNight("courts", "1000");
    expect(await screen.findByText("200 courts, 4 players on each")).toBeTruthy();
    expect(screen.getByText("200 waiting their turn on the bench")).toBeTruthy();
    expect(screen.getByText(copy.groups.countLimitedCourts)).toBeTruthy();
    expect(screen.getByText("More than this format works best for: 8 to 64 guests.")).toBeTruthy();
    expect(screen.getByText(copy.missions.titleSome)).toBeTruthy();
    expect(screen.queryByText(copy.missions.title)).toBeNull();
    expect(screen.queryByText(/courtside/u)).toBeNull();
    expect(screen.getByText(eventRuntimeSocialMissionCopy.prompts["shared.personal"])).toBeTruthy();
  });

  it("starts a practice session with a friend and shows its link and QR code", async () => {
    const rehearse = vi.fn<NightRehearsalStart>(async () => ({ok: true, guestUrl: fixtureRehearsalUrl}));
    render({client: scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.previewed]}}), rehearse, seed: () => 9});
    await planNight("run", "32");
    fireEvent.click(await screen.findByRole("button", {name: copy.rehearsal.action}));
    expect(await screen.findByRole("heading", {name: copy.rehearsal.readyTitle})).toBeTruthy();
    expect(screen.getByRole("link", {name: copy.rehearsal.open}).getAttribute("href")).toBe(fixtureRehearsalUrl);
    expect(screen.getByRole("img", {name: copy.rehearsal.qr})).toBeTruthy();
    expect(rehearse).toHaveBeenCalledTimes(1);
    expect(rehearse.mock.calls[0][0]).toMatchObject({organizerId: fixtureOrganizerId, sourceEventId: null, guestSource: "simulated",
      scenarioId: "smoothRun", seed: 9, setup: nightPlanFixtures.previewed.result.rehearsalSetup});
  });

  it("saves the plan to this tab's draft, and says plainly when the draft has a different activity", async () => {
    const client = scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.previewed], apply: [nightPlanFixtures.formatMismatch, nightPlanFixtures.applied]}});
    render({client, remembered: {read: () => draft, write: () => undefined}});
    await planNight("run", "32");
    expect(await screen.findByText(`Saves this plan on your draft “${draft.name}”. It stays private until you publish it.`)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: copy.save.action}));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(copy.save.refusals.event_format_mismatch)).toBeTruthy();
    expect(screen.getByRole("heading", {name: "Run for 32"})).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: copy.save.action}));
    expect(await screen.findByRole("heading", {name: `Saved on your draft “${draft.name}”.`})).toBeTruthy();
    await waitFor(() => expect(client.calls.filter((call) => call.mode === "apply")).toHaveLength(2));
    expect(client.calls.find((call) => call.mode === "apply")).toMatchObject({input: {format: "run", guestCount: 32, eventId: fixtureEventId},
      previewHash: nightPlanFixtures.previewed.previewHash});
  });

  it("asks a visitor with no verified phone for their brand and city first", async () => {
    render({client: scriptedTryItClient({}, null)});
    await planNight("dinner", "24");
    expect(await screen.findByRole("heading", {name: tryItCopy.account.title})).toBeTruthy();
    expect(screen.getByRole("button", {name: tryItCopy.account.continueWithPhone})).toBeTruthy();
  });
});
