import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {
  refreshOrganizerNextEvent,
  syncOrganizerNextEventHandler,
} from "./syncOrganizerNextEvent";

test("refreshOrganizerNextEvent stores the earliest upcoming active event",
  async () => {
    const now = timestamp("2026-05-12T10:00:00.000Z");
    const soon = timestamp("2026-05-13T10:00:00.000Z");
    const later = timestamp("2026-05-14T10:00:00.000Z");
    const past = timestamp("2026-05-11T10:00:00.000Z");
    const firestore = fakeFirestore({
      "organizers/organizer-1": {nextEventAt: null, nextEventLabel: null},
      "events/past": event("organizer-1", past, "Past gate"),
      "events/later": event("organizer-1", later, "Later gate"),
      "events/soon": event("organizer-1", soon, "Soon gate"),
      "events/cancelled": event(
        "organizer-1", soon, "Cancelled gate", "cancelled"
      ),
      "events/other-organizer": event("organizer-2", soon, "Other gate"),
    });

    await refreshOrganizerNextEvent("organizer-1", {
      firestore: () => firestore as never,
      nowTimestamp: () => now,
    });

    const expectedProjection = {
      nextEventAt: soon,
      nextEventLabel: "Soon gate",
    };
    assert.deepEqual(
      firestore.get("organizers/organizer-1"), expectedProjection
    );
  }
);

test("refreshOrganizerNextEvent clears projection when no future event exists",
  async () => {
    const now = timestamp("2026-05-12T10:00:00.000Z");
    const firestore = fakeFirestore({
      "organizers/organizer-1": {
        nextEventAt: timestamp("2026-05-13T10:00:00.000Z"),
        nextEventLabel: "Old gate",
      },
      "events/past": event(
        "organizer-1", timestamp("2026-05-11T10:00:00.000Z"), "Past gate"
      ),
      "events/cancelled": event(
        "organizer-1", timestamp("2026-05-13T10:00:00.000Z"),
        "Cancelled gate", "cancelled"
      ),
    });

    await refreshOrganizerNextEvent("organizer-1", {
      firestore: () => firestore as never,
      nowTimestamp: () => now,
    });

    const expectedProjection = {
      nextEventAt: null,
      nextEventLabel: null,
    };
    assert.deepEqual(
      firestore.get("organizers/organizer-1"), expectedProjection
    );
  }
);

test("syncOrganizerNextEventHandler refreshes moved organizers", async () => {
  const refreshed: string[] = [];
  const now = timestamp("2026-05-12T10:00:00.000Z");
  const firestore = fakeFirestore({
    "organizers/organizer-1": {},
    "organizers/organizer-2": {},
  });

  const deps = {
    nowTimestamp: () => now,
    firestore: () => ({
      ...firestore,
      collection: (path: string) => {
        if (path === "organizers") {
          return {
            doc: (id: string) => {
              refreshed.push(id);
              return firestore.collection(path).doc(id);
            },
          };
        }
        return firestore.collection(path);
      },
    }) as never,
  };

  await syncOrganizerNextEventHandler(
    {organizerId: "organizer-1"} as never,
    {organizerId: "organizer-2"} as never,
    deps
  );

  assert.deepEqual(refreshed.sort(), ["organizer-1", "organizer-2"]);
});

test("an unlabelled row never takes the projection at a tied start time",
  async () => {
    const start = timestamp("2026-05-13T10:00:00.000Z");
    const firestore = fakeFirestore({
      "organizers/organizer-1": {},
      "events/a-unlabelled": unlabelledEvent(
        "organizer-1", start, "Unlabelled gate"),
      "events/z-public": event("organizer-1", start, "Public gate"),
    });
    await refreshOrganizerNextEvent("organizer-1", {
      firestore: () => firestore as never,
      nowTimestamp: () => timestamp("2026-05-12T10:00:00.000Z"),
    });
    assert.equal(firestore.get("organizers/organizer-1").nextEventLabel,
      "Public gate");
  });

