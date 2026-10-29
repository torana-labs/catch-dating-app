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

  factory HostAttentionItem.fromMap(Map<Object?, Object?> map) =>
      HostAttentionItem(
        id: _requiredString(map, 'attentionId'),
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
        openedAt: _requiredDateTime(map, 'openedAtMillis'),
        dueAt: _requiredDateTime(map, 'dueAtMillis'),
        expiresAt: _nullableDateTime(map, 'expiresAtMillis'),
      );

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

  factory HostAttentionCoverage.fromMap(Map<Object?, Object?> map) =>
      HostAttentionCoverage(
        kind: _requiredEnum(HostAttentionKind.values, map, 'kind'),
        state: _requiredEnum(HostAttentionCoverageState.values, map, 'state'),
        reason: _requiredString(map, 'reason'),
      );

  final HostAttentionKind kind;
  final HostAttentionCoverageState state;
  final String reason;
}

@immutable
class HostAttentionProjection {
  const HostAttentionProjection({
    required this.organizerId,
    required this.policyVersion,
    required this.generatedAt,
    required this.horizonEndsAt,
    required this.items,
    required this.coverage,
  });

  factory HostAttentionProjection.fromCallableData(Object? value) {
    final map = _requiredMap(value, 'organizer attention projection');
    final items = _requiredList(map, 'items')
        .map(
          (item) => HostAttentionItem.fromMap(
            _requiredMap(item, 'organizer attention item'),
          ),
        )
        .toList(growable: false);
    final coverage = _requiredList(map, 'coverage')
        .map(
          (item) => HostAttentionCoverage.fromMap(
            _requiredMap(item, 'organizer attention coverage'),
          ),
        )
        .toList(growable: false);
    final coveredKinds = coverage.map((item) => item.kind).toSet();
    if (coverage.length != HostAttentionKind.values.length ||
        coveredKinds.length != HostAttentionKind.values.length) {
      throw const FormatException(
        'Organizer attention coverage must contain every kind exactly once.',
      );
    }
    return HostAttentionProjection(
      organizerId: _requiredString(map, 'organizerId'),
      policyVersion: _requiredInt(map, 'policyVersion'),
      generatedAt: _requiredDateTime(map, 'generatedAtMillis'),
      horizonEndsAt: _requiredDateTime(map, 'horizonEndsAtMillis'),
      items: List<HostAttentionItem>.unmodifiable(items),
      coverage: List<HostAttentionCoverage>.unmodifiable(coverage),
    );
  }

  final String organizerId;
  final int policyVersion;
  final DateTime generatedAt;
  final DateTime horizonEndsAt;
  final List<HostAttentionItem> items;
  final List<HostAttentionCoverage> coverage;
}

Map<Object?, Object?> _requiredMap(Object? value, String label) {
  if (value is Map<Object?, Object?>) return value;
  throw FormatException('Invalid $label.');
}

List<Object?> _requiredList(Map<Object?, Object?> map, String field) {
  final value = map[field];
  if (value is List<Object?>) return value;
  throw FormatException('Invalid $field.');
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

DateTime _requiredDateTime(Map<Object?, Object?> map, String field) =>
    DateTime.fromMillisecondsSinceEpoch(_requiredInt(map, field));

DateTime? _nullableDateTime(Map<Object?, Object?> map, String field) {
  if (map[field] == null) return null;
  return _requiredDateTime(map, field);
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
