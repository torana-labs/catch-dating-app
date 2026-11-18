import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// Why a programme screen may not show data for the signed-in account.
enum ProgramAccessDenial {
  /// No access view exists: never granted, or the grant was removed.
  notGranted,

  /// The view is marked inactive: revoked, or never approved by the owner.
  revoked,

  /// Every duty has ended, or the grant has.
  expired,

  /// The owner's approval has not begun yet.
  notYetActive,
}

/// One account's authority over one programme, as the trigger-kept
/// `programAccessViews/{programId__uid}` document states it. Every expiry is
/// an exclusive instant already bounded by the grant and the owner's
/// approval, so liveness is a comparison with the clock and nothing else.
/// This mirrors the server's `requireProgramAccess`; rules apply the same
/// instants online, and the phone applies them itself offline.
class ProgramAccessView {
  const ProgramAccessView({
    required this.programId,
    required this.uid,
    required this.role,
    required this.isActive,
    required this.activeFrom,
    required this.expiresAt,
    required this.revision,
    this.assignments = const [],
    this.grantExpiresAt,
    this.duties = const {},
    this.pickupAll = const {},
    this.pickupScoped = const {},
    this.hotelAll = const {},
    this.hotelScoped = const {},
    this.functionAll = const {},
    this.functionScoped = const {},
    this.workPickup = const {},
    this.workHotel = const {},
    this.workFunction = const {},
  });

  factory ProgramAccessView.fromMap(Map<Object?, Object?> map) {
    Map<String, DateTime> instants(String field) {
      final raw = map[field];
      if (raw is! Map) {
        throw FormatException('Program access view has no $field map.');
      }
      return {
        for (final entry in raw.entries)
          entry.key! as String: DateTime.fromMillisecondsSinceEpoch(
            requiredInt({'instant': entry.value}, 'instant'),
          ),
      };
    }

    final role = requiredString(map, 'role');
    return ProgramAccessView(
      programId: requiredString(map, 'programId'),
      uid: requiredString(map, 'uid'),
      role: ProgramActorRole.values.byName(role),
      isActive: requiredString(map, 'status') == 'active',
      activeFrom: DateTime.fromMillisecondsSinceEpoch(
        requiredInt(map, 'activeFromMillis'),
      ),
      expiresAt: nullableDateTime(map['expiresAtMillis']),
      revision: requiredInt(map, 'revision'),
      assignments: mapList(
        map['assignments'],
        'assignments',
      ).map(ProgramDutyAssignment.fromMap).toList(growable: false),
      grantExpiresAt: nullableDateTime(map['grantExpiresAtMillis']),
      duties: instants('duties'),
      pickupAll: instants('pickupAll'),
      pickupScoped: instants('pickupScoped'),
      hotelAll: instants('hotelAll'),
      hotelScoped: instants('hotelScoped'),
      functionAll: instants('functionAll'),
      functionScoped: instants('functionScoped'),
      workPickup: instants('workPickup'),
      workHotel: instants('workHotel'),
      workFunction: instants('workFunction'),
    );
  }

  /// The work map key standing for every pickup point, hotel or function.
  static const allKey = '*';

  final String programId;
  final String uid;
  final ProgramActorRole role;
  final bool isActive;
  final DateTime activeFrom;

  /// Exclusive end of the last live duty; null for the programme owner.
  final DateTime? expiresAt;

  /// The grant's revision; 0 for the owner.
  final int revision;

  /// The live duty tuples with their scopes and own expiries, as the
  /// work-access callable returned them; empty for the owner.
  final List<ProgramDutyAssignment> assignments;

  /// The grant's own expiry; null for the owner.
  final DateTime? grantExpiresAt;

  final Map<String, DateTime> duties;
  final Map<String, DateTime> pickupAll;
  final Map<String, DateTime> pickupScoped;
  final Map<String, DateTime> hotelAll;
  final Map<String, DateTime> hotelScoped;
  final Map<String, DateTime> functionAll;
  final Map<String, DateTime> functionScoped;
  final Map<String, DateTime> workPickup;
  final Map<String, DateTime> workHotel;
  final Map<String, DateTime> workFunction;

  bool get isManager => role == ProgramActorRole.manager;

  /// Identifies which resources the work lists reach, ignoring when they
  /// expire, so a data listener scoped to them reopens only when the set
  /// changes.
  String get workScopeKey => [
    isManager ? 'manager' : 'staff',
    for (final map in [workPickup, workHotel, workFunction])
      ([...map.keys]..sort()).join(','),
  ].join('|');

  /// Null when the account holds authority at [now], otherwise the reason.
  ProgramAccessDenial? denialAt(DateTime now) {
    if (!isActive) return ProgramAccessDenial.revoked;
    if (activeFrom.isAfter(now)) return ProgramAccessDenial.notYetActive;
    final end = expiresAt;
    if (end != null && !end.isAfter(now)) return ProgramAccessDenial.expired;
    return null;
  }

  bool isLiveAt(DateTime now) => denialAt(now) == null;

