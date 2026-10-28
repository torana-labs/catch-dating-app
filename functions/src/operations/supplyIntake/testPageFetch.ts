import type {FakeFirestore} from "../testFirestore";
import {supplyIntakeCollections} from "./worker";

/** The decision the shipped acquisition policy cites (CAT-266). */
export const PAGE_FETCH_DECISION_ID = "policy-on-demand-page-fetch-policy";

/** The owner's accepted page fetch decision, as Admin records it. */
export const acceptedPageFetchDecision = {
  schemaVersion: 1,
  decisionId: PAGE_FETCH_DECISION_ID,
  gapId: "on_demand_page_fetch_policy",
  decision: "accept",
  decisionStatus: "accepted",
  requiredInputsReviewed: ["robots"],
  checklist: {
    requiredInputsReviewed: true,
    costAndSafetyReviewed: true,
    implementationOwnerReviewed: true,
    behaviorStillDisabledAcknowledged: true,
  },
  operationalState: "blocked_until_policy_encoded",
};

export interface TransportResponse {
  status: number;
  location: null;
  contentType: string;
  body: Buffer;
}
export type Transport = (request: {url: URL}) => Promise<TransportResponse>;

/** No test reaches the network: every page is missing unless one serves it. */
export const notFoundTransport: Transport = async () => ({
  status: 404, location: null, contentType: "text/plain", body: Buffer.alloc(0),
});

/** Records the accepted decision, so the worker may fetch in tests. */
export function acceptPageFetch(
  db: FakeFirestore,
  decision: Record<string, unknown> = acceptedPageFetchDecision,
) {
  const path = `${supplyIntakeCollections.decisions}/${PAGE_FETCH_DECISION_ID}`;
  db.write(path, decision);
}
