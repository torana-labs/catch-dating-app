import type {DocumentSnapshot, Firestore, Transaction} from
  "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateEventSuccessPlanDocument} from
  "../../shared/generated/validators/eventSuccessPlanDocument";
import {validateEventAssistanceRuntimeConfigDocument} from
  "../../shared/generated/validators/eventAssistanceRuntimeConfigDocument";
import type {EventAssistanceRuntimeConfigDocument as RuntimeConfig} from
  "../../shared/generated/eventAssistanceRuntimeConfigDocument";
import type {LateJoinAutomation} from "./messageProtocol";
import {guestIdentity} from "./guestRecords";
import {invalidSource, timestampEvidence} from "./groupProgressSource";

export type {RuntimeConfig};
export type RuntimeContext = RuntimeConfig["context"];
export type RuntimeConfiguration = NonNullable<RuntimeConfig["configuration"]>;
export type RuntimeBinding = NonNullable<LateJoinAutomation["runtimeBinding"]>;
export const RUNTIME_CONFIGS = "eventAssistanceRuntimeConfigs";
export const RUNTIME_CONFIG_RECEIPTS = "eventAssistanceRuntimeConfigReceipts";
export type RuntimeUnavailable = "missing" | "paused" |
  "configurationChanged" | "sourceChanged" | "expired" | "eventClosed";

/** Prevent ambiguous routes and colliding guest-response identities. */
export function validRuntimeConfiguration(c: RuntimeConfiguration): boolean {
  const choices = c.options.laterChoices ?? [];
  return new Set(c.options.routes.map((r) => r.routeId)).size ===
    c.options.routes.length && (c.options.responseDeadline === null ||
      c.options.responseDeadline <= c.expiresAt) &&
    new Set(choices.map((choice) => operationContentHash(choice.target)))
      .size === choices.length;
}

export function runtimeConfigId(context: RuntimeContext): string {
  guestIdentity(context, "scope");
  return "runtime:lateJoin:" + operationContentHash(context);
}

export function parseRuntimeConfig(value: unknown, context: RuntimeContext,
  now: number): RuntimeConfig {
  if (!validateEventAssistanceRuntimeConfigDocument(value) ||
      value.runtimeId !== runtimeConfigId(context) ||
      operationContentHash(value.context) !== operationContentHash(context) ||
      value.createdAt > value.updatedAt || value.updatedAt > now) {
    throw invalidSource();
  }
  const c = value.configuration;
  if (c && !validRuntimeConfiguration(c)) throw invalidSource();
  return value;
}

export function runtimeConfigSource(context: RuntimeContext,
  eventSnap: DocumentSnapshot, planSnap: DocumentSnapshot, now: number) {
  const event = eventSnap.data();
  const plan = planSnap.data() ?? null;
  if (!Number.isSafeInteger(now) || now < 0 ||
      !validateEventDocument(event) ||
      event.organizerId !== context.organizerId ||
      (plan !== null && (!validateEventSuccessPlanDocument(plan) ||
        plan.eventId !== context.eventId ||
        (plan.organizerId) !== context.organizerId))) {
    throw invalidSource();
  }
  const end = timestampEvidence(event.endTime);
  const eventEnd = end._seconds * 1000 + end._nanoseconds / 1_000_000;
  if (!Number.isSafeInteger(eventEnd)) throw invalidSource();
  const generation = operationContentHash(
    timestampEvidence(eventSnap.createTime));
  const hash = operationContentHash([context, generation,
    timestampEvidence(event.startTime), end, event.eventFormat]);
  return {eventEnd, generation, hash,
    closed: event.status !== "active" || now >= eventEnd ||
      plan?.status === "complete"};
}

export function runtimeConfigStatus(record: RuntimeConfig | null,
  source: ReturnType<typeof runtimeConfigSource>, now: number) {
  if (!record) return "unconfigured" as const;
  if (record.status === "paused") return "paused" as const;
  if (source.closed) return "eventClosed" as const;
  if (record.sourceHash !== source.hash ||
      record.sourceGeneration !== source.generation) {
    return "sourceChanged" as const;
  }
  if (!record.configuration) throw invalidSource();
  return record.configuration.expiresAt <= now ? "expired" as const :
    "configured" as const;
}

/** Reads current permission inside the publication/dispatch transaction. */
export async function readRuntimeConfigAuthority(db: Firestore, tx: Transaction,
  context: RuntimeContext, binding: RuntimeBinding, now: number): Promise<
    {kind: "ready"; runtime: RuntimeConfig;
      configuration: RuntimeConfiguration} |
    {kind: "unavailable"; reason: RuntimeUnavailable}> {
  const unavailable = (reason: RuntimeUnavailable) =>
    ({kind: "unavailable" as const, reason});
  if (binding.runtimeId !== runtimeConfigId(context)) {
    return unavailable("configurationChanged");
  }
  const [recordSnap, eventSnap, planSnap] = await tx.getAll(
    db.collection(RUNTIME_CONFIGS).doc(binding.runtimeId),
    db.collection("events").doc(context.eventId),
    db.collection("eventSuccessPlans").doc(context.eventId));
  if (!recordSnap.exists) return unavailable("missing");
  const record = parseRuntimeConfig(recordSnap.data(), context, now);
  const source = runtimeConfigSource(context, eventSnap, planSnap, now);
  const status = runtimeConfigStatus(record, source, now);
  if (status === "paused") return unavailable("paused");
  if (record.revision !== binding.revision) {
    return unavailable("configurationChanged");
  }
  if (status !== "configured") {
    return unavailable(status === "unconfigured" ? "missing" : status);
  }
  return {kind: "ready", runtime: record,
    configuration: record.configuration!};
}
