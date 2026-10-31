
import assert from "node:assert/strict";
import test from "node:test";
import {
  baseSeed,
  deps,
  request,
  now,
} from "../shared/testing/programFixtures";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  listProgramGuestsHandler,
  upsertProgramGuestHandler,
  upsertProgramHouseholdHandler,
} from "./programGuests";
import {importProgramManifestHandler} from "./programManifestImport";
import {contractValidator} from "../shared/contractTestValidators";

const validateWorkspaceFieldDecisionDocument =
  contractValidator("WorkspaceFieldDecisionDocument");

const seed = () =>
  Object.fromEntries(
    Object.entries(baseSeed()).filter(
      ([path]) => !path.startsWith("programGuests/"),
    ),
  );
const facts = (db: FakeFirestore) =>
  [...db.docs].filter(([path]) =>
    path.startsWith("workspaceFieldAssertions/"),
  );
const edit = (db: FakeFirestore, extra: Record<string, unknown> = {},
  uid = "manager-1") =>
  upsertProgramGuestHandler(
    request(
      {
        programId: "program-1",
        displayName: "Synthetic guest",
        externalReference: "fixture-row-1",
        ...extra,
      },
      uid,
    ),
    deps(db),
  );
const list = (db: FakeFirestore, extra: Record<string, unknown> = {}) =>
  listProgramGuestsHandler(
    request({programId: "program-1", ...extra}, "manager-1"),
    deps(db),
  );

test("manual acquisition, omission and explicit clearing preserve evidence",
  async () => {
    const db = new FakeFirestore(seed());
    const created = await edit(db, {
      phoneE164: "+919900000001",
      email: "synthetic@example.test",
    });
    const initialFacts = facts(db);
    assert.equal(initialFacts.length, 3);
    const first = (await list(db)).guests[0];
    assert.equal(first.phoneE164, "+919900000001");
    assert.equal(first.fieldAuthority!.phoneE164.state, "available");
    const omitted = await edit(db, {
      guestId: created.entityId,
      expectedRevision: created.revision,
      displayName: "Updated name",
    });
    assert.equal((await list(db)).guests[0].phoneE164, "+919900000001");
    assert.equal(facts(db).length, 4); // Only the supplied name changed.
    await edit(db, {
      guestId: created.entityId,
      expectedRevision: omitted.revision,
      displayName: "Updated name",
      phoneE164: null,
    });
    const cleared = (await list(db)).guests[0];
    assert.equal(cleared.phoneE164, null);
    assert.equal(cleared.fieldAuthority!.phoneE164.state, "cleared");
    for (const [path, fact] of initialFacts) {
      assert.deepEqual(db.getDoc(path), fact);
    }
    assert.equal(
      facts(db).every(
        ([, fact]) =>
          fact.identityEvidenceRef === null && fact.programId === "program-1",
      ),
      true,
    );
  });

test("import conflicts require reviewed selection and retain original values",
  async () => {
    const db = new FakeFirestore(seed());
    const created = await edit(db, {phoneE164: "+919900000001"});
    const before = (await list(db)).guests[0];
    const oldId = before.fieldAuthority!.phoneE164.assertionId!;
    await importProgramManifestHandler(
      request(
        {
          programId: "program-1",
          mode: "commit",
          clientOperationId: "synthetic-conflict",
          rows: [
            {
              displayName: "Imported alternative",
              externalReference: "fixture-row-1",
              phoneE164: "+919900000002",
            },
          ],
        },
        "manager-1",
      ),
      deps(db),
    );
    const pending = (await list(db)).guests[0];
    assert.equal(pending.phoneE164, "+919900000001");
    assert.equal(pending.displayName, "Synthetic guest");
    const alternative = pending.fieldAuthority!.phoneE164.alternatives[0];
    assert.equal(alternative.value, "+919900000002");
    assert.equal(alternative.sourceId, "synthetic-conflict:0");
    assert.equal(alternative.sourceKind, "manifestRow");
    await edit(db, {
      guestId: created.entityId,
      expectedRevision: pending.revision,
      fieldChoices: {
        phoneE164: alternative.assertionId,
      },
    });
    const selected = (await list(db)).guests[0];
    assert.equal(selected.phoneE164, "+919900000002");
    assert.equal(
    selected.fieldAuthority!.phoneE164.assertionId,
    alternative.assertionId,
    );
    assert.equal(selected.fieldAuthority!.phoneE164.alternatives.length, 0);
    const decisions = [...db.docs].filter(([path]) =>
      path.startsWith("workspaceFieldDecisions/"),
    );
    assert.equal(decisions.length, 1);
    assert.ok(validateWorkspaceFieldDecisionDocument(decisions[0][1]),
      JSON.stringify(validateWorkspaceFieldDecisionDocument.errors));
    assert.equal(decisions[0][1].actorUid, "manager-1");
    assert.equal(decisions[0][1].previousAssertionId, oldId);
    assert.equal(
      decisions[0][1].selectedAssertionId,
      alternative.assertionId,
    );
    assert.equal(
    db.getDoc(`workspaceFieldAssertions/${oldId}`)!.value,
    "+919900000001",
    );
  });

