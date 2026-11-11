import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  backfillPublicOrganizers, projectPublicOrganizer, publicOrganizerEligible,
  reconcilePublicOrganizer, PUBLIC_ORGANIZER_FIELDS,
} from "./publicOrganizerProjection";
import {validatePublicOrganizerDocument} from
  "../shared/generated/validators/publicOrganizerDocument";

type Row = Record<string, unknown>;

const organizerDoc = (): Row => JSON.parse(readFileSync(
  "../contracts/fixtures/valid/organizer_doc.json", "utf8"));
const publicSchema = JSON.parse(readFileSync(
  "../contracts/firestore/public_organizers.schema.json", "utf8"));

class FakeStore {
  rows = new Map<string, Row>();
  writes: string[] = [];
  collection(name: string) {
    return new FakeQuery(this, name);
  }
  async runTransaction<T>(fn: (tx: {
    get: (ref: FakeRef) => Promise<unknown>;
    set: (ref: FakeRef, data: Row) => void;
    delete: (ref: FakeRef) => void;
  }) => Promise<T>): Promise<T> {
    return fn({
      get: async (ref) => this.snapshot(ref.path),
      set: (ref, data) => {
        this.writes.push(`set ${ref.path}`);
        this.rows.set(ref.path, structuredClone(data));
      },
      delete: (ref) => {
        this.writes.push(`delete ${ref.path}`);
        this.rows.delete(ref.path);
      },
    });
  }
  snapshot(path: string) {
    const row = this.rows.get(path);
    return {exists: row !== undefined, id: path.split("/").at(-1)!,
      data: () => row === undefined ? undefined : structuredClone(row)};
  }
  db() {
    return this as unknown as FirebaseFirestore.Firestore;
  }
}

class FakeRef {
  constructor(readonly path: string) {}
}

class FakeQuery {
  constructor(readonly store: FakeStore, readonly name: string,
    readonly max = Infinity, readonly after: string | null = null) {}
  doc(id: string) {
    return new FakeRef(`${this.name}/${id}`);
  }
  orderBy() {
    return this;
  }
  limit(max: number) {
    return new FakeQuery(this.store, this.name, max, this.after);
  }
  startAfter(doc: {id: string}) {
    return new FakeQuery(this.store, this.name, this.max, doc.id);
  }
  async get() {
    const docs = [...this.store.rows.keys()]
      .filter((path) => path.startsWith(`${this.name}/`))
      .map((path) => path.slice(this.name.length + 1))
      .sort()
      .filter((id) => this.after === null || id > this.after)
      .slice(0, this.max)
      .map((id) => this.store.snapshot(`${this.name}/${id}`));
    return {docs};
  }
}

const deps = (store: FakeStore) => ({firestore: () => store.db()});

test("the allowlist matches the public contract exactly", () => {
  assert.deepEqual([...PUBLIC_ORGANIZER_FIELDS].sort(),
    Object.keys(publicSchema.properties).sort());
});

test("private fields never reach the projection", () => {
  const source = {...organizerDoc(), provenance: {source: "supply_intake"},
    adminSearch: {tokens: ["x"]}, hostDefaults: {}, claim: {state: "claimed"},
    intakeLearningSource: "x", ownerLinks: [], publicSources: []};
  const projection = projectPublicOrganizer(source);
  for (const field of ["email", "phoneNumber", "provenance", "adminSearch",
    "hostDefaults", "claim", "intakeLearningSource", "ownerLinks",
    "publicSources", "archiveReason"]) {
    assert.equal(field in projection, false, field);
  }
  assert.equal(validatePublicOrganizerDocument(projection), true,
    JSON.stringify(validatePublicOrganizerDocument.errors));
  assert.equal(validatePublicOrganizerDocument(
    {...projection, email: "host@example.com"}), false);
});

test("only shown or hosted organizers are eligible", () => {
  const base = organizerDoc();
  assert.equal(publicOrganizerEligible(undefined), false);
  assert.equal(publicOrganizerEligible({...base, status: "deleted"}), false);
  assert.equal(publicOrganizerEligible({...base, hostUserId: null,
    ownerUserId: null, hostUserIds: [], appVisibility: "hidden"}), false);
  assert.equal(publicOrganizerEligible({...base, hostUserId: null,
    ownerUserId: null, hostUserIds: [], appVisibility: "discoverable"}), true);
  assert.equal(publicOrganizerEligible({...base, appVisibility: "hidden",
    hostUserId: "host-1"}), true);
  assert.equal(publicOrganizerEligible({...base, status: "archived",
    hostUserId: "host-1"}), true);
});

test("reconcile writes, skips unchanged, removes and refuses invalid",
  async () => {
    const store = new FakeStore();
    store.rows.set("organizers/o1", {...organizerDoc(), hostUserId: "host-1"});
    assert.equal(await reconcilePublicOrganizer("o1", deps(store)), "written");
    const written = store.rows.get("publicOrganizers/o1")!;
    assert.equal(written.email, undefined);
    assert.equal(written.name, organizerDoc().name);
    assert.equal(await reconcilePublicOrganizer("o1", deps(store)),
      "unchanged");

    store.rows.set("organizers/o1", {...store.rows.get("organizers/o1")!,
      name: ""});
    assert.equal(await reconcilePublicOrganizer("o1", deps(store)), "invalid");
    assert.equal(store.rows.has("publicOrganizers/o1"), false);

    store.rows.set("organizers/o1", {...organizerDoc(), hostUserId: "host-1"});
    await reconcilePublicOrganizer("o1", deps(store));
    store.rows.delete("organizers/o1");
    assert.equal(await reconcilePublicOrganizer("o1", deps(store)), "removed");
    assert.equal(await reconcilePublicOrganizer("o1", deps(store)), "absent");
    assert.equal([...store.writes].some((w) => w.startsWith("set organizers") ||
      w.startsWith("delete organizers")), false);
  });

test("backfill dry run writes nothing; apply writes projections only",
  async () => {
    const store = new FakeStore();
    for (let index = 0; index < 205; index++) {
      store.rows.set(`organizers/o${String(index).padStart(3, "0")}`,
        {...organizerDoc(), hostUserId: "host-1"});
    }
    store.rows.set("organizers/scraped", {...organizerDoc(), hostUserId: null,
      ownerUserId: null, hostUserIds: [], appVisibility: "hidden"});
    const before = structuredClone([...store.rows.entries()]);
    assert.deepEqual(await backfillPublicOrganizers(deps(store), false),
      {eligible: 205, ineligible: 1});
    assert.deepEqual([...store.rows.entries()], before);
    assert.deepEqual(await backfillPublicOrganizers(deps(store), true),
      {written: 205, absent: 1});
    assert.equal(store.writes.every((w) =>
      w.startsWith("set publicOrganizers/")), true);
    assert.deepEqual(await backfillPublicOrganizers(deps(store), true),
      {unchanged: 205, absent: 1});
  });
