import * as admin from "firebase-admin";
import {prepareHostSalesIntent} from "../waitlist/hostSalesIntent";
import {assertSalesPrivacyOpen} from "../admin/salesPrivacy/model";
import {
  currentReviewedEvidence,
  uniqueIds,
} from "../admin/salesIntelligence/model";
import {PARTNER_TERMS_VERSION, MEMBERSHIPS, ASSIGNMENTS,
  employee, expectRevision, fail, future, hash, id, iso, object, officialUrl,
  requestId, revision, text, type PartnerActor, type PartnerAssignment,
  type PartnerDeps, type PartnerMembership,
  type PartnerMarketingGrant,
} from "./model";

type Tx = FirebaseFirestore.Transaction;

export async function requirePartner(deps: PartnerDeps, actor: PartnerActor,
  tx: Tx): Promise<PartnerMembership> {
  await deps.checkAuth(actor, false);
  return readPartnerMembership(deps, tx, actor.uid);
}

async function readPartnerMembership(deps: PartnerDeps, tx: Tx,
  uid: string): Promise<PartnerMembership> {
  const [snap, deleted] = await Promise.all([
    tx.get(deps.db.collection(MEMBERSHIPS).doc(uid)),
    tx.get(deps.db.collection("deletedUsers").doc(uid)),
  ]);
  const row = snap.data() as PartnerMembership | undefined;
  if (deleted.exists || row?.uid !== uid || row.schemaVersion !== 1 ||
      row.classification !== "sales_private" || row.status !== "active" ||
      row.termsVersion !== PARTNER_TERMS_VERSION ||
      !Number.isFinite(Date.parse(row.expiresAt)) ||
      Date.parse(row.expiresAt) <= deps.now().getTime()) {
    return fail(
      "permission-denied",
      "Current accepted partner membership is required.",
    );
  }
  return row;
}

/**
 * Whether uid holds a current accepted partner membership, for callers that
 * act on a partner's behalf without a partner session (a nomination the
 * partner sent by message).
 */
export async function hasCurrentPartnerMembership(
  db: FirebaseFirestore.Firestore, tx: Tx, uid: string, now: Date,
): Promise<boolean> {
  try {
    await readPartnerMembership({db, now: () => now,
      checkAuth: async () => undefined}, tx, uid);
    return true;
  } catch (error) {
    if ((error as {code?: unknown})?.code === "permission-denied") return false;
    throw error;
  }
}

/** One organizer-scoped assignment is the cross-channel reservation. */
export async function requireAssignment(
  deps: PartnerDeps, actor: PartnerActor, tx: Tx, organizerId: string,
  accepted = true, allowDeclined = false,
): Promise<PartnerAssignment> {
  await requirePartner(deps, actor, tx);
  return readPartnerAssignment(
    deps, tx, actor.uid, organizerId, accepted, allowDeclined,
  );
}

async function readPartnerAssignment(
  deps: PartnerDeps, tx: Tx, partnerUid: string, organizerId: string,
  accepted = true, allowDeclined = false,
): Promise<PartnerAssignment> {
  await assertSalesPrivacyOpen(tx, deps.db, organizerId);
  const [snap, account, organizer] = await Promise.all([
    tx.get(deps.db.collection(ASSIGNMENTS).doc(organizerId)),
    tx.get(deps.db.collection("organizerSalesAccounts").doc(organizerId)),
    tx.get(deps.db.collection("organizers").doc(organizerId)),
  ]);
  const row = snap.data() as PartnerAssignment | undefined;
  if (row?.classification !== "sales_private" || row.schemaVersion !== 1 ||
      row.organizerId !== organizerId || row.partnerUid !== partnerUid ||
      !(allowDeclined ?
        ["offered", "accepted", "declined"] :
        ["offered", "accepted"]).includes(row.status) ||
      accepted && row.status !== "accepted" ||
      !Number.isFinite(Date.parse(row.expiresAt)) ||
      Date.parse(row.expiresAt) <= deps.now().getTime()) {
    return fail(
      "permission-denied",
      "Current organizer assignment is required.",
    );
  }
  const sales = account.data();
  if (!organizer.exists || organizer.data()?.archived === true ||
      organizer.data()?.status === "archived" ||
      sales?.organizerId !== organizerId ||
      sales.classification !== "sales_private" ||
      sales.researchStatus === "archived" ||
      sales.suppressionStatus !== "clear" ||
      sales.duplicateReviewRequired) {
    return fail(
      "failed-precondition",
      "Organizer identity or suppression blocks partner work.",
    );
  }
  return row;
}

