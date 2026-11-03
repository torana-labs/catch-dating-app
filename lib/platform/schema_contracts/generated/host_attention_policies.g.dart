// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements
// Source: contracts/catalogs/host_attention_policies.json.

/// How the Host Today queue delivers one attention kind.
enum HostAttentionDeliveryMode {
  serverProjected,
  clientMerged,
  shortcutOnly,
  blockedMissingTruth,
}

class HostAttentionPolicyDefinition {
  const HostAttentionPolicyDefinition({
    required this.kind,
    required this.deliveryMode,
    required this.readinessReason,
  });

  final String kind;
  final HostAttentionDeliveryMode deliveryMode;
  final String readinessReason;
}

const int hostAttentionPolicyVersion = 4;
const int hostAttentionHorizonHours = 168;
const int hostAttentionImmediateHours = 24;
const int hostAttentionSoonHours = 72;

/// One entry per attention kind, in catalog order.
const List<HostAttentionPolicyDefinition> hostAttentionPolicyDefinitions =
    <HostAttentionPolicyDefinition>[
  HostAttentionPolicyDefinition(
    kind: 'eventLiveOperations',
    deliveryMode: HostAttentionDeliveryMode.serverProjected,
    readinessReason: 'Event lifecycle and schedule are canonical server-owned facts.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'eventAssistanceCaseReview',
    deliveryMode: HostAttentionDeliveryMode.serverProjected,
    readinessReason: 'Practical help ownership, open status, organizer, event, and receipt time are canonical server-owned case facts.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'eventAssistanceDeliveryReview',
    deliveryMode: HostAttentionDeliveryMode.serverProjected,
    readinessReason: 'The delivery checkpoint review phase and matching Operations human-review projection are explicit server-owned facts.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'eventWaitlistReview',
    deliveryMode: HostAttentionDeliveryMode.serverProjected,
    readinessReason: 'Waitlist count and admission policy are canonical event projections.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'eventJoinRequestReview',
    deliveryMode: HostAttentionDeliveryMode.serverProjected,
    readinessReason: 'Manual approval is explicit on both the event policy and canonical participation workflow edge.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'applicationReview',
    deliveryMode: HostAttentionDeliveryMode.serverProjected,
    readinessReason: 'Application review status is an explicit callable-owned workflow state.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'providerSyncFailure',
    deliveryMode: HostAttentionDeliveryMode.serverProjected,
    readinessReason: 'Provider sync run status is explicit, bounded, and server-owned.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'formAutomationFailure',
    deliveryMode: HostAttentionDeliveryMode.serverProjected,
    readinessReason: 'Automation run status is explicit and server-owned.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'payoutSetup',
    deliveryMode: HostAttentionDeliveryMode.serverProjected,
    readinessReason: 'Organizer ownership, paid-event currency, and provider account capability are explicit server facts.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'attendanceSync',
    deliveryMode: HostAttentionDeliveryMode.clientMerged,
    readinessReason: 'The outbox is intentionally local-only and must be merged after the server projection is fetched.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'dressRehearsal',
    deliveryMode: HostAttentionDeliveryMode.shortcutOnly,
    readinessReason: 'Rehearsal is available without pretending every event requires one.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'eventSuccessPreparation',
    deliveryMode: HostAttentionDeliveryMode.blockedMissingTruth,
    readinessReason: 'The plan has lifecycle state but no explicit complete preparation checklist or readiness projection.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'roomLayoutSetup',
    deliveryMode: HostAttentionDeliveryMode.blockedMissingTruth,
    readinessReason: 'A null optional layout is not proof that the event requires one.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'eventStaffing',
    deliveryMode: HostAttentionDeliveryMode.blockedMissingTruth,
    readinessReason: 'Grant existence does not express how many staff, if any, an event requires.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'formResponseReview',
    deliveryMode: HostAttentionDeliveryMode.blockedMissingTruth,
    readinessReason: 'Submission is not equivalent to needing review, and generic responses have no review workflow today.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'inboxReply',
    deliveryMode: HostAttentionDeliveryMode.blockedMissingTruth,
    readinessReason: 'Last inbound or unread is not proof that a human reply is required.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'postEventReconciliation',
    deliveryMode: HostAttentionDeliveryMode.blockedMissingTruth,
    readinessReason: 'Counts alone cannot prove whether attendance, refunds, provider imports, and reporting are reconciled.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'momentStaffAttention',
    deliveryMode: HostAttentionDeliveryMode.serverProjected,
    readinessReason: 'organizerMomentSends is a durable engine journal written at fire time.',
  ),
  HostAttentionPolicyDefinition(
    kind: 'eventOfferPaymentFollowUp',
    deliveryMode: HostAttentionDeliveryMode.serverProjected,
    readinessReason: 'Offer status, payment snapshot, manual payment review, and expiry are canonical server-owned offer facts.',
  ),
];
