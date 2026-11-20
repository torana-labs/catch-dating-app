import Ajv from "ajv";
import addFormats from "ajv-formats";
import {readFileSync} from "node:fs";
import path from "node:path";
import {describe, expect, it, vi} from "vitest";
import {fixtureCaller, fixtureEventId, fixtureOrganizerId, scriptedTryItClient, workspaceFixtures} from "../../stories/fixtures/tryItCommands";
import {fixtureRehearsalUrl, nightPlanFixtures} from "../../stories/fixtures/nightPlanCommands";
import {createNightPlanFlow, type NightPlanFlowDeps, type NightRehearsalStart} from "./nightPlanFlow";

const contracts = path.resolve(__dirname, "../../../../contracts");
const ajv = new Ajv({allErrors: true, strict: false, validateSchema: false});
addFormats(ajv);
for (const file of ["command_envelope.schema.json", "event_common.schema.json", "profile_common.schema.json", "event_rehearsal_common.schema.json"]) {
  ajv.addSchema(JSON.parse(readFileSync(path.join(contracts, "shared", file), "utf8")));
}
const schema = (file: string) => ajv.compile(JSON.parse(readFileSync(path.join(contracts, "..", file), "utf8")));

const draft = {uid: fixtureCaller.uid, eventId: fixtureEventId, name: "Salt Air Social Run", localDate: "2026-11-23", localStartTime: "06:30"};

function flowWith(client: ReturnType<typeof scriptedTryItClient>, extra: Partial<NightPlanFlowDeps> = {}) {
  let key = 0;
  const rehearse = vi.fn<NightRehearsalStart>(async () => ({ok: true, guestUrl: fixtureRehearsalUrl}));
  const flow = createNightPlanFlow({
    client,
    rehearse,
    newKey: () => `web_key${String(++key).padStart(12, "0")}`,
    seed: () => 42,
    ...extra,
  });
  return {flow, rehearse, state: () => flow.getState(), stage: () => flow.getState().stage};
}

async function plan(flow: ReturnType<typeof flowWith>["flow"], format = "run", guests = "32") {
  flow.setFormat(format);
  flow.setGuests(guests);
  await flow.submit();
}