export async function mutatePartnerAction(
  deps: PartnerDeps, actor: PartnerActor, action: string,
  request: string, material: Record<string, unknown>, employeeReview: boolean,
  authorize: (tx: Tx) => Promise<unknown>,
  apply: (tx: Tx, now: string) => Promise<Record<string, unknown>>,
  finalFence: () => void = () => undefined,
): Promise<Record<string, unknown>> {
  if (employeeReview) employee(actor);
  await deps.checkAuth(actor, employeeReview);
  const requestHash = hash({action, material});
  const receipt = deps.db.collection("salesActionReceipts")
    .doc(hash(`${actor.uid}\u0000${request}`));
  return deps.db.runTransaction(async (tx) => {
    await deps.checkAuth(actor, employeeReview);
    await authorize(tx);
    const prior = (await tx.get(receipt)).data();
    if (prior) {
      if (prior.actorUid !== actor.uid || prior.action !== action ||
          prior.requestHash !== requestHash) {
        return fail(
          "already-exists",
          "Request ID belongs to different partner work.",
        );
      }
      await deps.checkAuth(actor, employeeReview);
      finalFence();
      return prior.result as Record<string, unknown>;
    }
    const now = deps.now().toISOString();
    const result = await apply(tx, now);
    await deps.checkAuth(actor, employeeReview);
    finalFence();
    tx.create(receipt, {schemaVersion: 1, classification: "sales_private",
      actorUid: actor.uid, action, requestId: request,
      requestHash, organizerId: material.organizerId ?? null,
      result,
      createdAt: now, clientId: null, clientAuthUid: null, delegationId: null});
    return result;
  });
}

export async function registerPartner(deps: PartnerDeps, actor: PartnerActor,
  payload: unknown): Promise<Record<string, unknown>> {
  const input = object(payload, ["requestId", "displayName", "termsVersion"]);
  const request = requestId(input.requestId);
  const displayName = text(input.displayName, 100);
  if (input.termsVersion !== PARTNER_TERMS_VERSION) {
    return fail(
      "invalid-argument",
      "Accept the current bounded referral role terms.",
    );
  }
  return mutatePartnerAction(
    deps, actor, "partner.register", request, {displayName,
      termsVersion: PARTNER_TERMS_VERSION}, false, async (tx) => {
      if ((await tx.get(
        deps.db.collection("deletedUsers").doc(actor.uid),
      )).exists) {
        fail(
          "permission-denied",
          "This account cannot join the partner workspace.",
        );
      }
      const prior = (
        await tx.get(deps.db.collection(MEMBERSHIPS).doc(actor.uid))
      ).data();
      if (prior && (prior.uid !== actor.uid || prior.schemaVersion !== 1 ||
        prior.classification !== "sales_private" || prior.status !== "active" ||
        prior.termsVersion !== PARTNER_TERMS_VERSION ||
        !Number.isFinite(Date.parse(String(prior.expiresAt))) ||
        Date.parse(String(prior.expiresAt)) <= deps.now().getTime())) {
        fail(
          "permission-denied",
          "Membership needs employee review before renewal.",
        );
      }
    }, async (tx, now) => {
      const ref = deps.db.collection(MEMBERSHIPS).doc(actor.uid);
      const prior = (await tx.get(ref)).data();
      if (prior) {
        return {
          uid: actor.uid,
          status: prior.status,
          revision: prior.revision,
        };
      }
      const row: PartnerMembership = {
        schemaVersion: 1,
        classification: "sales_private",
        uid: actor.uid,
        revision: 1,
        status: "active",
        termsVersion: PARTNER_TERMS_VERSION,
        acceptedAt: now,
        expiresAt: new Date(
          Date.parse(now) + 90 * 86400000,
        ).toISOString(),
        displayName, createdAt: now, updatedAt: now, marketingGrants: []};
      tx.create(ref, row);
      return {uid: actor.uid, status: row.status, revision: row.revision};
    });
}

/**
 * A nomination is an unverified inbound observation, never an identity claim.
 */
export async function nominateOrganizer(deps: PartnerDeps, actor: PartnerActor,
  payload: unknown): Promise<Record<string, unknown>> {
  const input = object(payload, [
    "requestId", "name", "city", "url", "relationshipContext",
  ]);
  const request = requestId(input.requestId);
  const name = text(input.name, 140);
  const city = text(input.city, 80);
  const url = officialUrl(input.url);
  const relationshipContext = input.relationshipContext === null ? null :
    text(input.relationshipContext, 1000);
  return mutatePartnerAction(deps, actor, "partner.nominate", request,
    {name, city, url, relationshipContext}, false,
    (tx) => requirePartner(deps, actor, tx), async (tx, now) => {
      const membership = await requirePartner(deps, actor, tx);
      const intent = prepareHostSalesIntent({waitlistId: `partner:${actor.uid}`,
        requestId: request, fullName: membership.displayName,
        email: null, city, role: "host", entryRoute: "/partners/",
        hostApplication: {organizationName: name, communityLink: url,
          operatingCity: city, operatingNotes: relationshipContext}})!;
      const row = {...intent, source: "partner", partnerUid: actor.uid,
        email: null, alreadyJoined: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date(now)),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date(now))};
      // Identity includes the actor and submission; repeated exact nominations
      // recover their immutable receipt without overwriting employee linkage.
      tx.create(
        deps.db.collection("salesInboundIntents").doc(row.intentId),
        row,
      );
      return {intentId: row.intentId, status: "needs_identity_review",
        evidenceStatus: "self_reported", organizerId: null};
    });
}