test("private-only events clear the old public projection", async () => {
  const start = timestamp("2026-05-13T10:00:00.000Z");
  const firestore = fakeFirestore({
    "organizers/organizer-1": {nextEventAt: start,
      nextEventLabel: "Previously public"},
    "events/now-private": {...event("organizer-1", start, "Private"),
      publicationState: "private", setupRevision: 2},
  });
  await refreshOrganizerNextEvent("organizer-1", {
    firestore: () => firestore as never,
    nowTimestamp: () => timestamp("2026-05-12T10:00:00.000Z"),
  });
  assert.deepEqual(firestore.get("organizers/organizer-1"), {
    nextEventAt: null, nextEventLabel: null,
  });
});

test("the usual next-event read is a single bounded query", async () => {
  const start = timestamp("2026-05-13T10:00:00.000Z");
  const firestore = fakeFirestore({
    "organizers/organizer-1": {nextEventLabel: "Old label"},
    "events/a-public": event("organizer-1", start, "Public gate"),
    "events/z-public": event("organizer-1", start, "Later gate"),
  });
  await refreshOrganizerNextEvent("organizer-1", {
    firestore: () => firestore as never,
    nowTimestamp: () => timestamp("2026-05-12T10:00:00.000Z"),
  });
  assert.equal(firestore.queryReads(), 1);
  assert.equal(firestore.get("organizers/organizer-1").nextEventLabel,
    "Public gate");
});

test("private drafts do not mask the next published event",
  async () => {
    {
      const start = timestamp("2026-05-13T10:00:00.000Z");
      const initial: Record<string, Record<string, unknown>> = {
        "organizers/organizer-1": {nextEventLabel: "Previously visible"},
        "events/z-public": event("organizer-1", start, "Public gate"),
      };
      // More than one continuation page, with every start time tied.
      for (let index = 0; index < 65; index++) {
        initial[`events/a-private-${String(index).padStart(3, "0")}`] = {
          ...event("organizer-1", start, "Private location"),
          publicationState: "private", setupRevision: 2,
        };
      }
      const firestore = fakeFirestore(initial);
      await refreshOrganizerNextEvent("organizer-1", {
        firestore: () => firestore as never,
        nowTimestamp: () => timestamp("2026-05-12T10:00:00.000Z"),
      });
      assert.deepEqual(firestore.get("organizers/organizer-1"), {
        nextEventAt: start, nextEventLabel: "Public gate",
      });
      assert.equal(firestore.queryReads(), 3);
    }
  });

test("invalid progressive publication does not hide a later public row",
  async () => {
    const start = timestamp("2026-05-13T10:00:00.000Z");
    const invalid = unlabelledEvent("organizer-1", start, "Private location");
    invalid.setupRevision = 2;
    const firestore = fakeFirestore({
      "organizers/organizer-1": {},
      "events/a-unpublished": invalid,
      "events/z-public": event("organizer-1", start, "Public gate"),
    });
    await refreshOrganizerNextEvent("organizer-1", {
      firestore: () => firestore as never,
      nowTimestamp: () => timestamp("2026-05-12T10:00:00.000Z"),
    });
    assert.equal(firestore.get("organizers/organizer-1").nextEventLabel,
      "Public gate");
  });

function event(
  organizerId: string,
  startTime: FirebaseFirestore.Timestamp,
  meetingPoint: string,
  status = "active"
) {
  return {organizerId, publicationState: "published", startTime,
    meetingPoint, status};
}

/** A row without a publication state: invalid, so never public. */
function unlabelledEvent(
  organizerId: string,
  startTime: FirebaseFirestore.Timestamp,
  meetingPoint: string
): Record<string, unknown> {
  const unlabelled: Record<string, unknown> =
    event(organizerId, startTime, meetingPoint);
  delete unlabelled.publicationState;
  return unlabelled;
}

function timestamp(iso: string): FirebaseFirestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(new Date(iso));
}

