import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {
  organizerPublicationPatch,
  organizerPublicationRoute,
  updateOrganizerHandler,
} from "./mutateOrganizer";
import {defaultOrganizerPublicSlug} from "./organizerIdentity";

type Row = Record<string, unknown>;

/** The reads and writes updateOrganizerHandler makes, and nothing else. */
function organizerStore(rows: Record<string, Row>) {
  const updates: Array<{path: string; patch: Row}> = [];
  const ref = (path: string) => ({path});
  const db = {
    collection: (name: string) => ({doc: (id: string) => ref(`${name}/${id}`)}),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn({
      get: async ({path}: {path: string}) => ({exists: path in rows,
        data: () => rows[path] === undefined ? undefined :
          structuredClone(rows[path])}),
      update: ({path}: {path: string}, patch: Row) => {
        updates.push({path, patch});
        rows[path] = {...rows[path], ...patch};
      },
    }),
  };
  return {
    rows,
    updates,
    deps: {
      firestore: () => db as unknown as FirebaseFirestore.Firestore,
      serverTimestamp: () =>
        "SERVER_TIMESTAMP" as unknown as FirebaseFirestore.FieldValue,
      deleteStoragePaths: async () => undefined,
    },
  };
}

function hostRequest(uid: string, data: Row): CallableRequest<unknown> {
  return {auth: {uid, token: {}}, data,
    rawRequest: {headers: {}}} as unknown as CallableRequest<unknown>;
}

const teamOrganizer = (overrides: Row = {}): Row => ({
  name: "Neemwood Run Club", description: "Easy social runs.",
  location: "in-dl-delhi-ncr", area: "Saket", hostUserId: "owner-1",
  ownerUserId: "owner-1", hostUserIds: ["owner-1", "manager-1"],
  hostProfiles: [], ...overrides,
});

async function rejectsWith(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error) =>
    (error as {code?: string}).code === code);
}

test("publishing maps one owner intent to governed discovery fields", () => {
  assert.deepEqual(organizerPublicationPatch(true), {
    "appVisibility": "discoverable",
    "publicPage.publishStatus": "published",
    "publicPage.indexStatus": "indexReady",
    "publicPage.robots": "index, follow",
  });
});

test(
  "unpublishing preserves the workspace behind private discovery fields",
  () => {
    assert.deepEqual(organizerPublicationPatch(false), {
      "appVisibility": "hidden",
      "publicPage.publishStatus": "draft",
      "publicPage.indexStatus": "noindex",
      "publicPage.robots": "noindex, follow",
    });
  }
);

test("publishing a legacy organizer derives a reservable website route", () => {
  const organizerId = "fJlZbx9BewUXsOZwQKv3";
  const slug = defaultOrganizerPublicSlug("Neemwood Run Club", organizerId);

  assert.deepEqual(
    organizerPublicationRoute(organizerId, {
      name: "Neemwood Run Club",
      location: "in-dl-delhi-ncr",
    }),
    {
      slug,
      citySlug: "delhi-ncr",
      canonicalPath: `/organizers/${slug}/`,
      needsIdentityPatch: true,
    }
  );
});

test("publishing preserves an existing organizer route identity", () => {
  assert.deepEqual(
    organizerPublicationRoute("organizer-one", {
      name: "Neemwood Run Club",
      location: "in-dl-delhi-ncr",
      publicPage: {
        slug: "neemwood-run-club",
        citySlug: "delhi-ncr",
        canonicalPath: "/organizers/neemwood-run-club/",
        publishStatus: "draft",
        indexStatus: "noindex",
        robots: "noindex, follow",
        seoTitle: null,
        seoDescription: null,
        lastRenderedAt: null,
      },
    }),
    {
      slug: "neemwood-run-club",
      citySlug: "delhi-ncr",
      canonicalPath: "/organizers/neemwood-run-club/",
      needsIdentityPatch: false,
    }
  );
});

