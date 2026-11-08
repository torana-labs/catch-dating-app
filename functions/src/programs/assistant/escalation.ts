/* eslint-disable max-len */
// "Passed to you": a guest's message the assistant does not answer goes to
// the planner three ways. The thread turns needsYou with the reason; a
// staff attention journal row (organizerMomentSends, actionKind
// staffAttention) puts it on the programme's live board, the staff
// attention feed and the organiser's Today list; and a programAlerts row
// assigns that live board alert to the first escalation contact. All
// three writes are idempotent per run and hold no guest text.

import {MOMENT_SENDS_COLLECTION} from "../../moments/momentDocuments";
import {PROGRAM_ALERTS_COLLECTION, programAlertDocId} from "../programLiveBoard";
import type {EscalationReason} from "./policy";
import {sha256} from "./prompt";
import {budgetDay} from "./runs";
import {PROGRAM_WHATSAPP_THREADS} from "./settings";

/** The duty an assistant escalation is stamped for on the live board. */
export const ESCALATION_DUTY = "communications";
/** Stands in for a moment id: the alert has no moment behind it. */
export const ASSISTANT_ALERT_SOURCE = "programAssistant";
export const ASSISTANT_ACTOR = "programAssistant";

export interface EscalationTarget {
  programId: string;
  organizerId: string;
  timezone: string;
  householdLabel: string;
  threadId: string;
  runId: string;
  reason: EscalationReason;
  /** Escalation contacts from the settings, else the programme's manager. */
  staffUids: string[];
  nowMillis: number;
}

export function escalationTitle(label: string, reason: EscalationReason): string {
  const who = label.trim() || "A guest";
  return reason === "distress" ?
    `${who} may need help now on WhatsApp` :
    `${who} needs a reply on WhatsApp`;
}

export function escalationAlertId(runId: string): string {
  return `${runId}_${ESCALATION_DUTY}`;
}

/** Marks the thread needsYou with the reason (fields from W1's schema). */
export async function markThreadNeedsYou(db: FirebaseFirestore.Firestore,
  threadId: string, reason: EscalationReason): Promise<void> {
  await db.collection(PROGRAM_WHATSAPP_THREADS).doc(threadId).update({
    state: "needsYou", escalationReason: reason,
  });
}

/**
 * Writes the staff attention journal rows (one per staff member, as moment
 * sends fan out) and the programAlerts assignment, each only once.
 */
export async function raiseEscalationAlert(db: FirebaseFirestore.Firestore,
  target: EscalationTarget): Promise<{alertId: string}> {
  const alertId = escalationAlertId(target.runId);
  const severity = target.reason === "distress" ? "urgent" : "warning";
  const title = escalationTitle(target.householdLabel, target.reason);
  const dayKey = budgetDay(target.nowMillis, target.timezone);
  const recipients = [...new Set(target.staffUids)].slice(0, 10);
  const alertRef = db.collection(PROGRAM_ALERTS_COLLECTION)
    .doc(programAlertDocId(target.programId, alertId));
  await db.runTransaction(async (tx) => {
    const sendRefs = recipients.map((uid) => db.collection(MOMENT_SENDS_COLLECTION)
      .doc(`${target.runId}_uid:${uid}`));
    const [alertSnap, ...sendSnaps] = await Promise.all([tx.get(alertRef),
      ...sendRefs.map((ref) => tx.get(ref))]);
    sendRefs.forEach((ref, index) => {
      if (sendSnaps[index].exists) return;
      tx.set(ref, {
        momentId: ASSISTANT_ALERT_SOURCE, recipientKey: `uid:${recipients[index]}`,
        decision: "sent", reason: null, dayKey, createdAtMillis: target.nowMillis,
        runId: target.runId, actionKind: "staffAttention",
        organizerId: target.organizerId, scopeKind: "program",
        scopeId: target.programId, duty: ESCALATION_DUTY, severity, title,
      });
    });
    if (!alertSnap.exists) {
      const alert = {
        programId: target.programId, organizerId: target.organizerId, alertId,
        state: "open", assigneeUid: recipients[0] ?? null, assigneeName: null,
        updatedByUid: ASSISTANT_ACTOR, updatedAtMillis: target.nowMillis,
        revision: 1, lastRequestId: target.runId, lastRequestHash: sha256(target.runId),
      };
      tx.set(alertRef, alert);
    }
  });
  return {alertId};
}
