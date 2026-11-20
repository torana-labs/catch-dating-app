import {describe, expect, it} from "vitest";
import {fixtureCaller, workspaceFixtures} from "../../stories/fixtures/tryItCommands";
import {guestImportFixtures as fixtures, guestSampleCsv, guestSampleFile, scriptedGuestClient} from "../../stories/fixtures/guestImportTryIt";
import {createGuestImportFlow} from "./guestImportFlow";
import {guestImportMaxBytes} from "./guestImportModel";

const content = btoa(guestSampleCsv);
const file = {fileName: "salt-air-guests.csv", contentBase64: content};

function flowWith(client: ReturnType<typeof scriptedGuestClient>) {
  let key = 0;
  const flow = createGuestImportFlow({client, newKey: () => `web_key${String(++key).padStart(12, "0")}`});
  return {flow, stage: () => flow.getState().stage};
}

const guestCalls = (client: ReturnType<typeof scriptedGuestClient>) =>
  client.calls.filter((call) => call.commandId === "guests.import-list")
    .map(({mode, idempotencyKey, previewHash, input}) => ({mode, idempotencyKey, previewHash, input}));

describe("guest import flow: file step", () => {
  it("checks the file in the browser and sends nothing until one is chosen", async () => {
    const client = scriptedGuestClient({});
    const {flow} = flowWith(client);
    await flow.submit();
    expect(flow.getState().fields.file).toBe("fileRequired");
    flow.setFile({name: "guests.pdf", size: 10, read: async () => "x"});
    expect(flow.getState().fields.file).toBe("fileType");
    expect(flow.getState().file).toBeNull();
    flow.setFile({name: "guests.csv", size: guestImportMaxBytes + 1, read: async () => "x"});
    expect(flow.getState().fields.file).toBe("fileTooLarge");
    await flow.submit();
    expect(flow.getState().fields.file).toBe("fileTooLarge");
    expect(client.calls).toEqual([]);
  });

  it("goes back to the file step when the browser cannot read the file", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [fixtures.previewed]}});
    const {flow, stage} = flowWith(client);
    flow.setFile({name: "guests.csv", size: 20, read: async () => {throw new Error("NotReadableError");}});
    await flow.submit();
    expect(stage()).toEqual({name: "start"});
    expect(flow.getState().fields.file).toBe("fileUnreadable");
    expect(client.calls).toEqual([]);
  });

  it("stops with the command's reason when it refuses the file, and offers another file rather than a retry", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [{problem: "invalid", reason: "roster_file_too_large"}]}});
    const {flow, stage} = flowWith(client);
    flow.setFile(guestSampleFile());
    await flow.submit();
    expect(stage()).toEqual({name: "problem", reason: "roster_file_too_large"});
  });

  it("words an unknown file refusal plainly", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [{problem: "invalid", reason: "roster_unreadable"}]}});
    const {flow, stage} = flowWith(client);
    flow.setFile(guestSampleFile());
    await flow.submit();
    expect(stage()).toEqual({name: "problem", reason: "unreadable"});
  });
});

describe("guest import flow: the phone step comes before the upload", () => {
  it("asks a visitor with no verified phone for the account step, sending no file", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [fixtures.previewed]}}, null);
    const {flow, stage} = flowWith(client);
    flow.setFile(guestSampleFile());
    await flow.submit();
    expect(stage().name).toBe("account");
    flow.setBrand("Driftwood Bay Runners");
    flow.setCity("in-mh-mumbai");
    await flow.continueAccount();
    expect(flow.getState().signIn).toBe(true);
    expect(client.calls).toEqual([]);
  });

  it("sets up the private profile on no_workspace, then previews the same file", async () => {
    const client = scriptedGuestClient({
      "guests.import-list": {preview: [{problem: "no_workspace", reason: "no_workspace"}, fixtures.previewed]},
      "workspace.ensure": {preview: [workspaceFixtures.previewNew], apply: [workspaceFixtures.applied]},
    });
    const {flow, stage} = flowWith(client);
    flow.setFile(guestSampleFile());
    await flow.submit();
    expect(stage().name).toBe("account");
    flow.setBrand("Driftwood Bay Runners");
    flow.setCity("in-mh-mumbai");
    await flow.continueAccount();
    expect(stage()).toMatchObject({name: "workspace", summary: workspaceFixtures.previewNew.summary});
    await flow.confirmWorkspace();
    expect(stage()).toMatchObject({name: "review", summary: fixtures.previewed.summary});
    expect(client.calls.map((call) => `${call.commandId}:${call.mode}`)).toEqual([
      "guests.import-list:preview", "workspace.ensure:preview", "workspace.ensure:apply", "guests.import-list:preview",
    ]);
    // The same import, so the same key, before and after the profile step.
    expect(new Set(guestCalls(client).map((call) => call.idempotencyKey)).size).toBe(1);
  });

  it("signs in again when the command says the phone is not verified", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [{problem: "sign_in", reason: "phone_not_verified"}]}});
    const {flow, stage} = flowWith(client);
    flow.setFile(guestSampleFile());
    await flow.submit();
    expect(stage().name).toBe("account");
    expect(flow.getState().caller).toBeNull();
  });
});

