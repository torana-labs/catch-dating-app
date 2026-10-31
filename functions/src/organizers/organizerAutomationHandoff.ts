import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  EventDocument,
  OrganizerCampaignDocument,
  OrganizerFormAutomationRuleDocument,
  OrganizerMessageTemplateDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AutomationDeliveryMessageIntent as MessageIntent} from
  "../shared/generated/automationDeliveryMessageIntent";
import {
  automationDeliveryIntentId,
  newAutomationDeliveryRecord,
  parseAutomationDeliveryRecord,
} from "./automationDelivery";
import type {OrganizerAutomationEvent} from "./organizerAutomationSource";
import {organizerAutomationDueMillis} from "./organizerAutomationSource";
import {campaignVariables} from "./organizerCampaigns";
import {eventInviteToken, inviteLinkTokenHash} from "../events/inviteLinks";
import type {MomentDefinition, RunRecord} from "../moments/momentModel";
import {
  momentFromDocument, momentToDocument, MOMENT_RUNS_COLLECTION,
  MOMENTS_COLLECTION,
} from "../moments/momentDocuments";

/**
 * The typed messaging handoff between the automation engine and Moments.
 * The rule remains the single authored object: rule writes sync one
 * server-managed companion moment per `campaignHandoff` action, and the
 * executor mints the durable delivery intent + moment run inside one
 * transaction so a retried handoff can never split the ownership record
 * from the orchestration record.
 * */

const RECOVERY_WINDOW_MS = 6 * 3_600_000;
const INVITE_ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function automationHashId(prefix: string, ...parts: string[]): string {
  const digest = createHash("sha256")
    .update(parts.join(""))
    .digest("hex")
    .slice(0, 32);
  return `${prefix}_${digest}`;
}

/** Companion moment identity — one per (rule, messaging action). */
export function automationCompanionMomentId(
  ruleId: string, actionId: string
): string {
  return automationHashId("automoment", ruleId, actionId);
}

/** Moment-run identity: one orchestrated occurrence per automation run. */
export function automationMomentRunId(
  momentId: string, automationRunId: string
): string {
  return automationHashId("mrun", momentId, automationRunId);
}

/** Per-occurrence invitation link; the token mints once and reuses. */
export function automationInviteLinkId(
  automationRunId: string, actionId: string, contactId: string
): string {
  return `ecil_auto_${createHash("sha256")
    .update([automationRunId, actionId, contactId].join(""))
    .digest("hex").slice(0, 40)}`;
}

type AutomationAction =
  OrganizerFormAutomationRuleDocument["actions"][number];

/**
 * Syncs the rule's companion-moment projections inside the same
 * transaction that writes the rule: one armed/paused moment per
 * `campaignHandoff` action mirrors the rule's enablement and pinned
 * revisions. Companions for removed actions pause — never delete, because
 * pending intents and run history still reference them.
 */