  bool _live(DateTime? until, DateTime now) =>
      until != null && until.isAfter(now);

  bool holdsDuty(ProgramStaffDuty duty, DateTime now) =>
      isLiveAt(now) && (isManager || _live(duties[duty.name], now));

  bool coversPickup(ProgramStaffDuty duty, String id, DateTime now) =>
      isLiveAt(now) &&
      (isManager ||
          _live(pickupAll[duty.name], now) ||
          _live(pickupScoped['${duty.name}__$id'], now));

  bool coversHotel(ProgramStaffDuty duty, String id, DateTime now) =>
      isLiveAt(now) &&
      (isManager ||
          _live(hotelAll[duty.name], now) ||
          _live(hotelScoped['${duty.name}__$id'], now));

  bool coversFunction(ProgramStaffDuty duty, String id, DateTime now) =>
      isLiveAt(now) &&
      (isManager ||
          _live(functionAll[duty.name], now) ||
          _live(functionScoped['${duty.name}__$id'], now));

  /// Whether the work shell lists this pickup point, hotel or function.
  bool listsPickup(String id, DateTime now) =>
      isLiveAt(now) &&
      (isManager ||
          _live(workPickup[allKey], now) ||
          _live(workPickup[id], now));

  bool listsHotel(String id, DateTime now) =>
      isLiveAt(now) &&
      (isManager || _live(workHotel[allKey], now) || _live(workHotel[id], now));

  bool listsFunction(String id, DateTime now) =>
      isLiveAt(now) &&
      (isManager ||
          _live(workFunction[allKey], now) ||
          _live(workFunction[id], now));

  Iterable<MapEntry<String, DateTime>> get _instantEntries sync* {
    for (final map in [
      duties,
      pickupAll,
      pickupScoped,
      hotelAll,
      hotelScoped,
      functionAll,
      functionScoped,
      workPickup,
      workHotel,
      workFunction,
    ]) {
      yield* map.entries;
    }
  }

  /// The grants that are live at [now], as stable keys. Two instants of the
  /// same view give a narrower authority exactly when keys disappear, so
  /// this is what the narrowing check compares.
  Set<String> liveKeys(DateTime now) {
    if (!isLiveAt(now)) return const {};
    if (isManager) return const {'manager'};
    return {
      for (final map in {
        'duty': duties,
        'pickupAll': pickupAll,
        'pickup': pickupScoped,
        'hotelAll': hotelAll,
        'hotel': hotelScoped,
        'functionAll': functionAll,
        'function': functionScoped,
        'workPickup': workPickup,
        'workHotel': workHotel,
        'workFunction': workFunction,
      }.entries)
        for (final entry in map.value.entries)
          if (entry.value.isAfter(now)) '${map.key}:${entry.key}',
    };
  }

  /// The next instant after [now] at which live authority changes by time
  /// alone: an approval beginning or an expiry. Null when none is pending.
  DateTime? nextChangeAfter(DateTime now) {
    DateTime? next;
    void consider(DateTime? instant) {
      if (instant == null || !instant.isAfter(now)) return;
      if (next == null || instant.isBefore(next!)) next = instant;
    }

    consider(activeFrom);
    consider(expiresAt);
    // The owner holds every duty with no end; the maps cannot change that.
    if (!isManager) {
      for (final entry in _instantEntries) {
        consider(entry.value);
      }
    }
    return next;
  }
}

/// A view of the signed-in account's authority at one instant, with the
/// epoch that tells captured rows apart. The epoch rises whenever authority
/// narrows (a duty or scope disappears, by revocation, a rewrite or the
/// clock) and never when it only widens, so rows captured under an older
/// epoch are hidden until a fresh read shows them again.
class ProgramAccessState {
  const ProgramAccessState({
    required this.programId,
    required this.view,
    required this.epoch,
    required this.evaluatedAt,
    required this.liveKeys,
    required this.denial,
  });

  final String programId;

  /// Null when no view exists.
  final ProgramAccessView? view;
  final int epoch;
  final DateTime evaluatedAt;
  final Set<String> liveKeys;

  /// Null while the account holds authority.
  final ProgramAccessDenial? denial;

  bool get isLive => denial == null;
}

/// Evaluates successive views of one programme against the clock, counting
/// the epoch. One tracker serves one subscription; it is not shared.
class ProgramAccessTracker {
  ProgramAccessTracker(this.programId);

  final String programId;
  var _epoch = 0;
  Set<String> _lastKeys = const {};

  ProgramAccessState evaluate(ProgramAccessView? view, DateTime now) {
    final keys = view?.liveKeys(now) ?? const <String>{};
    if (!keys.containsAll(_lastKeys)) _epoch++;
    _lastKeys = keys;
    return ProgramAccessState(
      programId: programId,
      view: view,
      epoch: _epoch,
      evaluatedAt: now,
      liveKeys: keys,
      denial: view == null
          ? ProgramAccessDenial.notGranted
          : view.denialAt(now),
    );
  }
}
