part of 'program_models.dart';

enum ProgramKind { wedding, corporate, social, other }

enum ProgramStatus { draft, active, completed, archived }

enum ProgramActorRole { manager, staff }

enum ProgramStaffDuty {
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
}

enum ProgramVehicleCapability { wheelchairAccessible, extraLuggage, childSeat }

class ProgramVehicleClass {
  const ProgramVehicleClass({
    required this.id,
    required this.label,
    required this.passengerCapacity,
    required this.luggageCapacity,
    required this.capabilities,
    required this.sortOrder,
  });

  factory ProgramVehicleClass.fromMap(Map<Object?, Object?> map) =>
      ProgramVehicleClass(
        id: requiredString(map, 'id'),
        label: requiredString(map, 'label'),
        passengerCapacity: requiredInt(map, 'passengerCapacity'),
        luggageCapacity: requiredInt(map, 'luggageCapacity'),
        capabilities: stringList(
          map['capabilities'],
        ).map(ProgramVehicleCapability.values.byName).toSet(),
        sortOrder: requiredInt(map, 'sortOrder'),
      );

  final String id;
  final String label;
  final int passengerCapacity;
  final int luggageCapacity;
  final Set<ProgramVehicleCapability> capabilities;
  final int sortOrder;
}

class ProgramDutyAssignment {
  const ProgramDutyAssignment({
    required this.duty,
    required this.pickupPointIds,
    required this.hotelIds,
    required this.functionIds,
    this.expiresAt,
  });

  factory ProgramDutyAssignment.fromMap(Map<Object?, Object?> map) =>
      ProgramDutyAssignment(
        duty: ProgramStaffDuty.values.byName(requiredString(map, 'duty')),
        pickupPointIds: stringList(map['pickupPointIds']).toSet(),
        hotelIds: stringList(map['hotelIds']).toSet(),
        // Absent on legacy grants and non-function duties: unrestricted-ish
        // semantics live on the duty, missing scope parses as empty.
        functionIds: map['functionIds'] == null
            ? const {}
            : stringList(map['functionIds']).toSet(),
        expiresAt: nullableDateTime(map['expiresAtMillis']),
      );

  final ProgramStaffDuty duty;
  final Set<String> pickupPointIds;
  final Set<String> hotelIds;
  final Set<String> functionIds;

  /// Null is an ungranted request scope or a legacy assignment, never authority.
  final DateTime? expiresAt;

  bool isActiveAt(DateTime now) =>
      expiresAt != null &&
      expiresAt!.isAfter(now) &&
      ((duty != ProgramStaffDuty.programCoordinator &&
              duty != ProgramStaffDuty.programAdmin) ||
          (pickupPointIds.isEmpty &&
              hotelIds.isEmpty &&
              functionIds.isEmpty)) &&
      (duty != ProgramStaffDuty.hotelDesk || pickupPointIds.isEmpty) &&
      (functionIds.isEmpty ||
          duty == ProgramStaffDuty.functionCheckIn ||
          duty == ProgramStaffDuty.functionLead);

  bool get coversAllStations => pickupPointIds.isEmpty;
  bool get coversAllHotels => hotelIds.isEmpty;
  bool get coversAllFunctions => functionIds.isEmpty;
  bool coversPickupPoint(String id) =>
      pickupPointIds.isEmpty || pickupPointIds.contains(id);
  bool coversHotel(String id) => hotelIds.isEmpty || hotelIds.contains(id);
  bool coversFunction(String id) =>
      functionIds.isEmpty || functionIds.contains(id);
}

class ProgramStation {
  const ProgramStation({
    required this.pickupPointId,
    required this.label,
    required this.kind,
    this.iataCode,
    this.terminal,
    this.meetingZone,
    this.instructions,
    this.active,
    this.revision,
  });

  factory ProgramStation.fromMap(Map<Object?, Object?> map) => ProgramStation(
    pickupPointId: requiredString(map, 'pickupPointId'),
    label: requiredString(map, 'label'),
    kind: requiredString(map, 'kind'),
    iataCode: map['iataCode'] as String?,
    terminal: map['terminal'] as String?,
    meetingZone: map['meetingZone'] as String?,
    instructions: map['instructions'] as String?,
    active: map['active'] as bool?,
    revision: map['revision'] as int?,
  );

  final String pickupPointId;
  final String label;
  final String kind;
  final String? iataCode;
  final String? terminal;
  final String? meetingZone;
  final String? instructions;
  final bool? active;
  final int? revision;
}

