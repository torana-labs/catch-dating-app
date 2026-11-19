/* eslint-disable max-len */
import {strict as assert} from "node:assert";
import {test} from "node:test";
import type {SalesAccount, SalesPrincipal} from "../sales/types";
import {qualificationPolicyHash} from "../sales/qualificationPolicy";
import {evaluateScore, hash, parsePolicy, type Assessment,
  type IntelligencePolicy} from "../salesIntelligence/model";
import {entryVisible, projectScore, scoreExpiry,
  type FitQueueEntry} from "./model";
import {listFitQueue, refreshFitQueue, refreshFitQueueBatch, type FitQueueDeps} from "./service";

const at = "2026-09-28T10:00:00.000Z";
const factors = ["a", "b", "c", "d", "e", "f", "g"];
const parsed = parsePolicy({policyId: "synthetic", version: "v1",
  status: "active", promptVersion: "prompt-v1", playbookVersion: "play-v1",
  priorityBands: {high: 80, medium: 50},
  factors: factors.map((factorId, index) => ({id: factorId,
    weight: index === 6 ? 16 : 14, claimKeys: ["operation"], maxAgeDays: 30}))});
const policy: IntelligencePolicy = {schemaVersion: 1,
  classification: "sales_private", policyRecordId: "current", revision: 2,
  updatedAt: at, updatedBy: "reviewer", ...parsed};
const account: SalesAccount = {schemaVersion: 1, classification: "sales_private",
  organizerId: "org-a", revision: 3, researchStatus: "qualified",
  assignedOwnerUid: "employee", summary: null, nextAction: null,
  suppressionStatus: "clear", duplicateReviewRequired: false,
  qualificationPolicy: {policyId: "qualification", version: "v1",
    policyHash: "a".repeat(64)}, name: "Synthetic Host", city: "City",
  market: null, marketLabel: null, eventTypes: [], cohortIds: [],
  searchTokens: ["synthetic"], createdAt: at, updatedAt: at,
  updatedBy: "employee"};
const assessments: Assessment[] = factors.map((factorId) => ({
  schemaVersion: 1, classification: "sales_private",
  assessmentId: `assessment-${factorId}`, organizerId: "org-a", factorId,
  revision: 1, state: "known", value: 4, evidenceIds: [`evidence-${factorId}`],
  reason: null, reviewedAt: at, reviewerUid: "employee"}));
const evidence = factors.map((factorId) => ({classification: "sales_private",
  evidenceId: `evidence-${factorId}`, organizerId: "org-a",
  claimKey: "operation", observedAt: "2026-09-27T10:00:00.000Z",
  validThrough: null, reviewedAt: at, reviewerUid: "employee"}));
const employee: SalesPrincipal = {uid: "employee", roles: ["admin"]};

test("complete fit keeps an evidence expiry; unknown is never scored zero", () => {
  const snapshot = requireScore(assessments, evidence);
  const row = projectScore(account, policy, snapshot, assessments, evidence,
    "a".repeat(64));
  assert.equal(row.score, 80);
  assert.equal(row.eligibleForOutreachReview, true);
  assert.equal(row.expiresAt, "2026-10-27T10:00:00.001Z");
  assert.equal(entryVisible(row, "ranked", 2, "a".repeat(64), at), true);
  assert.equal(entryVisible(row, "ranked", 2, "a".repeat(64), row.expiresAt!), false);
  const missing = requireScore(assessments.slice(1), evidence);
  const unknown = projectScore(account, policy, missing, assessments.slice(1),
    evidence, "a".repeat(64));
  assert.equal(unknown.score, null);
  assert.equal(unknown.priority, "unranked");
  assert.equal(unknown.expiresAt, null);
  assert.equal(entryVisible(unknown, "needs_research", 2, null, at), true);
});

test("suppression, duplicates and qualification drift exclude review candidates", () => {
  const snapshot = requireScore(assessments, evidence);
  const row = projectScore(account, policy, snapshot, assessments,
    evidence, "a".repeat(64));
  for (const changed of [
    {...account, suppressionStatus: "held" as const},
    {...account, duplicateReviewRequired: true},
    {...account, researchStatus: "needs_research" as const},
  ]) {
    assert.equal(projectScore(changed, policy, snapshot, assessments,
      evidence, "a".repeat(64)).eligibleForOutreachReview, false);
  }
  assert.equal(entryVisible(row, "outreach_review_candidate", 2,
    "b".repeat(64), at), false);
  assert.equal(entryVisible(row, "outreach_review_candidate", 3,
    "a".repeat(64), at), false);
  assert.equal(scoreExpiry(policy, snapshot, assessments,
    evidence.map((item, index) => index === 0 ?
      {...item, validThrough: "2026-09-29T00:00:00.000Z"} : item)),
  "2026-09-29T00:00:00.001Z");
});

