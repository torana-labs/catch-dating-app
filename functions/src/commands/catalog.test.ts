/* eslint-disable max-len */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

// contracts/commands/catalog.json is the one list of commands every surface
// calls. This keeps each entry, its schemas and the Functions export in step,
// and holds every payload and response to the shared envelope.

const repo = path.resolve(__dirname, "../../..");
const read = (relative: string) =>
  JSON.parse(fs.readFileSync(path.join(repo, relative), "utf8"));
const catalog = read("contracts/commands/catalog.json") as {
  effectClasses: Record<string, string>;
  commands: Array<{commandId: string; callable: string; payloadSchema: string;
    responseSchema: string; effect: string; caller: string;
    surfaces: string[]; linkAllowance: string | null}>;
};
const index = fs.readFileSync(path.join(repo, "functions/src/index.ts"),
  "utf8");
const ENVELOPE = "../shared/command_envelope.schema.json#/definitions/";

test("every command names a known effect, caller and surfaces", () => {
  const ids = new Set<string>();
  for (const command of catalog.commands) {
    assert.match(command.commandId, /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/u);
    assert.ok(!ids.has(command.commandId), `${command.commandId} is listed twice`);
    ids.add(command.commandId);
    assert.ok(command.effect in catalog.effectClasses, command.commandId);
    assert.ok(["phone_verified", "organizer_manager"].includes(command.caller),
      command.commandId);
    assert.ok(command.surfaces.length > 0 && command.surfaces.every((surface) =>
      ["website", "catch_host", "cli", "whatsapp"].includes(surface)));
    assert.ok(command.linkAllowance === null ||
      /^[a-z][a-z0-9_-]*$/u.test(command.linkAllowance));
  }
});

test("every command's callable is exported and its schemas share the envelope", () => {
  for (const command of catalog.commands) {
    assert.match(index, new RegExp(`export \\{[^}]*\\b${command.callable}\\b`, "u"),
      `${command.callable} is not exported from functions/src/index.ts`);
    const payload = read(command.payloadSchema);
    for (const field of ["mode", "idempotencyKey", "surface", "confirm"]) {
      assert.equal(payload.properties?.[field]?.$ref, `${ENVELOPE}${field}`,
        `${command.commandId} payload.${field}`);
    }
    assert.deepEqual([...payload.required].sort(),
      ["idempotencyKey", "input", "mode", "surface"]);
    assert.equal(payload.properties.input?.additionalProperties, false,
      `${command.commandId} input must be closed so an AI caller can fill it`);
    const response = read(command.responseSchema);
    assert.equal(response.properties?.commandId?.const, command.commandId);
    for (const field of ["previewHash", "summary"]) {
      assert.equal(response.properties?.[field]?.$ref, `${ENVELOPE}${field}`,
        `${command.commandId} response.${field}`);
    }
    assert.ok(["commandId", "status", "previewHash", "summary", "effects",
      "result", "next", "receiptId"].every((field) =>
      response.required.includes(field)), command.commandId);
  }
});
