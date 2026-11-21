import {expect, it, vi} from "vitest";

const sdk = vi.hoisted(() => ({listeners: [] as Array<{path: string; filters: unknown[]; next: (snapshot: unknown) => void}>}));
vi.mock("./firebase", () => ({getSignedInFirestore: vi.fn(async () => ({name: "firestore"}))}));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({path}),
  where: (field: string, op: string, value: unknown) => ({field, op, value}),
  limit: (count: number) => ({limit: count}),
  query: (source: {path: string}, ...filters: unknown[]) => ({path: source.path, filters}),
  onSnapshot: (source: {path: string; filters: unknown[]}, next: (snapshot: unknown) => void) => {
    sdk.listeners.push({path: source.path, filters: source.filters, next});
    return vi.fn();
  },
}));
import {trackingSettingsEditable, watchOwnAccountRows} from "./firebaseReadModels";

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

it("the account page listens to the guest's own rows, filtered by their UID, and reports once all three arrive", async () => {
  sdk.listeners.length = 0;
  const onValue = vi.fn();
  await watchOwnAccountRows("guest", onValue, vi.fn());
  expect(sdk.listeners.map(({path, filters}) => [path, filters])).toEqual([
    ["guestEventStatuses", [{field: "uid", op: "==", value: "guest"}, {limit: 200}]],
    ["organizerFollows", [{field: "uid", op: "==", value: "guest"}, {field: "status", op: "==", value: "active"}, {limit: 200}]],
    ["reviews", [{field: "reviewerUserId", op: "==", value: "guest"}, {limit: 200}]],
  ]);
  const snapshot = (id: string) => ({docs: [{id, data: () => ({uid: "guest"})}]});
  sdk.listeners[0].next(snapshot("e1_guest"));
  sdk.listeners[1].next(snapshot("o_guest"));
  expect(onValue).not.toHaveBeenCalled();
  sdk.listeners[2].next({docs: []});
  expect(onValue).toHaveBeenCalledWith({plans: [{id: "e1_guest", data: {uid: "guest"}}],
    follows: [{id: "o_guest", data: {uid: "guest"}}], reviews: []});
});
