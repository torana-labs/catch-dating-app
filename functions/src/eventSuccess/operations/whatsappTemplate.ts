import type {EventWhatsappPolicyDocument as WhatsappPolicy} from
  "../../shared/generated/eventWhatsappPolicyDocument";
import {validateEventWhatsappPolicyDocument} from
  "../../shared/generated/validators/eventWhatsappPolicyDocument";
import {validateOrganizerMessageTemplateDocument} from
  "../../shared/generated/validators/organizerMessageTemplateDocument";
import type {MetaQuickReplyPayload, MetaTemplateSnapshot} from
  "../../organizers/organizerWhatsappProvider";
import {operationContentHash} from "../../operations/durableActions";
import {Grant, parseGrant, threadIdentity} from "./guestRecords";
import {grantSecret, GuestLinkSigningKeys, matchesGuestSecret} from
  "./guestLinkTokens";
import type {MessageRecord} from "./messageOutbox";
import {parseMessageIntent} from "./messageProtocol";
import {sameMessageContext} from "./messagingPolicy";
import {whatsappEndpointHash, whatsappNativeReplyId} from
  "./whatsappReplyProtocol";
import {brandWebUrl} from "../../shared/generated/brand";

export type {WhatsappPolicy};
type Intent = MessageRecord["intent"];
type TemplatePolicy = WhatsappPolicy["templates"][number];
export const WHATSAPP_POLICIES = "eventAssistanceWhatsappPolicies";
export interface RenderedWhatsapp {
  template: MetaTemplateSnapshot;
  variables: Record<string, string>;
  /** Position here is the native correlation index, not the provider slot. */
  replies: Array<{buttonIndex: number; choiceId: string; label: string}>;
  templateDocumentId: string;
  policyHash: string;
  templateHash: string;
  payloadHash: string;
  validUntil: number;
  maxCostMicros: number;
  currency: string;
}

export function parseWhatsappPolicy(value: unknown): WhatsappPolicy {
  if (!validateEventWhatsappPolicyDocument(value) ||
      value.activation.validUntil <= value.activation.approvedAt ||
      value.quote.validUntil <= value.activation.approvedAt) {
    throw new Error("Invalid event WhatsApp policy");
  }
  const purposes = new Set<string>();
  for (const template of value.templates) {
    const names = template.variables.map((v) => v.providerName);
    const replies = template.quickReplies;
    if (purposes.has(template.purpose) ||
        new Set(names).size !== names.length ||
        template.variables.filter((v) => v.source === "instruction")
          .length !== 1 ||
        template.variables.filter((v) => v.source === "responseUrl" ||
          v.source === "responseUrlSuffix").length !== 1 ||
        new Set(replies.map((r) => r.buttonIndex)).size !== replies.length ||
        new Set(replies.map((r) => r.choiceId)).size !== replies.length ||
        replies.some((r) => !r.label.trim())) {
      throw new Error("Ambiguous event WhatsApp template policy");
    }
    purposes.add(template.purpose);
  }
  return value;
}

