import {describe, expect, it} from "vitest";
import {fixtureExportFile, pastSalesFixtures, scriptedPastSalesClient} from "../../stories/fixtures/pastSalesTryItCommands";
import {fixtureCaller, workspaceFixtures} from "../../stories/fixtures/tryItCommands";
import {createPastSalesFlow, type PastSalesFlowDeps} from "./pastSalesFlow";

const bytes = new TextEncoder().encode("Name,Ticket,Amount\nAnanya Rao,General,400\n");
const base64 = btoa(String.fromCharCode(...bytes));

function flowWith(client: ReturnType<typeof scriptedPastSalesClient>, extra: Partial<PastSalesFlowDeps> = {}) {
  let key = 0;
  const flow = createPastSalesFlow({
    client,
    newKey: () => `web_key${String(++key).padStart(12, "0")}`,
    readFile: async () => bytes,
    today: () => "2026-11-20",
    ...extra,
  });
  return {flow, stage: () => flow.getState().stage};
}

const salesCalls = (client: ReturnType<typeof scriptedPastSalesClient>) => client.calls.filter((call) => call.commandId === "sales.import-past");

describe("past sales flow: preview, then save", () => {
  it("sends the file and the night's details, shows the report, then applies with the same key and the preview's hash", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.previewed], apply: [pastSalesFixtures.applied]}});
    const {flow, stage} = flowWith(client);
    flow.chooseFile(fixtureExportFile());
    flow.setDetail("eventName", "  Salt Air   Social Run ");
    flow.setDetail("eventDate", "2026-11-16");
    flow.setDetail("ticketPrice", "400");
    flow.setDetail("feePercent", "3");
    flow.setDetail("feePerTicket", "10");
    await flow.submit();
    expect(stage()).toMatchObject({name: "review", report: pastSalesFixtures.previewed.result.report, rows: []});
    await flow.confirm();
    expect(stage()).toMatchObject({name: "done", eventId: pastSalesFixtures.applied.result.eventId, imported: {createdCount: 49, updatedCount: 2}});
    const input = {
      file: {fileName: "salt-air-sales.csv", contentBase64: base64},
      event: {name: "Salt Air Social Run", localDate: "2026-11-16"},
      fallbackTicketPrice: {amountMinor: 40000, currency: "INR"},
      currentFees: {percent: 3, perTicketMinor: 1000, currency: "INR"},
    };
    expect(client.calls.map(({commandId, mode, idempotencyKey, previewHash, input: sent}) => ({commandId, mode, idempotencyKey, previewHash, input: sent}))).toEqual([
      {commandId: "sales.import-past", mode: "preview", idempotencyKey: "web_key000000000001", previewHash: undefined, input},
      {commandId: "sales.import-past", mode: "apply", idempotencyKey: "web_key000000000001", previewHash: pastSalesFixtures.previewed.previewHash, input},
    ]);
  });

  it("leaves empty details out, so the command uses its own defaults", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.thin]}});
    const {flow, stage} = flowWith(client);
    flow.chooseFile(fixtureExportFile("guests.XLSX"));
    await flow.submit();
    expect(stage().name).toBe("review");
    expect(client.calls[0].input).toEqual({file: {fileName: "guests.XLSX", contentBase64: base64}});
  });

  it("asks for the columns when the command can't tell them apart, with first guesses, and previews again with the same key", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.needsMapping, pastSalesFixtures.previewed]}});
    const {flow, stage} = flowWith(client);
    flow.chooseFile(fixtureExportFile());
    await flow.submit();
    expect(stage()).toEqual({name: "mapping", headers: pastSalesFixtures.needsMapping.result.headers, shapes: pastSalesFixtures.needsMapping.result.columnShapes});
    // The phone-shaped column and the headings' words are guessed; the visitor fixes the rest.
    expect(flow.getState().mapping).toEqual({displayName: 0, phone: 1, email: null, ticketType: 2, status: 4, revenueAmount: 3});
    flow.setMapping("displayName", null);
    await flow.submitMapping();
    expect(flow.getState().mappingProblems).toEqual({displayName: "nameRequired"});
    flow.setMapping("displayName", 1);
    await flow.submitMapping();
    expect(flow.getState().mappingProblems).toEqual({phone: "duplicate"});
    expect(salesCalls(client)).toHaveLength(1);
    flow.setMapping("displayName", 0);
    await flow.submitMapping();
    expect(stage().name).toBe("review");
    const [first, second] = salesCalls(client);
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(second.input).toMatchObject({mapping: {displayName: 0, phone: 1, email: null, ticketType: 2, status: 4, revenueAmount: 3}});
    expect(first.input).not.toHaveProperty("mapping");
  });

  it("lists the rows that need a look and leaves them out on request, before saving", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.rowsNeedReview, pastSalesFixtures.previewedAgain],
      apply: [pastSalesFixtures.applied]}});
    const {flow, stage} = flowWith(client);
    flow.chooseFile(fixtureExportFile());
    await flow.submit();
    expect(stage()).toMatchObject({name: "review", rows: pastSalesFixtures.rowsNeedReview.result.rowsNeedingReview});
    // The command refuses to save while rows need a look, so confirming does nothing yet.
    await flow.confirm();
    expect(client.calls.some((call) => call.mode === "apply")).toBe(false);
    await flow.leaveOutRows();
    expect(salesCalls(client)[1].input).toMatchObject({excludedRowIds: ["7"]});
    expect(stage()).toMatchObject({name: "review", rows: []});
    await flow.confirm();
    expect(stage().name).toBe("done");
    expect(client.calls.at(-1)).toMatchObject({mode: "apply", previewHash: pastSalesFixtures.previewedAgain.previewHash, input: {excludedRowIds: ["7"]}});
  });

  it("previews again when the result changed since the preview, and applies the new hash with the same key", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.previewed, pastSalesFixtures.previewedAgain],
      apply: [{problem: "changed"}, pastSalesFixtures.applied]}});
    const {flow, stage} = flowWith(client);
    flow.chooseFile(fixtureExportFile());
    await flow.submit();
    await flow.confirm();
    expect(stage()).toMatchObject({name: "review", report: pastSalesFixtures.previewedAgain.result.report});
    await flow.confirm();
    expect(stage().name).toBe("done");
    const applies = client.calls.filter((call) => call.mode === "apply");
    expect(applies.map((call) => call.previewHash)).toEqual([pastSalesFixtures.previewed.previewHash, pastSalesFixtures.previewedAgain.previewHash]);
    expect(new Set(client.calls.map((call) => call.idempotencyKey)).size).toBe(1);
  });

  it("retries a save whose outcome is unknown with the same key, so the server replays it", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.previewed],
      apply: [{problem: "offline"}, {...pastSalesFixtures.applied, status: "replayed"}]}});
    const {flow, stage} = flowWith(client);
    flow.chooseFile(fixtureExportFile());
    await flow.submit();
    await flow.confirm();
    expect(stage()).toMatchObject({name: "problem", reason: "offline"});
    await flow.retry();
    expect(stage().name).toBe("done");
    const applies = client.calls.filter((call) => call.mode === "apply");
    expect(applies.map((call) => [call.idempotencyKey, call.previewHash])).toEqual([
      ["web_key000000000001", pastSalesFixtures.previewed.previewHash], ["web_key000000000001", pastSalesFixtures.previewed.previewHash]]);
  });
});