export async function assignPartner(deps: PartnerDeps, actor: PartnerActor,
  payload: unknown): Promise<Record<string, unknown>> {
  const input = object(payload, [
    "requestId", "organizerId", "partnerUid", "expectedRevision",
    "nextAction", "reviewAt", "expiresAt", "reason", "originatorUid",
  ]);
  const request = requestId(input.requestId);
  const organizerId = id(input.organizerId);
  const partnerUid = id(input.partnerUid);
  const expectedRevision = revision(input.expectedRevision);
  const nextAction = text(input.nextAction, 500);
  const reason = text(input.reason, 1000);
  const reviewAt = future(input.reviewAt, deps.now(), 30);
  const expiresAt = future(input.expiresAt, deps.now(), 90);
  if (reviewAt > expiresAt) {
    fail(
      "invalid-argument",
      "Review must occur before reservation expiry.",
    );
  }
  const originatorUid = input.originatorUid === null ?
    null : id(input.originatorUid);
  return mutatePartnerAction(deps, actor, "partner.assign", request,
    {organizerId, partnerUid, expectedRevision, nextAction, reviewAt,
      expiresAt, reason,
      originatorUid}, true, async (tx) => {
      await assertSalesPrivacyOpen(tx, deps.db, organizerId);
      const [member, canonical, account, deleted] = await Promise.all([
        tx.get(deps.db.collection(MEMBERSHIPS).doc(partnerUid)),
        tx.get(deps.db.collection("organizers").doc(organizerId)),
        tx.get(deps.db.collection("organizerSalesAccounts").doc(organizerId)),
        tx.get(deps.db.collection("deletedUsers").doc(partnerUid)),
      ]);
      const m = member.data(); const a = account.data();
      if (
        deleted.exists || !canonical.exists ||
        canonical.data()?.archived === true ||
        canonical.data()?.status === "archived" || m?.uid !== partnerUid ||
        m.schemaVersion !== 1 || m.classification !== "sales_private" ||
        m.status !== "active" ||
        m.termsVersion !== PARTNER_TERMS_VERSION ||
        !Number.isFinite(Date.parse(String(m.expiresAt))) ||
        Date.parse(m.expiresAt) <= deps.now().getTime() ||
        a?.organizerId !== organizerId ||
        a.classification !== "sales_private" ||
        a.suppressionStatus !== "clear" ||
        a.researchStatus === "archived" || a.duplicateReviewRequired
      ) {
        fail(
          "failed-precondition",
          "Reviewed canonical identity and eligible partner are required.",
        );
      }
    }, async (tx, now) => {
      const ref = deps.db.collection(ASSIGNMENTS).doc(organizerId);
      const prior = (await tx.get(ref)).data() as PartnerAssignment | undefined;
      expectRevision(prior?.revision ?? 0, expectedRevision);
      if (
        prior && ["offered", "accepted"].includes(prior.status) &&
        Date.parse(prior.expiresAt) > Date.parse(now) &&
        prior.partnerUid !== partnerUid
      ) {
        fail(
          "failed-precondition",
          "Resolve the current outreach reservation before reassignment.",
        );
      }
      const row: PartnerAssignment = {
        schemaVersion: 1,
        classification: "sales_private",
        organizerId,
        partnerUid,
        revision: expectedRevision + 1,
        status: "offered",
        catchOwnerUid: actor.uid, activationOwnerUid: null, originatorUid,
        introducingSenderUid: null,
        relationshipContext: null,
        relationshipConfirmedAt: null,
        channel: null, nextAction, reviewAt, expiresAt,
        assignedAt: now, updatedAt: now, reason,
      };
      tx.set(ref, row);
      return {
        organizerId, partnerUid,
        revision: row.revision,
        status: row.status,
      };
    });
}