function requireScore(items: Assessment[], sources: typeof evidence) {
  return evaluateScore(policy, "org-a", account.revision, items, sources, at);
}

type Row = Record<string, unknown>;
class FakeSnap {
  constructor(public id: string, private row: Row | undefined) {}
  get exists() {
    return this.row !== undefined;
  }
  data() {
    return this.row;
  }
  get(key: string) {
    return this.row?.[key];
  }
}
class FakeRef {
  constructor(private db: FakeDb, public path: string) {}
  get id() {
    return this.path.split("/").at(-1)!;
  }
  get() {
    return Promise.resolve(new FakeSnap(this.id, this.db.rows.get(this.path)));
  }
}
class FakeQuery {
  private filters: Array<[string, unknown]> = [];
  private order: Array<[string, string]> = [];
  private anchor: unknown[] | null = null;
  private max = 100;
  constructor(private db: FakeDb, private path: string) {}
  doc(id: string) {
    return new FakeRef(this.db, `${this.path}/${id}`);
  }
  where(field: string, _operator: string, value: unknown) {
    this.filters.push([field, value]); return this;
  }
  orderBy(field: string | object, direction = "asc") {
    this.order.push([typeof field === "string" ? field : "__name__", direction]);
    return this;
  }
  startAfter(...values: unknown[]) {
    this.anchor = values; return this;
  }
  limit(max: number) {
    this.max = max; return this;
  }
  async get() {
    const docs = [...this.db.rows.entries()]
      .filter(([key, row]) => key.startsWith(`${this.path}/`) &&
        key.slice(this.path.length + 1).indexOf("/") === -1 &&
        this.filters.every(([field, value]) => row[field] === value))
      .map(([key, row]) => new FakeSnap(key.split("/").at(-1)!, row));
    const value = (snap: FakeSnap, field: string) =>
      field === "__name__" ? snap.id : snap.get(field);
    const compare = (left: unknown, right: unknown) =>
      left === right ? 0 : left === null ? -1 : right === null ? 1 :
        (left as string | number) < (right as string | number) ? -1 : 1;
    docs.sort((a, b) => {
      for (const [field, direction] of this.order) {
        const result = compare(value(a, field), value(b, field));
        if (result) return direction === "desc" ? -result : result;
      }
      return a.id.localeCompare(b.id);
    });
    const after = this.anchor ? docs.filter((doc) => {
      for (let index = 0; index < this.order.length; index++) {
        const [field, direction] = this.order[index];
        const compared = compare(value(doc, field), this.anchor![index]);
        if (compared) return direction === "desc" ? compared < 0 : compared > 0;
      }
      return false;
    }) : docs;
    this.db.queryCount++;
    if (this.path === "salesFitQueueEntries") this.db.onFitQuery?.();
    const page = after.slice(0, this.max);
    return {docs: page, size: page.length};
  }
}
class FakeTransaction {
  private writes: Array<() => void> = [];
  constructor(private db: FakeDb) {}
  get(target: FakeRef | FakeQuery) {
    return target.get();
  }
  set(ref: FakeRef, value: Row) {
    this.writes.push(() => this.db.rows.set(ref.path, value));
  }
  create(ref: FakeRef, value: Row) {
    this.writes.push(() => {
      if (this.db.rows.has(ref.path)) throw new Error("exists");
      this.db.rows.set(ref.path, value);
    });
  }
  commit() {
    this.writes.forEach((write) => write());
  }
}
class FakeDb {
  rows = new Map<string, Row>();
  queryCount = 0;
  onFitQuery?: () => void;
  doc(path: string) {
    return new FakeRef(this, path);
  }
  collection(path: string) {
    return new FakeQuery(this, path);
  }
  async runTransaction<T>(callback: (tx: FakeTransaction) => Promise<T>) {
    const tx = new FakeTransaction(this);
    const result = await callback(tx);
    tx.commit();
    return result;
  }
}

function deps(db: FakeDb, authorize = async () => {}) : FitQueueDeps {
  return {db: db as unknown as FirebaseFirestore.Firestore,
    now: () => new Date(at), authorize};
}
function seedPolicy(db: FakeDb, status: "active" | "paused" = "active") {
  db.rows.set("salesIntelligencePolicies/current", {...policy, status});
  db.rows.set("salesFitQueueMeta/current", {generation: 3});
}
function seededEntry(id: string, score: number | null): FitQueueEntry {
  return {...projectScore(account, policy,
    requireScore(assessments, evidence), assessments, evidence,
    "a".repeat(64)), organizerId: id, score,
  status: score === null ? "needs_research" : "complete",
  priority: score === null ? "unranked" : "high"};
}