describe("past sales flow: the file, the phone step and errors", () => {
  it("asks for a file the command takes before sending anything", async () => {
    const client = scriptedPastSalesClient({});
    const {flow} = flowWith(client);
    await flow.submit();
    expect(flow.getState().fields).toEqual({file: "fileRequired"});
    flow.chooseFile(new File(["x"], "guests.pdf"));
    expect(flow.getState().fields).toEqual({file: "fileType"});
    await flow.submit();
    flow.chooseFile(fixtureExportFile());
    flow.setDetail("eventDate", "2026-11-21");
    flow.setDetail("feePercent", "120");
    await flow.submit();
    expect(flow.getState().detailProblems).toEqual({eventDate: "dateInFuture", feePercent: "tooLarge"});
    expect(client.calls).toEqual([]);
  });

  it("asks for the brand, city and phone first, ensures the profile, then sends the file", async () => {
    const client = scriptedPastSalesClient({
      "workspace.ensure": {preview: [workspaceFixtures.previewNew], apply: [workspaceFixtures.applied]},
      "sales.import-past": {preview: [pastSalesFixtures.previewed]},
    }, null);
    const {flow, stage} = flowWith(client);
    flow.chooseFile(fixtureExportFile());
    await flow.submit();
    expect(stage().name).toBe("account");
    // Nothing goes to the command before the phone is confirmed.
    expect(client.calls).toEqual([]);
    flow.setBrand("Driftwood Bay Runners");
    flow.setCity("in-mh-mumbai");
    await flow.continueAccount();
    expect(flow.getState().signIn).toBe(true);
    client.setCaller(fixtureCaller);
    await flow.signedIn();
    expect(stage()).toEqual({name: "workspace", summary: workspaceFixtures.previewNew.summary});
    await flow.confirmWorkspace();
    expect(stage().name).toBe("review");
    expect(client.calls.map((call) => `${call.commandId}:${call.mode}`)).toEqual(["workspace.ensure:preview", "workspace.ensure:apply", "sales.import-past:preview"]);
  });

  it("goes to the profile step when a verified visitor has no profile yet, then sends the same file again", async () => {
    const client = scriptedPastSalesClient({
      "workspace.ensure": {preview: [workspaceFixtures.previewExisting]},
      "sales.import-past": {preview: [pastSalesFixtures.noWorkspace, pastSalesFixtures.previewed]},
    });
    const {flow, stage} = flowWith(client);
    flow.chooseFile(fixtureExportFile());
    await flow.submit();
    expect(stage().name).toBe("account");
    flow.setBrand("Driftwood Bay Runners");
    flow.setCity("in-mh-mumbai");
    await flow.continueAccount();
    expect(stage().name).toBe("review");
    const [first, second] = salesCalls(client);
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(second.input).toEqual(first.input);
  });

  it("stops with the command's reason when it can't read the file, and starts over with a new key", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [{problem: "invalid", reason: "roster_unsupported_file"}, pastSalesFixtures.previewed]}});
    const {flow, stage} = flowWith(client);
    flow.chooseFile(fixtureExportFile());
    await flow.submit();
    expect(stage()).toEqual({name: "problem", reason: "invalid", detail: "roster_unsupported_file", summary: null});
    flow.startOver();
    expect(stage().name).toBe("start");
    expect(flow.getState().file).toEqual({name: "salt-air-sales.csv", size: fixtureExportFile().size});
    await flow.submit();
    expect(stage().name).toBe("review");
    const [first, second] = salesCalls(client);
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it("stops plainly when the file can't be read in the browser", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.previewed]}});
    const {flow, stage} = flowWith(client, {readFile: async () => {throw new Error("unreadable");}});
    flow.chooseFile(fixtureExportFile());
    await flow.submit();
    expect(stage()).toMatchObject({name: "problem", reason: "failed"});
    expect(flow.getState().busy).toBe(false);
    expect(client.calls).toEqual([]);
  });
});
