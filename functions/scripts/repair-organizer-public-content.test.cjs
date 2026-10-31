"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {parseArgs, run} = require("./repair-organizer-public-content.cjs");

const repoRoot = path.resolve(__dirname, "../..");
const DELETE = Symbol("delete");

class FakeTimestamp {
  constructor(seconds, nanoseconds) {
    this._seconds = seconds;
    this._nanoseconds = nanoseconds;
  }
}

// A contract-valid organizer, so a clean document also passes --check.
function baseOrganizer() {
  const schema = JSON.parse(fs.readFileSync(
    path.join(repoRoot, "contracts/firestore/organizers.schema.json"), "utf8"));
  const organizer = JSON.parse(fs.readFileSync(
    path.join(repoRoot, "contracts/fixtures/valid/organizer_doc.json"), "utf8"));
  return {
    ...Object.fromEntries(Object.entries(organizer)
      .filter(([key]) => key in schema.properties)),
    followerCount: 0,
    organizerPhotos: [],
    organizerType: "club",
  };
}

function leakedOrganizer() {
  return {
    ...baseOrganizer(),
    name: "AFTER FLY",
    description: "AFTER FLY is an Indore organizer discovered through a " +
      "public Luma event page.",
    publicProfile: {
      headline: "AFTER FLY run club in Indore",
      summary: "This unclaimed profile stays out of search until verified.",
      sourceSummary: null,
      formats: ["Social runs"],
      facts: [
        {label: "Location", value: "Indore, Madhya Pradesh"},
        {label: "Claim state", value: "Unclaimed seed listing"},
      ],
      fitNotes: ["Internal market rationale."],
      missingEvidence: ["Owner verification or claim"],
      eventEvidence: [],
    },
    publicSources: [
      {
        type: "user_supplied",
        label: "User seed input",
        detail: "User requested an initial listing.",
        href: null,
        confidence: "medium",
        lastCheckedAt: new FakeTimestamp(1781049600, 0),
      },
      {
        type: "public_event_page",
        label: "Luma event page",
        detail: "Public Luma page for AFTERFLY TAKEOFF RUN & RAVE.",
        href: "https://luma.com/pxgmph3b",
        confidence: "high",
        lastCheckedAt: new FakeTimestamp(1781049600, 0),
      },
    ],
  };
}

function hostCreatedOrganizer() {
  return {
    ...baseOrganizer(),
    name: "Courtside",
    description: "Racket sports and socials in Mumbai.",
    publicProfile: {
      headline: null,
      summary: null,
      sourceSummary: null,
      formats: [],
      facts: [],
      fitNotes: [],
      missingEvidence: [],
      eventEvidence: [],
    },
    publicSources: [],
  };
}

function cleanOrganizer() {
  const organizer = hostCreatedOrganizer();
  delete organizer.publicProfile.fitNotes;
  delete organizer.publicProfile.missingEvidence;
  return organizer;
}

// Like Firestore, snapshots hand out copies that keep Timestamp instances.
function clone(value) {
  if (value instanceof FakeTimestamp) {
    return new FakeTimestamp(value._seconds, value._nanoseconds);
  }
  if (Array.isArray(value)) return value.map(clone);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, nested]) =>
    [key, clone(nested)]));
}

function fakeDb(docs, {beforeTransaction} = {}) {
  const snapshot = (docPath) => ({
    ref: {path: docPath},
    exists: docs[docPath] !== undefined,
    data: () => clone(docs[docPath]),
  });
  return {
    writes: [],
    collection(name) {
      return {
        doc: (id) => ({get: async () => snapshot(`${name}/${id}`)}),
        get: async () => ({
          docs: Object.keys(docs)
            .filter((docPath) => docPath.startsWith(`${name}/`))
            .map(snapshot),
        }),
      };
    },
    doc(docPath) {
      return {path: docPath};
    },
    async runTransaction(callback) {
      beforeTransaction?.(docs);
      const tx = {
        get: async (ref) => snapshot(ref.path),
        update: (ref, patch) => {
          this.writes.push({path: ref.path, patch});
          for (const [field, value] of Object.entries(patch)) {
            const segments = field.split(".");
            let cursor = docs[ref.path];
            for (const segment of segments.slice(0, -1)) {
              cursor = cursor[segment];
            }
            if (value === DELETE) delete cursor[segments.at(-1)];
            else cursor[segments.at(-1)] = value;
          }
        },
      };
      return callback(tx);
    },
  };
}

