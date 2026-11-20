import Ajv from "ajv";
import addFormats from "ajv-formats";
import {readFileSync} from "node:fs";
import path from "node:path";
import {describe, expect, it, vi} from "vitest";
import {eventFixtures, kitFixtures, organizerFixtures, workspaceFixtures} from "../../stories/fixtures/tryItCommands";
import {
  createTryItAction,
  createTryItCommandClient,
  tryItCommandCallables,
  tryItIdempotencyKey,
  tryItProblemFor,
  type TryItCommandId,
  type TryItInvoke,
} from "./tryItCommands";

const contracts = path.resolve(__dirname, "../../../../contracts");
// event_common keeps a list of field names under definitions, so the shared files are not checked as schemas here.
const ajv = new Ajv({allErrors: true, strict: false, validateSchema: false});
addFormats(ajv);
// The schemas the four commands' payloads and responses reference.
for (const file of ["command_envelope.schema.json", "event_common.schema.json", "profile_common.schema.json"]) {
  ajv.addSchema(JSON.parse(readFileSync(path.join(contracts, "shared", file), "utf8")));
}
const catalog = JSON.parse(readFileSync(path.join(contracts, "commands/catalog.json"), "utf8")) as {
  commands: {commandId: string; callable: string; payloadSchema: string; responseSchema: string; surfaces: string[]}[];
};
const compiled = new Map<string, ReturnType<typeof ajv.compile>>();
function validator(file: string) {
  if (!compiled.has(file)) compiled.set(file, ajv.compile(JSON.parse(readFileSync(path.join(contracts, "..", file), "utf8"))));
  return compiled.get(file)!;
}
/** A kit link as the command takes it. */
const kitLink = (name: string, kind: "channel" | "promoter", source?: string) => ({label: name, kind, ...(source ? {source} : {})});
/** A FunctionsError as the SDK throws it: its code and the server's words. */
const callableError = (code: string, text: string) => Object.assign(new Error(text), {code});
const entry = (commandId: TryItCommandId) => catalog.commands.find((command) => command.commandId === commandId)!;

