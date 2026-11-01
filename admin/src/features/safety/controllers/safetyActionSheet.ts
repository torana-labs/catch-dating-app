import type {
  AccountActionKind,
  SafetyReason,
  TakeAccountAction,
} from "../api/accountSafetyRepository";

/**
 * Rules behind the act-on-an-account sheet (board AdminSafetyAction): the
 * ladder, who may take each step, how long each lasts, and the message the
 * person sees. The server enforces the same rules; this keeps the sheet from
 * offering what would be refused.
 */

export type SafetyJob = "owner" | "ops";
export type ActionDuration = 7 | 30 | null;

export interface ActionStep {
  kind: AccountActionKind;
  title: string;
  subtitle: string;
  ownerOnly: boolean;
  durations: ActionDuration[];
}

export const ACTION_STEPS: ActionStep[] = [
  {kind: "warn", title: "Warn",
    subtitle: "They see the rule they broke. Nothing else changes.",
    ownerOnly: false, durations: [null]},
  {kind: "restrict", title: "Restrict",
    subtitle: "No messages or group chats for a while. They can still book.",
    ownerOnly: false, durations: [7, 30, null]},
  {kind: "suspend", title: "Suspend",
    subtitle: "Signed out of Catch for a while. Future bookings cancelled; " +
      "organizers asked to refund.",
    ownerOnly: true, durations: [7, 30, null]},
  {kind: "ban", title: "Ban",
    subtitle: "Account closed across Catch. This phone and device cannot " +
      "make another.",
    ownerOnly: true, durations: [null]},
];

export function safetyJob(roles: readonly string[]): SafetyJob {
  return roles.includes("adminOwner") ? "owner" : "ops";
}

export function canTakeStep(job: SafetyJob, kind: AccountActionKind):
  boolean {
  const step = ACTION_STEPS.find((item) => item.kind === kind);
  return Boolean(step) && (!step!.ownerOnly || job === "owner");
}

export function durationLabel(duration: ActionDuration): string {
  return duration === null ? "Until we lift it" : `${duration} days`;
}

export function activeReasons(reasons: SafetyReason[]): SafetyReason[] {
  return reasons.filter((reason) => reason.active);
}

/** The plain-words message the person sees; never names a reporter. */
export function defaultActionMessage(input: {
  kind: AccountActionKind;
  durationDays: ActionDuration;
  reasonLabel: string;
}): string {
  const rule = `our rule on ${input.reasonLabel.toLowerCase()}`;
  const span = input.durationDays === null ? "until we lift it" :
    `for ${input.durationDays} days`;
  switch (input.kind) {
  case "warn":
    return `Something you did broke ${rule}. This is a warning; nothing ` +
      "else changes.";
  case "restrict":
    return `Something you did broke ${rule}. You can't send messages or ` +
      `post in group chats ${span}.`;
  case "suspend":
    return `Something you did broke ${rule}. Your account is suspended ` +
      `${span}, and your upcoming bookings are cancelled.`;
  case "ban":
    return `Something you did broke ${rule}. Your account is closed and ` +
      "can't be used again on Catch.";
  }
}

export interface ActionDraft {
  kind: AccountActionKind;
  durationDays: ActionDuration;
  reasonCode: string;
  messageToUser: string;
  notifyReporter: boolean;
  appealable: boolean;
  note: string;
}

/** Validates a sheet draft and builds the callable payload. */
export function buildTakeAction(input: {
  job: SafetyJob;
  uid: string;
  caseTargetPath: string | null;
  draft: ActionDraft;
}): {payload: TakeAccountAction} | {error: string} {
  const {draft} = input;
  const step = ACTION_STEPS.find((item) => item.kind === draft.kind);
  if (!step) return {error: "Choose a step."};
  if (!canTakeStep(input.job, draft.kind)) {
    return {error: "Only the owner can suspend or ban an account."};
  }
  if (!step.durations.includes(draft.durationDays)) {
    return {error: "Choose how long this lasts."};
  }
  if (!draft.reasonCode) return {error: "Choose the rule they broke."};
  const messageToUser = draft.messageToUser.trim();
  if (!messageToUser) return {error: "Write the message they will see."};
  const note = draft.note.trim();
  if (!note) return {error: "Write what you decided and why."};
  return {payload: {
    uid: input.uid,
    kind: draft.kind,
    durationDays: draft.durationDays,
    reasonCode: draft.reasonCode,
    messageToUser: messageToUser.slice(0, 1000),
    caseTargetPath: input.caseTargetPath,
    notifyReporter: input.caseTargetPath !== null && draft.notifyReporter,
    appealable: draft.appealable,
    note: note.slice(0, 1000),
  }};
}

/** The primary button's label, e.g. "Restrict for 7 days". */
export function actionButtonLabel(draft: Pick<ActionDraft,
  "kind" | "durationDays">): string {
  const step = ACTION_STEPS.find((item) => item.kind === draft.kind);
  const verb = step?.title ?? "Act";
  if (draft.kind === "warn" || draft.kind === "ban") return verb;
  return draft.durationDays === null ? `${verb} until lifted` :
    `${verb} for ${draft.durationDays} days`;
}