async function invoke(argv, db, prodProject = "catchdates-prod") {
  const lines = [];
  const status = await run(argv, {
    db,
    prodProject,
    Timestamp: FakeTimestamp,
    deleteField: () => DELETE,
    log: (line) => lines.push(line),
  });
  return {status, report: JSON.parse(lines[0]), lines};
}

function writeReplacements(value) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "organizer-content-"));
  const file = path.join(dir, "replacements.json");
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
}

const afterflyCopy = {
  "organizers/afterfly": {
    "description": "AFTER FLY pairs social runs with post-run music in Indore.",
    "publicProfile.summary":
      "AFTER FLY pairs social runs with post-run music in Indore.",
  },
};

test("dry run plans repairs without writing", async () => {
  const db = fakeDb({
    "organizers/afterfly": leakedOrganizer(),
    "organizers/courtside": hostCreatedOrganizer(),
    "organizers/clean": cleanOrganizer(),
  });
  const {status, report, lines} = await invoke(["--project", "demo"], db);

  assert.equal(status, 0);
  assert.equal(report.mode, "dry_run");
  assert.equal(report.scanned, 3);
  assert.equal(report.clean, 1);
  assert.deepEqual(report.blocked, []);
  assert.deepEqual(report.needsReplacement, ["organizers/afterfly"]);
  assert.deepEqual(report.contractInvalidAfterRepair, []);
  const afterfly = report.plans.find((plan) =>
    plan.path === "organizers/afterfly");
  assert.deepEqual(afterfly.deletes, [
    "publicProfile.fitNotes",
    "publicProfile.missingEvidence",
  ]);
  assert.deepEqual(Object.keys(afterfly.patch).sort(), [
    "publicProfile.facts",
    "publicSources",
  ]);
  assert.deepEqual(afterfly.remainingIssues.map((issue) => issue.field),
    ["description", "publicProfile.summary"]);
  const courtside = report.plans.find((plan) =>
    plan.path === "organizers/courtside");
  assert.deepEqual(courtside.patch, {});
  assert.deepEqual(courtside.deletes, [
    "publicProfile.fitNotes",
    "publicProfile.missingEvidence",
  ]);
  assert.match(report.planHash, /^[0-9a-f]{64}$/u);
  assert.equal(lines.at(-1), "Dry run only. Nothing was written.");
  assert.deepEqual(db.writes, []);
});

test("check exits non-zero until every organizer is clean", async () => {
  const leaked = await invoke(
    ["--project", "demo", "--check"],
    fakeDb({"organizers/courtside": hostCreatedOrganizer()})
  );
  assert.equal(leaked.status, 1, "stale empty lists still need deleting");
  const clean = await invoke(
    ["--project", "demo", "--check"],
    fakeDb({"organizers/clean": cleanOrganizer()})
  );
  assert.equal(clean.status, 0);
});

