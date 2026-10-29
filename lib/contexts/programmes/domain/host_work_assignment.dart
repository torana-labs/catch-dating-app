/// Server-resolved staff assignments for the unified host work shell.
///
/// `listMyHostAssignments` is the authority: it returns the caller's live
/// grants across event and program scopes together with the shell entry the
/// app should render. The client parses destinations and duties into typed
/// values but never derives access locally — every destination re-checks
/// server-side authorization.
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

/// A restricted work-shell destination in canonical bottom-bar order.
enum HostWorkDestination {
  arrivals,
  dispatch,
  inbound,
  rooms,
  nowNext,
  door,
  walkIns,
  attention,
  guests,
  rsvpInbox,
  imports,
  inbox,
  moments,
  trips,
  exceptions,
  export,
  overview,
  team,
}

/// How the per-assignment shell renders: a single focused task, a bottom
/// bar of up to three destinations plus overflow, the program-locked
/// coordinator workspace, or nothing reachable.
enum HostWorkShellMode { task, tabs, programWorkspace, none }

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

/// One staff assignment resolved server-side: the grant's canonical duties
/// plus the derived shell destination set. Only live, unexpired grants are
/// returned unless the caller asks for history.
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
    required this.destinations,
    required this.overflowDestinations,
    required this.shellMode,
    required this.grantExpiresAt,
  });

  factory HostWorkAssignment.fromMap(Map<Object?, Object?> map) =>
      HostWorkAssignment(
        kind: _requiredEnum(
          HostWorkScopeKind.values,
          _requiredString(map, 'kind'),
        ),
        scopeId: _requiredString(map, 'scopeId'),
        organizerId: _requiredString(map, 'organizerId'),
        title: _requiredString(map, 'title'),
        subtitle: map['subtitle'] as String?,
        organizerName: _requiredString(map, 'organizerName'),
        duties: _mapList(
          map['duties'],
          'duties',
        ).map(HostWorkGrantedDuty.fromMap).toList(growable: false),
        destinations: _destinationList(map['destinations'], 'destinations'),
        overflowDestinations: _destinationList(
          map['overflowDestinations'],
          'overflowDestinations',
        ),
        shellMode: _requiredEnum(
          HostWorkShellMode.values,
          _requiredString(map, 'shellMode'),
        ),
        grantExpiresAt: _nullableDateTime(map['grantExpiresAtMillis']),
      );

  final HostWorkScopeKind kind;

  /// The eventId or programId this assignment scopes to.
  final String scopeId;
  final String organizerId;
  final String title;
  final String? subtitle;
  final String organizerName;
  final List<HostWorkGrantedDuty> duties;

  /// Resolved destinations in canonical order; the shell renders the first
  /// three plus an overflow entry.
  final List<HostWorkDestination> destinations;

  /// Destinations beyond the first three, for the overflow menu.
  final List<HostWorkDestination> overflowDestinations;
  final HostWorkShellMode shellMode;
  final DateTime? grantExpiresAt;

  bool get isProgram => kind == HostWorkScopeKind.program;
}

/// The callable response: the caller's assignments and the shell entry they
/// should land in.
@immutable
class HostWorkAssignments {
  const HostWorkAssignments({
    required this.assignments,
    required this.shellEntry,
  });

  factory HostWorkAssignments.fromCallableData(Object? value) {
    final map = _requiredMap(value);
    return HostWorkAssignments(
      assignments: _mapList(
        map['assignments'],
        'assignments',
      ).map(HostWorkAssignment.fromMap).toList(growable: false),
      shellEntry: _requiredEnum(
        HostWorkShellEntry.values,
        _requiredString(map, 'shellEntry'),
      ),
    );
  }

  final List<HostWorkAssignment> assignments;
  final HostWorkShellEntry shellEntry;

  bool get isEmpty => assignments.isEmpty;
}

List<HostWorkDestination> _destinationList(Object? value, String field) {
  return _stringList(value, field)
      .map((name) => _enumByName(HostWorkDestination.values, name))
      .nonNulls
      .toList(growable: false);
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

List<String> _stringList(Object? value, String field) {
  if (value == null) return const [];
  if (value is! List) {
    throw FormatException('Missing host work assignment field "$field".');
  }
  return value.whereType<String>().toList(growable: false);
}

Set<String> _stringSet(Object? value) {
  if (value is! List) return const {};
  return value.whereType<String>().toSet();
}

DateTime? _nullableDateTime(Object? value) {
  if (value == null) return null;
  if (value is! int) {
    throw const FormatException('Invalid host work assignment timestamp.');
  }
  return DateTime.fromMillisecondsSinceEpoch(value, isUtc: true);
}

T? _enumByName<T extends Enum>(List<T> values, String name) {
  for (final value in values) {
    if (value.name == name) return value;
  }
  return null;
}

T _requiredEnum<T extends Enum>(List<T> values, String name) {
  final value = _enumByName(values, name);
  if (value == null) {
    throw FormatException('Unknown host work assignment value "$name".');
  }
  return value;
}
