import assert from "node:assert/strict";
import test from "node:test";
import type {IntakePageSource} from "../operations/supplyIntake/runtime";
import {lumaClaimMarker, readLumaClaimMarker} from "./lumaClaimPage";

function source(finalUrl: string | null, snapshot: unknown): IntakePageSource {
  return {
    capture: async ({runKey, url}) => ({
      snapshot: snapshot as never,
      receipt: {runKey, requestedUrl: url, finalUrl,
        outcome: finalUrl ? "fetched" : "blocked"} as never,
    }),
  };
}

const input = {url: "https://luma.com/carter-runs",
  marker: lumaClaimMarker("482173"), runKey: "organizer-claim:test"};

test("the marker is found in the page's embedded calendar data", async () => {
  const reading = await readLumaClaimMarker(source(input.url, {
    text: "Carter Road Runners",
    embeddedJson: [{id: "__NEXT_DATA__", value: {calendar: {
      description_mirror: {content: [{text: "Join us. CATCH-482173"}]}}}}],
  }), input);
  assert.deepEqual(reading, {outcome: "fetched", finalUrl: input.url,
    showsMarker: true});
});

test("a redirect off Luma or a missing page never counts", async () => {
  assert.equal((await readLumaClaimMarker(source(
    "https://example.com/catch", {text: "catch-482173"}), input))
    .showsMarker, false);
  assert.equal((await readLumaClaimMarker(source(null, null), input))
    .showsMarker, false);
});
