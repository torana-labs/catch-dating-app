import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/host_attention_policies.g.dart';
import 'package:meta/meta.dart';

/// Shared decision horizon for Today's operational queue and event preview.
const hostTodayOperationsHorizon = Duration(days: 7);

enum HostAttentionKind {
  eventLiveOperations,
  eventAssistanceCaseReview,
  eventAssistanceDeliveryReview,
  eventWaitlistReview,
  eventJoinRequestReview,
  applicationReview,
  providerSyncFailure,
  formAutomationFailure,
  payoutSetup,
  attendanceSync,
  dressRehearsal,
  eventSuccessPreparation,
  roomLayoutSetup,
  eventStaffing,
  formResponseReview,
  inboxReply,
  postEventReconciliation,
  momentStaffAttention,
  eventOfferPaymentFollowUp,
}

enum HostAttentionScope { organizer, event, application, form, thread, account }

enum HostAttentionSourceOwner {
  events,
  eventParticipations,
  organizerApplications,
  providerSyncRuns,
  organizerFormAutomationRuns,
  hostPaymentAccounts,
  hostAttendanceOutbox,
  eventAssistanceCases,
  operationWorkItems,
  eventSuccessPlans,
  eventRehearsals,
  eventStaffGrants,
  organizerFormResponses,
  organizerWhatsappThreads,
  eventAttendees,
  organizerMomentSends,
  organizerEventOffers,
}

enum HostAttentionConsequence {
  blocksLiveOperation,
  risksGuestExperience,
  risksRevenue,
  delaysResponse,
  degradesAutomation,
  requiresReconciliation,
  preparationIncomplete,
  informational,
}

enum HostAttentionStatus { open }

enum HostAttentionUrgency { immediate, soon, upcoming }

enum HostAttentionDestinationRoute {
  hostEventManage,
  hostApplications,
  hostOrganizerPayments,
  hostAudienceForms,
  hostInbox,
  hostDressRehearsal,
  hostEvents,
  hostProgramWork,
}

enum HostAttentionCoverageState {
  complete,
  clientMergeRequired,
  shortcutOnly,
  blockedMissingTruth,
}

@immutable
class HostAttentionDestination {
  const HostAttentionDestination({
    required this.route,
    this.section,
    this.eventId,
    this.applicationId,
    this.formId,
    this.threadId,
  });

  factory HostAttentionDestination.fromMap(Map<Object?, Object?> map) =>
      HostAttentionDestination(
        route: _requiredEnum(
          HostAttentionDestinationRoute.values,
          map,
          'route',
        ),
        section: _nullableString(map, 'section'),
        eventId: _nullableString(map, 'eventId'),
        applicationId: _nullableString(map, 'applicationId'),
        formId: _nullableString(map, 'formId'),
        threadId: _nullableString(map, 'threadId'),
      );

  final HostAttentionDestinationRoute route;
  final String? section;
  final String? eventId;
  final String? applicationId;
  final String? formId;
  final String? threadId;
}

@immutable
class HostAttentionContext {
  const HostAttentionContext({
    this.eventName,
    this.subjectLabel,
    this.count,
    this.provider,
    this.errorCode,
  });

  factory HostAttentionContext.fromMap(Map<Object?, Object?> map) =>
      HostAttentionContext(
        eventName: _nullableString(map, 'eventName'),
        subjectLabel: _nullableString(map, 'subjectLabel'),
        count: _nullableInt(map, 'count'),
        provider: _nullableString(map, 'provider'),
        errorCode: _nullableString(map, 'errorCode'),
      );

  final String? eventName;
  final String? subjectLabel;
  final int? count;
  final String? provider;
  final String? errorCode;
}

@immutable
class HostAttentionItem {
  const HostAttentionItem({
    required this.id,
    required this.kind,
    required this.scope,
    required this.sourceOwner,
    required this.sourceId,
    required this.sourceRevision,
    required this.eventId,
    required this.status,
    required this.consequence,
    required this.blocking,
    required this.urgency,
    required this.destination,
    required this.context,
    required this.dedupeKey,
    required this.policyVersion,
    required this.resolutionVersion,
    required this.assignedHostUid,
    required this.openedAt,
    required this.dueAt,
    required this.expiresAt,
  });

