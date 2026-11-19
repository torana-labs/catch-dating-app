import {describe, expect, it, vi} from "vitest";
import {
  eventFixtures,
  fixtureCaller,
  fixtureEventId,
  kitFixtures,
  organizerFixtures,
  scriptedTryItClient,
  workspaceFixtures,
} from "../../stories/fixtures/tryItCommands";
import {createTryItFlow, type TryItDraftEvent, type TryItFlowDeps} from "./tryItFlow";
import type {TryItToolKind} from "./tryItModel";

const link = "https://www.instagram.example/driftwoodbayrunners/";
/** A kit link as the command takes it. */
const kitLink = (name: string, kind: "channel" | "promoter", source?: string) => ({label: name, kind, ...(source ? {source} : {})});
const eventLink = "https://events.example/salt-air-social-run";

function flowWith(tool: TryItToolKind, client: ReturnType<typeof scriptedTryItClient>, extra: Partial<TryItFlowDeps> = {}) {
  let key = 0;
  const waits: number[] = [];
  const flow = createTryItFlow(tool, {
    client,
    newKey: () => `web_key${String(++key).padStart(12, "0")}`,
    wait: async (ms) => {waits.push(ms);},
    ...extra,
  });
  return {flow, waits, stage: () => flow.getState().stage};
}