export async function syncAutomationCompanionMoments(params: {
  tx: Transaction;
  db: Firestore;
  ruleId: string;
  rule: OrganizerFormAutomationRuleDocument;
  actorUid: string;
  nowMillis: number;
}): Promise<void> {
  const {tx, db, ruleId, rule, actorUid, nowMillis} = params;
  const messagingActions = rule.actions.filter(
    (action) => action.kind === "campaignHandoff");
  // Reads first: the rule's existing companions, each action's pinned
  // recipe (the sendTemplate action mirrors its sender/template
  // identity), and each companion's skipped runs so a re-arm can recover
  // occurrences withheld only because the rule was disabled.
  const recipeIds = [...new Set(messagingActions.map(
    (action) => action.campaignId!))];
  const companionIds = messagingActions.map((action) =>
    automationCompanionMomentId(ruleId, action.actionId));
  const [boundSnap, recipeSnaps, skippedSnaps] = await Promise.all([
    tx.get(db.collection(MOMENTS_COLLECTION)
      .where("scopeKind", "==", "organizer")
      .where("scopeId", "==", rule.organizerId)
      .where("origin", "==", "formAutomation")),
    Promise.all(recipeIds.map((id) =>
      tx.get(db.collection("organizerCampaigns").doc(id)))),
    Promise.all(companionIds.map((id) =>
      tx.get(db.collection(MOMENT_RUNS_COLLECTION)
        .where("momentId", "==", id)
        .where("status", "==", "skipped")))),
  ]);
  const recipes = new Map(recipeIds.map((id, index) => [
    id,
    recipeSnaps[index].data() as OrganizerCampaignDocument | undefined,
  ]));
  const wantedIds = new Set(companionIds);
  const companions = boundSnap.docs
    .map((doc) => momentFromDocument(doc.data() as Record<string, unknown>))
    .filter((moment): moment is MomentDefinition =>
      moment !== null && moment.initiation.kind === "triggered" &&
      moment.initiation.automation?.ruleId === ruleId);
  // Pause companions whose messaging actions left the rule.
  for (const moment of companions) {
    if (wantedIds.has(moment.momentId) || moment.status !== "armed") {
      continue;
    }
    tx.set(db.collection(MOMENTS_COLLECTION).doc(moment.momentId),
      momentToDocument(
        {...moment, status: "paused", revision: moment.revision + 1},
        nowMillis, false));
  }
  for (const action of messagingActions) {
    const momentId = automationCompanionMomentId(ruleId, action.actionId);
    const existing = companions.find((m) => m.momentId === momentId);
    const recipe = recipes.get(action.campaignId!);
    const prior = existing?.action.kind === "sendTemplate" ?
      existing.action : null;
    const next: MomentDefinition = {
      momentId,
      scope: {kind: "organizer", organizerId: rule.organizerId},
      name: rule.name.slice(0, 140),
      initiation: {
        kind: "triggered",
        triggerKind: "formAutomation",
        functionId: null,
        automation: {
          ruleId,
          ruleRevision: rule.revision,
          actionId: action.actionId,
          recipeCampaignId: action.campaignId!,
          recipeRevision: action.campaignRevision!,
        },
      },
      sense: "individual",
      audience: {kind: "subject"},
      action: {
        kind: "sendTemplate",
        connectionId: recipe?.connectionId ?? prior?.connectionId ?? "",
        templateId: recipe?.templateId ?? prior?.templateId ?? "",
        variables: {...(recipe?.templateVariables ?? prior?.variables ?? {})},
      },
      status: rule.enabled ? "armed" : "paused",
      approval: rule.enabled ?
        {approvedByUid: actorUid, approvedAtMillis: nowMillis} :
        existing?.approval ?? null,
      origin: "formAutomation",
      revision: (existing?.revision ?? 0) + 1,
    };
    tx.set(db.collection(MOMENTS_COLLECTION).doc(momentId),
      momentToDocument(next, nowMillis, existing === undefined));
    // Re-arm recovery: a run skipped only because the companion was
    // paused returns to planned under the same occurrence identity. A
    // rule edited during the pause pins a different ruleRevision, so its
    // stale runs stay skipped and the intent stops "superseded" at claim.
    if (rule.enabled && existing?.status === "paused") {
      const skipped = skippedSnaps[companionIds.indexOf(momentId)];
      for (const doc of skipped.docs) {
        const data = doc.data() as Record<string, unknown>;
        const automation = data.automation as
          {ruleRevision?: unknown} | undefined;
        const expiresAtMillis = typeof data.expiresAtMillis === "number" ?
          data.expiresAtMillis : null;
        if (data.reason !== "skip:momentNotArmed" ||
            automation?.ruleRevision !== rule.revision ||
            (expiresAtMillis !== null && expiresAtMillis <= nowMillis)) {
          continue;
        }
        tx.update(doc.ref, {
          status: "planned", dueAtMillis: nowMillis, reason: null});
      }
    }
  }
}

export type AutomationHandoffResult =
  | {kind: "delegated"; momentRunId: string; deliveryMessageId: string;
    /** Business-delay horizon — the caller skips immediate dispatch when
     *  the run is not yet due; the moments sweep fires it at due. */
    dueAtMillis: number};

