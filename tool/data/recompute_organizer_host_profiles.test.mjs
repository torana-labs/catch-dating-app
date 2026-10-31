import assert from "node:assert/strict";
import test from "node:test";
import {verifyRecomputeCli} from "./lib/recompute_cli_test_support.mjs";
import {
  applyOrganizerHostProfileRepairPlan,
  buildOrganizerHostProfileRepairPlan,
} from "./recompute_organizer_host_profiles.mjs";

test("buildOrganizerHostProfileRepairPlan finds stale host projections",
  async () => {
    const firestore = fakeFirestore({
      hostProfiles: {
        "host-1": {
          displayName: "New Host",
          avatarUrl: "https://example.com/new-thumb.jpg",
        },
        "host-2": {
          displayName: "Second",
          avatarUrl: "https://example.com/second.jpg",
        },
      },
      organizers: {
        "club-1": {
          hostUserId: "host-1",
          hostName: "Old Host",
          hostAvatarUrl: "https://example.com/old.jpg",
        },
        "club-2": {
          hostUserId: "host-2",
          hostName: "Second",
          hostAvatarUrl: "https://example.com/second.jpg",
          ownerUserId: "host-2",
          hostUserIds: ["host-2"],
          hostProfiles: [{
            uid: "host-2",
            displayName: "Second",
            avatarUrl: "https://example.com/second.jpg",
            role: "owner",
          }],
          profileImageUrl: null,
        },
        "club-3": {
          hostUserId: "missing",
          hostName: "Missing",
        },
      },
    });

    const plan = await buildOrganizerHostProfileRepairPlan(firestore);

    assert.deepEqual(plan.summary.repairs, [
      {
        path: "organizers/club-1",
        organizerId: "club-1",
        hostUserId: "host-1",
        current: {
          hostName: "Old Host",
          hostAvatarUrl: "https://example.com/old.jpg",
          ownerUserId: null,
          hostUserIds: [],
          hostProfiles: [],
          profileImageUrl: null,
        },
        expected: {
          hostName: "New Host",
          hostAvatarUrl: "https://example.com/new-thumb.jpg",
          ownerUserId: "host-1",
          hostUserIds: ["host-1"],
          hostProfiles: [{
            uid: "host-1",
            displayName: "New Host",
            avatarUrl: "https://example.com/new-thumb.jpg",
            role: "owner",
          }],
          profileImageUrl: null,
        },
      },
      {
        path: "organizers/club-3",
        organizerId: "club-3",
        hostUserId: "missing",
        current: {
          hostName: "Missing",
          hostAvatarUrl: null,
          ownerUserId: null,
          hostUserIds: [],
          hostProfiles: [],
          profileImageUrl: null,
        },
        expected: {
          hostName: "Missing",
          hostAvatarUrl: null,
          ownerUserId: "missing",
          hostUserIds: ["missing"],
          hostProfiles: [{
            uid: "missing",
            displayName: "Missing",
            avatarUrl: null,
            role: "owner",
          }],
          profileImageUrl: null,
        },
      },
    ]);
    assert.deepEqual(plan.summary.warnings, [
      "organizers/club-3 has no hostProfiles/missing; using the existing club host snapshot fallback.",
    ]);
  }
);

test("buildOrganizerHostProfileRepairPlan refreshes multi-host projections",
  async () => {
    const firestore = fakeFirestore({
      hostProfiles: {
        "owner-1": {
          displayName: "Owner One",
          avatarUrl: "https://example.com/owner.jpg",
        },
        "cohost-1": {
          displayName: "Co Host",
          avatarUrl: "https://example.com/cohost.jpg",
        },
      },
      organizers: {
        "club-1": {
          hostUserId: "owner-1",
          ownerUserId: "owner-1",
          hostUserIds: ["owner-1", "cohost-1"],
          hostProfiles: [{
            uid: "owner-1",
            displayName: "Stale Owner",
            avatarUrl: null,
            role: "owner",
          }],
          hostName: "Stale Owner",
          hostAvatarUrl: null,
          profileImageUrl: "https://example.com/club-profile.jpg",
        },
      },
    });

    const plan = await buildOrganizerHostProfileRepairPlan(firestore);

    assert.deepEqual(plan.summary.repairs, [
      {
        path: "organizers/club-1",
        organizerId: "club-1",
        hostUserId: "owner-1",
        current: {
          hostName: "Stale Owner",
          hostAvatarUrl: null,
          ownerUserId: "owner-1",
          hostUserIds: ["owner-1", "cohost-1"],
          hostProfiles: [{
            uid: "owner-1",
            displayName: "Stale Owner",
            avatarUrl: null,
            role: "owner",
          }],
          profileImageUrl: "https://example.com/club-profile.jpg",
        },
        expected: {
          hostName: "Owner One",
          hostAvatarUrl: "https://example.com/owner.jpg",
          ownerUserId: "owner-1",
          hostUserIds: ["owner-1", "cohost-1"],
          hostProfiles: [
            {
              uid: "owner-1",
              displayName: "Owner One",
              avatarUrl: "https://example.com/owner.jpg",
              role: "owner",
            },
            {
              uid: "cohost-1",
              displayName: "Co Host",
              avatarUrl: "https://example.com/cohost.jpg",
              role: "host",
            },
          ],
          profileImageUrl: "https://example.com/club-profile.jpg",
        },
      },
    ]);
  }
);

test("applyOrganizerHostProfileRepairPlan writes only planned host fields",
  async () => {
    const firestore = fakeFirestore({
      hostProfiles: {},
      organizers: {
        "club-1": {hostName: "Old", area: "Bandra"},
        "club-2": {hostName: "Stable"},
      },
    });

    await applyOrganizerHostProfileRepairPlan(firestore, {
      repairs: [
        {
          path: "organizers/club-1",
          expected: {
            hostName: "New",
            hostAvatarUrl: "https://example.com/new.jpg",
          },
        },
      ],
    });

    assert.deepEqual(firestore.data.organizers["club-1"], {
      hostName: "New",
      hostAvatarUrl: "https://example.com/new.jpg",
      area: "Bandra",
    });
    assert.equal(firestore.data.organizers["club-2"].hostName, "Stable");
  }
);

function fakeFirestore(initialData) {
  const data = structuredClone(initialData);
  return {
    data,
    collection: (collectionName) => ({
      get: async () => ({
        size: Object.keys(data[collectionName] ?? {}).length,
        docs: Object.entries(data[collectionName] ?? {}).map(([id, value]) =>
          docSnapshot(collectionName, id, value)
        ),
      }),
    }),
    doc: (documentPath) => ({
      path: documentPath,
      update: (patch) => {
        const [collectionName, docId] = documentPath.split("/");
        data[collectionName][docId] = {
          ...data[collectionName][docId],
          ...patch,
        };
      },
    }),
    batch: () => {
      const writes = [];
      return {
        update: (ref, patch) => writes.push(() => ref.update(patch)),
        commit: async () => {
          for (const write of writes) write();
        },
      };
    },
  };
}

function docSnapshot(collectionName, id, value) {
  return {
    id,
    ref: {path: `${collectionName}/${id}`},
    data: () => ({...value}),
  };
}

test("CLI shared helpers preserve project precedence and dry-run policy", (t) => {
  verifyRecomputeCli(t, new URL("./recompute_organizer_host_profiles.mjs", import.meta.url), {organizers: {organizer: {hostUserId: "host", hostName: "Old"}}, hostProfiles: {host: {displayName: "New"}}});
});
