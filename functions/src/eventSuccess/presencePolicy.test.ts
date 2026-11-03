import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {eventSuccessPresencePolicyCatalog} from "./presencePolicy";

test("the presence policy module carries the catalog's values", () => {
  const catalog = JSON.parse(readFileSync(
    "../contracts/catalogs/event_success_presence_policy.json", "utf8"));
  assert.deepEqual({...eventSuccessPresencePolicyCatalog}, {
    heartbeatIntervalSeconds: catalog.heartbeatIntervalSeconds,
    presentWindowSeconds: catalog.presentWindowSeconds,
    likelyDepartedAfterSeconds: catalog.likelyDepartedAfterSeconds,
  });
  assert.ok(catalog.heartbeatIntervalSeconds <= catalog.presentWindowSeconds);
  assert.ok(catalog.presentWindowSeconds <
    catalog.likelyDepartedAfterSeconds);
});