/**
 * Executes the `campaignHandoff` action as a durable Moments send: mints
 * the companion run + immutable delivery intent + per-occurrence invite
 * inside one transaction, then hands the run to the caller for dispatch
 * through the moment runner (quiet hours, caps, consent, journal).
 */
export async function handoffAutomationMessage(params: {
  db: Firestore;
  automationRunId: string;
  ruleId: string;
  event: OrganizerAutomationEvent;
  rule: OrganizerFormAutomationRuleDocument;
  action: AutomationAction;
  nowMillis: () => number;
}): Promise<AutomationHandoffResult> {
  const {db, automationRunId, ruleId, event, rule, action, nowMillis} =
    params;
  const contactId = event.contactId;
  if (!contactId) {
    throw new HttpsError(
      "failed-precondition", "Automation message needs a contact.");
  }
  const momentId = automationCompanionMomentId(ruleId, action.actionId);
  const momentRunId = automationMomentRunId(momentId, automationRunId);
  const recipeId = action.campaignId!;
  const inviteLinkId = automationInviteLinkId(
    automationRunId, action.actionId, contactId);

  const result = await db.runTransaction(async (tx) => {
    const ruleRef = db.collection("organizerFormAutomationRules").doc(ruleId);
    const recipeRef = db.collection("organizerCampaigns").doc(recipeId);
    const momentRef = db.collection(MOMENTS_COLLECTION).doc(momentId);
    const runRef = db.collection(MOMENT_RUNS_COLLECTION).doc(momentRunId);
    const [ruleSnap, recipeSnap, momentSnap, runSnap] =
      await Promise.all([
        tx.get(ruleRef), tx.get(recipeRef),
        tx.get(momentRef), tx.get(runRef),
      ]);
    const liveRule = ruleSnap.data() as
      | OrganizerFormAutomationRuleDocument
      | undefined;
    const recipe = recipeSnap.data() as OrganizerCampaignDocument |
      undefined;
    if (!liveRule || liveRule.organizerId !== rule.organizerId ||
        !liveRule.enabled || liveRule.revision !== rule.revision) {
      throw new HttpsError(
        "failed-precondition", "Automation or source changed.");
    }
    const liveAction = liveRule.actions.find(
      (item) => item.actionId === action.actionId);
    if (liveAction?.kind !== "campaignHandoff" ||
        liveAction.campaignId !== action.campaignId ||
        liveAction.campaignRevision !== action.campaignRevision) {
      throw new HttpsError(
        "failed-precondition", "Automation or source changed.");
    }
    if (!recipe || recipe.organizerId !== rule.organizerId ||
        recipe.revision !== action.campaignRevision ||
        !["draft", "previewed"].includes(recipe.status) ||
        recipe.scheduledAt !== null || !recipe.connectionId ||
        !recipe.templateId) {
      throw new HttpsError(
        "failed-precondition", "Automation message recipe changed.");
    }
    const templateRef = db.collection("organizerMessageTemplates")
      .doc(recipe.templateId);
    const eventRef = recipe.eventId ?
      db.collection("events").doc(recipe.eventId) : null;
    const inviteLinkRef = recipe.eventId ?
      db.collection("eventInviteLinks").doc(inviteLinkId) : null;
    const inviteSecretRef = recipe.eventId ?
      db.collection("eventInviteLinkSecrets").doc(inviteLinkId) : null;
    const [templateSnap, eventSnap, inviteLinkSnap, inviteSecretSnap] =
      await Promise.all([
        tx.get(templateRef),
        eventRef ? tx.get(eventRef) : null,
        inviteLinkRef ? tx.get(inviteLinkRef) : null,
        inviteSecretRef ? tx.get(inviteSecretRef) : null,
      ]);
    const template = templateSnap.data() as
      | OrganizerMessageTemplateDocument
      | undefined;
    if (!template || template.organizerId !== rule.organizerId) {
      throw new HttpsError(
        "failed-precondition", "Automation message template missing.");
    }
    const eventDoc = eventSnap?.data() as EventDocument | undefined;
    if (recipe.eventId &&
        (!eventDoc || (eventDoc.organizerId) !==
          rule.organizerId)) {
      throw new HttpsError(
        "failed-precondition", "Automation message event missing.");
    }

    // Companion moment — self-heals for rules that predate projection
    // sync; the binding must match the revisions this handoff pins.
    const moment = momentSnap.exists ?
      momentFromDocument(momentSnap.data() as Record<string, unknown>) :
      null;
    const momentMatch = moment !== null &&
      moment.scope.kind === "organizer" &&
      moment.scope.organizerId === rule.organizerId &&
      moment.initiation.kind === "triggered" &&
      moment.initiation.triggerKind === "formAutomation" &&
      moment.initiation.automation?.ruleId === ruleId &&
      moment.initiation.automation.actionId === action.actionId &&
      moment.initiation.automation.ruleRevision === liveRule.revision &&
      moment.initiation.automation.recipeCampaignId === recipeId &&
      moment.initiation.automation.recipeRevision ===
        action.campaignRevision &&
      moment.status === "armed" &&
      moment.approval !== null;
    const momentNext: MomentDefinition | null = momentMatch ? null : {
      momentId,
      scope: {kind: "organizer", organizerId: rule.organizerId},
      name: liveRule.name.slice(0, 140),
      initiation: {
        kind: "triggered",
        triggerKind: "formAutomation",
        functionId: null,
        automation: {
          ruleId,
          ruleRevision: liveRule.revision,
          actionId: action.actionId,
          recipeCampaignId: recipeId,
          recipeRevision: action.campaignRevision!,
        },
      },
      sense: "individual",
      audience: {kind: "subject"},
      action: {
        kind: "sendTemplate",
        connectionId: recipe.connectionId,
        templateId: recipe.templateId,
        variables: {...recipe.templateVariables},
      },
      status: "armed",
      approval: {
        approvedByUid: liveRule.updatedByUid,
        approvedAtMillis: liveRule.updatedAt.toMillis(),
      },
      origin: "formAutomation",
      revision: (moment?.revision ?? 0) + 1,
    };

    // Invite link: mint once per occurrence; a retry reuses the stored
    // token so the rendered variable is stable across attempts.
    let inviteToken: string | null = null;
    if (recipe.eventId && eventDoc) {
      const existingSecret = inviteSecretSnap?.data() as
        | {token?: unknown}
        | undefined;
      inviteToken = typeof existingSecret?.token === "string" ?
        existingSecret.token : eventInviteToken(inviteLinkId);
    }
    const now = nowMillis();
    const dueAtMillis = organizerAutomationDueMillis(event, liveRule);
    const intent: MessageIntent = {
      schemaVersion: 1,
      intentId: automationDeliveryIntentId(automationRunId, action.actionId),
      revision: 1,
      context: {
        mode: "live",
        organizerId: rule.organizerId,
        ruleId,
        ruleRevision: liveRule.revision,
        actionId: action.actionId,
        eventKind: event.kind,
        sourceId: event.sourceId,
        occurredAtMillis: event.occurredAt.toMillis(),
        dueAtMillis,
        contactId,
        recipeCampaignId: recipeId,
        recipeRevision: action.campaignRevision!,
      },
      ruleId,
      recipient: {kind: "organizerContact", recipientKey: contactId},
      workflow: {
        kind: "automationSend",
        momentId,
        runId: momentRunId,
      },
      createdAt: now,
      expiresAt: now + RECOVERY_WINDOW_MS,
      permittedRoutes: ["organizerWhatsappAutomation"],
      deliveryPolicy: {
        maxAttempts: 3,
        maxAttemptsPerRoute: 2,
        minimumRetrySeconds: 60,
      },
      kind: "automationMessage",
      instructionRevision: (momentNext ?? moment!).revision,
      whatsapp: {
        connectionId: recipe.connectionId,
        templateId: recipe.templateId,
        variables: campaignVariables(
          recipe, inviteToken, eventDoc ?? null,
          template.variableNames ?? []),
        eventId: recipe.eventId ?? null,
        inviteLinkId: recipe.eventId ? inviteLinkId : null,
      },
    };
    const record = newAutomationDeliveryRecord(intent, now);
    const outboxRef = db.collection("automationDeliveryMessages")
      .doc(record.messageId);
    const outboxSnap = await tx.get(outboxRef);
    if (outboxSnap.exists) {
      // Identity is deterministic; an existing record must be the same
      // intent or the occurrence mapping itself is corrupt.
      const existing = parseAutomationDeliveryRecord(outboxSnap.data());
      if (existing.messageId !== record.messageId) {
        throw new HttpsError(
          "already-exists", "Automation send identity conflict.");
      }
    }

    const runRecord: RunRecord = {
      runId: momentRunId,
      momentId,
      dueAtMillis: Math.max(now, dueAtMillis),
      expiresAtMillis: intent.expiresAt,
      anchorRevision: moment?.revision ?? momentNext?.revision ?? 0,
      status: "planned",
      subjectId: contactId,
      automation: {
        ruleId,
        ruleRevision: liveRule.revision,
        actionId: action.actionId,
        eventKind: event.kind,
        sourceId: event.sourceId,
        occurredAtMillis: event.occurredAt.toMillis(),
        dueAtMillis,
        contactId,
        deliveryMessageId: record.messageId,
      },
    };
    if (runSnap.exists) {
      // Retried handoff: the run already materialized for this occurrence.
      const existingRun = runSnap.data() as Record<string, unknown>;
      const existingDue = typeof existingRun.dueAtMillis === "number" ?
        existingRun.dueAtMillis : dueAtMillis;
      return {kind: "delegated" as const, momentRunId,
        deliveryMessageId: record.messageId, dueAtMillis: existingDue};
    }
    if (momentNext) {
      tx.set(momentRef, momentToDocument(momentNext, now,
        !momentSnap.exists));
    }
    if (recipe.eventId && eventDoc && inviteToken) {
      if (!inviteLinkSnap?.exists) {
        tx.create(inviteLinkRef!, {
          eventId: recipe.eventId,
          organizerId: eventDoc.organizerId,
          hostUid: liveRule.updatedByUid,
          label: liveRule.name.slice(0, 80),
          source: "formAutomation",
          tokenHash: inviteLinkTokenHash(inviteToken),
          contractVersion: 2,
          linkKind: "directRecipient",
          ownerContactId: null,
          ownerUid: null,
          intendedRecipientContactId: contactId,
          campaignId: null,
          issuanceChannel: "formAutomation",
          destinationKind: recipe.inviteDestinationKind,
          tokenVersion: 2,
          attributionWindowEndsAt: admin.firestore.Timestamp.fromMillis(
            now + INVITE_ATTRIBUTION_WINDOW_MS),
          openCount: 0,
          likelyHumanOpenCount: 0,
          shareIntentCount: 0,
          verifiedRegistrationCount: 0,
          referredRegistrationCount: 0,
          referredCheckedInCount: 0,
          requestCount: 0,
          confirmedCount: 0,
          paidCount: 0,
          checkedInCount: 0,
          catcherCount: 0,
          matchCount: 0,
          chatStartedCount: 0,
          disabledAt: null,
          createdAt: admin.firestore.Timestamp.fromMillis(now),
          updatedAt: admin.firestore.Timestamp.fromMillis(now),
        });
      }
      if (!inviteSecretSnap?.exists) {
        tx.create(inviteSecretRef!, {
          eventId: recipe.eventId,
          organizerId: eventDoc.organizerId,
          token: inviteToken,
          tokenHash: inviteLinkTokenHash(inviteToken),
          tokenVersion: 2,
          createdAt: admin.firestore.Timestamp.fromMillis(now),
          updatedAt: admin.firestore.Timestamp.fromMillis(now),
        });
      }
    }
    if (!outboxSnap.exists) {
      tx.create(outboxRef, record);
    }
    tx.create(runRef, {...runRecord});
    return {kind: "delegated" as const, momentRunId,
      deliveryMessageId: record.messageId, dueAtMillis};
  });
  return result;
}