test("score pages use score then ID ties and reject a changed generation", async () => {
  const db = new FakeDb(); seedPolicy(db);
  db.rows.set("salesFitQueueEntries/org-b", seededEntry("org-b", 80) as unknown as Row);
  db.rows.set("salesFitQueueEntries/org-a", seededEntry("org-a", 80) as unknown as Row);
  db.rows.set("salesFitQueueEntries/org-c", seededEntry("org-c", 70) as unknown as Row);
  const first = await listFitQueue(deps(db), employee, {view: "ranked", limit: 1});
  assert.deepEqual(first.rows.map((row) => row.organizerId), ["org-a"]);
  assert(first.nextCursor);
  const second = await listFitQueue(deps(db), employee,
    {view: "ranked", limit: 1, cursor: first.nextCursor});
  assert.deepEqual(second.rows.map((row) => row.organizerId), ["org-b"]);
  assert.equal(db.queryCount, 2); // no account/evidence query per listed host
  db.rows.set("salesFitQueueMeta/current", {generation: 4});
  await assert.rejects(listFitQueue(deps(db), employee,
    {view: "ranked", limit: 1, cursor: first.nextCursor}),
  /Fit queue changed/);
  db.onFitQuery = () => db.rows.set("salesFitQueueMeta/current", {generation: 5});
  await assert.rejects(listFitQueue(deps(db), employee,
    {view: "ranked", limit: 1}), /Fit queue changed/);
});

test("listing omits expired rows and fails closed on policy pause and revoked role", async () => {
  const db = new FakeDb(); seedPolicy(db);
  db.rows.set("salesFitQueueEntries/org-a",
    {...seededEntry("org-a", 80), expiresAt: at});
  const listed = await listFitQueue(deps(db), employee, {view: "ranked"});
  assert.equal(listed.rows.length, 0);
  assert.equal(listed.omittedExpiredInPage, 1);
  db.rows.set("salesIntelligencePolicies/current", {...policy, status: "paused"});
  await assert.rejects(listFitQueue(deps(db), employee,
    {view: "ranked"}), /paused/);
  await assert.rejects(listFitQueue(deps(db),
    {uid: "client", roles: ["admin"], clientId: "client"},
    {view: "ranked"}), /employee/);
});

test("candidate cursor binds qualification policy and fails on mid-read policy drift", async () => {
  const db = new FakeDb(); seedPolicy(db);
  const rules = [{ruleId: "reviewed", claimKey: "operation",
    sourceTypes: ["first_party" as const], confidence: ["high" as const],
    minimumCount: 1, distinctSignalIds: false,
    distinctSourceRoots: false, maxAgeDays: 30}];
  const firstHash = qualificationPolicyHash({policyId: "qual",
    version: "v1", rules});
  db.rows.set("salesSettings/qualificationPolicy", {schemaVersion: 1,
    classification: "sales_private", status: "active", policyId: "qual",
    version: "v1", rules, policyHash: firstHash});
  for (const id of ["org-a", "org-b"]) {
    db.rows.set(`salesFitQueueEntries/${id}`, {...seededEntry(id, 80),
      qualificationPolicyHash: firstHash});
  }
  const first = await listFitQueue(deps(db), employee,
    {view: "outreach_review_candidate", limit: 1});
  assert.deepEqual(first.rows.map((row) => row.organizerId), ["org-a"]);
  const nextHash = qualificationPolicyHash({policyId: "qual",
    version: "v2", rules});
  db.rows.set("salesSettings/qualificationPolicy", {schemaVersion: 1,
    classification: "sales_private", status: "active", policyId: "qual",
    version: "v2", rules, policyHash: nextHash});
  await assert.rejects(listFitQueue(deps(db), employee,
    {view: "outreach_review_candidate", limit: 1, cursor: first.nextCursor}),
  /Fit queue changed/);
  db.rows.set("salesSettings/qualificationPolicy", {schemaVersion: 1,
    classification: "sales_private", status: "active", policyId: "qual",
    version: "v1", rules, policyHash: firstHash});
  db.onFitQuery = () => db.rows.set("salesIntelligencePolicies/current",
    {...policy, revision: 3});
  await assert.rejects(listFitQueue(deps(db), employee,
    {view: "ranked"}), /Fit queue changed/);
});