/** Reviewed template and exact variables; not consent or a send permit. */
export function renderEventWhatsapp(input: {
  policy: WhatsappPolicy; templateDocumentId: string; template: unknown;
  intent: Intent; grant: Grant; keys: GuestLinkSigningKeys;
  eventTitle: string; phoneE164: string; now: number;
}): RenderedWhatsapp {
  const {policy, intent, grant, keys, now} = input;
  parseWhatsappPolicy(policy);
  parseMessageIntent(intent);
  parseGrant(grant);
  const purpose = intent.kind === "joiningUpdate" ?
    "joiningUpdate" : intent.noticeKind;
  const approved = policy.templates.find((t) => t.purpose === purpose);
  const template = input.template;
  const snapshot = whatsappTemplateSnapshot(template);
  if (!approved || !validateOrganizerMessageTemplateDocument(template) ||
      approved.templateDocumentId !== input.templateDocumentId ||
      intent.context.mode !== "live" ||
      intent.context.organizerId !== policy.organizerId ||
      template.organizerId !== policy.organizerId ||
      template.connectionId !== policy.senderId ||
      template.status !== "APPROVED" || template.category !== "UTILITY" ||
      operationContentHash(snapshot) !== approved.templateHash ||
      template.hasMediaHeader ||
      !["NAMED", "POSITIONAL"].includes(template.parameterFormat ?? "") ||
      template.buttonKinds.some((kind) =>
        !["URL", "PHONE_NUMBER", "QUICK_REPLY"].includes(kind)) ||
      template.buttonKinds.length !== template.buttonLabels?.length ||
      template.buttonKinds.length !== template.buttonUrls?.length) {
    throw new Error("Reviewed WhatsApp template unavailable");
  }
  const syncedAt = Math.floor(template.syncedAt._seconds * 1000 +
    template.syncedAt._nanoseconds / 1_000_000);
  if (!Number.isSafeInteger(now) || now < intent.createdAt || syncedAt > now ||
      now >= syncedAt + policy.maxTemplateAgeSeconds * 1000 ||
      policy.status !== "ready" || policy.activation.approvedAt > now ||
      now >= policy.activation.validUntil || now >= policy.quote.validUntil ||
      !whatsappEndpointHash(input.phoneE164) ||
      !policy.quote.recipientPrefixes.some((p) =>
        input.phoneE164.startsWith(p)) ||
      now >= intent.expiresAt || grant.issuedAt > now ||
      now >= grant.expiresAt || grant.revokedAt !== null ||
      !sameMessageContext(grant.context, intent.context) ||
      grant.attendeeId !== intent.attendeeId ||
      grant.episodeId !== intent.episodeId ||
      grant.threadId !== threadIdentity(intent)) {
    throw new Error("WhatsApp template, quote or guest link authority expired");
  }
  const secret = grantSecret(grant, keys);
  if (!matchesGuestSecret(grant, secret)) {
    throw new Error("WhatsApp guest link key mismatch");
  }
  const suffix = grant.linkId + "#" + secret;
  const values = {eventTitle: input.eventTitle,
    instruction: intent.kind === "joiningUpdate" ?
      intent.guidance.text : intent.body,
    responseUrl: brandWebUrl("/event-update/") + suffix,
    responseUrlSuffix: suffix};
  assertParameterMapping(template, approved);
  const variables = Object.fromEntries(approved.variables.map((variable) => {
    const value = values[variable.source];
    if (!value || !value.trim() || value.length > variable.maxCharacters) {
      throw new Error("WhatsApp variable exceeds its reviewed limit");
    }
    return [variable.providerName, value];
  }));
  const slots = template.buttonKinds.flatMap((kind, i) =>
    kind === "QUICK_REPLY" ? [i] : []);
  const replies = approved.quickReplies.map((r) => {
    const choice = intent.choices.find((c) => c.choiceId === r.choiceId);
    if (!slots.includes(r.buttonIndex) ||
        template.buttonLabels?.[r.buttonIndex] !== r.label ||
        !choice || choice.label !== r.label ||
        !actionMatches(r.action, choice.value)) {
      throw new Error("WhatsApp button differs from the offered guest action");
    }
    return {buttonIndex: r.buttonIndex, choiceId: r.choiceId, label: r.label};
  });
  if (slots.length !== replies.length) {
    throw new Error("WhatsApp quick-reply coverage is incomplete");
  }
  return {template: snapshot, variables, replies,
    templateDocumentId: input.templateDocumentId,
    policyHash: operationContentHash(policy),
    templateHash: operationContentHash(snapshot),
    payloadHash: operationContentHash([snapshot, variables, replies]),
    maxCostMicros: policy.quote.maxMicrosPerMessage,
    currency: policy.quote.currency,
    validUntil: Math.min(intent.expiresAt, grant.expiresAt,
      policy.activation.validUntil, policy.quote.validUntil,
      syncedAt + policy.maxTemplateAgeSeconds * 1000)};
}

