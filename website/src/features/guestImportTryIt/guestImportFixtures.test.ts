import Ajv from "ajv";
import addFormats from "ajv-formats";
import {readFileSync} from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {guestImportFixtures, guestSampleFile, scriptedGuestClient} from "../../stories/fixtures/guestImportTryIt";
import {createGuestImportFlow} from "./guestImportFlow";

const contracts = path.resolve(__dirname, "../../../../contracts");
// event_common keeps a list of field names under definitions, so the shared files are not checked as schemas here.
const ajv = new Ajv({allErrors: true, strict: false, validateSchema: false});
addFormats(ajv);
for (const file of ["command_envelope.schema.json", "event_common.schema.json"]) {
  ajv.addSchema(JSON.parse(readFileSync(path.join(contracts, "shared", file), "utf8")));
}
const schema = (file: string) => ajv.compile(JSON.parse(readFileSync(path.join(contracts, file), "utf8")));
const validateResponse = schema("callable_responses/import_guest_list_response.schema.json");
const validatePayload = schema("callables/import_guest_list_payload.schema.json");

describe("guest import fixtures and payloads", () => {
  it("answers with envelopes the response schema accepts", () => {
    for (const [name, fixture] of Object.entries(guestImportFixtures)) {
      expect(validateResponse(fixture), `${name}: ${JSON.stringify(validateResponse.errors)}`).toBe(true);
    }
  });

  it("sends payloads the payload schema accepts: the website surface, no event (the try-it draft), the mapping, the rows left out and the confirm", async () => {
    const sent: unknown[] = [];
    const client = scriptedGuestClient({"guests.import-list": {preview: [guestImportFixtures.needsMapping, guestImportFixtures.needsReview,
      guestImportFixtures.withLeftOut], apply: [guestImportFixtures.applied]}});
    const flow = createGuestImportFlow({client: {
      caller: client.caller,
      async call(commandId, request) {
        const {mode, idempotencyKey, input, previewHash} = request;
        sent.push({mode, idempotencyKey, surface: "website", input, ...(previewHash ? {confirm: {commandId, previewHash}} : {})});
        return client.call(commandId, request);
      },
    }});
    flow.setFile(guestSampleFile());
    await flow.submit();
    flow.setColumn("displayName", 0);
    await flow.submitMapping();
    flow.toggleExcluded("row-4");
    flow.toggleExcluded("row-5");
    await flow.previewAgain();
    await flow.confirm();
    expect(flow.getState().stage.name).toBe("done");
    const guestPayloads = sent.filter((_, index) => client.calls[index].commandId === "guests.import-list");
    expect(guestPayloads).toHaveLength(4);
    for (const payload of guestPayloads) {
      expect(validatePayload(payload), JSON.stringify(validatePayload.errors)).toBe(true);
      expect((payload as {input: Record<string, unknown>}).input).not.toHaveProperty("eventId");
    }
  });
});