export async function decideAssignment(deps: PartnerDeps, actor: PartnerActor,
  payload: unknown): Promise<Record<string, unknown>> {
  const input = object(payload, [
    "requestId", "organizerId", "expectedRevision", "decision",
    "relationshipContext", "channel",
  ]);
  const request = requestId(input.requestId);
  const organizerId = id(input.organizerId);
  const expectedRevision = revision(input.expectedRevision);
  const decision = input.decision;
  if (decision !== "accept" && decision !== "decline") {
    fail("invalid-argument", "Accept or decline the lead.");
  }
  const relationshipContext = input.relationshipContext === null ?
    null : text(input.relationshipContext, 1000);
  const channel = input.channel;
  if (
    decision === "accept" &&
      !["email", "whatsapp", "other"].includes(String(channel)) ||
    decision === "decline" && channel !== null
  ) {
    fail("invalid-argument", "Choose an established channel when accepting.");
  }
  return mutatePartnerAction(deps, actor, "partner.assignment.decide", request,
    {organizerId, expectedRevision, decision, relationshipContext, channel},
    false,
    async (tx) => {
      const current = await requireAssignment(
        deps, actor, tx, organizerId, false, true,
      );
      if (
        current.revision !== expectedRevision &&
        current.revision !== expectedRevision + 1
      ) {
        fail(
          "aborted",
          "Assignment generation changed; refresh before reviewing.",
        );
      }
    }, async (tx, now) => {
      const row = await requireAssignment(deps, actor, tx, organizerId, false);
      expectRevision(row.revision, expectedRevision);
      if (row.status !== "offered") {
        fail("failed-precondition", "Lead was already accepted.");
      }
      const next: PartnerAssignment = {...row, revision: row.revision + 1,
        status: decision === "accept" ? "accepted" : "declined",
        relationshipContext,
        relationshipConfirmedAt: decision === "accept" ? now : null,
        channel: channel as PartnerAssignment["channel"], updatedAt: now};
      tx.set(deps.db.collection(ASSIGNMENTS).doc(organizerId), next);
      return {organizerId, revision: next.revision, status: next.status};
    });
}

/**
 * Own accepted lead context remains a self-report; this action sends no
 * outreach.
 */
export async function updateAssignment(deps: PartnerDeps, actor: PartnerActor,
  payload: unknown): Promise<Record<string, unknown>> {
  const input = object(payload, ["requestId", "organizerId", "expectedRevision",
    "relationshipContext", "channel", "nextAction", "reviewAt"]);
  const request = requestId(input.requestId);
  const organizerId = id(input.organizerId);
  const expectedRevision = revision(input.expectedRevision);
  const relationshipContext = input.relationshipContext === null ?
    null : text(input.relationshipContext, 1000);
  const channel = input.channel;
  if (!["email", "whatsapp", "other"].includes(String(channel))) {
    fail("invalid-argument", "Choose your established contact channel.");
  }
  const nextAction = text(input.nextAction, 500);
  const reviewAt = iso(input.reviewAt);
  return mutatePartnerAction(deps, actor, "partner.assignment.update", request,
    {organizerId, expectedRevision, relationshipContext, channel,
      nextAction, reviewAt}, false,
    async (tx) => {
      const current = await requireAssignment(
        deps, actor, tx, organizerId, true,
      );
      if (
        current.revision !== expectedRevision &&
        current.revision !== expectedRevision + 1
      ) {
        fail(
          "aborted",
          "Assignment generation changed; refresh before editing.",
        );
      }
    }, async (tx, now) => {
      const row = await requireAssignment(deps, actor, tx, organizerId, true);
      expectRevision(row.revision, expectedRevision);
      future(reviewAt, deps.now(), 30);
      if (Date.parse(reviewAt) > Date.parse(row.expiresAt)) {
        fail("invalid-argument", "Review before this assignment expires.");
      }
      const next: PartnerAssignment = {...row, revision: row.revision + 1,
        relationshipContext,
        relationshipConfirmedAt: relationshipContext ? now : null,
        channel: channel as PartnerAssignment["channel"], nextAction, reviewAt,
        updatedAt: now};
      tx.set(deps.db.collection(ASSIGNMENTS).doc(organizerId), next);
      return {organizerId, revision: next.revision, status: next.status};
    });
}

export async function revokePartnerAccess(
  deps: PartnerDeps, actor: PartnerActor,
  payload: unknown): Promise<Record<string, unknown>> {
  const input = object(payload, [
    "requestId", "organizerId", "partnerUid", "expectedRevision", "reason",
  ]);
  const request = requestId(input.requestId);
  const partnerUid = id(input.partnerUid);
  const organizerId = input.organizerId === null ? null : id(input.organizerId);
  const expectedRevision = revision(input.expectedRevision);
  const reason = text(input.reason, 1000);
  return mutatePartnerAction(deps, actor, "partner.revoke", request,
    {organizerId, partnerUid, expectedRevision, reason}, true,
    async () => undefined,
    async (tx, now) => {
      const ref = deps.db.collection(organizerId ? ASSIGNMENTS : MEMBERSHIPS)
        .doc(organizerId ?? partnerUid);
      const row = (await tx.get(ref)).data();
      if (!row || (organizerId ? row.partnerUid : row.uid) !== partnerUid) {
        fail("not-found", "Partner access record not found.");
      }
      expectRevision(row.revision, expectedRevision);
      tx.set(ref, {...row, revision: expectedRevision + 1,
        status: "revoked", updatedAt: now});
      return {organizerId, partnerUid,
        revision: expectedRevision + 1, status: "revoked"};
    });
}

