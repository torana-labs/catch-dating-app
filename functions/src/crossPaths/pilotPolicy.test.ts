import assert from "node:assert/strict";
import test from "node:test";
import {
  crossPathsEventWriteInvalidationMode,
  crossPathsPilotEventEnabled,
  crossPathsPilotMarketId,
  crossPathsPilotMaximumEvents,
  crossPathsPilotMaximumMembers,
  crossPathsPilotMinimumEvents,
  crossPathsPilotMinimumMembers,
} from "./pilotPolicy";

test("the pilot is explicitly bounded to Mumbai supply", () => {
  assert.equal(crossPathsPilotMarketId, "in-mh-mumbai");
  assert.deepEqual(
    [crossPathsPilotMinimumEvents, crossPathsPilotMaximumEvents],
    [2, 3]
  );
  assert.deepEqual(
    [crossPathsPilotMinimumMembers, crossPathsPilotMaximumMembers],
    [20, 50]
  );
});

test(
  "real events require both the selected-event flag and Mumbai market",
  () => {
    assert.equal(crossPathsPilotEventEnabled({
      crossPathsDiscoveryEnabled: true,
      discoveryMarketId: "in-mh-mumbai",
    }), true);
    assert.equal(crossPathsPilotEventEnabled({
      crossPathsDiscoveryEnabled: false,
      discoveryMarketId: "in-mh-mumbai",
    }), false);
    assert.equal(crossPathsPilotEventEnabled({
      crossPathsDiscoveryEnabled: true,
      discoveryMarketId: "in-dl-delhi-ncr",
    }), false);
  }
);

test("explicit synthetic events retain a dev-only fixture path", () => {
  assert.equal(crossPathsPilotEventEnabled({
    crossPathsDiscoveryEnabled: true,
    discoveryMarketId: "us-ny-new-york",
    synthetic: true,
  }), true);
});

test(
  "event-gate rollback invalidates pending invitations but preserves plans",
  () => {
    const enabled = {
      status: "active",
      publicationState: "published",
      crossPathsDiscoveryEnabled: true,
      discoveryMarketId: "in-mh-mumbai",
    };
    assert.equal(crossPathsEventWriteInvalidationMode(
      enabled,
      {...enabled, crossPathsDiscoveryEnabled: false}
    ), "pending");
    assert.equal(crossPathsEventWriteInvalidationMode(
      {...enabled, publicationState: "published"},
      {...enabled, publicationState: "private"}
    ), "pending");
    assert.equal(crossPathsEventWriteInvalidationMode(
      {...enabled, publicationState: "private"},
      {...enabled, publicationState: "published"}
    ), "none");
    assert.equal(crossPathsEventWriteInvalidationMode(
      enabled,
      {...enabled, status: "cancelled"}
    ), "all");
    assert.equal(crossPathsEventWriteInvalidationMode(
      {...enabled, crossPathsDiscoveryEnabled: false},
      enabled
    ), "none");
  }
);
