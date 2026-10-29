import 'package:meta/meta.dart';

/// Scope a moment definition is bound to. Exactly one id is set per kind.
enum OrganizerMomentScopeKind { event, program }

@immutable
class OrganizerMomentScope {
  const OrganizerMomentScope.event(this.eventId)
    : kind = OrganizerMomentScopeKind.event,
      programId = null;
  const OrganizerMomentScope.program(this.programId)
    : kind = OrganizerMomentScopeKind.program,
      eventId = null;

  factory OrganizerMomentScope.fromMap(Map<Object?, Object?> map) {
    final kind = OrganizerMomentScopeKind.values.byName(_string(map['kind']));
    return switch (kind) {
      OrganizerMomentScopeKind.event => OrganizerMomentScope.event(
        _string(map['eventId']),
      ),
      OrganizerMomentScopeKind.program => OrganizerMomentScope.program(
        _string(map['programId']),
      ),
    };
  }

  final OrganizerMomentScopeKind kind;
  final String? eventId;
  final String? programId;

  String get scopeId => switch (kind) {
    OrganizerMomentScopeKind.event => eventId!,
    OrganizerMomentScopeKind.program => programId!,
  };

  Map<String, Object?> toJson() => {
    'kind': kind.name,
    'eventId': ?eventId,
    'programId': ?programId,
  };
}

enum OrganizerMomentInitiationKind { manual, scheduled, anchored, triggered }

enum OrganizerMomentAnchorKind {
  scopeStart,
  scopeEnd,
  functionStart,
  functionEnd,
  rsvpDeadline,
  travelLegTime,
}

enum OrganizerMomentTriggerKind { lateArrivalAtHotel, flightDisrupted }

@immutable
class OrganizerMomentInitiation {
  const OrganizerMomentInitiation({
    required this.kind,
    this.atMillis,
    this.anchorKind,
    this.anchorId,
    this.offsetMinutes,
    this.triggerKind,
    this.functionId,
  });

  factory OrganizerMomentInitiation.fromMap(Map<Object?, Object?> map) =>
      OrganizerMomentInitiation(
        kind: OrganizerMomentInitiationKind.values.byName(_string(map['kind'])),
        atMillis: _intOrNull(map['atMillis']),
        anchorKind: _enumOrNull(
          map['anchorKind'],
          OrganizerMomentAnchorKind.values,
        ),
        anchorId: _stringOrNull(map['anchorId']),
        offsetMinutes: _intOrNull(map['offsetMinutes']),
        triggerKind: _enumOrNull(
          map['triggerKind'],
          OrganizerMomentTriggerKind.values,
        ),
        functionId: _stringOrNull(map['functionId']),
      );

  final OrganizerMomentInitiationKind kind;
  final int? atMillis;
  final OrganizerMomentAnchorKind? anchorKind;
  final String? anchorId;
  final int? offsetMinutes;
  final OrganizerMomentTriggerKind? triggerKind;
  final String? functionId;

  Map<String, Object?> toJson() => {
    'kind': kind.name,
    'atMillis': ?atMillis,
    'anchorKind': ?anchorKind?.name,
    'anchorId': ?anchorId,
    'offsetMinutes': ?offsetMinutes,
    'triggerKind': ?triggerKind?.name,
    'functionId': ?functionId,
  };
}

enum OrganizerMomentSense { individual, audience }

enum OrganizerMomentAudienceKind {
  subject,
  eventParticipants,
  functionGuests,
  households,
  staffDuty,
}

enum OrganizerMomentRsvpState { attending, maybe }

@immutable
class OrganizerMomentAudience {
  const OrganizerMomentAudience({
    required this.kind,
    this.statuses = const [],
    this.functionId,
    this.rsvp = const [],
    this.householdDedupe,
    this.rsvpPendingOnly,
    this.duty,
    this.scopeIds = const [],
    this.travelTimeLead,
  });