class ProgramHotel {
  const ProgramHotel({
    required this.hotelId,
    required this.name,
    this.address,
    this.receptionContact,
    this.active,
    this.revision,
  });

  factory ProgramHotel.fromMap(Map<Object?, Object?> map) => ProgramHotel(
    hotelId: requiredString(map, 'hotelId'),
    name: requiredString(map, 'name'),
    address: map['address'] as String?,
    receptionContact: map['receptionContact'] as String?,
    active: map['active'] as bool?,
    revision: map['revision'] as int?,
  );

  final String hotelId;
  final String name;
  final String? address;
  final String? receptionContact;
  final bool? active;
  final int? revision;
}

enum ProgramFunctionStatus { scheduled, completed, cancelled }

class ProgramFunction {
  const ProgramFunction({
    required this.functionId,
    required this.name,
    this.venueName,
    required this.startsAt,
    required this.endsAt,
    required this.checkInEnabled,
    required this.status,
    required this.expectedCount,
    required this.checkedInCount,
  });

  factory ProgramFunction.fromMap(Map<Object?, Object?> map) => ProgramFunction(
    functionId: requiredString(map, 'functionId'),
    name: requiredString(map, 'name'),
    venueName: map['venueName'] as String?,
    startsAt: requiredDateTime(map, 'startsAtMillis'),
    endsAt: requiredDateTime(map, 'endsAtMillis'),
    checkInEnabled: map['checkInEnabled'] == true,
    status: ProgramFunctionStatus.values.byName(requiredString(map, 'status')),
    expectedCount: requiredInt(map, 'expectedCount'),
    checkedInCount: requiredInt(map, 'checkedInCount'),
  );

  final String functionId;
  final String name;
  final String? venueName;
  final DateTime startsAt;
  final DateTime endsAt;
  final bool checkInEnabled;
  final ProgramFunctionStatus status;
  final int expectedCount;
  final int checkedInCount;
}

class ProgramWorkAccess {
  const ProgramWorkAccess({
    required this.programId,
    required this.organizerId,
    required this.title,
    required this.kind,
    required this.timezone,
    required this.status,
    required this.actorRole,
    required this.duties,
    required this.grantExpiresAt,
    required this.capabilities,
    required this.pickupPoints,
    required this.hotels,
    required this.functions,
    required this.vehicleClasses,
  });

  factory ProgramWorkAccess.fromCallableData(Object? value) {
    final map = requiredMap(value, 'program work access');
    return ProgramWorkAccess(
      programId: requiredString(map, 'programId'),
      organizerId: requiredString(map, 'organizerId'),
      title: requiredString(map, 'title'),
      kind: ProgramKind.values.byName(requiredString(map, 'kind')),
      timezone: requiredString(map, 'timezone'),
      status: ProgramStatus.values.byName(requiredString(map, 'status')),
      actorRole: ProgramActorRole.values.byName(
        requiredString(map, 'actorRole'),
      ),
      duties: mapList(
        map['duties'],
        'duties',
      ).map(ProgramDutyAssignment.fromMap).toList(growable: false),
      grantExpiresAt: nullableDateTime(map['grantExpiresAtMillis']),
      capabilities: stringList(map['capabilities']).toSet(),
      pickupPoints: mapList(
        map['pickupPoints'],
        'pickupPoints',
      ).map(ProgramStation.fromMap).toList(growable: false),
      hotels: mapList(
        map['hotels'],
        'hotels',
      ).map(ProgramHotel.fromMap).toList(growable: false),
      functions: mapList(
        map['functions'],
        'functions',
      ).map(ProgramFunction.fromMap).toList(growable: false),
      vehicleClasses: mapList(
        map['vehicleClasses'],
        'vehicleClasses',
      ).map(ProgramVehicleClass.fromMap).toList(growable: false),
    );
  }

  final String programId;
  final String organizerId;
  final String title;
  final ProgramKind kind;
  final String timezone;
  final ProgramStatus status;
  final ProgramActorRole actorRole;
  final List<ProgramDutyAssignment> duties;
  final DateTime? grantExpiresAt;
  final Set<String> capabilities;
  final List<ProgramStation> pickupPoints;
  final List<ProgramHotel> hotels;
  final List<ProgramFunction> functions;
  final List<ProgramVehicleClass> vehicleClasses;

