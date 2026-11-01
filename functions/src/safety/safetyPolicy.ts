import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {AdminContext} from "../admin/adminAuth";
import type {SafetySettingsDocument} from
  "../shared/generated/firestoreAdminTypes";

/**
 * Safety policy decided by the owner on 1 Nov 2026. Deadlines follow our
 * reading of India's IT Rules; a lawyer confirms them before launch.
 */
export const SAFETY_DEADLINES = {
  acknowledge: "immediately",
  firstLookHours: 24,
  resolveDays: 15,
  takedownHours: 24,
} as const;

/** Case records are kept this long after either account is deleted. */
export const SAFETY_RETENTION_DAYS_AFTER_DELETION = 180;

export type SafetyStep = "warn" | "restrict" | "suspend" | "ban";
export type SafetyActorRole = "owner" | "ops";

/** Ops warn and restrict; suspend and ban are owner-only. */
export const SAFETY_STEP_ROLES: Record<SafetyStep, SafetyActorRole> = {
  warn: "ops",
  restrict: "ops",
  suspend: "owner",
  ban: "owner",
};

/**
 * Today's admin claims mapped onto the owner/ops jobs. The owner is the
 * adminOwner claim; ops and support are the other safety-capable claims.
 */
export const SAFETY_OPS_ROLES = [
  "admin",
  "adminOwner",
  "safetyReviewer",
  "support",
] as const;
export const SAFETY_OWNER_ROLES = ["adminOwner"] as const;

export const SAFETY_SETTINGS_PATH = "safetySettings/current";

export type SafetyReason = SafetySettingsDocument["reasons"][number];

export interface SafetySettings {
  reasons: SafetyReason[];
  restrictOnSevereReport: boolean;
  organizerBlockLists: boolean;
  organizerReports: boolean;
  updatedAtMillis: number | null;
  updatedByUid: string | null;
}

/** The reasons offered until the owner edits them in Settings → Safety. */
export const DEFAULT_SAFETY_REASONS: SafetyReason[] = [
  reason("harassment", "Harassment", false),
  reason("unwanted_contact", "Unwanted contact", false),
  reason("hate", "Hate or discrimination", false),
  reason("fake_profile", "Fake profile", false),
  reason("inappropriate_content", "Inappropriate content", false),
  reason("spam", "Spam", false),
  reason("assault", "Physical or sexual assault", true),
  reason("stalking", "Stalking", true),
  reason("threats", "Threats of violence", true),
  reason("intimate_images", "Sharing intimate images", true, true),
  reason("minor", "Someone under 18", true),
  reason("fraud", "Fraud or scam", true),
  reason("other", "Something else", false),
];

export const DEFAULT_SAFETY_SETTINGS: SafetySettings = {
  reasons: DEFAULT_SAFETY_REASONS,
  restrictOnSevereReport: true,
  organizerBlockLists: true,
  organizerReports: true,
  updatedAtMillis: null,
  updatedByUid: null,
};

function reason(
  code: string,
  label: string,
  severe: boolean,
  takedown = false
): SafetyReason {
  return {code, label, severe, takedown, active: true};
}

/**
 * Reads the owner's safety settings, falling back to the defaults.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {FirebaseFirestore.Transaction=} tx Optional transaction.
 * @return {Promise<SafetySettings>} Current settings.
 */
export async function readSafetySettings(
  db: FirebaseFirestore.Firestore,
  tx?: FirebaseFirestore.Transaction
): Promise<SafetySettings> {
  const ref = db.doc(SAFETY_SETTINGS_PATH);
  const snap = tx ? await tx.get(ref) : await ref.get();
  if (!snap.exists) return DEFAULT_SAFETY_SETTINGS;
  const data = snap.data() as SafetySettingsDocument;
  return {
    reasons: data.reasons,
    restrictOnSevereReport: data.restrictOnSevereReport,
    organizerBlockLists: data.organizerBlockLists,
    organizerReports: data.organizerReports,
    updatedAtMillis: millisOf(data.updatedAt),
    updatedByUid: data.updatedByUid,
  };
}

/**
 * Finds a reason by code. Unknown codes (older app builds send free text)
 * are treated as a standard, non-severe report.
 * @param {SafetySettings} settings Current settings.
 * @param {string | undefined} code Reason code.
 * @return {SafetyReason | null} Matching reason.
 */
export function safetyReasonFor(
  settings: SafetySettings,
  code: string | null | undefined
): SafetyReason | null {
  if (!code) return null;
  const normalized = code.trim().toLowerCase();
  return settings.reasons.find((item) => item.code === normalized) ?? null;
}

/**
 * Returns the label shown for a reason code.
 * @param {SafetySettings} settings Current settings.
 * @param {string} code Reason code.
 * @return {string} Display label.
 */
export function safetyReasonLabel(
  settings: SafetySettings,
  code: string
): string {
  return safetyReasonFor(settings, code)?.label ??
    code.replace(/_/gu, " ").replace(/^./u, (first) => first.toUpperCase());
}

export interface ReportDeadlines {
  firstLookDueAt: Timestamp;
  resolveDueAt: Timestamp;
  takedownDueAt: Timestamp | null;
}

/**
 * Computes the deadlines a new report carries.
 * @param {number} createdAtMillis When the report arrived.
 * @param {SafetyReason | null} reportReason Matching reason.
 * @return {ReportDeadlines} Deadlines.
 */
export function reportDeadlines(
  createdAtMillis: number,
  reportReason: SafetyReason | null
): ReportDeadlines {
  const hour = 3600_000;
  return {
    firstLookDueAt: Timestamp.fromMillis(
      createdAtMillis + SAFETY_DEADLINES.firstLookHours * hour),
    resolveDueAt: Timestamp.fromMillis(
      createdAtMillis + SAFETY_DEADLINES.resolveDays * 24 * hour),
    takedownDueAt: reportReason?.takedown ?
      Timestamp.fromMillis(
        createdAtMillis + SAFETY_DEADLINES.takedownHours * hour) :
      null,
  };
}

/**
 * Returns the retention cut-off for a record touching a deleted account.
 * @param {number} deletedAtMillis Deletion time.
 * @return {Timestamp} When the record may be purged.
 */
export function safetyRetainUntil(deletedAtMillis: number): Timestamp {
  return Timestamp.fromMillis(deletedAtMillis +
    SAFETY_RETENTION_DAYS_AFTER_DELETION * 24 * 3600_000);
}

/**
 * Maps an admin's claims onto the owner or ops job.
 * @param {AdminContext} context Admin actor.
 * @return {SafetyActorRole} Job.
 */
export function safetyActorRole(context: AdminContext): SafetyActorRole {
  return context.roles.includes("adminOwner") ? "owner" : "ops";
}

/**
 * Throws unless the admin's job may take (or lift) this step.
 * @param {AdminContext} context Admin actor.
 * @param {SafetyStep} step Step being taken or lifted.
 */
export function requireSafetyStepAuthority(
  context: AdminContext,
  step: SafetyStep
): void {
  if (SAFETY_STEP_ROLES[step] === "owner" &&
      safetyActorRole(context) !== "owner") {
    throw new HttpsError(
      "permission-denied",
      "Only the owner can suspend or ban an account, or lift either."
    );
  }
}

/**
 * Reads a Firestore timestamp as epoch millis.
 * @param {unknown} value Timestamp-like value.
 * @return {number | null} Millis or null.
 */
export function millisOf(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" &&
      typeof (value as {toMillis?: unknown}).toMillis === "function") {
    return (value as {toMillis: () => number}).toMillis();
  }
  return null;
}