  factory OrganizerMomentAudience.fromMap(Map<Object?, Object?> map) =>
      OrganizerMomentAudience(
        kind: OrganizerMomentAudienceKind.values.byName(_string(map['kind'])),
        statuses: _stringList(map['statuses']),
        functionId: _stringOrNull(map['functionId']),
        rsvp: _stringList(
          map['rsvp'],
        ).map(OrganizerMomentRsvpState.values.byName).toList(growable: false),
        householdDedupe: map['householdDedupe'] is bool
            ? map['householdDedupe'] as bool
            : null,
        rsvpPendingOnly: map['rsvpPendingOnly'] is bool
            ? map['rsvpPendingOnly'] as bool
            : null,
        duty: _stringOrNull(map['duty']),
        scopeIds: _stringList(map['scopeIds']),
        travelTimeLead: map['travelTimeLead'] is bool
            ? map['travelTimeLead'] as bool
            : null,
      );

  final OrganizerMomentAudienceKind kind;
  final List<String> statuses;
  final String? functionId;
  final List<OrganizerMomentRsvpState> rsvp;
  final bool? householdDedupe;
  final bool? rsvpPendingOnly;
  final String? duty;
  final List<String> scopeIds;

  /// `functionGuests` only: shift each recipient's send earlier by their
  /// hotel→function travel estimate (hotel via the guest's linked group).
  final bool? travelTimeLead;

  Map<String, Object?> toJson() => {
    'kind': kind.name,
    if (statuses.isNotEmpty) 'statuses': statuses,
    'functionId': ?functionId,
    if (rsvp.isNotEmpty) 'rsvp': rsvp.map((state) => state.name).toList(),
    'householdDedupe': ?householdDedupe,
    'rsvpPendingOnly': ?rsvpPendingOnly,
    'duty': ?duty,
    if (scopeIds.isNotEmpty) 'scopeIds': scopeIds,
    'travelTimeLead': ?travelTimeLead,
  };
}

enum OrganizerMomentActionKind { sendTemplate, push, staffAttention }

enum OrganizerMomentAttentionSeverity { info, warning, urgent }

@immutable
class OrganizerMomentAction {
  const OrganizerMomentAction({
    required this.kind,
    this.connectionId,
    this.templateId,
    this.variables = const {},
    this.notificationType,
    this.preferenceKey,
    this.duty,
    this.severity,
    this.titleTemplate,
  });

  factory OrganizerMomentAction.fromMap(Map<Object?, Object?> map) =>
      OrganizerMomentAction(
        kind: OrganizerMomentActionKind.values.byName(_string(map['kind'])),
        connectionId: _stringOrNull(map['connectionId']),
        templateId: _stringOrNull(map['templateId']),
        variables: _stringMap(map['variables']),
        notificationType: _stringOrNull(map['notificationType']),
        preferenceKey: _stringOrNull(map['preferenceKey']),
        duty: _stringOrNull(map['duty']),
        severity: _enumOrNull(
          map['severity'],
          OrganizerMomentAttentionSeverity.values,
        ),
        titleTemplate: _stringOrNull(map['titleTemplate']),
      );

  final OrganizerMomentActionKind kind;
  final String? connectionId;
  final String? templateId;
  final Map<String, String> variables;
  final String? notificationType;
  final String? preferenceKey;
  final String? duty;
  final OrganizerMomentAttentionSeverity? severity;
  final String? titleTemplate;

  Map<String, Object?> toJson() => {
    'kind': kind.name,
    'connectionId': ?connectionId,
    'templateId': ?templateId,
    if (variables.isNotEmpty) 'variables': variables,
    'notificationType': ?notificationType,
    'preferenceKey': ?preferenceKey,
    'duty': ?duty,
    'severity': ?severity?.name,
    'titleTemplate': ?titleTemplate,
  };
}

enum OrganizerMomentStatus { draft, armed, paused, done }

enum OrganizerMomentOrigin { organizer, systemDefault }