/** No account summary, employee notes, contact inventory, or guest records. */
export async function getPartnerWorkspace(
  deps: PartnerDeps, actor: PartnerActor,
  payload: unknown): Promise<Record<string, unknown>> {
  const input = object(payload, ["cursor"]);
  const cursor = input.cursor === null || input.cursor === undefined ?
    null : id(input.cursor);
  return deps.db.runTransaction(async (tx) => {
    const membership = await requirePartner(deps, actor, tx);
    let query = deps.db.collection(ASSIGNMENTS)
      .where("partnerUid", "==", actor.uid)
      .orderBy(admin.firestore.FieldPath.documentId());
    if (cursor) query = query.startAfter(cursor);
    const page = await tx.get(query.limit(26));
    const leads = [];
    for (const snap of page.docs.slice(0, 25)) {
      try {
        const assignment = await requireAssignment(
          deps, actor, tx, snap.id, false,
        );
        const organizer = (
          await tx.get(deps.db.collection("organizers").doc(snap.id))
        ).data()!;
        leads.push({assignment: {organizerId: assignment.organizerId,
          revision: assignment.revision, status: assignment.status,
          nextAction: assignment.nextAction, reviewAt: assignment.reviewAt,
          expiresAt: assignment.expiresAt,
          relationshipContext: assignment.relationshipContext,
          channel: assignment.channel},
        organizer: {organizerId: snap.id, name: organizer.name,
          city: organizer.cityName ?? null,
          claimState: organizer.claim?.state ?? "unclaimed"}});
      } catch (error) {
        if (!(error instanceof Error && "code" in error &&
            ["permission-denied", "failed-precondition"].includes(
              String(error.code),
            ))) {
          throw error;
        }
      }
    }
    const submissions = await tx.get(
      deps.db.collection("salesInboundIntents")
        .where("partnerUid", "==", actor.uid)
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(25),
    );
    const ownSubmissions = [];
    for (const s of submissions.docs) {
      const row = s.data();
      if (typeof row.organizerId === "string") {
        try {
          await assertSalesPrivacyOpen(tx, deps.db, row.organizerId);
        } catch (error) {
          if (
            error instanceof Error && "code" in error &&
            error.code === "failed-precondition"
          ) {
            continue;
          }
          throw error;
        }
      }
      ownSubmissions.push({
        intentId: s.id,
        status: row.status,
        name: row.hostApplication?.organizationName,
        organizerId: row.organizerId,
      });
    }
    await requirePartner(deps, actor, tx);
    return {
      membership: {
        uid: membership.uid,
        displayName: membership.displayName,
        termsVersion: membership.termsVersion,
        expiresAt: membership.expiresAt,
      },
      leads,
      submissions: ownSubmissions,
      nextCursor: page.size > 25 ? page.docs[24].id : null,
      sendAuthority: false,
    };
  });
}