test("same organizer and contact pointer do not permit cross-program choices",
  async () => {
    const db = new FakeFirestore(seed());
    db.setDoc("organizerPrograms/program-2", {
      ...db.getDoc("organizerPrograms/program-1")!,
    });
    const first = await edit(db, {phoneE164: "+919900000001"});
    const second = await edit(db, {
      programId: "program-2",
      phoneE164: "+919900000002",
    });
    db.updateDoc(`programGuests/${first.entityId}`, {
      contactId: "same-person",
    });
    db.updateDoc(`programGuests/${second.entityId}`, {
      contactId: "same-person",
    });
    const foreign = db.getDoc(`programGuests/${second.entityId}`)!
      .fieldSelections as {phoneE164: string};
    const before = new Map(db.docs);
    await assert.rejects(
      edit(db, {
        guestId: first.entityId,
        expectedRevision: first.revision,
        fieldChoices: {
          phoneE164: foreign.phoneE164,
        },
      }),
      /workspace, guest and field/,
    );
    assert.deepEqual(db.docs, before);
    assert.equal((await list(db)).guests[0].phoneE164, "+919900000001");
  });

test("raw old fields are not assigned evidence by a name-only edit",
  async () => {
    const db = new FakeFirestore(baseSeed());
    await edit(db, {
      guestId: "guest-1",
      expectedRevision: 1,
      displayName: "Explicitly acquired name",
    });
    const page = await list(db);
    assert.equal(page.guests.length, 1);
    assert.equal(page.guests[0].phoneE164, null);
    assert.equal(page.guests[0].fieldAuthority!.phoneE164.state, "unknown");
    assert.equal(
    db.getDoc("programGuests/guest-1")!.phoneE164,
    "+919999900001",
    );
    assert.equal(facts(db).length, 1);
  });

test("unknown rows advance pagination without disclosing their name",
  async () => {
    const db = new FakeFirestore(seed());
    const known = await edit(db, {displayName: "Zed"});
    db.setDoc("programGuests/unknown", {
      ...db.getDoc(`programGuests/${known.entityId}`)!,
      displayName: "Amy",
      fieldSelections: {},
      fieldConflicts: {},
    });
    const first = await list(db, {limit: 1});
    assert.deepEqual(first.guests, []);
    assert.equal(first.nextCursor, "unknown");
    const second = await list(db, {limit: 1, cursor: first.nextCursor});
    assert.equal(second.guests[0].displayName, "Zed");
  });

test("projection tampering hides the field instead of using the raw value",
  async () => {
    const db = new FakeFirestore(seed());
    const guest = await edit(db, {phoneE164: "+919900000001"});
    db.updateDoc(`programGuests/${guest.entityId}`, {
      phoneE164: "+919900000099",
    });
    const row = (await list(db)).guests[0];
    assert.equal(row.phoneE164, null);
    assert.equal(row.fieldAuthority!.phoneE164.state, "restricted");
  });

test("revoked writer contention leaves no new guest or assertion",
  async () => {
    const db = new FakeFirestore(seed());
    db.setDoc("programStaffGrants/program-1__coordinator-1", {
      ...db.getDoc("programStaffGrants/program-1__dispatcher-1"),
      uid: "coordinator-1",
      duties: [{duty: "programCoordinator", pickupPointIds: [], hotelIds: [],
        expiresAtMillis: now.toMillis() + 60_000}],
    });
    db.beforeCommit = async () => {
      db.beforeCommit = undefined;
      db.updateDoc("programStaffGrants/program-1__coordinator-1",
        {status: "revoked"});
    };
    await assert.rejects(
      edit(db, {phoneE164: "+919900000001"}, "coordinator-1"),
      /active program access/,
    );
    assert.equal(facts(db).length, 0);
    assert.equal(
      [...db.docs.keys()].some((path) => path.startsWith("programGuests/")),
      false,
    );
  });

test("household acquisition has its own scope and retains consent",
  async () => {
    const db = new FakeFirestore(seed());
    const household = await upsertProgramHouseholdHandler(
      request(
        {
          programId: "program-1",
          label: "Synthetic family",
          primaryContactName: "Synthetic contact",
          primaryPhoneE164: "+919900000001",
          memberGuestIds: [],
        },
        "manager-1",
      ),
      deps(db),
    );
    const path = `programHouseholds/${household.entityId}`;
    db.updateDoc(path, {
      messagingConsent: {granted: false, grantedAt: now, source: "staff"},
      side: "bride",
    });
    await upsertProgramHouseholdHandler(
      request(
        {
          programId: "program-1",
          householdId: household.entityId,
          expectedRevision: household.revision,
          label: "Renamed family",
          primaryContactName: "Synthetic contact",
          memberGuestIds: [],
        },
        "manager-1",
      ),
      deps(db),
    );
    assert.equal(
      (db.getDoc(path)!.messagingConsent as {granted: boolean}).granted,
      false,
    );
    assert.equal(db.getDoc(path)!.side, "bride");
    assert.equal(
      facts(db).every(
        ([, fact]) =>
          (fact.relationshipRef as {kind: string}).kind ===
        "programHousehold",
      ),
      true,
    );
  });