describe("try-it flow: organiser import (Your page)", () => {
  it("previews, shows the summary, then applies with the same key and the preview's hash", async () => {
    const client = scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.previewed], apply: [organizerFixtures.applied]}});
    const {flow, stage} = flowWith("organizer", client);
    flow.setLink("driftwoodbayrunners.example");
    await flow.submit();
    expect(stage()).toMatchObject({name: "review", step: "organizer", summary: organizerFixtures.previewed.summary});
    await flow.confirm();
    expect(stage()).toMatchObject({name: "done", step: "organizer", summary: organizerFixtures.applied.summary});
    // The receipt keeps a short proposal: the result keeps the reviewed events.
    expect(stage().name === "done" && stage()).toMatchObject({proposal: {events: organizerFixtures.previewed.result.proposal.events}});
    expect(client.calls.map(({mode, idempotencyKey, previewHash, input}) => ({mode, idempotencyKey, previewHash, input}))).toEqual([
      {mode: "preview", idempotencyKey: "web_key000000000001", previewHash: undefined, input: {link: "https://driftwoodbayrunners.example/"}},
      {mode: "apply", idempotencyKey: "web_key000000000001", previewHash: organizerFixtures.previewed.previewHash, input: {link: "https://driftwoodbayrunners.example/"}},
    ]);
  });

  it("polls a running read with the same key until it is previewed", async () => {
    const client = scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.running, organizerFixtures.running, organizerFixtures.previewed]}});
    const {flow, waits, stage} = flowWith("organizer", client);
    const seen: string[] = [];
    flow.subscribe(() => seen.push(flow.getState().stage.name));
    flow.setLink(link);
    await flow.submit();
    expect(stage().name).toBe("review");
    expect(seen).toContain("working");
    expect(waits).toEqual([2000, 2000]);
    expect(new Set(client.calls.map((call) => call.idempotencyKey))).toEqual(new Set(["web_key000000000001"]));
    expect(client.calls).toHaveLength(3);
  });

  it("stops polling after its budget, and a retry picks the read up with the same key", async () => {
    const client = scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.running, organizerFixtures.running, organizerFixtures.previewed]}});
    let now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const {flow, stage} = flowWith("organizer", client, {pollBudgetMs: 1_000, wait: async () => {now += 5_000;}});
    flow.setLink(link);
    await flow.submit();
    expect(stage()).toMatchObject({name: "problem", reason: "slow"});
    await flow.retry();
    expect(stage().name).toBe("review");
    expect(new Set(client.calls.map((call) => call.idempotencyKey)).size).toBe(1);
    vi.restoreAllMocks();
  });

  it("sends an already listed organiser to claim", async () => {
    const client = scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.listed]}});
    const {flow, stage} = flowWith("organizer", client);
    flow.setLink(link);
    await flow.submit();
    expect(stage()).toMatchObject({name: "listed", match: organizerFixtures.listed.result.match});
  });

  it("previews again when apply says the page became a listing since the preview", async () => {
    const client = scriptedTryItClient({"organizer.import-from-link": {
      preview: [organizerFixtures.previewed, organizerFixtures.listed], apply: [{problem: "existing_listing"}]}});
    const {flow, stage} = flowWith("organizer", client);
    flow.setLink(link);
    await flow.submit();
    await flow.confirm();
    expect(stage().name).toBe("listed");
  });

  it("re-previews on aborted (changed since the preview) and applies the new hash with the same key", async () => {
    const client = scriptedTryItClient({"organizer.import-from-link": {
      preview: [organizerFixtures.previewed, organizerFixtures.previewedAgain], apply: [{problem: "changed"}, organizerFixtures.applied]}});
    const {flow, stage} = flowWith("organizer", client);
    flow.setLink(link);
    await flow.submit();
    await flow.confirm();
    expect(stage()).toMatchObject({name: "review", summary: organizerFixtures.previewedAgain.summary});
    await flow.confirm();
    expect(stage().name).toBe("done");
    const applies = client.calls.filter((call) => call.mode === "apply");
    expect(applies.map((call) => call.previewHash)).toEqual([organizerFixtures.previewed.previewHash, organizerFixtures.previewedAgain.previewHash]);
    expect(new Set(client.calls.map((call) => call.idempotencyKey)).size).toBe(1);
  });

  it("retries an apply whose outcome is unknown with the same key, so the server replays it", async () => {
    const client = scriptedTryItClient({"organizer.import-from-link": {
      preview: [organizerFixtures.previewed], apply: [{problem: "offline"}, {...organizerFixtures.applied, status: "replayed"}]}});
    const {flow, stage} = flowWith("organizer", client);
    flow.setLink(link);
    await flow.submit();
    await flow.confirm();
    expect(stage()).toMatchObject({name: "problem", reason: "offline"});
    await flow.retry();
    expect(stage().name).toBe("done");
    const applies = client.calls.filter((call) => call.mode === "apply");
    expect(applies).toHaveLength(2);
    expect(applies[0].idempotencyKey).toBe(applies[1].idempotencyKey);
    expect(applies[1].previewHash).toBe(organizerFixtures.previewed.previewHash);
  });

  it("starts a new key when the server says this one went with another request", async () => {
    const client = scriptedTryItClient({"organizer.import-from-link": {preview: [{problem: "key_reused"}, organizerFixtures.previewed]}});
    const {flow, stage} = flowWith("organizer", client);
    flow.setLink(link);
    await flow.submit();
    expect(stage().name).toBe("review");
    expect(client.calls.map((call) => call.idempotencyKey)).toEqual(["web_key000000000001", "web_key000000000002"]);
  });

  it("shows a refusal in the command's own words, and rate limits and other failures as problems", async () => {
    const refused = flowWith("organizer", scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.refused]}}));
    refused.flow.setLink(link);
    await refused.flow.submit();
    expect(refused.stage()).toEqual({name: "problem", reason: "refused", summary: organizerFixtures.refused.summary});
    const limited = flowWith("organizer", scriptedTryItClient({"organizer.import-from-link": {preview: [{problem: "rate_limited"}]}}));
    limited.flow.setLink(link);
    await limited.flow.submit();
    expect(limited.stage()).toEqual({name: "problem", reason: "rate_limited", summary: null});
    const unreadable = flowWith("organizer", scriptedTryItClient({"organizer.import-from-link": {preview: [{problem: "link_unreadable"}]}}));
    unreadable.flow.setLink(link);
    await unreadable.flow.submit();
    expect(unreadable.stage()).toMatchObject({name: "problem", reason: "link_unreadable"});
  });

  it("checks the link before calling anything, and a new link is a new request", async () => {
    const client = scriptedTryItClient({"organizer.import-from-link": {preview: [{problem: "link_unreadable"}, organizerFixtures.previewed]}});
    const {flow, stage} = flowWith("organizer", client);
    await flow.submit();
    expect(flow.getState().fields.link).toBe("linkRequired");
    flow.setLink("not a link");
    await flow.submit();
    expect(flow.getState().fields.link).toBe("linkInvalid");
    expect(client.calls).toHaveLength(0);
    flow.setLink(link);
    await flow.submit();
    flow.startOver();
    flow.setLink("https://driftwoodbayrunners.example/");
    await flow.submit();
    expect(stage().name).toBe("review");
    expect(client.calls.map((call) => call.idempotencyKey)).toEqual(["web_key000000000001", "web_key000000000002"]);
  });
});