test("owners and managers declare the women-led default with audit fields",
  async () => {
    const store = organizerStore({"organizers/club-1": teamOrganizer()});
    await updateOrganizerHandler(hostRequest("owner-1", {
      organizerId: "club-1", fields: {womenLed: true}}), store.deps);
    assert.deepEqual(store.rows["organizers/club-1"].womenLed, {
      value: true, setByUid: "owner-1", setByRole: "owner",
      setAt: "SERVER_TIMESTAMP", lockedByAdmin: false});

    await updateOrganizerHandler(hostRequest("manager-1", {
      organizerId: "club-1", fields: {womenLed: false}}), store.deps);
    assert.deepEqual(store.rows["organizers/club-1"].womenLed, {
      value: false, setByUid: "manager-1", setByRole: "manager",
      setAt: "SERVER_TIMESTAMP", lockedByAdmin: false});

    // Repeating the stored value writes nothing.
    const writes = store.updates.length;
    await updateOrganizerHandler(hostRequest("manager-1", {
      organizerId: "club-1", fields: {womenLed: false}}), store.deps);
    assert.equal(store.updates.length, writes);
  });

test("managers may set women-led but still not organizer identity",
  async () => {
    const store = organizerStore({"organizers/club-1": teamOrganizer()});
    await rejectsWith(updateOrganizerHandler(hostRequest("manager-1", {
      organizerId: "club-1", fields: {womenLed: true, name: "Renamed"}}),
    store.deps), "permission-denied");
    assert.equal(store.rows["organizers/club-1"].womenLed, undefined);
  });

test("people outside the organizer team cannot declare women-led",
  async () => {
    const store = organizerStore({"organizers/club-1": teamOrganizer()});
    await rejectsWith(updateOrganizerHandler(hostRequest("guest-1", {
      organizerId: "club-1", fields: {womenLed: true}}), store.deps),
    "permission-denied");
    assert.equal(store.updates.length, 0);
  });

test("an admin lock refuses the Host's women-led declaration", async () => {
  const lock = {value: false, setByUid: "admin-1", setByRole: "admin",
    setAt: "EARLIER", lockedByAdmin: true};
  const store = organizerStore({"organizers/club-1":
    teamOrganizer({womenLed: lock})});
  await rejectsWith(updateOrganizerHandler(hostRequest("owner-1", {
    organizerId: "club-1", fields: {womenLed: true}}), store.deps),
  "failed-precondition");
  // Declining keeps the lock in place.
  await updateOrganizerHandler(hostRequest("owner-1", {
    organizerId: "club-1", fields: {womenLed: false}}), store.deps);
  assert.deepEqual(store.rows["organizers/club-1"].womenLed, lock);
});

test("an imported page publishes only once its identity is verified",
  async () => {
    const provenance = (verification: string) => ({importProvenance: {
      requestId: "tryit-0123456789abcdef0123", listingId: "listing-1",
      contentHash: "b".repeat(64), sourceUrls: [],
      identities: [{platform: "luma", url: "https://luma.com/driftwood-bay-runners"}],
      verification, importedAt: "EARLIER"}});
    const store = organizerStore({"organizers/club-1":
      teamOrganizer(provenance("unverified"))});
    await assert.rejects(updateOrganizerHandler(hostRequest("owner-1", {
      organizerId: "club-1", fields: {publicListingEnabled: true}}),
    store.deps), (error) => (error as {code?: string}).code ===
      "failed-precondition" && (error as {details?: {reason?: string}})
      .details?.reason === "import_verification_required");
    assert.equal(store.updates.length, 0);
    // Other edits still save while the import waits for verification.
    await updateOrganizerHandler(hostRequest("owner-1", {
      organizerId: "club-1", fields: {description: "Saturday runs."}}),
    store.deps);
    assert.equal(store.rows["organizers/club-1"].description, "Saturday runs.");

    for (const verification of ["verified", "not_needed"]) {
      const ready = organizerStore({"organizers/club-1":
        teamOrganizer(provenance(verification))});
      await updateOrganizerHandler(hostRequest("owner-1", {
        organizerId: "club-1", fields: {publicListingEnabled: true}}),
      {...ready.deps, reserveCanonicalRoute: async () => undefined});
      assert.equal(ready.updates.length, 1, verification);
    }
  });