  bool get isManager => actorRole == ProgramActorRole.manager;

  /// Next point at which the visible work choices must be recalculated.
  DateTime? nextAccessChangeAt(DateTime now) {
    if (isManager) return null;
    var deadline = grantExpiresAt ?? DateTime.fromMillisecondsSinceEpoch(0);
    for (final duty in activeDutiesAt(now)) {
      if (duty.expiresAt!.isBefore(deadline)) deadline = duty.expiresAt!;
    }
    return deadline;
  }

  Iterable<ProgramDutyAssignment> activeDutiesAt(DateTime now) =>
      grantExpiresAt == null || !grantExpiresAt!.isAfter(now)
      ? const []
      : duties.where(
          (assignment) =>
              assignment.isActiveAt(now) &&
              !assignment.expiresAt!.isAfter(grantExpiresAt!),
        );

  bool _matchesDuty(ProgramDutyAssignment assignment, ProgramStaffDuty duty) =>
      assignment.duty == duty ||
      (duty != ProgramStaffDuty.programAdmin &&
          assignment.duty == ProgramStaffDuty.programCoordinator);

  bool hasDuty(ProgramStaffDuty duty, {required DateTime now}) =>
      isManager || activeDutiesAt(now).any((a) => _matchesDuty(a, duty));

  /// Stations this actor may open; empty scope on a duty means all.
  Set<String>? stationScope(ProgramStaffDuty duty, {required DateTime now}) {
    if (isManager) return null;
    final scoped = <String>{};
    for (final a in activeDutiesAt(now)) {
      if (!_matchesDuty(a, duty)) {
        continue;
      }
      if (a.pickupPointIds.isEmpty) return null;
      scoped.addAll(a.pickupPointIds);
    }
    return scoped;
  }

  Set<String>? hotelScope(ProgramStaffDuty duty, {required DateTime now}) {
    if (isManager) return null;
    final scoped = <String>{};
    for (final a in activeDutiesAt(now)) {
      if (!_matchesDuty(a, duty)) {
        continue;
      }
      if (a.hotelIds.isEmpty) return null;
      scoped.addAll(a.hotelIds);
    }
    return scoped;
  }

  /// Functions this actor may open; empty scope on a duty means all.
  Set<String>? functionScope(ProgramStaffDuty duty, {required DateTime now}) {
    if (isManager) return null;
    final scoped = <String>{};
    for (final a in activeDutiesAt(now)) {
      if (!_matchesDuty(a, duty)) {
        continue;
      }
      if (a.functionIds.isEmpty) return null;
      scoped.addAll(a.functionIds);
    }
    return scoped;
  }
}

enum ProgramStaffStatus { active, expired, revoked, approvalRequired }

class ProgramStaffMember {
  const ProgramStaffMember({
    required this.uid,
    required this.displayName,
    required this.phoneLastFour,
    required this.duties,
    required this.status,
    required this.expiresAt,
    required this.revision,
  });

  factory ProgramStaffMember.fromMap(Map<Object?, Object?> map) =>
      ProgramStaffMember(
        uid: requiredString(map, 'uid'),
        displayName: requiredString(map, 'displayName'),
        phoneLastFour: requiredString(map, 'phoneLastFour'),
        duties: mapList(
          map['duties'],
          'duties',
        ).map(ProgramDutyAssignment.fromMap).toList(growable: false),
        status: ProgramStaffStatus.values.byName(requiredString(map, 'status')),
        expiresAt: requiredDateTime(map, 'expiresAtMillis'),
        revision: requiredInt(map, 'revision'),
      );

  final String uid;
  final String displayName;
  final String phoneLastFour;
  final List<ProgramDutyAssignment> duties;
  final ProgramStaffStatus status;
  final DateTime expiresAt;
  final int revision;
}

class ProgramStaffList {
  const ProgramStaffList({
    required this.programId,
    required this.members,
    required this.nextCursor,
  });

  factory ProgramStaffList.fromCallableData(Object? value) {
    final map = requiredMap(value, 'program staff list');
    return ProgramStaffList(
      nextCursor: requiredNullableString(map, 'nextCursor'),
      programId: requiredString(map, 'programId'),
      members: mapList(
        map['members'],
        'members',
      ).map(ProgramStaffMember.fromMap).toList(growable: false),
    );
  }

  final String programId;
  final List<ProgramStaffMember> members;
  final String? nextCursor;
}
