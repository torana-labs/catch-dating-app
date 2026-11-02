import type {ManagePaymentRoutingPolicyCallablePayload} from
  "../../../generated/contracts/managePaymentRoutingPolicyCallablePayload";
import type {ManagePaymentRoutingPolicyCallableResponse} from
  "../../../generated/contracts/managePaymentRoutingPolicyCallableResponse";

/**
 * Catch's app-wide payment routing, per purpose. The route is the money
 * flow: razorpayOAuth means the host collects on their own Razorpay account;
 * razorpayRoute means Catch's platform account collects and splits. At app
 * scope an unset purpose is off.
 */
export type RoutingPurpose = "eventAdmission" | "formFee" | "hostMembership";
export const routingPurposes: readonly RoutingPurpose[] =
  ["eventAdmission", "formFee", "hostMembership"];
export const routingPurposeLabels: Record<RoutingPurpose, string> = {
  eventAdmission: "Event tickets",
  formFee: "Form fees",
  hostMembership: "Host memberships",
};

export type RoutingSelection = NonNullable<
  ManagePaymentRoutingPolicyCallableResponse["formFee"]>;
export type RoutingPolicy = ManagePaymentRoutingPolicyCallableResponse;
export type RoutingReplacement = ManagePaymentRoutingPolicyCallablePayload & {
  action: "replace";
};

export type RoutingChoice = "off" | "razorpayOAuth" | "razorpayRoute" |
  "unsupported";
export interface PurposeDraft {route: RoutingChoice; mode: "test" | "live"}
export type RoutingDraft = Record<RoutingPurpose, PurposeDraft>;

export const routeOptions = [
  {value: "off", label: "Off"},
  {value: "razorpayOAuth", label: "Host collects (organizer's Razorpay)"},
  {value: "razorpayRoute", label: "Catch splits (Razorpay Route)"},
] as const;
export const modeOptions = [
  {value: "test", label: "Test mode"},
  {value: "live", label: "Live mode"},
] as const;

export function storedSelection(policy: RoutingPolicy,
  purpose: RoutingPurpose): RoutingSelection | null {
  return policy[purpose] ?? null;
}

export function purposeDraftOf(selection: RoutingSelection | null):
  PurposeDraft {
  if (!selection || selection.route === "disabled") {
    return {route: "off", mode: "test"};
  }
  return {route: selection.route === "razorpayOAuth" ||
    selection.route === "razorpayRoute" ? selection.route : "unsupported",
  mode: selection.mode};
}

export function draftFromPolicy(policy: RoutingPolicy): RoutingDraft {
  return Object.fromEntries(routingPurposes.map((purpose) =>
    [purpose, purposeDraftOf(storedSelection(policy, purpose))])) as
    RoutingDraft;
}

/** How one stored selection reads to an operator. */
export function describeSelection(selection: RoutingSelection | null): {
  route: string; mode: "test" | "live" | null;
} {
  if (!selection || selection.route === "disabled") {
    return {route: "Off", mode: null};
  }
  const route = selection.route === "razorpayOAuth" ?
    "Host collects (organizer's Razorpay)" :
    selection.route === "razorpayRoute" ? "Catch splits (Razorpay Route)" :
      `${selection.route} (not supported in the console)`;
  return {route, mode: selection.mode};
}

function describeDraft(draft: PurposeDraft, stored: RoutingSelection | null):
  string {
  if (draft.route === "unsupported") {
    const current = describeSelection(stored);
    return `${current.route}${current.mode ? ` · ${current.mode}` : ""}`;
  }
  if (draft.route === "off") return "Off";
  const label = routeOptions.find((option) => option.value === draft.route)!
    .label;
  return `${label} · ${draft.mode}`;
}

/**
 * The selection a draft saves. Unchanged purposes keep their stored value
 * exactly, so a null stays null and an unsupported route is preserved.
 */
function selectionFromDraft(draft: PurposeDraft,
  stored: RoutingSelection | null): RoutingSelection | null {
  const before = purposeDraftOf(stored);
  // A stored null and an explicit off both block at app scope; a null is
  // kept so an unchanged purpose saves exactly what was there.
  if (draft.route === "unsupported" ||
      draft.route === before.route &&
        (draft.route === "off" || draft.mode === before.mode)) {
    return stored;
  }
  if (draft.route === "off") return {route: "disabled"};
  return {route: draft.route, mode: draft.mode, currency: "INR",
    merchantCountry: "IN"};
}

