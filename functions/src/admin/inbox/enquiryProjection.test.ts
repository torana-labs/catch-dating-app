/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {projectInboxSource} from "./model";

const intent = (overrides: Record<string, unknown> = {}) => ({
  source: "meta_lead_ad", status: "needs_identity_review", fullName: "Meta Test Lead",
  city: "mumbai", createdAt: "2026-11-18T10:00:00.000Z", ...overrides,
});

test("a Meta lead ad enquiry says it came from a Facebook or Instagram ad", () => {
  const projection = projectInboxSource("salesInboundIntent", "meta-1", intent({
    hostApplication: {organizationName: "Harbor Social Club", operatingCity: "mumbai"},
  }));
  assert.equal(projection?.type, "enquiry");
  assert.equal(projection?.cameFrom, "Meta lead ad");
  assert.equal(projection?.subtitle, "Harbor Social Club, wants to run events on Catch");
  assert.equal(projection?.journey[0].title, "Lead from a Facebook or Instagram ad");
  assert.equal(projection?.journey[0].detail, "Meta Test Lead");
});

test("a Meta lead ad without a club name keeps the plain subtitle", () => {
  const projection = projectInboxSource("salesInboundIntent", "meta-2", intent({hostApplication: {}}));
  assert.equal(projection?.subtitle, "Wants to run events on Catch");
  assert.equal(projection?.cameFrom, "Meta lead ad");
});

test("a host website enquiry still reads as the host website", () => {
  const projection = projectInboxSource("salesInboundIntent", "web-1", intent({source: "website"}));
  assert.equal(projection?.cameFrom, "Host website");
  assert.equal(projection?.subtitle, "Wants to run events on Catch");
  assert.equal(projection?.journey[0].title, "Enquiry from the host website");
});