describe("try-it flow: phone step and workspace", () => {
  it("asks for the brand, city and phone, opens the sign-in sheet, then ensures the workspace before the tool", async () => {
    const client = scriptedTryItClient({
      "workspace.ensure": {preview: [workspaceFixtures.previewNew], apply: [workspaceFixtures.applied]},
      "organizer.import-from-link": {preview: [organizerFixtures.previewed]},
    }, null);
    const {flow, stage} = flowWith("organizer", client);
    flow.setLink(link);
    await flow.submit();
    expect(stage().name).toBe("account");
    await flow.continueAccount();
    expect(flow.getState().fields).toEqual({brand: "brandRequired", city: "cityRequired"});
    flow.setBrand("  Driftwood   Bay Runners ");
    flow.setCity("in-mh-mumbai");
    await flow.continueAccount();
    expect(flow.getState().signIn).toBe(true);
    expect(client.calls).toHaveLength(0);
    client.setCaller(fixtureCaller);
    await flow.signedIn();
    expect(stage()).toEqual({name: "workspace", summary: workspaceFixtures.previewNew.summary});
    await flow.confirmWorkspace();
    expect(stage().name).toBe("review");
    const [preview, apply] = client.calls;
    expect(preview).toMatchObject({commandId: "workspace.ensure", mode: "preview", input: {organizerName: "Driftwood Bay Runners", marketId: "in-mh-mumbai"}});
    expect(apply).toMatchObject({commandId: "workspace.ensure", mode: "apply", idempotencyKey: preview.idempotencyKey,
      previewHash: workspaceFixtures.previewNew.previewHash});
  });

  it("uses an existing workspace as it is, without applying", async () => {
    const client = scriptedTryItClient({
      "workspace.ensure": {preview: [workspaceFixtures.previewExisting]},
      "organizer.import-from-link": {preview: [organizerFixtures.previewed]},
    }, null);
    const {flow, stage} = flowWith("organizer", client);
    flow.setLink(link);
    await flow.submit();
    flow.setBrand("Driftwood Bay Runners");
    flow.setCity("in-mh-mumbai");
    client.setCaller(fixtureCaller);
    await flow.continueAccount();
    expect(stage().name).toBe("review");
    expect(client.calls.some((call) => call.commandId === "workspace.ensure" && call.mode === "apply")).toBe(false);
  });

  it("goes to the profile step when a verified visitor's tool answers no_workspace, then previews the same link again", async () => {
    const client = scriptedTryItClient({
      "workspace.ensure": {preview: [workspaceFixtures.previewNew], apply: [workspaceFixtures.applied]},
      "organizer.import-from-link": {preview: [organizerFixtures.noWorkspace, organizerFixtures.previewed]},
    });
    const {flow, stage} = flowWith("organizer", client);
    flow.setLink(link);
    await flow.submit();
    expect(stage().name).toBe("account");
    flow.setBrand("Driftwood Bay Runners");
    flow.setCity("in-mh-mumbai");
    await flow.continueAccount();
    await flow.confirmWorkspace();
    expect(stage().name).toBe("review");
    const imports = client.calls.filter((call) => call.commandId === "organizer.import-from-link");
    expect(imports[0].idempotencyKey).toBe(imports[1].idempotencyKey);
  });

  it("names a city the workspace cannot open in", async () => {
    const client = scriptedTryItClient({"workspace.ensure": {preview: [{problem: "market_not_open"}]}}, null);
    const {flow, stage} = flowWith("organizer", client);
    flow.setLink(link);
    await flow.submit();
    expect(stage().name).toBe("account");
    flow.setBrand("Driftwood Bay Runners");
    flow.setCity("in-mh-mumbai");
    client.setCaller(fixtureCaller);
    await flow.continueAccount();
    expect(stage()).toMatchObject({name: "problem", reason: "market_not_open"});
  });

  it("returns to the phone step when a command says the phone is not verified", async () => {
    const client = scriptedTryItClient({"organizer.import-from-link": {preview: [{problem: "sign_in"}]}});
    const {flow, stage} = flowWith("organizer", client);
    flow.setLink(link);
    await flow.submit();
    expect(stage().name).toBe("account");
    expect(flow.getState().caller).toBeNull();
  });
});