/** Stable review input includes content evidence, excluding sync timestamps. */
export function whatsappTemplateSnapshot(value: unknown): MetaTemplateSnapshot {
  if (!validateOrganizerMessageTemplateDocument(value) || !value.contentHash ||
      !value.buttonLabels || !value.buttonUrls || !value.parameterFormat) {
    throw new Error("Complete WhatsApp template metadata required");
  }
  return {providerTemplateId: value.providerTemplateId, name: value.name,
    language: value.language, category: value.category, status: value.status,
    hasMediaHeader: value.hasMediaHeader,
    variableNames: [...value.variableNames],
    parameterBindings: value.parameterBindings.map((b) => ({...b})),
    buttonKinds: [...value.buttonKinds], buttonLabels: [...value.buttonLabels],
    buttonUrls: [...value.buttonUrls], contentHash: value.contentHash,
    parameterFormat: value.parameterFormat};
}

/** Bind only after the outbox has selected the exact attempt identity. */
export function whatsappReplyPayloads(rendered: RenderedWhatsapp,
  attemptId: string): MetaQuickReplyPayload[] {
  if (rendered.templateHash !== operationContentHash(rendered.template) ||
      rendered.payloadHash !== operationContentHash([
        rendered.template, rendered.variables, rendered.replies,
      ])) {
    throw new Error("WhatsApp prepared material changed");
  }
  return rendered.replies.map((reply, index) => ({
    buttonIndex: reply.buttonIndex, label: reply.label,
    payload: whatsappNativeReplyId(attemptId, index),
  }));
}

function assertParameterMapping(template: MetaTemplateSnapshot,
  approved: TemplatePolicy): void {
  const names = approved.variables.map((v) => v.providerName).sort();
  const bindingNames = [...new Set(template.parameterBindings.map((b) =>
    b.variableName))].sort();
  if (operationContentHash(names) !== operationContentHash(bindingNames) ||
      operationContentHash(names) !==
        operationContentHash([...template.variableNames].sort())) {
    throw new Error("WhatsApp variable mapping is incomplete");
  }
  const positions = new Set<string>();
  const groups = new Map<string, number[]>();
  for (const binding of template.parameterBindings) {
    const key = [binding.component, binding.buttonIndex, binding.position]
      .join(":");
    const group = [binding.component, binding.buttonIndex].join(":");
    const source = approved.variables.find((v) =>
      v.providerName === binding.variableName)!.source;
    if (positions.has(key) || (binding.component === "button" ?
      source !== "responseUrlSuffix" || binding.buttonIndex === null ||
        template.buttonKinds[binding.buttonIndex] !== "URL" ||
        template.buttonUrls?.[binding.buttonIndex] !==
          brandWebUrl("/event-update/{{1}}") ||
        binding.position !== 0 :
      source === "responseUrlSuffix" || binding.buttonIndex !== null)) {
      throw new Error("Unsupported WhatsApp parameter destination");
    }
    positions.add(key);
    groups.set(group, [...(groups.get(group) ?? []), binding.position]);
  }
  for (const group of groups.values()) {
    if (group.sort((a, b) => a - b).some((position, i) => position !== i)) {
      throw new Error("WhatsApp parameter positions are incomplete");
    }
  }
}

function actionMatches(action: TemplatePolicy["quickReplies"][number]["action"],
  value: Intent["choices"][number]["value"]): boolean {
  switch (action) {
  case "onMyWay":
    return value.kind === "joinIntent" && value.intention.kind === "onMyWay" &&
      value.intention.claimedEta === null;
  case "notComing":
  case "joinLater":
    return value.kind === "joinIntent" && value.intention.kind === action;
  case "helpLogistics":
    return value.kind === "requestHelp" && value.category === "eventLogistics";
  case "helpSafety":
    return value.kind === "requestHelp" && value.category === "comfortSafety";
  case "helpAccessibility":
    return value.kind === "requestHelp" && value.category === "accessibility";
  case "helpOther":
    return value.kind === "requestHelp" && value.category === "other";
  case "acknowledge":
    return value.kind === "acknowledge";
  }
}