test("apply writes only the reviewed plan and leaves a clean check",
  async () => {
    const docs = {
      "organizers/afterfly": leakedOrganizer(),
      "organizers/courtside": hostCreatedOrganizer(),
    };
    const db = fakeDb(docs);
    const replacements = writeReplacements(afterflyCopy);
    const base = ["--project", "demo", "--replacements", replacements];

    await assert.rejects(
      invoke([...base, "--apply"], db),
      /requires --plan-hash/u
    );
    const reviewed = await invoke(base, db);
    assert.deepEqual(reviewed.report.needsReplacement, []);
    await assert.rejects(
      invoke([...base, "--apply", "--plan-hash", "0".repeat(64)], db),
      /does not match the current plan/u
    );
    assert.deepEqual(db.writes, []);

    const applied = await invoke(
      [...base, "--apply", "--plan-hash", reviewed.report.planHash],
      db
    );
    assert.equal(applied.status, 0);
    assert.equal(db.writes.length, 2);
    const afterfly = docs["organizers/afterfly"];
    assert.equal(afterfly.publicProfile.summary,
      afterflyCopy["organizers/afterfly"]["publicProfile.summary"]);
    assert.equal("fitNotes" in afterfly.publicProfile, false);
    assert.equal("missingEvidence" in afterfly.publicProfile, false);
    assert.equal("fitNotes" in docs["organizers/courtside"].publicProfile,
      false);
    assert.deepEqual(afterfly.publicProfile.facts,
      [{label: "Location", value: "Indore, Madhya Pradesh"}]);
    assert.deepEqual(afterfly.publicSources.map((source) => source.label),
      ["Luma event page"]);
    assert.ok(afterfly.publicSources[0].lastCheckedAt instanceof FakeTimestamp);

    const verified = await invoke(["--project", "demo", "--check"], db);
    assert.equal(verified.status, 0);
    assert.equal(verified.report.pending, 0);
  });

test("mechanical repairs apply before reviewed copy exists", async () => {
  const docs = {"organizers/afterfly": leakedOrganizer()};
  const db = fakeDb(docs);
  const reviewed = await invoke(["--project", "demo"], db);
  assert.deepEqual(reviewed.report.needsReplacement, ["organizers/afterfly"]);

  await invoke(
    ["--project", "demo", "--apply", "--plan-hash", reviewed.report.planHash],
    db
  );
  assert.equal("fitNotes" in docs["organizers/afterfly"].publicProfile, false);
  const verified = await invoke(["--project", "demo", "--check"], db);
  assert.equal(verified.status, 1, "intake wording still needs copy");
  assert.deepEqual(verified.report.needsReplacement, ["organizers/afterfly"]);
});

test("apply refuses contract regressions, prod without opt-in and drift",
  async () => {
    const broken = writeReplacements({
      "organizers/clean": {"description": 42},
    });
    const brokenDb = fakeDb({"organizers/clean": cleanOrganizer()});
    const blocked = await invoke(
      ["--project", "demo", "--replacements", broken],
      brokenDb
    );
    assert.deepEqual(blocked.report.blocked, ["organizers/clean"]);
    await assert.rejects(
      invoke(["--project", "demo", "--replacements", broken, "--apply",
        "--plan-hash", blocked.report.planHash], brokenDb),
      /would break the organizer contract: organizers\/clean/u
    );
    assert.deepEqual(brokenDb.writes, []);

    await assert.rejects(
      invoke(
        ["--project", "catchdates-prod", "--apply", "--plan-hash", "a"],
        fakeDb({})
      ),
      /without --allow-prod/u
    );

    const driftDb = fakeDb({"organizers/afterfly": leakedOrganizer()}, {
      beforeTransaction: (docs) => {
        docs["organizers/afterfly"].publicProfile.fitNotes.push("New note");
      },
    });
    const reviewed = await invoke(["--project", "demo"], driftDb);
    await assert.rejects(
      invoke(["--project", "demo", "--apply", "--plan-hash",
        reviewed.report.planHash], driftDb),
      /changed after the reviewed dry run/u
    );
    assert.deepEqual(driftDb.writes, []);
  });

test("rejects unknown flags, missing projects and unscanned replacements",
  async () => {
    assert.throws(() => parseArgs(["--project", "demo", "--force"]),
      /Unknown argument: --force/u);
    assert.throws(() => parseArgs([]), /explicit --project/u);
    assert.throws(() => parseArgs(["--project", "demo", "--check", "--apply",
      "--plan-hash", "a"]), /--check or --apply/u);
    const replacements = writeReplacements({
      "organizers/missing": {"publicProfile.summary": "Visitor copy."},
    });
    await assert.rejects(
      invoke(["--project", "demo", "--replacements", replacements],
        fakeDb({"organizers/afterfly": leakedOrganizer()})),
      /Replacement target was not scanned: organizers\/missing/u
    );
  });