  /// Parses one `organizerAttentionItems` document. Only open rows belong in
  /// the queue; the document id is the attention id.
  factory HostAttentionItem.fromFirestore(
    String documentId,
    Map<Object?, Object?> map,
  ) {
    final id = _requiredString(map, 'attentionId');
    if (id != documentId) {
      throw const FormatException('Attention id does not match its document.');
    }
    return HostAttentionItem(
      id: id,
      kind: _requiredEnum(HostAttentionKind.values, map, 'kind'),
      scope: _requiredEnum(HostAttentionScope.values, map, 'scope'),
      sourceOwner: _requiredEnum(
        HostAttentionSourceOwner.values,
        map,
        'sourceOwner',
      ),
      sourceId: _requiredString(map, 'sourceId'),
      sourceRevision: _requiredString(map, 'sourceRevision'),
      eventId: _nullableString(map, 'eventId'),
      status: _requiredEnum(HostAttentionStatus.values, map, 'status'),
      consequence: _requiredEnum(
        HostAttentionConsequence.values,
        map,
        'consequence',
      ),
      blocking: _requiredBool(map, 'blocking'),
      urgency: _requiredEnum(HostAttentionUrgency.values, map, 'urgency'),
      destination: HostAttentionDestination.fromMap(
        _requiredMap(map['destination'], 'attention destination'),
      ),
      context: HostAttentionContext.fromMap(
        _requiredMap(map['context'], 'attention context'),
      ),
      dedupeKey: _requiredString(map, 'dedupeKey'),
      policyVersion: _requiredInt(map, 'policyVersion'),
      resolutionVersion: _requiredInt(map, 'resolutionVersion'),
      assignedHostUid: _nullableString(map, 'assignedHostUid'),
      openedAt: dateTimeFromFirestoreValue(map['openedAt'], field: 'openedAt'),
      dueAt: dateTimeFromFirestoreValue(map['dueAt'], field: 'dueAt'),
      expiresAt: nullableDateTimeFromFirestoreValue(map['actionExpiresAt']),
    );
  }

  final String id;
  final HostAttentionKind kind;
  final HostAttentionScope scope;
  final HostAttentionSourceOwner sourceOwner;
  final String sourceId;
  final String sourceRevision;
  final String? eventId;
  final HostAttentionStatus status;
  final HostAttentionConsequence consequence;
  final bool blocking;
  final HostAttentionUrgency urgency;
  final HostAttentionDestination destination;
  final HostAttentionContext context;
  final String dedupeKey;
  final int? policyVersion;
  final int resolutionVersion;
  final String? assignedHostUid;
  final DateTime openedAt;
  final DateTime dueAt;
  final DateTime? expiresAt;
}

@immutable
class HostAttentionCoverage {
  const HostAttentionCoverage({
    required this.kind,
    required this.state,
    required this.reason,
  });

  final HostAttentionKind kind;
  final HostAttentionCoverageState state;
  final String reason;
}

/// One coverage row per catalog kind, from the generated policy catalog.
final List<HostAttentionCoverage> hostAttentionCatalogCoverage =
    List<HostAttentionCoverage>.unmodifiable([
      for (final definition in hostAttentionPolicyDefinitions)
        HostAttentionCoverage(
          kind: HostAttentionKind.values.byName(definition.kind),
          state: hostAttentionCoverageState(definition.deliveryMode),
          reason: definition.readinessReason,
        ),
    ]);

/// How a catalog delivery mode reads as coverage on Today.
HostAttentionCoverageState hostAttentionCoverageState(
  HostAttentionDeliveryMode mode,
) => switch (mode) {
  HostAttentionDeliveryMode.serverProjected =>
    HostAttentionCoverageState.complete,
  HostAttentionDeliveryMode.clientMerged =>
    HostAttentionCoverageState.clientMergeRequired,
  HostAttentionDeliveryMode.shortcutOnly =>
    HostAttentionCoverageState.shortcutOnly,
  HostAttentionDeliveryMode.blockedMissingTruth =>
    HostAttentionCoverageState.blockedMissingTruth,
};