interface MarketingScope {
  partnerUid: string; organizerId: string; campaignId: string;
  channel: PartnerMarketingGrant["channel"]; assetIds: string[];
}
function parseMarketingScope(input: Record<string, unknown>): MarketingScope {
  const channel = input.channel;
  if (!["email", "whatsapp", "other"].includes(String(channel))) {
    fail("invalid-argument", "Choose the exact reviewed marketing channel.");
  }
  const assetIds = uniqueIds(input.assetIds, 12).map(id).sort();
  if (!assetIds.length) {
    fail(
      "invalid-argument",
      "Choose at least one approved wording asset.",
    );
  }
  return {
    partnerUid: id(input.partnerUid),
    organizerId: id(input.organizerId),
    campaignId: id(input.campaignId),
    channel: channel as MarketingScope["channel"],
    assetIds,
  };
}
function marketingGrantId(scope: MarketingScope): string {
  return `marketing-${hash([scope.partnerUid, scope.organizerId,
    scope.campaignId, scope.channel]).slice(0, 40)}`;
}
function marketingGrants(member: PartnerMembership): PartnerMarketingGrant[] {
  const grants = member.marketingGrants;
  if (!Array.isArray(grants) || grants.length > 30 || grants.some((g) =>
    !g || g.schemaVersion !== 1 || typeof g.grantId !== "string" ||
    !Number.isSafeInteger(g.revision) || g.revision < 1 ||
    typeof g.approvalReceiptId !== "string" ||
    !/^[a-f0-9]{64}$/u.test(g.approvalReceiptId) ||
    !Number.isSafeInteger(g.approvedMembershipRevision) ||
    g.approvedMembershipRevision < 1 ||
    !Number.isSafeInteger(g.assignmentRevision) ||
    g.assignmentRevision < 1 ||
    !["active", "revoked"].includes(g.status) ||
    typeof g.reviewedBy !== "string" || !g.reviewedBy ||
    typeof g.reviewedAt !== "string" ||
    !Number.isFinite(Date.parse(g.reviewedAt)) ||
    typeof g.reason !== "string" || !g.reason.trim() ||
    typeof g.sourceHash !== "string" || !/^[a-f0-9]{64}$/u.test(g.sourceHash) ||
    g.purpose !== "manual_partner_outreach") ||
    new Set(grants.map((g) => g.grantId)).size !== grants.length) {
    fail(
      "failed-precondition",
      "Marketing permissions need an explicit current review.",
    );
  }
  return grants;
}
async function marketingContext(
  deps: PartnerDeps, tx: Tx, scope: MarketingScope,
) {
  // Employee review reads target state without impersonating its Firebase user.
  // Partner consumers authenticate themselves separately before using this
  // helper.
  const membership = await readPartnerMembership(deps, tx, scope.partnerUid);
  const assignment = await readPartnerAssignment(
    deps, tx, scope.partnerUid, scope.organizerId,
  );
  const snapshots = await Promise.all(scope.assetIds.map((assetId) =>
    tx.get(deps.db.collection("salesIntelligenceClauses").doc(assetId))));
  const sourceRows = snapshots.map((snap, index) => {
    const row = snap.data();
    if (!row || row.schemaVersion !== 1 ||
        row.classification !== "sales_private" ||
        row.clauseId !== scope.assetIds[index] ||
        row.organizerId !== scope.organizerId ||
        row.state !== "approved" ||
        !["capability", "reference", "cta"].includes(row.kind) ||
        row.permission !== "not_required" ||
        !Number.isSafeInteger(row.revision) ||
        row.revision < 1 || typeof row.text !== "string" || !row.text.trim() ||
        row.text.length > 2000 || typeof row.reviewedBy !== "string" ||
        !row.reviewedBy || typeof row.reviewedAt !== "string" ||
        !Number.isFinite(Date.parse(row.reviewedAt)) ||
        Date.parse(row.reviewedAt) > deps.now().getTime() ||
        typeof row.validUntil !== "string" ||
        !Number.isFinite(Date.parse(row.validUntil)) ||
        Date.parse(row.validUntil) <= deps.now().getTime()) {
      fail(
        "failed-precondition",
        "A wording asset is missing, private, changed or no longer approved.",
      );
    }
    return row;
  });
  const evidenceIds = [
    ...new Set(
      sourceRows.flatMap((row) => uniqueIds(row.evidenceIds, 8)),
    ),
  ].sort();
  const evidence = await Promise.all(evidenceIds.map(async (evidenceId) => {
    const row = (
      await tx.get(deps.db.collection("salesEvidence").doc(evidenceId))
    ).data();
    if (!currentReviewedEvidence(
      row, scope.organizerId, deps.now().toISOString(),
    )) {
      fail(
        "failed-precondition",
        "A wording source is missing or no longer currently reviewed.",
      );
    }
    return {evidenceId, row: row!};
  }));
  const sourceHash = hash({
    scope,
    assignmentRevision: assignment.revision,
    assets: sourceRows,
    evidence,
  });
  const validUntil = new Date(Math.min(
    Date.parse(membership.expiresAt),
    Date.parse(assignment.expiresAt),
    ...sourceRows.map((row) => Date.parse(row.validUntil)),
    ...evidence.filter(({row}) => row.validThrough)
      .map(({row}) => Date.parse(row.validThrough)),
  )).toISOString();
  const assets = sourceRows.map((row) => ({
    assetId: row.clauseId as string,
    kind: row.kind as string,
    text: row.text as string,
    validUntil: row.validUntil as string,
  }));
  return {membership, assignment, sourceHash, validUntil, assets};
}

function marketingTimeFence(deps: PartnerDeps, deadline: string): void {
  if (!Number.isFinite(Date.parse(deadline)) ||
      Date.parse(deadline) <= deps.now().getTime()) {
    fail(
      "permission-denied",
      "Marketing permission or reviewed source expired during this request.",
    );
  }
}

/** Campaign is a reviewed capability scope, not another CRM or delivery job. */
export async function previewPartnerMarketingGrant(
  deps: PartnerDeps, actor: PartnerActor,
  payload: unknown): Promise<Record<string, unknown>> {
  employee(actor);
  const input = object(payload, [
    "partnerUid", "organizerId", "campaignId", "channel", "assetIds",
  ]);
  const scope = parseMarketingScope(input);
  return deps.db.runTransaction(async (tx) => {
    await deps.checkAuth(actor, true);
    const state = await marketingContext(deps, tx, scope);
    const grantId = marketingGrantId(scope);
    const prior = marketingGrants(state.membership)
      .find((g) => g.grantId === grantId);
    await deps.checkAuth(actor, true);
    marketingTimeFence(deps, state.validUntil);
    return {...scope, grantId,
      expectedMembershipRevision: state.membership.revision,
      expectedGrantRevision: prior?.revision ?? 0, sourceHash: state.sourceHash,
      expiresBefore: state.validUntil, assets: state.assets,
      sendAuthority: false, publicationAuthority: false};
  });
}