describe("try-it flow: event import (Bookings and memberships)", () => {
  it("reads, lists the events (choose_event), previews the chosen one with the same key, then applies", async () => {
    const client = scriptedTryItClient({"event.import-from-link": {preview: [eventFixtures.running, eventFixtures.chooseEvent, eventFixtures.previewed],
      apply: [eventFixtures.applied]}});
    const remembered: TryItDraftEvent[] = [];
    const {flow, stage} = flowWith("event", client, {remembered: {read: () => null, write: (draft) => remembered.push(draft)}});
    flow.setLink(eventLink);
    await flow.submit();
    expect(stage()).toMatchObject({name: "choose", events: eventFixtures.chooseEvent.result.events});
    await flow.chooseEvent("wiSaltAirSocialRun");
    expect(stage()).toMatchObject({name: "review", step: "event"});
    await flow.confirm();
    expect(stage()).toMatchObject({name: "done", step: "event", draft: {eventId: fixtureEventId, name: "Salt Air Social Run"}});
    expect(remembered).toEqual([{uid: fixtureCaller.uid, eventId: fixtureEventId, name: "Salt Air Social Run", localDate: "2026-11-23", localStartTime: "06:30"}]);
    expect(client.calls.map((call) => [call.mode, call.idempotencyKey, call.input])).toEqual([
      ["preview", "web_key000000000001", {link: eventLink}],
      ["preview", "web_key000000000001", {link: eventLink}],
      ["preview", "web_key000000000001", {link: eventLink, eventKey: "wiSaltAirSocialRun"}],
      ["apply", "web_key000000000001", {link: eventLink, eventKey: "wiSaltAirSocialRun"}],
    ]);
    expect(client.calls[3].previewHash).toBe(eventFixtures.previewed.previewHash);
  });

  it("previews again when apply comes before the read is done", async () => {
    const client = scriptedTryItClient({"event.import-from-link": {preview: [eventFixtures.previewed, eventFixtures.previewed], apply: [{problem: "not_ready"}, eventFixtures.applied]}});
    const {flow, stage} = flowWith("event", client);
    flow.setLink(eventLink);
    await flow.submit();
    await flow.confirm();
    expect(stage().name).toBe("review");
    await flow.confirm();
    expect(stage().name).toBe("done");
  });
});

