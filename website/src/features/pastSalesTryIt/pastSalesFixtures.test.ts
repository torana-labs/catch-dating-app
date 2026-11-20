import Ajv from "ajv";
import addFormats from "ajv-formats";
import {readFileSync} from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {fixtureExportFile, pastSalesFixtures, scriptedPastSalesClient} from "../../stories/fixtures/pastSalesTryItCommands";
import {createPastSalesFlow} from "./pastSalesFlow";

const contracts = path.resolve(__dirname, "../../../../contracts");
const ajv = new Ajv({allErrors: true, strict: false, validateSchema: false});
addFormats(ajv);
ajv.addSchema(JSON.parse(readFileSync(path.join(contracts, "shared/command_envelope.schema.json"), "utf8")));
const schema = (file: string) => ajv.compile(JSON.parse(readFileSync(path.join(contracts, file), "utf8")));
const validateResponse = schema("callable_responses/import_past_sales_response.schema.json");
const validatePayload = schema("callables/import_past_sales_payload.schema.json");

describe("sales.import-past fixtures and payloads", () => {
  it.each(Object.entries(pastSalesFixtures))("%s is an envelope the response schema accepts", (_name, fixture) => {
    expect(validateResponse(fixture), JSON.stringify(validateResponse.errors)).toBe(true);
  });

  it("sends payloads the payload schema accepts, from the preview to the save", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.needsMapping, pastSalesFixtures.rowsNeedReview, pastSalesFixtures.previewedAgain],
      apply: [pastSalesFixtures.applied]}});
    const flow = createPastSalesFlow({client, readFile: async (file) => new Uint8Array(await new Response(file).arrayBuffer()), today: () => "2026-11-20"});
    flow.chooseFile(fixtureExportFile());
    flow.setDetail("eventName", "Salt Air Social Run");
    flow.setDetail("eventDate", "2026-11-16");
    flow.setDetail("ticketPrice", "400");
    flow.setDetail("feePercent", "2.5");
    flow.setDetail("feePerTicket", "10");
    await flow.submit();
    await flow.submitMapping();
    await flow.leaveOutRows();
    await flow.confirm();
    expect(flow.getState().stage.name).toBe("done");
    expect(client.calls).toHaveLength(4);
    for (const call of client.calls) {
      const payload = {mode: call.mode, idempotencyKey: call.idempotencyKey, surface: "website", input: call.input,
        ...(call.previewHash ? {confirm: {commandId: "sales.import-past", previewHash: call.previewHash}} : {})};
      expect(validatePayload(payload), JSON.stringify(validatePayload.errors)).toBe(true);
    }
  });
});
