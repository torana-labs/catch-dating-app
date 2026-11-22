import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument} from "../../shared/generated/firestoreAdminTypes";

/** Approval alone cannot substitute for cohort, member or pair eligibility. */
export function assertUnpartitionedAdmission(event: EventDocument): void {
  assertUnpartitionedInventory(event);
  const admission = event.eventPolicy?.admission;
  if (admission?.format === "membersOnly" || admission?.membershipRequired) {
    throw new HttpsError("failed-precondition",
      "This event requires its membership admission flow.");
  }
}

/** Shared inventory boundary; member eligibility has its own current proof. */
export function assertUnpartitionedInventory(event: EventDocument): void {
  const admission = event.eventPolicy?.admission;
  if (admission?.crossPathsPairInventory?.enabled ||
      (event.crossPathsPairHeldCount ?? 0) !== 0 ||
      (event.crossPathsPairConfirmedCount ?? 0) !== 0 ||
      Object.values(event.crossPathsPairHeldCohortCounts ?? {})
        .some((count) => count !== 0) ||
      Object.keys(admission?.cohortCapacityLimits ?? {}).length > 0 ||
      admission?.balancedRatioPolicy != null ||
      ["balancedRatio", "fixedCohortCaps"].includes(
        admission?.format ?? "") ||
      event.constraints?.maxMen != null ||
      event.constraints?.maxWomen != null) {
    throw new HttpsError("failed-precondition",
      "This event requires its cohort, membership or Cross Paths admission " +
      "flow.");
  }
}