export async function reviewPartnerMarketingGrant(
  deps: PartnerDeps, actor: PartnerActor,
  payload: unknown): Promise<Record<string, unknown>> {
  const input = object(payload, [
    "requestId", "partnerUid", "organizerId", "campaignId", "channel",
    "assetIds", "expectedMembershipRevision", "expectedGrantRevision",
    "sourceHash", "expiresAt", "reason",
  ]);
  const scope = parseMarketingScope(input);
  const request = requestId(input.requestId);
  const expectedMembershipRevision = revision(input.expectedMembershipRevision);
  const expectedGrantRevision = revision(input.expectedGrantRevision);
  const sourceHash = input.sourceHash;
  if (typeof sourceHash !== "string" || !/^[a-f0-9]{64}$/u.test(sourceHash)) {
    fail("invalid-argument", "Review the exact current asset fingerprint.");
  }
  const expiresAt = future(input.expiresAt, deps.now(), 30);
  const reason = text(input.reason, 1000);
  const grantId = marketingGrantId(scope);
  let deadline = expiresAt;
  return mutatePartnerAction(deps, actor, "partner.marketing.review", request,
    {...scope, expectedMembershipRevision, expectedGrantRevision,
      sourceHash, expiresAt, reason}, true,
    async (tx) => {
      const state = await marketingContext(deps, tx, scope);
      deadline = new Date(Math.min(
        Date.parse(expiresAt), Date.parse(state.validUntil),
      )).toISOString();
      const prior = marketingGrants(state.membership)
        .find((g) => g.grantId === grantId);
      if (state.sourceHash !== sourceHash ||
          Date.parse(expiresAt) > Date.parse(state.validUntil)) {
        fail(
          "failed-precondition",
          "Assets or scope changed; review again before granting access.",
        );
      }
      if (![
        expectedMembershipRevision, expectedMembershipRevision + 1,
      ].includes(state.membership.revision) ||
          ![
            expectedGrantRevision, expectedGrantRevision + 1,
          ].includes(prior?.revision ?? 0)) {
        fail(
          "aborted",
          "Marketing permission generation changed; refresh before reviewing.",
        );
      }
      if (prior?.revision === expectedGrantRevision + 1 &&
          prior.status !== "active") {
        fail(
          "permission-denied",
          "The reviewed marketing permission was revoked.",
        );
      }
    }, async (tx, now) => {
      const state = await marketingContext(deps, tx, scope);
      deadline = new Date(Math.min(
        Date.parse(expiresAt), Date.parse(state.validUntil),
      )).toISOString();
      const grants = marketingGrants(state.membership);
      const prior = grants.find((g) => g.grantId === grantId);
      expectRevision(state.membership.revision, expectedMembershipRevision);
      expectRevision(prior?.revision ?? 0, expectedGrantRevision);
      if (!prior && grants.length >= 30) {
        fail(
          "resource-exhausted",
          "Campaign scope capacity reached; review an existing scope or " +
            "request an employee capacity review.",
        );
      }
      const grant: PartnerMarketingGrant = {schemaVersion: 1, grantId,
        revision: expectedGrantRevision + 1, status: "active",
        organizerId: scope.organizerId,
        campaignId: scope.campaignId, channel: scope.channel,
        assetIds: scope.assetIds,
        assignmentRevision: state.assignment.revision, sourceHash, expiresAt,
        approvalReceiptId: hash(`${actor.uid}\u0000${request}`),
        approvedMembershipRevision: expectedMembershipRevision + 1,
        reviewedAt: now, reviewedBy: actor.uid, reason,
        purpose: "manual_partner_outreach"};
      tx.set(deps.db.collection(MEMBERSHIPS).doc(scope.partnerUid), {
        ...state.membership,
        revision: expectedMembershipRevision + 1, updatedAt: now,
        marketingGrants: [
          ...grants.filter((g) => g.grantId !== grantId), grant,
        ],
      });
      return {partnerUid: scope.partnerUid, grantId, revision: grant.revision,
        membershipRevision: expectedMembershipRevision + 1,
        status: grant.status};
    }, () => marketingTimeFence(deps, deadline));
}

