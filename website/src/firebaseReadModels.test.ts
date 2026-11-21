import {expect, it, vi} from "vitest";

vi.mock("./firebase", () => ({getSignedInFirestore: vi.fn()}));
import {trackingSettingsEditable} from "./firebaseReadModels";

it("tracking settings are editable only on a live owned page that its owner created or verified", () => {
  const created = {ownerUserId: "owner", ownership: {state: "userCreated"}};
  expect(trackingSettingsEditable(created)).toBe(true);
  expect(trackingSettingsEditable({ownerUserId: "owner", claim: {state: "verified"}})).toBe(true);
  expect(trackingSettingsEditable(null)).toBe(false);
  expect(trackingSettingsEditable({ownership: {state: "userCreated"}})).toBe(false);
  expect(trackingSettingsEditable({...created, archived: true})).toBe(false);
  expect(trackingSettingsEditable({...created, status: "archived"})).toBe(false);
  expect(trackingSettingsEditable({...created, claim: {state: "suppressed"}})).toBe(false);
  expect(trackingSettingsEditable({ownerUserId: "owner", claim: {state: "pending"}})).toBe(false);
});