describe("try-it command client", () => {
  it("names each command's catalog callable, on a command the catalog opens to the website", () => {
    for (const [commandId, callable] of Object.entries(tryItCommandCallables)) {
      const command = entry(commandId as TryItCommandId);
      expect(command.callable, commandId).toBe(callable);
      expect(command.surfaces, commandId).toContain("website");
    }
  });

  it("sends the shared envelope: surface website, the key, and on apply the confirm of the reviewed preview", async () => {
    const invoke = vi.fn(async () => organizerFixtures.previewed) as unknown as TryItInvoke;
    const client = createTryItCommandClient({invoke});
    const validatePayload = validator(entry("organizer.import-from-link").payloadSchema);
    await client.call("organizer.import-from-link", {mode: "preview", idempotencyKey: "web_0123456789abcdef", input: {link: "https://driftwoodbayrunners.example/"}});
    await client.call("organizer.import-from-link", {mode: "apply", idempotencyKey: "web_0123456789abcdef", input: {link: "https://driftwoodbayrunners.example/"},
      previewHash: organizerFixtures.previewed.previewHash});
    const payloads = vi.mocked(invoke).mock.calls.map(([callable, payload]) => {
      expect(callable).toBe("importOrganizerFromLink");
      return payload;
    });
    expect(payloads[0]).toEqual({mode: "preview", idempotencyKey: "web_0123456789abcdef", surface: "website", input: {link: "https://driftwoodbayrunners.example/"}});
    expect(payloads[1]).toEqual({mode: "apply", idempotencyKey: "web_0123456789abcdef", surface: "website", input: {link: "https://driftwoodbayrunners.example/"},
      confirm: {commandId: "organizer.import-from-link", previewHash: organizerFixtures.previewed.previewHash}});
    for (const payload of payloads) expect(validatePayload(payload), JSON.stringify(validatePayload.errors)).toBe(true);
  });

  it("builds payloads every command's schema accepts", async () => {
    const samples: {[C in TryItCommandId]: Parameters<ReturnType<typeof createTryItCommandClient>["call"]>[1] & {input: unknown}} = {
      "workspace.ensure": {mode: "preview", idempotencyKey: tryItIdempotencyKey(), input: {organizerName: "Driftwood Bay Runners", marketId: "in-mh-mumbai"}},
      "organizer.import-from-link": {mode: "preview", idempotencyKey: tryItIdempotencyKey(), input: {link: "https://www.instagram.example/driftwoodbayrunners/"}},
      "event.import-from-link": {mode: "preview", idempotencyKey: tryItIdempotencyKey(), input: {link: "https://events.example/salt-air", eventKey: "wiSaltAirSocialRun"}},
      "promotion.create-kit": {mode: "apply", idempotencyKey: tryItIdempotencyKey(), previewHash: "e".repeat(64),
        input: {eventId: "evtSaltAirSocialRun01", links: [kitLink("Instagram", "channel", "instagram"), kitLink("Kabir", "promoter")]}},
      "night.plan": {mode: "preview", idempotencyKey: tryItIdempotencyKey(), input: {format: "run", guestCount: 32, eventId: "evtSaltAirSocialRun01"}},
    };
    for (const [commandId, sample] of Object.entries(samples) as [TryItCommandId, (typeof samples)[TryItCommandId]][]) {
      let sent: unknown;
      const invoke = (async (_callable: string, payload: unknown) => {
        sent = payload;
        throw Object.assign(new Error("stop"), {code: "functions/internal"});
      }) as unknown as TryItInvoke;
      await createTryItCommandClient({invoke}).call(commandId, sample as never);
      const validate = validator(entry(commandId).payloadSchema);
      expect(validate(sent), `${commandId}: ${JSON.stringify(validate.errors)}`).toBe(true);
    }
  });

  it("uses fixture envelopes each command's response schema accepts", () => {
    const sets: [TryItCommandId, Record<string, unknown>][] = [
      ["workspace.ensure", workspaceFixtures], ["organizer.import-from-link", organizerFixtures],
      ["event.import-from-link", eventFixtures], ["promotion.create-kit", kitFixtures],
    ];
    for (const [commandId, fixtures] of sets) {
      const validate = validator(entry(commandId).responseSchema);
      for (const [name, fixture] of Object.entries(fixtures)) expect(validate(fixture), `${commandId} ${name}: ${JSON.stringify(validate.errors)}`).toBe(true);
    }
  });

  it("names a thrown call's problem from its reason, then its code, and never throws", async () => {
    const fail = (error: unknown) => createTryItCommandClient({invoke: (async () => {throw error;}) as unknown as TryItInvoke})
      .call("workspace.ensure", {mode: "preview", idempotencyKey: "web_0123456789abcdef", input: {organizerName: "A", marketId: "in-mh-mumbai"}});
    expect(await fail(callableError("functions/resource-exhausted", "Rate limit exceeded"))).toEqual({ok: false, problem: "rate_limited", reason: null});
    expect(await fail({code: "functions/failed-precondition", details: {reason: "market_not_open"}})).toEqual({ok: false, problem: "market_not_open", reason: "market_not_open"});
    expect(await fail({code: "functions/failed-precondition", details: {reason: "phone_not_verified"}})).toMatchObject({problem: "sign_in"});
    expect(await fail({code: "functions/unauthenticated"})).toMatchObject({problem: "sign_in"});
    expect(await fail({code: "functions/aborted", details: {reason: "changed_since_preview"}})).toMatchObject({problem: "changed"});
    expect(await fail({code: "functions/already-exists", details: {reason: "idempotency_key_reused"}})).toMatchObject({problem: "key_reused"});
    expect(await fail({code: "functions/failed-precondition", details: {reason: "existing_listing"}})).toMatchObject({problem: "existing_listing"});
    expect(await fail(callableError("functions/invalid-argument", "Send a public https link."))).toMatchObject({problem: "invalid"});
    expect(await fail({code: "functions/permission-denied"})).toMatchObject({problem: "not_allowed"});
    expect(await fail(callableError("functions/internal", "internal"))).toMatchObject({problem: "offline"});
    expect(await fail(new Error("Try-it tools are not configured for this build."))).toMatchObject({problem: "not_configured"});
    expect(await fail(Object.assign(new Error("App Check could not start in this browser."), {name: "AppCheckDeadlineError"}))).toMatchObject({problem: "app_check"});
    expect(tryItProblemFor("nope")).toEqual({problem: "failed", reason: null});
  });

  it("refuses an answer from another command", async () => {
    const client = createTryItCommandClient({invoke: (async () => organizerFixtures.previewed) as unknown as TryItInvoke});
    expect(await client.call("event.import-from-link", {mode: "preview", idempotencyKey: "web_0123456789abcdef", input: {link: "https://events.example/"}}))
      .toEqual({ok: false, problem: "failed", reason: null});
  });

  it("keeps one key for an action's previews and its apply, and takes a new one only on restart", async () => {
    const keys: string[] = [];
    const client = createTryItCommandClient({invoke: (async (_callable: string, payload: {idempotencyKey: string}) => {
      keys.push(payload.idempotencyKey);
      return organizerFixtures.running;
    }) as unknown as TryItInvoke});
    let next = 0;
    const action = createTryItAction(client, "organizer.import-from-link", () => `web_key${String(++next).padStart(12, "0")}`);
    await action.preview({link: "https://driftwoodbayrunners.example/"});
    await action.preview({link: "https://driftwoodbayrunners.example/"});
    await action.apply({link: "https://driftwoodbayrunners.example/"}, "5".repeat(64));
    action.restart();
    await action.preview({link: "https://driftwoodbayrunners.example/"});
    expect(keys).toEqual(["web_key000000000001", "web_key000000000001", "web_key000000000001", "web_key000000000002"]);
  });

  it("makes keys inside the envelope's pattern", () => {
    expect(tryItIdempotencyKey(() => "123e4567-e89b-12d3-a456-426614174000")).toBe("web_123e4567e89b12d3a456426614174000");
    expect(() => tryItIdempotencyKey(() => "")).toThrow();
    expect(tryItIdempotencyKey()).toMatch(/^web_[0-9a-f]{32}$/u);
  });
});