/** Revocation works after expiry, suppression or membership revocation too. */
export async function revokePartnerMarketingGrant(
  deps: PartnerDeps, actor: PartnerActor,
  payload: unknown): Promise<Record<string, unknown>> {
  const input = object(payload, ["requestId", "partnerUid", "grantId",
    "expectedMembershipRevision", "expectedGrantRevision", "reason"]);
  const partnerUid = id(input.partnerUid); const grantId = id(input.grantId);
  const expectedMembershipRevision = revision(input.expectedMembershipRevision);
  const expectedGrantRevision = revision(input.expectedGrantRevision);
  const reason = text(input.reason, 1000);
  const readState = async (tx: Tx) => {
    const membership = (
      await tx.get(deps.db.collection(MEMBERSHIPS).doc(partnerUid))
    ).data() as PartnerMembership | undefined;
    if (!membership || membership.uid !== partnerUid ||
        membership.schemaVersion !== 1 ||
        membership.classification !== "sales_private") {
      fail("not-found", "Partner permission record not found.");
    }
    const grants = marketingGrants(membership);
    const grant = grants.find((g) => g.grantId === grantId);
    if (!grant) fail("not-found", "Marketing permission record not found.");
    return {membership, grants, grant};
  };
  return mutatePartnerAction(
    deps, actor, "partner.marketing.revoke", requestId(input.requestId),
    {partnerUid, grantId, expectedMembershipRevision,
      expectedGrantRevision, reason}, true,
    async (tx) => {
      const state = await readState(tx);
      if (![
        expectedMembershipRevision, expectedMembershipRevision + 1,
      ].includes(state.membership.revision) ||
          ![
            expectedGrantRevision, expectedGrantRevision + 1,
          ].includes(state.grant.revision)) {
        fail(
          "aborted",
          "Marketing permission generation changed; refresh before revoking.",
        );
      }
    }, async (tx, now) => {
      const state = await readState(tx);
      expectRevision(state.membership.revision, expectedMembershipRevision);
      expectRevision(state.grant.revision, expectedGrantRevision);
      const grant = {...state.grant, revision: expectedGrantRevision + 1,
        status: "revoked" as const, reviewedAt: now,
        reviewedBy: actor.uid, reason};
      tx.set(deps.db.collection(MEMBERSHIPS).doc(partnerUid), {
        ...state.membership,
        revision: expectedMembershipRevision + 1, updatedAt: now,
        marketingGrants: state.grants.map(
          (g) => g.grantId === grantId ? grant : g,
        ),
      });
      return {partnerUid, grantId, revision: grant.revision,
        membershipRevision: expectedMembershipRevision + 1,
        status: grant.status};
    });
}

/**
 * Grants return exact approved wording only; no recipients, guests or live
 * authority.
 */
export async function getPartnerMarketingAssets(
  deps: PartnerDeps, actor: PartnerActor,
  payload: unknown): Promise<Record<string, unknown>> {
  const input = object(payload, ["grantId", "expectedGrantRevision"]);
  const grantId = id(input.grantId);
  const expected = revision(input.expectedGrantRevision);
  return deps.db.runTransaction(async (tx) => {
    const membership = await requirePartner(deps, actor, tx);
    const grant = marketingGrants(membership)
      .find((g) => g.grantId === grantId);
    if (!grant || grant.status !== "active" ||
        grant.purpose !== "manual_partner_outreach" ||
        !Number.isFinite(Date.parse(grant.expiresAt)) ||
        Date.parse(grant.expiresAt) <= deps.now().getTime()) {
      fail(
        "permission-denied",
        "Current reviewed marketing permission is required.",
      );
    }
    expectRevision(grant.revision, expected);
    const scope = parseMarketingScope({...grant, partnerUid: actor.uid});
    if (marketingGrantId(scope) !== grantId) {
      fail("permission-denied", "Marketing scope is inconsistent.");
    }
    const state = await marketingContext(deps, tx, scope);
    if (state.sourceHash !== grant.sourceHash ||
        state.assignment.revision !== grant.assignmentRevision ||
        Date.parse(grant.expiresAt) > Date.parse(state.validUntil)) {
      fail(
        "failed-precondition",
        "Marketing assets changed; a new explicit review is required.",
      );
    }
    const receipt = (
      await tx.get(
        deps.db.collection("salesActionReceipts")
          .doc(grant.approvalReceiptId),
      )
    ).data();
    const material = {...scope,
      expectedMembershipRevision: grant.approvedMembershipRevision - 1,
      expectedGrantRevision: grant.revision - 1, sourceHash: grant.sourceHash,
      expiresAt: grant.expiresAt, reason: grant.reason};
    if (receipt?.schemaVersion !== 1 ||
        receipt.classification !== "sales_private" ||
        receipt.actorUid !== grant.reviewedBy ||
        receipt.createdAt !== grant.reviewedAt ||
        receipt.action !== "partner.marketing.review" ||
        typeof receipt.requestId !== "string" ||
        hash(`${grant.reviewedBy}\u0000${receipt.requestId}`) !==
          grant.approvalReceiptId ||
        !receipt.result || typeof receipt.result !== "object" ||
        Array.isArray(receipt.result) ||
        receipt.requestHash !== hash({
          action: "partner.marketing.review", material,
        }) ||
        hash(receipt.result) !== hash({
          partnerUid: actor.uid, grantId, revision: grant.revision,
          membershipRevision: grant.approvedMembershipRevision,
          status: "active",
        })) {
      fail(
        "failed-precondition",
        "Marketing permission does not match its immutable approval receipt.",
      );
    }
    await requirePartner(deps, actor, tx);
    await deps.checkAuth(actor, false);
    marketingTimeFence(deps, state.validUntil);
    marketingTimeFence(deps, grant.expiresAt);
    return {grantId, revision: grant.revision, organizerId: grant.organizerId,
      campaignId: grant.campaignId, channel: grant.channel,
      expiresAt: grant.expiresAt,
      assets: state.assets, sendAuthority: false, publicationAuthority: false,
      guestAuthority: false, providerAuthority: false};
  });
}