describe("plan-a-night flow", () => {
  it("uses fixture envelopes night.plan's response schema accepts", () => {
    const validate = schema("contracts/callable_responses/plan_night_response.schema.json");
    for (const [name, fixture] of Object.entries(nightPlanFixtures)) expect(validate(fixture), `${name}: ${JSON.stringify(validate.errors)}`).toBe(true);
  });

  it("asks for a format and a head count night.plan takes before calling anything", async () => {
    const client = scriptedTryItClient({});
    const {flow, state} = flowWith(client);
    await flow.submit();
    expect(state().fields).toEqual({format: "formatRequired", guests: "guestsInvalid"});
    flow.setFormat("karaoke");
    flow.setGuests("1001");
    await flow.submit();
    expect(state().fields).toEqual({format: "formatRequired", guests: "guestsInvalid"});
    expect(client.calls).toHaveLength(0);
  });

  it("previews the plan for a verified visitor and shows it", async () => {
    const client = scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.previewed]}});
    const {flow, stage} = flowWith(client);
    await plan(flow);
    expect(stage()).toMatchObject({name: "plan", status: "previewed", plan: nightPlanFixtures.previewed.result.plan, organizerId: fixtureOrganizerId});
    expect(client.calls).toEqual([{commandId: "night.plan", mode: "preview", idempotencyKey: "web_key000000000001", input: {format: "run", guestCount: 32}}]);
  });

  it("draws the plan of a refused answer too, with its reasons", async () => {
    const client = scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.refusedNoDraft]}});
    const {flow, stage} = flowWith(client);
    await plan(flow);
    expect(stage()).toMatchObject({name: "plan", status: "refused", reasons: ["no_draft_event"], plan: nightPlanFixtures.refusedNoDraft.result.plan});
  });

  it("stops on a refusal with no plan, in the server's words", async () => {
    const refused = {...nightPlanFixtures.refusedNoDraft, result: {...nightPlanFixtures.refusedNoDraft.result, plan: null, rehearsalSetup: null}};
    const {flow, stage} = flowWith(scriptedTryItClient({"night.plan": {preview: [refused]}}));
    await plan(flow);
    expect(stage()).toEqual({name: "problem", reason: "refused", summary: refused.summary});
  });

  it("sends a visitor with no profile through the phone step and workspace.ensure, then plans with the same key", async () => {
    const client = scriptedTryItClient({
      "night.plan": {preview: [nightPlanFixtures.noWorkspace, nightPlanFixtures.previewed]},
      "workspace.ensure": {preview: [workspaceFixtures.previewNew], apply: [workspaceFixtures.applied]},
    });
    const {flow, stage} = flowWith(client);
    await plan(flow);
    expect(stage()).toEqual({name: "account"});
    flow.setBrand("Driftwood Bay Runners");
    flow.setCity("in-mh-mumbai");
    await flow.continueAccount();
    expect(stage()).toMatchObject({name: "workspace", summary: workspaceFixtures.previewNew.summary});
    await flow.confirmWorkspace();
    expect(stage()).toMatchObject({name: "plan", status: "previewed"});
    expect(client.calls.map((call) => `${call.commandId}:${call.mode}`)).toEqual([
      "night.plan:preview", "workspace.ensure:preview", "workspace.ensure:apply", "night.plan:preview",
    ]);
    expect(client.calls[0].idempotencyKey).toBe(client.calls[3].idempotencyKey);
    expect(client.calls[2].previewHash).toBe(workspaceFixtures.previewNew.previewHash);
  });

  it("asks a visitor with no verified phone for the account step first", async () => {
    const client = scriptedTryItClient({}, null);
    const {flow, stage} = flowWith(client);
    await plan(flow);
    expect(stage()).toEqual({name: "account"});
    flow.setBrand("Driftwood Bay Runners");
    flow.setCity("in-mh-mumbai");
    await flow.continueAccount();
    expect(flow.getState().signIn).toBe(true);
    expect(client.calls).toHaveLength(0);
  });

  it("starts a practice session from the plan's rehearsal setup and keeps its guest link", async () => {
    const client = scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.previewed]}});
    const {flow, rehearse, state} = flowWith(client);
    await plan(flow);
    await flow.tryWithFriend();
    expect(rehearse).toHaveBeenCalledTimes(1);
    const [payload] = rehearse.mock.calls[0];
    expect(payload).toEqual({organizerId: fixtureOrganizerId, sourceEventId: null, scenarioId: "smoothRun", seed: 42, actorCount: 32,
      setup: nightPlanFixtures.previewed.result.rehearsalSetup, guestSource: "simulated", startImmediately: true});
    const validate = schema("contracts/callables/create_event_rehearsal_payload.schema.json");
    expect(validate(payload), JSON.stringify(validate.errors)).toBe(true);
    expect(state().rehearsal).toEqual({name: "ready", guestUrl: fixtureRehearsalUrl});
  });

  it("names a practice session that could not start, and keeps the plan", async () => {
    const {flow, state} = flowWith(scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.previewed]}}),
      {rehearse: async () => ({ok: false, problem: "rate_limited"})});
    await plan(flow);
    await flow.tryWithFriend();
    expect(state().rehearsal).toEqual({name: "problem", problem: "rate_limited"});
    expect(state().stage.name).toBe("plan");
  });

  it("plans for this tab's draft and saves to it with the same key and the preview's hash", async () => {
    const client = scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.previewed], apply: [nightPlanFixtures.applied]}});
    const {flow, state} = flowWith(client, {remembered: {read: () => draft, write: () => undefined}});
    await plan(flow);
    expect(state().draft).toEqual(draft);
    await flow.save();
    expect(state().save).toEqual({name: "saved", summary: nightPlanFixtures.applied.summary});
    const [preview, apply] = client.calls;
    expect(preview.input).toEqual({format: "run", guestCount: 32, eventId: fixtureEventId});
    expect(apply).toMatchObject({mode: "apply", idempotencyKey: preview.idempotencyKey, input: preview.input,
      previewHash: nightPlanFixtures.previewed.previewHash});
  });

  it("says plainly when the draft already has a different activity, and keeps the plan on screen", async () => {
    const client = scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.previewed], apply: [nightPlanFixtures.formatMismatch]}});
    const {flow, state} = flowWith(client, {remembered: {read: () => draft, write: () => undefined}});
    await plan(flow);
    await flow.save();
    expect(state().save).toMatchObject({name: "refused", reasons: ["event_format_mismatch"]});
    expect(state().stage).toMatchObject({name: "plan", status: "previewed"});
  });

  it("offers no save without a draft from this account, and ignores another account's draft", async () => {
    const client = scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.previewed]}});
    const {flow, state} = flowWith(client, {remembered: {read: () => ({...draft, uid: "someoneElse"}), write: () => undefined}});
    await plan(flow);
    expect(state().draft).toBeNull();
    expect(client.calls[0].input).toEqual({format: "run", guestCount: 32});
    await flow.save();
    expect(client.calls).toHaveLength(1);
  });

  it("goes back to the phone step when saving finds no profile", async () => {
    const client = scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.previewed], apply: [{problem: "no_workspace"}]}});
    const {flow, stage} = flowWith(client, {remembered: {read: () => draft, write: () => undefined}});
    await plan(flow);
    await flow.save();
    expect(stage()).toEqual({name: "account"});
  });

  it("retries a failed preview with the same key, and starts over with a new one", async () => {
    const client = scriptedTryItClient({"night.plan": {preview: [{problem: "offline"}, nightPlanFixtures.previewed, nightPlanFixtures.previewed]}});
    const {flow, stage} = flowWith(client);
    await plan(flow);
    expect(stage()).toMatchObject({name: "problem", reason: "offline"});
    await flow.retry();
    expect(stage()).toMatchObject({name: "plan"});
    expect(client.calls[1].idempotencyKey).toBe(client.calls[0].idempotencyKey);
    flow.startOver();
    expect(stage()).toEqual({name: "start"});
    await flow.submit();
    expect(client.calls[2].idempotencyKey).not.toBe(client.calls[0].idempotencyKey);
  });
});