describe("guest import flow: columns, review and save", () => {
  it("asks which column is which when the command needs a mapping, then previews again with it", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [fixtures.needsMapping, fixtures.previewed]}});
    const {flow, stage} = flowWith(client);
    flow.setFile(guestSampleFile());
    await flow.submit();
    expect(stage()).toMatchObject({name: "mapping", headers: ["Guest", "Mobile", "Mail", "Pass"]});
    // The phone and email columns start from what the command says they hold.
    expect(flow.getState().mapping).toEqual({displayName: null, phone: 1, email: 2, ticketType: null});
    await flow.submitMapping();
    expect(flow.getState().fields.mapping).toBe("nameRequired");
    flow.setColumn("displayName", 1);
    await flow.submitMapping();
    expect(flow.getState().fields.mapping).toBe("duplicateColumn");
    flow.setColumn("displayName", 0);
    flow.setColumn("ticketType", 3);
    await flow.submitMapping();
    expect(stage()).toMatchObject({name: "review"});
    expect(guestCalls(client).map((call) => call.input)).toEqual([
      {file},
      {file, mapping: {displayName: 0, phone: 1, email: 2, ticketType: 3}},
    ]);
  });

  it("goes back to the column choice when the command refuses it", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [fixtures.needsMapping, {problem: "invalid", reason: "roster_duplicate_mapped_column"}]}});
    const {flow, stage} = flowWith(client);
    flow.setFile(guestSampleFile());
    await flow.submit();
    flow.setColumn("displayName", 0);
    await flow.submitMapping();
    expect(stage().name).toBe("mapping");
    expect(flow.getState().fields.mapping).toBe("invalidMapping");
  });

  it("holds rows that need a look, previews again without the ones left out, then saves with the same key and the new hash", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [fixtures.needsReview, fixtures.withLeftOut], apply: [fixtures.applied]}});
    const {flow, stage} = flowWith(client);
    flow.setFile(guestSampleFile());
    await flow.submit();
    expect(stage()).toMatchObject({name: "review", result: {eligibleForApply: false}});
    // A list that needs a look cannot be saved as it is.
    await flow.confirm();
    expect(client.calls.some((call) => call.mode === "apply")).toBe(false);
    flow.toggleExcluded("row-5");
    flow.toggleExcluded("row-4");
    await flow.previewAgain();
    expect(stage()).toMatchObject({name: "review", result: {eligibleForApply: true}});
    await flow.confirm();
    expect(stage()).toMatchObject({name: "done", summary: fixtures.applied.summary});
    expect(guestCalls(client)).toEqual([
      {mode: "preview", idempotencyKey: "web_key000000000001", previewHash: undefined, input: {file}},
      {mode: "preview", idempotencyKey: "web_key000000000001", previewHash: undefined, input: {file, excludedRowIds: ["row-4", "row-5"]}},
      {mode: "apply", idempotencyKey: "web_key000000000001", previewHash: fixtures.withLeftOut.previewHash, input: {file, excludedRowIds: ["row-4", "row-5"]}},
    ]);
  });

  it("applies exactly the previewed input with confirm.previewHash, and a retry after an unknown outcome reuses the key", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [fixtures.previewed], apply: [{problem: "offline"}, {...fixtures.applied, status: "replayed"}]}});
    const {flow, stage} = flowWith(client);
    flow.setFile(guestSampleFile());
    await flow.submit();
    await flow.confirm();
    expect(stage()).toEqual({name: "problem", reason: "offline"});
    await flow.retry();
    expect(stage().name).toBe("done");
    const applies = guestCalls(client).filter((call) => call.mode === "apply");
    expect(applies).toHaveLength(2);
    expect(applies.every((call) => call.idempotencyKey === "web_key000000000001" && call.previewHash === fixtures.previewed.previewHash)).toBe(true);
  });

  it("previews again when apply finds the preview changed or rows that need a look", async () => {
    const client = scriptedGuestClient({"guests.import-list": {
      preview: [fixtures.previewed, fixtures.needsReview], apply: [{problem: "failed", reason: "needs_review"}]}});
    const {flow, stage} = flowWith(client);
    flow.setFile(guestSampleFile());
    await flow.submit();
    await flow.confirm();
    expect(stage()).toMatchObject({name: "review", summary: fixtures.needsReview.summary});
  });

  it("starts a new import with a new key for another file", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [fixtures.previewed]}});
    const {flow} = flowWith(client);
    flow.setFile(guestSampleFile());
    await flow.submit();
    flow.setFile(guestSampleFile("lantern-lane-guests.xlsx", "other"));
    await flow.submit();
    const keys = guestCalls(client).map((call) => call.idempotencyKey);
    expect(keys).toEqual(["web_key000000000001", "web_key000000000002"]);
    expect(flow.getState().caller).toEqual(fixtureCaller);
  });

  it("stops with the command's words for a profile city that is not open", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [{problem: "failed", reason: "city_unavailable"}]}});
    const {flow, stage} = flowWith(client);
    flow.setFile(guestSampleFile());
    await flow.submit();
    expect(stage()).toEqual({name: "problem", reason: "city_unavailable"});
  });
});
