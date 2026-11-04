import {runAssistanceTransaction as transact} from "./transactionCallback";
import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {isOrganizerManager} from "../../shared/organizerHosts";
import type {OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateOrganizerDocument} from
  "../../shared/generated/validators/organizerDocument";
import {validateEventAssistanceSettingReceiptDocument} from
  "../../shared/generated/validators/eventAssistanceSettingReceiptDocument";
import {validateGetEventAssistanceSettingCallablePayload} from
  "../../shared/generated/validators/getEventAssistanceSettingInput";
import {validateSetEventAssistanceSettingCallablePayload} from
  "../../shared/generated/validators/setEventAssistanceSettingInput";
import {validateEventAssistanceSettingCallableResponse} from
  "../../shared/generated/validators/eventAssistanceSettingOutput";
import type {EventAssistanceSettingCallableResponse as Response} from
  "../../shared/generated/eventAssistanceSettingCallableResponse";
import {invalidSource} from "./groupProgressSource";
import {
  Setting, SettingScope, SETTINGS, SETTING_RECEIPTS, Template,
  settingId, settingSource, suggestedTemplate, templateTargetsAreCurrent,
} from "./policySettings";
import {parseSetting, resolveSetting, readSettingState} from
  "./policySettingsReader";
import {readMessageSenderChoice} from "./runtimeSenderSetup";

/** Saves preferences; execution and provider authority remain separate. */
export class EventAssistanceSettingsStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async get(actorUid: string, input: unknown): Promise<Response> {
    if (!validateGetEventAssistanceSettingCallablePayload(input)) {
      throw new HttpsError("invalid-argument",
        "Invalid assistance setting scope.");
    }
    return transact(this.db, async (tx) =>
      response("read", await this.read(tx, actorUid, input)));
  }

  async set(actorUid: string, input: unknown): Promise<Response> {
    if (!validateSetEventAssistanceSettingCallablePayload(input) ||
        (input.preference.kind === "configured" &&
          input.preference.template.kind !== input.workflowKind)) {
      throw new HttpsError("invalid-argument",
        "Invalid assistance preference.");
    }
    const requestHash = operationContentHash([actorUid, input]);
    const receiptId = "setting-action:" + operationContentHash([
      input.context, input.groupId, input.workflowKind, input.requestId]);
    return transact(this.db, async (tx) => {
      const state = await this.read(tx, actorUid, input);
      const receiptRef = this.db.collection(SETTING_RECEIPTS).doc(receiptId);
      const receipt = (await tx.get(receiptRef)).data();
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < state.now) throw invalidSource();
      state.now = now;
      if (receipt !== undefined) {
        if (!validateEventAssistanceSettingReceiptDocument(receipt) ||
            receipt.receiptId !== receiptId ||
            receipt.settingId !== state.own?.settingId ||
            receipt.requestHash !== requestHash ||
            receipt.revision > state.own.revision ||
            receipt.createdAt > now) throw conflict();
        return response("replayed", state, receipt.revision);
      }
      if (input.expectedRevision !== (state.own?.revision ?? 0) ||
          input.expectedSourceHash !== state.source.hash) throw conflict();
      if (input.preference.kind === "configured" &&
          input.preference.template.setting.kind === "enabled" &&
          !templateTargetsAreCurrent(input.preference.template,
            state.source.destinations.map((d) => d.target))) {
        throw new HttpsError("failed-precondition",
          "Choose joining destinations from the current event setup.");
      }
      if (input.preference.kind === "configured") {
        await requireOperationalNoticeSenders(this.db, tx, input.context,
          input.preference.template, now);
      }
      const own: Setting = {schemaVersion: 1, settingId: settingId(input),
        context: input.context, groupId: input.groupId,
        workflowKind: input.workflowKind,
        revision: (state.own?.revision ?? 0) + 1,
        preference: input.preference, sourceHash: state.source.hash,
        updatedBy: actorUid, createdAt: state.own?.createdAt ?? now,
        updatedAt: now};
      parseSetting(own, input, now);
      const savedReceipt = {receiptId, settingId: own.settingId,
        requestHash, revision: own.revision, createdAt: now};
      if (!validateEventAssistanceSettingReceiptDocument(savedReceipt)) {
        throw invalidSource();
      }
      const result = response("applied", {...state, own}, own.revision);
      const committedAt = this.clock();
      if (!Number.isSafeInteger(committedAt) || committedAt < now) {
        throw conflict();
      }
      if (input.preference.kind === "configured" && committedAt !== now) {
        await requireOperationalNoticeSenders(this.db, tx, input.context,
          input.preference.template, committedAt);
      }
      tx.set(this.db.collection(SETTINGS).doc(own.settingId), own);
      tx.create(receiptRef, savedReceipt);
      return result;
    });
  }

  private async read(tx: Transaction, actorUid: string, scope: SettingScope) {
    const [eventSnap, organizerSnap] = await tx.getAll(
      this.db.collection("events").doc(scope.context.eventId),
      this.db.collection("organizers").doc(scope.context.organizerId));
    const event = eventSnap.data();
    const organizer = organizerSnap.data();
    if (!validateEventDocument(event) ||
        event.organizerId !== scope.context.organizerId ||
        !validateOrganizerDocument(organizer)) throw invalidSource();
    if (!isOrganizerManager(organizer as unknown as OrganizerDocument,
      actorUid)) {
      throw new HttpsError("permission-denied",
        "Only organizer managers can configure assistance.");
    }
    return readSettingState(this.db, tx, scope, eventSnap, this.clock);
  }
}