/// Whether the server's last evaluation read every source completely.
/// [missing] means no evaluation has been recorded for the organizer.
enum HostAttentionSourceCoverage { complete, overCap, missing }

/// Today order: urgency, then blocking work, then deadline, then stable id.
int compareHostAttentionItems(HostAttentionItem left, HostAttentionItem right) {
  final urgency = left.urgency.index.compareTo(right.urgency.index);
  if (urgency != 0) return urgency;
  final blocking = (right.blocking ? 1 : 0).compareTo(left.blocking ? 1 : 0);
  if (blocking != 0) return blocking;
  final dueAt = left.dueAt.compareTo(right.dueAt);
  if (dueAt != 0) return dueAt;
  return left.id.compareTo(right.id);
}

@immutable
class HostAttentionProjection {
  const HostAttentionProjection({
    required this.organizerId,
    required this.policyVersion,
    required this.items,
    required this.coverage,
    required this.evaluatedAt,
    required this.sourceCoverage,
  });

  /// Combines the open rows and the schedule document ([schedule] is null
  /// when the organizer has not been evaluated yet).
  factory HostAttentionProjection.fromFirestore({
    required String organizerId,
    required Iterable<HostAttentionItem> items,
    required Map<Object?, Object?>? schedule,
  }) {
    if (schedule != null &&
        _requiredString(schedule, 'organizerId') != organizerId) {
      throw const FormatException(
        'Organizer attention schedule has the wrong organizer.',
      );
    }
    final sorted = [...items]..sort(compareHostAttentionItems);
    return HostAttentionProjection(
      organizerId: organizerId,
      policyVersion: hostAttentionPolicyVersion,
      items: List<HostAttentionItem>.unmodifiable(sorted),
      coverage: hostAttentionCatalogCoverage,
      evaluatedAt: schedule == null
          ? null
          : dateTimeFromFirestoreValue(
              schedule['evaluatedAt'],
              field: 'evaluatedAt',
            ),
      sourceCoverage: schedule == null
          ? HostAttentionSourceCoverage.missing
          : switch (_requiredString(schedule, 'sourceCoverage')) {
              'complete' => HostAttentionSourceCoverage.complete,
              'overCap' => HostAttentionSourceCoverage.overCap,
              _ => throw const FormatException('Invalid sourceCoverage.'),
            },
    );
  }

  final String organizerId;
  final int policyVersion;
  final List<HostAttentionItem> items;
  final List<HostAttentionCoverage> coverage;

  /// When the server last committed an evaluation; null before the first.
  final DateTime? evaluatedAt;
  final HostAttentionSourceCoverage sourceCoverage;

  bool get isComplete => sourceCoverage == HostAttentionSourceCoverage.complete;
}

Map<Object?, Object?> _requiredMap(Object? value, String label) {
  if (value is Map<Object?, Object?>) return value;
  throw FormatException('Invalid $label.');
}

String _requiredString(Map<Object?, Object?> map, String field) {
  final value = map[field];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Invalid $field.');
}

String? _nullableString(Map<Object?, Object?> map, String field) {
  final value = map[field];
  if (value == null) return null;
  if (value is String) return value;
  throw FormatException('Invalid $field.');
}

int _requiredInt(Map<Object?, Object?> map, String field) {
  final value = map[field];
  if (value is int) return value;
  if (value is num) return value.toInt();
  throw FormatException('Invalid $field.');
}

int? _nullableInt(Map<Object?, Object?> map, String field) {
  final value = map[field];
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  throw FormatException('Invalid $field.');
}

bool _requiredBool(Map<Object?, Object?> map, String field) {
  final value = map[field];
  if (value is bool) return value;
  throw FormatException('Invalid $field.');
}

T _requiredEnum<T extends Enum>(
  List<T> values,
  Map<Object?, Object?> map,
  String field,
) {
  final name = _requiredString(map, field);
  for (final value in values) {
    if (value.name == name) return value;
  }
  throw FormatException('Invalid $field.');
}
