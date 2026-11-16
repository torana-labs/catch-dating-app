import assert from "node:assert/strict";
import test from "node:test";
import {communityMembershipFixture} from "./communityMembershipFixture";
import {readApplicantCommunityMembership} from "./communityMembershipSummary";
import {org} from "../organizerFormAdmission/admissionTestFixture";
import type {OrganizerApplicationDocument} from
  "../shared/generated/firestoreAdminTypes";

function standing(h: ReturnType<typeof communityMembershipFixture>,
  changes: Partial<OrganizerApplicationDocument> = {}) {
  const application = {
    ...h.store.get(`organizerApplications/${h.applicationId}`),
    ...changes,
  } as unknown as OrganizerApplicationDocument;
  return readApplicantCommunityMembership({
    db: h.store.db(), organizerId: org, application, nowMillis: 3000,
  });
}

test("an approved organizer applicant with no decision stands at none",
  async () => {
    const h = communityMembershipFixture();
    assert.deepEqual(await standing(h),
      {uid: h.uid, state: "none", revision: 0});
  });

test("a grant and a revoke show as the revision the next decision expects",
  async () => {
    const h = communityMembershipFixture();
    await h.decide();
    assert.deepEqual(await standing(h),
      {uid: h.uid, state: "active", revision: 1});
    await h.decide({requestId: "revoke1", action: "revoke",
      expectedRevision: 1, applicationId: null,
      expectedApplicationRevision: null});
    assert.deepEqual(await standing(h),
      {uid: h.uid, state: "revoked", revision: 2});
  });

test("an application that cannot carry a membership reads null", async () => {
  const h = communityMembershipFixture();
  assert.equal(await standing(h, {linkedUid: null}), null);
  assert.equal(await standing(h, {targetKind: "event", targetId: "event1"}),
    null);
  const source = h.store.get(`organizerApplications/${h.applicationId}`)!
    .source as Record<string, unknown>;
  assert.equal(await standing(h, {
    source: {...source, kind: "tabularImport"},
  } as Partial<OrganizerApplicationDocument>), null);
});

test("a membership that fails its authority checks hides the decision",
  async () => {
    const h = communityMembershipFixture();
    const result = await h.decide();
    Object.assign(h.store.get(
      `organizerCommunityMemberships/${result.membershipId}`)!,
    {revision: 7});
    assert.equal(await standing(h), null);
  });
