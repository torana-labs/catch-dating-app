/// The caller's staff assignments for the unified host work shell.
///
/// They are read from the account's own `hostAssignmentViews` rows (#1339),
/// one per programme grant, event grant and team membership, which a trigger
/// keeps with the facts `listMyHostAssignments` filtered on. The phone keeps
/// the rows live at its clock (approval start, grant and duty expiry) and
/// works out the shell entry the callable decided. The list grants nothing:
/// every destination re-checks its own authorization.
library;

import 'package:meta/meta.dart';

/// Whether an assignment scopes to a single event or a multi-day program.
enum HostWorkScopeKind { event, program }

/// Canonical duty across event and program scopes.
///
/// Event grants carry role names server-side (`checkInOperator`,
/// `eventOperator`); the callable already maps them onto this union.
enum HostWorkDuty {
  programAdmin,
  programCoordinator,
  guestRelations,
  communications,
  functionCheckIn,
  functionLead,
  airportGreeter,
  hotelDesk,
  transportDispatcher,
  reconciliationViewer,
  stakeholderViewer,
  eventLead,
}

/// The app shell the caller should land in. Managers always get
/// [managerShell] even when they also hold staff assignments; staff get
/// [workShell] only while at least one assignment is live.
enum HostWorkShellEntry { managerShell, workShell, none }

/// One granted duty on an assignment, optionally narrowed to concrete
/// pickup points, hotels, or functions.
@immutable
class HostWorkGrantedDuty {
  const HostWorkGrantedDuty({
    required this.duty,
    required this.pickupPointIds,
    required this.hotelIds,
    required this.functionIds,
  });

  factory HostWorkGrantedDuty.fromMap(Map<Object?, Object?> map) {
    final dutyName = _requiredString(map, 'duty');
    final duty = _enumByName(HostWorkDuty.values, dutyName);
    if (duty == null) {
      throw FormatException('Unknown host work duty "$dutyName".');
    }
    return HostWorkGrantedDuty(
      duty: duty,
      pickupPointIds: _stringSet(map['pickupPointIds']),
      hotelIds: _stringSet(map['hotelIds']),
      functionIds: _stringSet(map['functionIds']),
    );
  }

  final HostWorkDuty duty;
  final Set<String> pickupPointIds;
  final Set<String> hotelIds;
  final Set<String> functionIds;
}

/// One live staff assignment: the grant's canonical duties that are live
/// now, and when access ends (the grant or its soonest live duty).
@immutable
class HostWorkAssignment {
  const HostWorkAssignment({
    required this.kind,
    required this.scopeId,
    required this.organizerId,
    required this.title,
    required this.subtitle,
    required this.organizerName,
    required this.duties,
    required this.grantExpiresAt,
  });

  final HostWorkScopeKind kind;

  /// The eventId or programId this assignment scopes to.
  final String scopeId;
  final String organizerId;
  final String title;
  final String? subtitle;
  final String organizerName;
  final List<HostWorkGrantedDuty> duties;
  final DateTime? grantExpiresAt;

  bool get isProgram => kind == HostWorkScopeKind.program;
}

/// The caller's live assignments and the shell entry they land in.
@immutable
class HostWorkAssignments {
  const HostWorkAssignments({
    required this.assignments,
    required this.shellEntry,
    this.nextChangeAt,
  });