test("refresh persists current source projection and exact receipt once", async () => {
  const db = new FakeDb(); seedPolicy(db);
  db.rows.set("organizerSalesAccounts/org-a", account as unknown as Row);
  for (const [index, factorId] of factors.entries()) {
    db.rows.set(`salesIntelligenceAssessments/assess-${hash(["org-a", factorId]).slice(0, 32)}`,
      assessments[index] as unknown as Row);
    db.rows.set(`salesEvidence/evidence-${factorId}`, evidence[index]);
  }
  const payload = {organizerId: "org-a", requestId: "refresh-0001",
    expectedAccountRevision: 3};
  const result = await refreshFitQueue(deps(db), employee, payload);
  assert.equal(result.entry.score, 80);
  assert.equal(db.rows.get("salesFitQueueMeta/current")?.generation, 4);
  assert.equal(db.rows.get("salesFitQueueEntries/org-a")?.sourceHash,
    result.entry.sourceHash);
  assert.equal([...db.rows.keys()].filter((key) =>
    key.startsWith("commandReceipts/adminRefreshSalesFitQueue_")).length, 1);
  assert.deepEqual(await refreshFitQueue(deps(db), employee, payload), result);
  assert.equal(db.rows.get("salesFitQueueMeta/current")?.generation, 4);
  await assert.rejects(refreshFitQueue(deps(db), employee,
    {...payload, expectedAccountRevision: 4}), /different material/);
  await assert.rejects(refreshFitQueue(deps(db,
    async () => {
      throw new Error("employee role revoked");
    }), employee, payload),
  /employee role revoked/);
});

function completeQueueSource(db: FakeDb) {
  seedPolicy(db);
  db.rows.set("organizerSalesAccounts/org-a", account as unknown as Row);
  for (const [index, factorId] of factors.entries()) {
    db.rows.set(`salesIntelligenceAssessments/assess-${hash(["org-a", factorId]).slice(0, 32)}`,
      assessments[index] as unknown as Row);
    db.rows.set(`salesEvidence/evidence-${factorId}`, evidence[index]);
  }
}

test("qualification proof expires independently of otherwise fresh scored evidence",
  async () => {
    const db = new FakeDb(); completeQueueSource(db);
    const rules = [{ruleId: "identity", claimKey: "identity",
      sourceTypes: ["first_party"], confidence: ["high"], minimumCount: 1,
      distinctSignalIds: false, distinctSourceRoots: false, maxAgeDays: 1}];
    const policyHash = qualificationPolicyHash({policyId: "qual", version: "v1", rules});
    db.rows.set("salesSettings/qualificationPolicy", {schemaVersion: 1,
      classification: "sales_private", status: "active", policyId: "qual",
      version: "v1", rules, policyHash});
    db.rows.set("organizerSalesAccounts/org-a", {...account,
      qualificationPolicy: {policyId: "qual", version: "v1", policyHash}});
    const identityEvidence = {classification: "sales_private",
      evidenceId: "identity-source", organizerId: "org-a", contactId: null,
      claimKey: "identity", sourceType: "first_party", confidence: "high",
      observedAt: "2026-09-26T10:00:00.000Z", validThrough: null};
    db.rows.set("salesEvidence/identity-source", identityEvidence);
    const expired = await refreshFitQueue(deps(db), employee,
      {organizerId: "org-a", requestId: "expired-qual-001"});
    assert.equal(expired.entry.score, 80);
    assert.equal(expired.entry.eligibleForOutreachReview, false);
    assert.equal((await listFitQueue(deps(db), employee,
      {view: "outreach_review_candidate"})).rows.length, 0);
    db.rows.set("salesEvidence/identity-source", {...identityEvidence,
      observedAt: "2026-09-28T09:59:00.000Z",
      validThrough: "2026-09-28T10:01:00.000Z"});
    const fresh = await refreshFitQueue(deps(db), employee,
      {organizerId: "org-a", requestId: "fresh-qual-001"});
    assert.equal(fresh.entry.eligibleForOutreachReview, true);
    assert.equal(fresh.entry.qualificationExpiresAt, "2026-09-28T10:01:00.001Z");
    const later = {...deps(db), now: () => new Date("2026-09-28T10:02:00Z")};
    assert.equal((await listFitQueue(later, employee,
      {view: "outreach_review_candidate"})).rows.length, 0);
    assert.equal((await listFitQueue(later, employee,
      {view: "ranked"})).rows.length, 1);
  });

test("batch retry reports invalidated historical refresh as needing review",
  async () => {
    const db = new FakeDb(); completeQueueSource(db);
    const input = {requestId: "batch-refresh-001", limit: 10};
    const first = await refreshFitQueueBatch(deps(db), employee, input);
    assert.equal(first.rows[0].result, "refreshed");
    db.rows.delete("salesFitQueueEntries/org-a");
    db.rows.set("organizerSalesAccounts/org-a", {...account, revision: 4});
    const retry = await refreshFitQueueBatch(deps(db), employee, input);
    assert.equal(retry.rows[0].result, "needs_review");
    assert.equal(db.rows.has("salesFitQueueEntries/org-a"), false);
    const renewed = await refreshFitQueueBatch(deps(db), employee,
      {...input, requestId: "batch-refresh-002"});
    assert.equal(renewed.rows[0].result, "refreshed");
    assert.equal(db.rows.get("salesFitQueueEntries/org-a")?.accountRevision, 4);
  });