function fakeFirestore(initialDocs: Record<string, Record<string, unknown>>) {
  let queryReads = 0;
  const docs = Object.fromEntries(
    Object.entries(initialDocs).map(([path, data]) => [path, {...data}])
  );
  return {
    queryReads: () => queryReads,
    get: (path: string) => docs[path],
    collection: (collectionPath: string) =>
      queryRef(collectionPath, []),
    runTransaction: async (callback: (tx: object) => Promise<unknown>) => {
      let writing = false;
      return callback({
        get: (ref: {get: () => Promise<unknown>}) => {
          assert.equal(writing, false, "transaction reads precede writes");
          return ref.get();
        },
        set: (ref: ReturnType<typeof docRef>,
          patch: Record<string, unknown>, options: {merge: boolean}) => {
          writing = true;
          return ref.set(patch, options);
        },
      });
    },
    batch: () => {
      const writes: Array<{
        ref: ReturnType<typeof docRef>;
        patch: Record<string, unknown>;
        options: {merge: boolean};
      }> = [];
      return {
        set: (
          ref: ReturnType<typeof docRef>,
          patch: Record<string, unknown>,
          options: {merge: boolean}
        ) => writes.push({ref, patch, options}),
        commit: async () => {
          await Promise.all(
            writes.map(({ref, patch, options}) => ref.set(patch, options))
          );
        },
      };
    },
  };

  function docRef(path: string) {
    return {
      get: async () => ({
        exists: docs[path] !== undefined,
        data: () => docs[path],
      }),
      set: async (
        patch: Record<string, unknown>,
        options: {merge: boolean}
      ) => {
        docs[path] = options.merge ? {...docs[path], ...patch} : patch;
      },
    };
  }

  function queryRef(
    collectionPath: string,
    filters: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>,
    order?: {field: string; direction: "asc" | "desc"},
    count?: number,
    afterPath?: string
  ) {
    return {
      doc: (docId: string) => docRef(`${collectionPath}/${docId}`),
      where: (field: string, operator: string, value: unknown) =>
        queryRef(collectionPath, [
          ...filters,
          {field, operator, value},
        ], order, count, afterPath),
      orderBy: (field: string, direction: "asc" | "desc") =>
        queryRef(collectionPath, filters, order ?? {field, direction},
          count, afterPath),
      limit: (limitCount: number) =>
        queryRef(collectionPath, filters, order, limitCount, afterPath),
      startAfter: (last: {path: string}) =>
        queryRef(collectionPath, filters, order, count, last.path),
      get: async () => {
        queryReads++;
        let results = Object.entries(docs)
          .filter(([path]) => path.startsWith(`${collectionPath}/`))
          .filter(([, data]) =>
            filters.every((filter) => matchesFilter(data, filter))
          );
        if (order) {
          results = results.sort((a, b) =>
            compareValues(
              a[1][order.field],
              b[1][order.field],
              order.direction
            ) || a[0].localeCompare(b[0])
          );
        }
        if (afterPath) {
          results = results.slice(
            results.findIndex(([path]) => path === afterPath) + 1);
        }
        const limited = count === undefined ? results : results.slice(0, count);
        return {
          size: limited.length,
          docs: limited.map(([path, data]) => ({path,
            data: () => ({...data})})),
        };
      },
    };
  }
}

function matchesFilter(
  data: Record<string, unknown>,
  filter: {field: string; operator: string; value: unknown}
): boolean {
  if (filter.operator === "==") {
    return data[filter.field] === filter.value;
  }
  if (filter.operator === ">=") {
    return millis(data[filter.field]) >= millis(filter.value);
  }
  throw new Error(`Unsupported fake query operator: ${filter.operator}`);
}

function compareValues(
  left: unknown,
  right: unknown,
  direction: "asc" | "desc"
) {
  const result = millis(left) - millis(right);
  return direction === "asc" ? result : -result;
}

function millis(value: unknown): number {
  if (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }
  throw new Error("Expected timestamp-like value.");
}
