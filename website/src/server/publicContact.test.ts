import {expect, it, vi} from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./publicCatalog", () => ({publicFirestore: vi.fn()}));
import {fallbackPublicContact, parsePublicContactDocument} from "../content/publicContact";
import {loadPublicContact} from "./publicContact";
import {brand} from "@catch/brand";

const doc = (revision: number, supportEmail: string) => ({schemaVersion: 1, revision, supportEmail});

it("projects only the allowed public email and observes a new document on the next read", async () => {
  let current: unknown = doc(1, brand.support.email);
  const read = vi.fn(async () => current);
  expect(await loadPublicContact(read)).toEqual({supportEmail: brand.support.email});
  current = doc(2, "support@example.org");
  expect(await loadPublicContact(read)).toEqual({supportEmail: "support@example.org"});
  expect(read).toHaveBeenCalledTimes(2);
  expect(Object.keys(await loadPublicContact(read))).toEqual(["supportEmail"]);
});

it.each([
  null, {}, doc(0, "support@example.org"), doc(1, "Bad Name <support@example.org>"),
  doc(1, "support@example.org?subject=bad"), doc(1, "SUPPORT@example.org"),
  doc(1, "support%0d%0a@example.org"), doc(1, "support..team@example.org"),
  {...doc(1, "support@example.org"), privateKey: "secret"},
])("uses the source-controlled Gmail address for missing or malformed config: %j", async value => {
  expect(parsePublicContactDocument(value)).toBeNull();
  expect(await loadPublicContact(async () => value)).toEqual(fallbackPublicContact);
});

it("uses the source-controlled Gmail address if Firestore is unavailable", async () => {
  expect(await loadPublicContact(async () => {throw new Error("unavailable");})).toEqual(fallbackPublicContact);
});

it("uses the source-controlled Gmail address when a Firestore read never resolves", async () => {
  vi.useFakeTimers();
  try {
    const result = loadPublicContact(() => new Promise<never>(() => {}));
    await vi.advanceTimersByTimeAsync(2_000);
    expect(await result).toEqual(fallbackPublicContact);
  } finally {
    vi.useRealTimers();
  }
});

it("does not share one request's contact with another or retain it after failure", async () => {
  const first = await loadPublicContact(async () => doc(3, "first@example.org"));
  const second = await loadPublicContact(async () => doc(4, "second@example.org"));
  const third = await loadPublicContact(async () => {throw new Error("unavailable");});
  expect([first.supportEmail, second.supportEmail, third.supportEmail]).toEqual([
    "first@example.org", "second@example.org", brand.support.email,
  ]);
});