describe("try-it flow: promotion kit (Messages and growth)", () => {
  it("imports the event first, then lists the channels and people, previews and applies the kit", async () => {
    const client = scriptedTryItClient({
      "event.import-from-link": {preview: [eventFixtures.previewed], apply: [eventFixtures.applied]},
      "promotion.create-kit": {preview: [kitFixtures.previewed], apply: [kitFixtures.applied]},
    });
    const {flow, stage} = flowWith("kit", client);
    flow.setLink(eventLink);
    flow.setChannels("Instagram, run club WhatsApp, Kabir");
    await flow.submit();
    await flow.confirm();
    expect(stage()).toMatchObject({name: "channels", draft: {eventId: fixtureEventId}});
    flow.togglePerson("Kabir");
    await flow.makeLinks();
    expect(stage()).toMatchObject({name: "review", step: "kit"});
    await flow.confirm();
    expect(stage()).toMatchObject({name: "done", step: "kit", links: kitFixtures.applied.result.links});
    const kitCalls = client.calls.filter((call) => call.commandId === "promotion.create-kit");
    expect(kitCalls.map((call) => call.input)).toEqual([0, 1].map(() => ({eventId: fixtureEventId, links: [
      kitLink("Instagram", "channel", "instagram"), kitLink("run club WhatsApp", "channel", "whatsapp"), kitLink("Kabir", "promoter"),
    ]})));
    expect(kitCalls[1]).toMatchObject({mode: "apply", idempotencyKey: kitCalls[0].idempotencyKey, previewHash: kitFixtures.previewed.previewHash});
  });

  it("uses this tab's draft event, and asks again for repeated or too many places", async () => {
    const draft = {uid: fixtureCaller.uid, eventId: fixtureEventId, name: "Salt Air Social Run", localDate: "2026-11-23", localStartTime: "06:30"};
    const client = scriptedTryItClient({"promotion.create-kit": {preview: [kitFixtures.duplicate, kitFixtures.previewed]}});
    const {flow, stage} = flowWith("kit", client, {remembered: {read: () => draft, write: () => undefined}});
    expect(flow.getState().remembered).toEqual(draft);
    await flow.useRemembered();
    expect(stage()).toMatchObject({name: "channels", draft});
    await flow.makeLinks();
    expect(flow.getState().fields.channels).toBe("channelsRequired");
    flow.setChannels("a, b, c, d, e, f, g, h, i");
    await flow.makeLinks();
    expect(flow.getState().fields.channels).toBe("channelsTooMany");
    flow.setChannels("Instagram, instagram");
    await flow.makeLinks();
    expect(flow.getState().fields.channels).toBe("channelsDuplicate");
    flow.setChannels("Instagram, Kabir");
    await flow.makeLinks();
    expect(flow.getState().fields.channels).toBe("channelsDuplicate");
    await flow.makeLinks();
    expect(stage().name).toBe("review");
    expect(client.calls.every((call) => call.commandId === "promotion.create-kit")).toBe(true);
  });

  it("ignores a remembered draft from another account", async () => {
    const draft = {uid: "someoneElse", eventId: fixtureEventId, name: "Salt Air Social Run", localDate: "2026-11-23", localStartTime: "06:30"};
    const {flow, stage} = flowWith("kit", scriptedTryItClient({}), {remembered: {read: () => draft, write: () => undefined}});
    await flow.useRemembered();
    expect(stage().name).toBe("start");
    expect(flow.getState().remembered).toBeNull();
  });
});

describe("try-it flow: lifetime", () => {
  it("resumes after a dispose, as React's StrictMode mounts a component twice, and drops calls from before", async () => {
    const client = scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.previewed]}});
    const {flow, stage} = flowWith("organizer", client);
    flow.dispose();
    flow.resume();
    flow.setLink(link);
    await flow.submit();
    expect(stage().name).toBe("review");
  });
});

describe("try-it flow: unexpected failures", () => {
  it("stops with a plain failure instead of staying busy when a step throws", async () => {
    const client = scriptedTryItClient({});
    const flow = createTryItFlow("organizer", {client, newKey: () => {throw new Error("no crypto");}});
    flow.setLink(link);
    await flow.submit();
    expect(flow.getState()).toMatchObject({busy: false, stage: {name: "problem", reason: "failed"}});
  });
});