  /// The account's assignments at [now] from its `hostAssignmentViews` rows,
  /// as `listMyHostAssignments` resolved them: a programme or event row is
  /// live while it is active, its approval has begun, its grant has not
  /// expired and one of its duties is live; only the live duties are listed,
  /// and access ends at the grant's expiry or the soonest live duty's. Events
  /// sort before programmes, then by id. An active team membership lands the
  /// account in the manager shell; otherwise one live assignment lands it in
  /// the work shell. [nextChangeAt] is the next instant the list changes.
  factory HostWorkAssignments.fromViews(
    List<Map<Object?, Object?>> rows,
    DateTime now,
  ) {
    final at = now.millisecondsSinceEpoch;
    var manager = false;
    int? next;
    void wake(int? instant) {
      if (instant != null &&
          instant > at &&
          (next == null || instant < next!)) {
        next = instant;
      }
    }

    final assignments = <HostWorkAssignment>[];
    for (final row in rows) {
      if (row['status'] != 'active') continue;
      final kind = row['kind'];
      if (kind == 'team') {
        manager = true;
        continue;
      }
      final scopeKind = _enumByName(HostWorkScopeKind.values, '$kind');
      if (scopeKind == null) continue;
      final activeFrom = row['activeFromMillis'];
      if (activeFrom is int && activeFrom > at) {
        wake(activeFrom);
        continue;
      }
      final grantExpiry = row['grantExpiresAtMillis'];
      if (grantExpiry is int && grantExpiry <= at) continue;
      final live = <(HostWorkGrantedDuty, int)>[];
      for (final duty in _mapList(row['duties'], 'duties')) {
        final expiry = duty['expiresAtMillis'];
        if (expiry is! int || expiry <= at) continue;
        final parsed = _dutyOrNull(duty);
        if (parsed != null) live.add((parsed, expiry));
      }
      if (live.isEmpty) continue;
      var endsAt = grantExpiry is int ? grantExpiry : live.first.$2;
      for (final (_, expiry) in live) {
        if (expiry < endsAt) endsAt = expiry;
        wake(expiry);
      }
      wake(grantExpiry is int ? grantExpiry : null);
      assignments.add(
        HostWorkAssignment(
          kind: scopeKind,
          scopeId: _requiredString(row, 'scopeId'),
          organizerId: _requiredString(row, 'organizerId'),
          title: _requiredString(row, 'title'),
          subtitle: null,
          organizerName: _requiredString(row, 'organizerName'),
          duties: [for (final (duty, _) in live) duty],
          grantExpiresAt: DateTime.fromMillisecondsSinceEpoch(
            endsAt,
            isUtc: true,
          ),
        ),
      );
    }
    assignments.sort((a, b) {
      final byKind = a.kind.name.compareTo(b.kind.name);
      return byKind != 0 ? byKind : a.scopeId.compareTo(b.scopeId);
    });
    return HostWorkAssignments(
      assignments: List.unmodifiable(assignments),
      shellEntry: manager
          ? HostWorkShellEntry.managerShell
          : assignments.isNotEmpty
          ? HostWorkShellEntry.workShell
          : HostWorkShellEntry.none,
      nextChangeAt: switch (next) {
        final instant? => DateTime.fromMillisecondsSinceEpoch(
          instant,
          isUtc: true,
        ),
        null => null,
      },
    );
  }

  final List<HostWorkAssignment> assignments;
  final HostWorkShellEntry shellEntry;

  /// When an approval begins or a grant or duty ends, so the list is
  /// rebuilt then without a new snapshot.
  final DateTime? nextChangeAt;

  bool get isEmpty => assignments.isEmpty;
}

/// A duty a newer server may name that this build does not know is skipped.
HostWorkGrantedDuty? _dutyOrNull(Map<Object?, Object?> map) {
  final name = map['duty'];
  if (name is! String || _enumByName(HostWorkDuty.values, name) == null) {
    return null;
  }
  return HostWorkGrantedDuty.fromMap(map);
}

Map<Object?, Object?> _requiredMap(Object? value) {
  if (value is Map<Object?, Object?>) return value;
  throw const FormatException('Invalid host work assignment payload.');
}

String _requiredString(Map<Object?, Object?> map, String field) {
  final value = map[field];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Missing host work assignment field "$field".');
}

List<Map<Object?, Object?>> _mapList(Object? value, String field) {
  if (value is! List) {
    throw FormatException('Missing host work assignment field "$field".');
  }
  return value.map(_requiredMap).toList(growable: false);
}

Set<String> _stringSet(Object? value) {
  if (value is! List) return const {};
  return value.whereType<String>().toSet();
}

T? _enumByName<T extends Enum>(List<T> values, String name) {
  for (final value in values) {
    if (value.name == name) return value;
  }
  return null;
}