async function requireOperationalNoticeSenders(db: Firestore, tx: Transaction,
  context: SettingScope["context"], template: Template, now: number) {
  if (template.setting.kind !== "enabled" ||
      template.setting.authority !== "executeWithinPolicy" ||
      template.kind !== "planChangeCommunication" &&
        template.kind !== "postEventFollowUp") return;
  const routes = template.config.delivery.routes;
  if (new Set(routes.map((route) => route.routeId)).size !== routes.length) {
    throw new HttpsError("invalid-argument",
      "Choose at most one sender for each message route.");
  }
  const purpose = template.kind === "planChangeCommunication" ?
    "planChanged" : "followUp";
  for (const route of routes) {
    const choice = await readMessageSenderChoice(db, tx, context, route,
      purpose, now);
    if (!choice || choice.availability !== "eligible") {
      throw new HttpsError("failed-precondition",
        "A selected event message sender needs setup.");
    }
  }
}

type State = {
  scope: SettingScope; now: number; own: Setting | null;
  parent: Setting | null;
  source: ReturnType<typeof settingSource>;
  parentSource: ReturnType<typeof settingSource>;
};
/**
 * The setting as a manager reviews it: own and inherited preference, the
 * resolved status and the current setup. It reads no clock, so the live
 * console's view stores it as is.
 */
export function settingView(state: State):
  Omit<Response["view"], "serverTime"> &
  {setup: NonNullable<Response["view"]["setup"]>} {
  const {scope, own, source} = state;
  const {selected, template, status} = resolveSetting(state);
  return {...scope, sourceHash: source.hash,
    ownRevision: own?.revision ?? 0, own,
    origin: !selected ? "none" : selected.groupId === "event:whole" ?
      "event" : "group", status,
    effective: status === "configured" || status === "disabled" ?
      template : null,
    suggested: suggestedTemplate(scope.workflowKind),
    setup: {eventEnd: source.endAt, destinations: source.destinations}};
}
function response(outcome: Response["outcome"], state: State,
  operationRevision: number | null = null): Response {
  const value: Response = {outcome, operationRevision,
    view: {...settingView(state), serverTime: state.now}};
  if (!validateEventAssistanceSettingCallableResponse(value)) {
    throw invalidSource();
  }
  return value;
}

function conflict(): HttpsError {
  return new HttpsError("aborted",
    "Assistance settings changed. Refresh and retry.");
}
