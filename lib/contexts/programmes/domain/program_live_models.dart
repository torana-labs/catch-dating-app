import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

enum ProgramAlertSource { staffAttention, flight, readiness }

enum ProgramAlertSeverity { info, warning, urgent }

enum ProgramAlertState { open, done }

/// What the planner or a lead can do with an alert.
enum ProgramAlertAction { claim, done, reopen }

/// Where a function sits in tonight's schedule.
enum ProgramLivePhase { done, now, next, later }

/// One live board alert with its stored resolution.
class ProgramLiveAlert {
  const ProgramLiveAlert({
    required this.alertId,
    required this.source,
    required this.severity,
    required this.title,
    required this.subjectId,
    required this.createdAt,
    required this.state,
    required this.assignedToMe,
    required this.assigneeName,
    required this.revision,
  });

  factory ProgramLiveAlert.fromMap(Map<Object?, Object?> map) =>
      ProgramLiveAlert(
        alertId: requiredString(map, 'alertId'),
        source: nullableEnum(map['source'], ProgramAlertSource.values)!,
        severity: nullableEnum(map['severity'], ProgramAlertSeverity.values)!,
        title: requiredString(map, 'title'),
        subjectId: map['subjectId'] as String?,
        createdAt: requiredDateTime(map, 'createdAtMillis'),
        state: nullableEnum(map['state'], ProgramAlertState.values)!,
        assignedToMe: map['assignedToMe'] == true,
        assigneeName: map['assigneeName'] as String?,
        revision: requiredInt(map, 'revision'),
      );

  final String alertId;
  final ProgramAlertSource source;
  final ProgramAlertSeverity severity;
  final String title;
  final String? subjectId;
  final DateTime createdAt;
  final ProgramAlertState state;
  final bool assignedToMe;
  final String? assigneeName;
  final int revision;

  ProgramLiveAlert resolved(ProgramAlertState next, int nextRevision) =>
      ProgramLiveAlert(
        alertId: alertId,
        source: source,
        severity: severity,
        title: title,
        subjectId: subjectId,
        createdAt: createdAt,
        state: next,
        assignedToMe: next == ProgramAlertState.open || assignedToMe,
        assigneeName: assigneeName,
        revision: nextRevision,
      );
}

/// One of tonight's functions with its door counts.
class ProgramLiveFunction {
  const ProgramLiveFunction({
    required this.functionId,
    required this.name,
    required this.venueName,
    required this.startsAt,
    required this.endsAt,
    required this.expectedCount,
    required this.checkedInCount,
    required this.phase,
  });

  factory ProgramLiveFunction.fromMap(Map<Object?, Object?> map) =>
      ProgramLiveFunction(
        functionId: requiredString(map, 'functionId'),
        name: map['name'] as String? ?? '',
        venueName: map['venueName'] as String? ?? '',
        startsAt: requiredDateTime(map, 'startsAtMillis'),
        endsAt: requiredDateTime(map, 'endsAtMillis'),
        expectedCount: map['expectedCount'] as int?,
        checkedInCount: map['checkedInCount'] as int?,
        phase: nullableEnum(map['phase'], ProgramLivePhase.values)!,
      );

  final String functionId;
  final String name;
  final String venueName;
  final DateTime startsAt;
  final DateTime endsAt;
  final int? expectedCount;
  final int? checkedInCount;
  final ProgramLivePhase phase;
}

/// `getProgramLiveBoard`: the function on now, tonight, travel counts and
/// the alerts the caller may see.
class ProgramLiveBoard {
  const ProgramLiveBoard({
    required this.programId,
    required this.generatedAt,
    required this.now,
    required this.tonight,
    required this.expected,
    required this.atCurb,
    required this.disrupted,
    required this.alerts,
    required this.truncated,
  });

  factory ProgramLiveBoard.fromCallableData(Object? value) {
    final map = requiredMap(value, 'live board');
    final travel = requiredMap(map['travel'], 'travel');
    return ProgramLiveBoard(
      programId: requiredString(map, 'programId'),
      generatedAt: requiredDateTime(map, 'generatedAtMillis'),
      now: map['now'] == null
          ? null
          : ProgramLiveFunction.fromMap(requiredMap(map['now'], 'now')),
      tonight: mapList(
        map['tonight'],
        'tonight',
      ).map(ProgramLiveFunction.fromMap).toList(growable: false),
      expected: requiredInt(travel, 'expected'),
      atCurb: requiredInt(travel, 'atCurb'),
      disrupted: requiredInt(travel, 'disrupted'),
      alerts: mapList(
        map['alerts'],
        'alerts',
      ).map(ProgramLiveAlert.fromMap).toList(growable: false),
      truncated: map['truncated'] == true,
    );
  }

  final String programId;
  final DateTime generatedAt;
  final ProgramLiveFunction? now;
  final List<ProgramLiveFunction> tonight;
  final int expected;
  final int atCurb;
  final int disrupted;
  final List<ProgramLiveAlert> alerts;
  final bool truncated;

  List<ProgramLiveAlert> get open => [
    for (final a in alerts)
      if (a.state == ProgramAlertState.open) a,
  ];

  List<ProgramLiveAlert> get mine => [
    for (final a in alerts)
      if (a.state == ProgramAlertState.open && a.assignedToMe) a,
  ];

  List<ProgramLiveAlert> get done => [
    for (final a in alerts)
      if (a.state == ProgramAlertState.done) a,
  ];
}

/// `resolveProgramAlert`'s stored result.
class ProgramAlertResolution {
  const ProgramAlertResolution({
    required this.alertId,
    required this.state,
    required this.revision,
  });

  factory ProgramAlertResolution.fromCallableData(Object? value) {
    final map = requiredMap(value, 'alert');
    return ProgramAlertResolution(
      alertId: requiredString(map, 'alertId'),
      state: nullableEnum(map['state'], ProgramAlertState.values)!,
      revision: requiredInt(map, 'revision'),
    );
  }

  final String alertId;
  final ProgramAlertState state;
  final int revision;
}