@immutable
class OrganizerMomentApproval {
  const OrganizerMomentApproval({
    required this.approvedByUid,
    required this.approvedAtMillis,
  });

  factory OrganizerMomentApproval.fromMap(Map<Object?, Object?> map) =>
      OrganizerMomentApproval(
        approvedByUid: _string(map['approvedByUid']),
        approvedAtMillis: _intOrNull(map['approvedAtMillis']) ?? 0,
      );

  final String approvedByUid;
  final int approvedAtMillis;
}

/// One organizer moment definition as returned by the moment callables.
@immutable
class OrganizerMoment {
  const OrganizerMoment({
    required this.momentId,
    required this.scope,
    required this.name,
    required this.initiation,
    required this.sense,
    required this.audience,
    required this.action,
    required this.status,
    this.approval,
    required this.origin,
    required this.revision,
  });

  factory OrganizerMoment.fromMap(Map<Object?, Object?> map) => OrganizerMoment(
    momentId: _string(map['momentId']),
    scope: OrganizerMomentScope.fromMap(_requiredMap(map['scope'])),
    name: _string(map['name']),
    initiation: OrganizerMomentInitiation.fromMap(
      _requiredMap(map['initiation']),
    ),
    sense: OrganizerMomentSense.values.byName(_string(map['sense'])),
    audience: OrganizerMomentAudience.fromMap(_requiredMap(map['audience'])),
    action: OrganizerMomentAction.fromMap(_requiredMap(map['action'])),
    status: OrganizerMomentStatus.values.byName(_string(map['status'])),
    approval: map['approval'] is Map<Object?, Object?>
        ? OrganizerMomentApproval.fromMap(
            map['approval'] as Map<Object?, Object?>,
          )
        : null,
    origin: OrganizerMomentOrigin.values.byName(_string(map['origin'])),
    revision: _intOrNull(map['revision']) ?? 0,
  );

  factory OrganizerMoment.fromCallableData(Object? data) =>
      OrganizerMoment.fromMap(_requiredMap(data));

  final String momentId;
  final OrganizerMomentScope scope;
  final String name;
  final OrganizerMomentInitiation initiation;
  final OrganizerMomentSense sense;
  final OrganizerMomentAudience audience;
  final OrganizerMomentAction action;
  final OrganizerMomentStatus status;
  final OrganizerMomentApproval? approval;
  final OrganizerMomentOrigin origin;
  final int revision;

  bool get canArm => status == OrganizerMomentStatus.draft;
  bool get canPause => status == OrganizerMomentStatus.armed;
  bool get canResume => status == OrganizerMomentStatus.paused;
  bool get canRevise => status != OrganizerMomentStatus.done;
  bool get canRun =>
      status == OrganizerMomentStatus.armed &&
      initiation.kind == OrganizerMomentInitiationKind.manual;
}

Map<Object?, Object?> _requiredMap(Object? value) {
  if (value is Map<Object?, Object?>) return value;
  throw const FormatException('Invalid organizer moment payload.');
}

String _string(Object? value) {
  if (value is String && value.isNotEmpty) return value;
  throw const FormatException('Invalid organizer moment payload.');
}

String? _stringOrNull(Object? value) =>
    value is String && value.isNotEmpty ? value : null;

int? _intOrNull(Object? value) => value is int ? value : null;

T? _enumOrNull<T extends Enum>(Object? value, List<T> values) =>
    value is String && value.isNotEmpty ? values.byName(value) : null;

List<String> _stringList(Object? value) {
  if (value is! List<Object?>) return const [];
  return [
    for (final item in value)
      if (item is String && item.isNotEmpty) item,
  ];
}

Map<String, String> _stringMap(Object? value) {
  if (value is! Map<Object?, Object?>) return const {};
  return {
    for (final entry in value.entries)
      if (entry.key is String && entry.value is String)
        entry.key as String: entry.value as String,
  };
}