export function replacementFromDraft(policy: RoutingPolicy,
  draft: RoutingDraft): RoutingReplacement {
  const next = (purpose: RoutingPurpose) => selectionFromDraft(
    draft[purpose], storedSelection(policy, purpose));
  return {action: "replace", organizerId: null,
    expectedRevision: policy.revision, formFee: next("formFee"),
    eventAdmission: next("eventAdmission"),
    hostMembership: next("hostMembership")};
}

export interface RoutingDiffRow {
  purpose: RoutingPurpose;
  field: string;
  before: string;
  after: string;
  changed: boolean;
}

/**
 * Before any app policy is saved, form fees follow each organizer's own
 * Razorpay connection, in that connection's mode. Saving the first policy
 * replaces that with the one selection chosen here.
 */
export function followsLegacyConnections(policy: RoutingPolicy,
  purpose: RoutingPurpose): boolean {
  return policy.revision === 0 && purpose === "formFee";
}
export const legacyFormFeeLabel =
  "Each organizer's own Razorpay connection, in its mode (no app policy yet)";

export function routingDiff(policy: RoutingPolicy, draft: RoutingDraft):
  RoutingDiffRow[] {
  return routingPurposes.map((purpose) => {
    const stored = storedSelection(policy, purpose);
    const before = followsLegacyConnections(policy, purpose) ?
      legacyFormFeeLabel : describeDraft(purposeDraftOf(stored), stored);
    const after = describeDraft(draft[purpose], stored);
    return {purpose, field: routingPurposeLabels[purpose], before, after,
      changed: before !== after};
  });
}

export interface RoutingConfirmation {
  id: string;
  purpose: RoutingPurpose;
  phrase: string;
  reason: string;
}

/**
 * Typed confirmations for the changes that can move real money: turning a
 * purpose live, and choosing the Route split, which needs Catch's platform
 * account and the platform commercial terms.
 */
export function requiredConfirmations(policy: RoutingPolicy,
  draft: RoutingDraft): RoutingConfirmation[] {
  const confirmations: RoutingConfirmation[] = [];
  for (const purpose of routingPurposes) {
    const before = purposeDraftOf(storedSelection(policy, purpose));
    const after = draft[purpose];
    const label = routingPurposeLabels[purpose].toLowerCase();
    const enabled = after.route === "razorpayOAuth" ||
      after.route === "razorpayRoute";
    const legacy = followsLegacyConnections(policy, purpose);
    const wasLive = !legacy && before.route !== "off" && before.mode === "live";
    const wasOn = legacy || before.route !== "off";
    if (after.route === "off" && wasOn) {
      confirmations.push({id: `${purpose}.off`, purpose,
        phrase: `${label} off`,
        reason: `${routingPurposeLabels[purpose]} will stop taking ` +
          "automatic payments for every organizer without their own override."});
    }
    if (enabled && after.mode === "live" && !wasLive) {
      confirmations.push({id: `${purpose}.live`, purpose,
        phrase: `${label} live`,
        reason: `${routingPurposeLabels[purpose]} will take real payments.`});
    }
    if (after.route === "razorpayRoute" && before.route !== "razorpayRoute") {
      confirmations.push({id: `${purpose}.route`, purpose,
        phrase: `${label} route`,
        reason: `${routingPurposeLabels[purpose]} will be collected on ` +
          "Catch's platform account and split through Razorpay Route. " +
          "Route payments stay unavailable until platform commercial terms " +
          "are saved and the platform account is set up."});
    }
  }
  return confirmations;
}

/** Purposes that would be live after this draft is saved. */
export function livePurposes(draft: RoutingDraft): RoutingPurpose[] {
  return routingPurposes.filter((purpose) => draft[purpose].route !== "off" &&
    draft[purpose].mode === "live");
}

export function confirmationsSatisfied(
  confirmations: RoutingConfirmation[], typed: Record<string, string>):
  boolean {
  return confirmations.every((confirmation) =>
    (typed[confirmation.id] ?? "").trim().toLowerCase() ===
      confirmation.phrase);
}
