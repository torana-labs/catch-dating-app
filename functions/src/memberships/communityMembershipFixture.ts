import {createHash} from "node:crypto";
import type {CallableRequest} from "firebase-functions/v2/https";
import {
  approvedApplicationFixture,
  responseId,
  actorUid,
  org,
  Row,
} from "../organizerFormAdmission/admissionTestFixture";
import {decideOrganizerCommunityMembershipHandler} from "./communityMembership";
import {
  communityMembershipId,
  communityMembershipDecisionId,
} from "./communityMembershipAuthority";

/** Synthetic new decisions only, never reconstructed historical evidence. */
export function communityMembershipFixture() {
  const {store, applicationId} = approvedApplicationFixture();
  const uid = "respondent1";
  Object.assign(store.get(`organizerApplications/${applicationId}`)!, {
    targetKind: "organizer",
    targetId: null,
    linkedUid: uid,
  });
  Object.assign(store.get(`organizerFormResponses/${responseId}`)!, {
    identityKind: "phoneVerified",
    respondentUid: uid,
    identity: {
      displayName: "Ada Guest",
      searchName: "ada guest",
      email: null,
      phoneE164: "+919999999999",
      origin: "respondentGranted",
    },
  });
  Object.assign(
    store.get("organizerFormVersions/version1")!.definition as Row,
    {
      defaultTargetKind: "organizer",
      defaultTargetId: null,
      identityPolicy: "phoneVerified",
    }
  );
  const payload = {
    organizerId: org,
    uid,
    requestId: "grant1",
    action: "grant" as "grant" | "revoke",
    expectedRevision: 0,
    applicationId: applicationId as string | null,
    expectedApplicationRevision: 2 as number | null,
    reason: "Host approved",
  };
  const decide = (changes: Partial<typeof payload> = {}, caller = actorUid) =>
    decideOrganizerCommunityMembershipHandler(
      {
        auth: {uid: caller, token: {}},
        data: {...payload, ...changes},
      } as CallableRequest<unknown>,
      {
        firestore: () => store.db(),
        checkRateLimit: async () => undefined,
        nowMillis: () => 2000,
      }
    );
  return {
    store,
    applicationId,
    payload,
    decide,
    uid,
    membershipId: communityMembershipId(org, uid),
  };
}

/** Fixture for existing booking harnesses; same persisted decision contract. */
export function communityMembershipRows(
  organizerId: string,
  uid: string,
  state: "active" | "revoked" = "active"
): Record<string, Row> {
  const membershipId = communityMembershipId(organizerId, uid);
  const source = {
    applicationId: "fixtureApplication",
    responseId: "fixtureResponse",
    formVersionId: "fixtureVersion",
    applicationRevision: 2,
  };
  const grantRequestId = "fixtureGrant1";
  const grantId = communityMembershipDecisionId(
    organizerId,
    uid,
    grantRequestId
  );
  const decisionId =
    state === "active" ?
      grantId :
      communityMembershipDecisionId(organizerId, uid, "fixtureRevoke1");
  const grant = {
    schemaVersion: 1,
    organizerId,
    uid,
    membershipId,
    requestId: grantRequestId,
    requestHash: createHash("sha256")
      .update("synthetic new fixture")
      .digest("hex"),
    actorUid: "fixtureManager",
    action: "grant",
    reason: "Synthetic fixture",
    previousState: "none",
    expectedRevision: 0,
    resultingRevision: 1,
    source,
    decidedAtMillis: 1000,
  };
  return {
    [`organizerCommunityMemberships/${membershipId}`]: {
      schemaVersion: 1,
      organizerId,
      uid,
      state,
      revision: state === "active" ? 1 : 2,
      source,
      lastDecisionId: decisionId,
      activatedAtMillis: 1000,
      updatedAtMillis: state === "active" ? 1000 : 1100,
    },
    [`organizerCommunityMembershipDecisions/${grantId}`]: grant,
    ...(state === "revoked" ?
      {
        [`organizerCommunityMembershipDecisions/${decisionId}`]: {
          ...grant,
          requestId: "fixtureRevoke1",
          action: "revoke",
          previousState: "active",
          expectedRevision: 1,
          resultingRevision: 2,
          decidedAtMillis: 1100,
        },
      } :
      {}),
  };
}
