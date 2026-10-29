/// Domain projections for private wedding/corporate programs and the
/// airport-arrivals transport workspace.
///
/// Every class parses only the fields the scoped callable actually returns;
/// operational projections never carry contact data.
library;

import 'package:catch_dating_app/contexts/programmes/domain/program_calendar.dart';

part 'program_access_models.dart';
part 'program_door_models.dart';
part 'program_workspace_models.dart';
part 'program_attendance_models.dart';
part 'program_room_models.dart';

enum TravelLegReadiness {
  expected,
  ready,
  disrupted,
  dispatched,
  arrived,
  noShow,
}

enum ProgramStayStatus { held, confirmed, checkedIn, checkedOut, cancelled }

enum TravelLegFlightStatus {
  scheduled,
  enroute,
  landed,
  delayed,
  cancelled,
  diverted,
  unknown,
}

enum CurbSource {
  ready,
  manual,
  actualLanding,
  estimatedLanding,
  scheduledLanding,
}

enum TimingUnavailableReason { cancelled, diverted, missingTiming }

class ArrivalsRosterRow {
  const ArrivalsRosterRow({
    required this.legId,
    required this.guestId,
    required this.partyId,
    required this.guestDisplayName,
    required this.partyLabel,
    required this.partyGuestIds,
    required this.passengers,
    required this.luggageUnits,
    required this.flightNumber,
    required this.originIata,
    required this.arrivalTerminal,
    required this.flightStatus,
    required this.curbAt,
    required this.curbSource,
    required this.unavailableReason,
    required this.readiness,
    required this.claimedByDisplay,
    required this.claimedByMe,
    required this.destinationHotelId,
    required this.destinationLabel,
    required this.requiredCapabilities,
    required this.dedicatedVehicle,
    required this.revision,
  });

  factory ArrivalsRosterRow.fromMap(Map<Object?, Object?> map) =>
      ArrivalsRosterRow(
        legId: requiredString(map, 'legId'),
        guestId: requiredString(map, 'guestId'),
        partyId: map['partyId'] as String?,
        guestDisplayName: requiredString(map, 'guestDisplayName'),
        partyLabel: map['partyLabel'] as String?,
        partyGuestIds: stringList(map['partyGuestIds']),
        passengers: requiredInt(map, 'passengers'),
        luggageUnits: requiredInt(map, 'luggageUnits'),
        flightNumber: map['flightNumber'] as String?,
        originIata: map['originIata'] as String?,
        arrivalTerminal: map['arrivalTerminal'] as String?,
        flightStatus: TravelLegFlightStatus.values.byName(
          requiredString(map, 'flightStatus'),
        ),
        curbAt: nullableDateTime(map['curbAtMillis']),
        curbSource: nullableEnum(map['curbSource'], CurbSource.values),
        unavailableReason: nullableEnum(
          map['unavailableReason'],
          TimingUnavailableReason.values,
        ),
        readiness: TravelLegReadiness.values.byName(
          requiredString(map, 'readiness'),
        ),
        claimedByDisplay: map['claimedByDisplay'] as String?,
        claimedByMe: map['claimedByMe'] == true,
        destinationHotelId: map['destinationHotelId'] as String?,
        destinationLabel: requiredString(map, 'destinationLabel'),
        requiredCapabilities: stringList(
          map['requiredCapabilities'],
        ).map(ProgramVehicleCapability.values.byName).toSet(),
        dedicatedVehicle: map['dedicatedVehicle'] == true,
        revision: requiredInt(map, 'revision'),
      );

  final String legId;
  final String guestId;
  final String? partyId;
  final String guestDisplayName;
  final String? partyLabel;
  final List<String> partyGuestIds;
  final int passengers;
  final int luggageUnits;
  final String? flightNumber;
  final String? originIata;
  final String? arrivalTerminal;
  final TravelLegFlightStatus flightStatus;
  final DateTime? curbAt;
  final CurbSource? curbSource;
  final TimingUnavailableReason? unavailableReason;
  final TravelLegReadiness readiness;
  final String? claimedByDisplay;
  final bool claimedByMe;
  final String? destinationHotelId;
  final String destinationLabel;
  final Set<ProgramVehicleCapability> requiredCapabilities;
  final bool dedicatedVehicle;
  final int revision;

  /// The party label shown to staff: explicit label or lead guest name.
  String get partyTitle => partyLabel ?? guestDisplayName;

  bool get needsAttention =>
      readiness == TravelLegReadiness.disrupted || unavailableReason != null;
}

class ProgramArrivalsRoster {
  const ProgramArrivalsRoster({
    required this.programId,
    required this.accessExpiresAt,
    required this.pickupPointId,
    required this.generatedAt,
    required this.rows,
    required this.vehicleClasses,
  });

  factory ProgramArrivalsRoster.fromCallableData(Object? value) {
    final map = requiredMap(value, 'arrivals roster');
    return ProgramArrivalsRoster(
      programId: requiredString(map, 'programId'),
      accessExpiresAt: requiredNullableDateTime(map, 'accessExpiresAtMillis'),
      pickupPointId: map['pickupPointId'] as String?,
      generatedAt: requiredDateTime(map, 'generatedAtMillis'),
      rows: mapList(
        map['rows'],
        'rows',
      ).map(ArrivalsRosterRow.fromMap).toList(growable: false),
      vehicleClasses: mapList(
        map['vehicleClasses'],
        'vehicleClasses',
      ).map(ProgramVehicleClass.fromMap).toList(growable: false),
    );
  }

  final DateTime? accessExpiresAt;
  final String programId;
  final String? pickupPointId;
  final DateTime generatedAt;
  final List<ArrivalsRosterRow> rows;
  final List<ProgramVehicleClass> vehicleClasses;
}

enum TransportGroupReadiness { expected, ready }

enum TransportUnassignedReason { missingTime, noSuitableVehicle, missingScope }

class TransportGroupSuggestion {
  const TransportGroupSuggestion({
    required this.legIds,
    required this.partyIds,
    required this.destinationHotelId,
    required this.destinationLabel,
    required this.readiness,
    required this.vehicleClassId,
    required this.vehicleClassLabel,
    required this.passengers,
    required this.luggageUnits,
    required this.earliestCurbAt,
    required this.latestCurbAt,
    required this.dispatchBy,
    required this.waitOverdue,
  });

  factory TransportGroupSuggestion.fromMap(Map<Object?, Object?> map) =>
      TransportGroupSuggestion(
        legIds: stringList(map['legIds']),
        partyIds: stringList(map['partyIds']),
        destinationHotelId: map['destinationHotelId'] as String?,
        destinationLabel: requiredString(map, 'destinationLabel'),
        readiness: TransportGroupReadiness.values.byName(
          requiredString(map, 'readiness'),
        ),
        vehicleClassId: requiredString(map, 'vehicleClassId'),
        vehicleClassLabel: requiredString(map, 'vehicleClassLabel'),
        passengers: requiredInt(map, 'passengers'),
        luggageUnits: requiredInt(map, 'luggageUnits'),
        earliestCurbAt: requiredDateTime(map, 'earliestCurbAtMillis'),
        latestCurbAt: requiredDateTime(map, 'latestCurbAtMillis'),
        dispatchBy: nullableDateTime(map['dispatchByMillis']),
        waitOverdue: map['waitOverdue'] == true,
      );

  final List<String> legIds;
  final List<String> partyIds;
  final String? destinationHotelId;
  final String destinationLabel;
  final TransportGroupReadiness readiness;
  final String vehicleClassId;
  final String vehicleClassLabel;
  final int passengers;
  final int luggageUnits;
  final DateTime earliestCurbAt;
  final DateTime latestCurbAt;
  final DateTime? dispatchBy;
  final bool waitOverdue;
}

class ProgramTransportPlan {
  const ProgramTransportPlan({
    required this.programId,
    required this.accessExpiresAt,
    required this.pickupPointId,
    required this.generatedAt,
    required this.groups,
    required this.unassigned,
  });

  factory ProgramTransportPlan.fromCallableData(Object? value) {
    final map = requiredMap(value, 'transport plan');
    return ProgramTransportPlan(
      programId: requiredString(map, 'programId'),
      accessExpiresAt: requiredNullableDateTime(map, 'accessExpiresAtMillis'),
      pickupPointId: map['pickupPointId'] as String?,
      generatedAt: requiredDateTime(map, 'generatedAtMillis'),
      groups: mapList(
        map['groups'],
        'groups',
      ).map(TransportGroupSuggestion.fromMap).toList(growable: false),
      unassigned: mapList(map['unassigned'], 'unassigned')
          .map(
            (item) => (
              legId: requiredString(item, 'legId'),
              reason: TransportUnassignedReason.values.byName(
                requiredString(item, 'reason'),
              ),
            ),
          )
          .toList(growable: false),
    );
  }

  final DateTime? accessExpiresAt;
  final String programId;
  final String? pickupPointId;
  final DateTime generatedAt;
  final List<TransportGroupSuggestion> groups;
  final List<({String legId, TransportUnassignedReason reason})> unassigned;
}

enum TransportManifestSource { dispatchSnapshot, currentRecords }

enum TransportTripStatus { enRoute, arrived, cancelled, voided }

class ProgramTripSummary {
  const ProgramTripSummary({
    required this.tripId,
    required this.pickupPointId,
    required this.destinationHotelId,
    required this.destinationLabel,
    required this.vehicleClassId,
    required this.vehicleClassLabel,
    required this.manifestSource,
    required this.plateDisplay,
    required this.vendorId,
    required this.vendorName,
    required this.status,
    required this.passengerCount,
    required this.departedAt,
    required this.arrivedAt,
    required this.estimatedArriveAt,
    required this.voidReason,
    required this.guestNames,
    required this.revision,
  });

  factory ProgramTripSummary.fromTripMap(Map<Object?, Object?> map) =>
      ProgramTripSummary(
        tripId: requiredString(map, 'tripId'),
        pickupPointId: requiredString(map, 'pickupPointId'),
        destinationHotelId: map['destinationHotelId'] as String?,
        destinationLabel: map['destinationLabel'] as String? ?? 'Unassigned',
        vehicleClassId: requiredString(map, 'vehicleClassId'),
        vehicleClassLabel: requiredNullableString(map, 'vehicleClassLabel'),
        manifestSource: TransportManifestSource.values.byName(
          requiredString(map, 'manifestSource'),
        ),
        plateDisplay: requiredString(map, 'plateDisplay'),
        vendorId: map['vendorId'] as String?,
        vendorName: map['vendorName'] as String?,
        status: TransportTripStatus.values.byName(
          requiredString(map, 'status'),
        ),
        passengerCount: requiredInt(map, 'passengerCount'),
        departedAt: requiredDateTime(map, 'departedAtMillis'),
        arrivedAt: nullableDateTime(map['arrivedAtMillis']),
        estimatedArriveAt: nullableDateTime(map['estimatedArriveAtMillis']),
        voidReason: map['voidReason'] as String?,
        guestNames: stringList(map['guestNames']),
        revision: requiredInt(map, 'revision'),
      );

  /// Hotel-inbound rows carry a slightly different shape (no vendorId/kind).
  factory ProgramTripSummary.fromInboundMap(Map<Object?, Object?> map) =>
      ProgramTripSummary(
        tripId: requiredString(map, 'tripId'),
        pickupPointId: '',
        destinationHotelId: null,
        destinationLabel: '',
        vehicleClassId: requiredString(map, 'vehicleClassId'),
        vehicleClassLabel: requiredNullableString(map, 'vehicleClassLabel'),
        manifestSource: TransportManifestSource.values.byName(
          requiredString(map, 'manifestSource'),
        ),
        plateDisplay: requiredString(map, 'plateDisplay'),
        vendorId: null,
        vendorName: map['vendorName'] as String?,
        status: TransportTripStatus.values.byName(
          requiredString(map, 'status'),
        ),
        passengerCount: requiredInt(map, 'passengerCount'),
        departedAt: requiredDateTime(map, 'departedAtMillis'),
        arrivedAt: null,
        estimatedArriveAt: nullableDateTime(map['estimatedArriveAtMillis']),
        voidReason: null,
        guestNames: stringList(map['guestNames']),
        revision: requiredInt(map, 'revision'),
      );

  final String tripId;
  final String pickupPointId;
  final String? destinationHotelId;
  final String destinationLabel;
  final String vehicleClassId;
  final String? vehicleClassLabel;
  final TransportManifestSource manifestSource;
  final String plateDisplay;
  final String? vendorId;
  final String? vendorName;
  final TransportTripStatus status;
  final int passengerCount;
  final DateTime departedAt;
  final DateTime? arrivedAt;
  final DateTime? estimatedArriveAt;
  final String? voidReason;
  final List<String> guestNames;
  final int revision;
}

class ProgramTripList {
  const ProgramTripList({
    required this.programId,
    required this.accessExpiresAt,
    required this.trips,
    required this.nextCursor,
  });

  factory ProgramTripList.fromCallableData(Object? value) {
    final map = requiredMap(value, 'program trips');
    if (!map.containsKey('nextCursor')) {
      throw const FormatException('Missing trip pagination cursor');
    }
    return ProgramTripList(
      programId: requiredString(map, 'programId'),
      nextCursor: map['nextCursor'] == null
          ? null
          : requiredString(map, 'nextCursor'),
      accessExpiresAt: requiredNullableDateTime(map, 'accessExpiresAtMillis'),
      trips: mapList(
        map['trips'],
        'trips',
      ).map(ProgramTripSummary.fromTripMap).toList(growable: false),
    );
  }

  final DateTime? accessExpiresAt;
  final String programId;
  final List<ProgramTripSummary> trips;
  final String? nextCursor;
}

/// One program attention alert — a deduplicated staffAttention moment send
/// from the organizerMomentSends journal, already filtered server-side to the
/// caller's duties.
class ProgramStaffAttentionItem {
  const ProgramStaffAttentionItem({
    required this.itemId,
    required this.runId,
    required this.momentId,
    required this.duty,
    required this.severity,
    required this.title,
    required this.createdAt,
  });

  factory ProgramStaffAttentionItem.fromMap(Map<Object?, Object?> map) =>
      ProgramStaffAttentionItem(
        itemId: requiredString(map, 'itemId'),
        runId: requiredString(map, 'runId'),
        momentId: requiredString(map, 'momentId'),
        duty: requiredString(map, 'duty'),
        severity: requiredString(map, 'severity'),
        title: requiredString(map, 'title'),
        createdAt: requiredDateTime(map, 'createdAtMillis'),
      );

  final String itemId;
  final String runId;
  final String momentId;
  final String duty;
  final String severity;
  final String title;
  final DateTime createdAt;
}

class ProgramStaffAttention {
  const ProgramStaffAttention({
    required this.programId,
    required this.items,
    required this.truncated,
  });

  factory ProgramStaffAttention.fromCallableData(Object? value) {
    final map = requiredMap(value, 'program staff attention');
    return ProgramStaffAttention(
      programId: requiredString(map, 'programId'),
      truncated: map['truncated'] == true,
      items: mapList(
        map['items'],
        'items',
      ).map(ProgramStaffAttentionItem.fromMap).toList(growable: false),
    );
  }

  final String programId;
  final List<ProgramStaffAttentionItem> items;
  final bool truncated;
}

class HotelExpectedLeg {
  const HotelExpectedLeg({
    required this.legId,
    required this.guestDisplayName,
    required this.partyLabel,
    required this.passengers,
    required this.curbAt,
    required this.readiness,
  });

  factory HotelExpectedLeg.fromMap(Map<Object?, Object?> map) =>
      HotelExpectedLeg(
        legId: requiredString(map, 'legId'),
        guestDisplayName: requiredString(map, 'guestDisplayName'),
        partyLabel: map['partyLabel'] as String?,
        passengers: requiredInt(map, 'passengers'),
        curbAt: nullableDateTime(map['curbAtMillis']),
        readiness: TravelLegReadiness.values.byName(
          requiredString(map, 'readiness'),
        ),
      );

  final String legId;
  final String guestDisplayName;
  final String? partyLabel;
  final int passengers;
  final DateTime? curbAt;
  final TravelLegReadiness readiness;
}

class ProgramHotelInbound {
  const ProgramHotelInbound({
    required this.programId,
    required this.accessExpiresAt,
    required this.hotelId,
    required this.hotelName,
    required this.generatedAt,
    required this.trips,
    required this.expectedLegs,
    required this.nextTripCursor,
    required this.nextExpectedCursor,
  });

  factory ProgramHotelInbound.fromCallableData(Object? value) {
    final map = requiredMap(value, 'hotel inbound');
    return ProgramHotelInbound(
      nextTripCursor: requiredNullableString(map, 'nextTripCursor'),
      nextExpectedCursor: requiredNullableString(map, 'nextExpectedCursor'),
      programId: requiredString(map, 'programId'),
      accessExpiresAt: requiredNullableDateTime(map, 'accessExpiresAtMillis'),
      hotelId: requiredString(map, 'hotelId'),
      hotelName: requiredString(map, 'hotelName'),
      generatedAt: requiredDateTime(map, 'generatedAtMillis'),
      trips: mapList(
        map['trips'],
        'trips',
      ).map(ProgramTripSummary.fromInboundMap).toList(growable: false),
      expectedLegs: mapList(
        map['expectedLegs'],
        'expectedLegs',
      ).map(HotelExpectedLeg.fromMap).toList(growable: false),
    );
  }

  final DateTime? accessExpiresAt;
  final String programId;
  final String hotelId;
  final String hotelName;
  final DateTime generatedAt;
  final List<ProgramTripSummary> trips;
  final List<HotelExpectedLeg> expectedLegs;
  final String? nextTripCursor;
  final String? nextExpectedCursor;
}

/// Guest-id exception sets for one function — the lists a
/// reconciliationViewer works through by hand. Guest ids only, no PII.
class ProgramFunctionCounts {
  const ProgramFunctionCounts({
    required this.functionId,
    required this.status,
    required this.invitedCount,
    required this.rsvpPending,
    required this.rsvpAttending,
    required this.rsvpDeclined,
    required this.rsvpMaybe,
    required this.expectedHeads,
    required this.checkedInHeads,
    required this.noShowCount,
  });

  factory ProgramFunctionCounts.fromMap(Map<Object?, Object?> map) =>
      ProgramFunctionCounts(
        functionId: requiredString(map, 'functionId'),
        status: ProgramFunctionStatus.values.byName(
          requiredString(map, 'status'),
        ),
        invitedCount: requiredInt(map, 'invitedCount'),
        rsvpPending: requiredInt(map, 'rsvpPending'),
        rsvpAttending: requiredInt(map, 'rsvpAttending'),
        rsvpDeclined: requiredInt(map, 'rsvpDeclined'),
        rsvpMaybe: requiredInt(map, 'rsvpMaybe'),
        expectedHeads: requiredInt(map, 'expectedHeads'),
        checkedInHeads: requiredInt(map, 'checkedInHeads'),
        noShowCount: requiredInt(map, 'noShowCount'),
      );

  final String functionId;
  final ProgramFunctionStatus status;
  final int invitedCount;
  final int rsvpPending;
  final int rsvpAttending;
  final int rsvpDeclined;
  final int rsvpMaybe;
  final int expectedHeads;
  final int checkedInHeads;
  final int noShowCount;
}

class ProgramHotelOccupancy {
  const ProgramHotelOccupancy({
    required this.hotelId,
    required this.routedGuestCount,
    required this.arrivedGuestCount,
    required this.legCount,
  });

  factory ProgramHotelOccupancy.fromMap(Map<Object?, Object?> map) =>
      ProgramHotelOccupancy(
        hotelId: requiredString(map, 'hotelId'),
        routedGuestCount: requiredInt(map, 'routedGuestCount'),
        arrivedGuestCount: requiredInt(map, 'arrivedGuestCount'),
        legCount: requiredInt(map, 'legCount'),
      );

  final String hotelId;
  final int routedGuestCount;
  final int arrivedGuestCount;
  final int legCount;
}

class ProgramStakeholderCounts {
  const ProgramStakeholderCounts({
    required this.programId,
    required this.serverTime,
    required this.accessExpiresAt,
    required this.guestCount,
    required this.householdCount,
    required this.functions,
    required this.hotels,
  });

  factory ProgramStakeholderCounts.fromCallableData(Object? value) {
    final map = requiredMap(value, 'stakeholder counts');
    return ProgramStakeholderCounts(
      programId: requiredString(map, 'programId'),
      serverTime: requiredDateTime(map, 'serverTimeMillis'),
      accessExpiresAt: requiredNullableDateTime(map, 'accessExpiresAtMillis'),
      guestCount: requiredInt(map, 'guestCount'),
      householdCount: requiredInt(map, 'householdCount'),
      functions: mapList(
        map['functions'],
        'functions',
      ).map(ProgramFunctionCounts.fromMap).toList(growable: false),
      hotels: mapList(
        map['hotels'],
        'hotels',
      ).map(ProgramHotelOccupancy.fromMap).toList(growable: false),
    );
  }

  final String programId;
  final DateTime serverTime;
  final DateTime? accessExpiresAt;
  final int guestCount;
  final int householdCount;
  final List<ProgramFunctionCounts> functions;
  final List<ProgramHotelOccupancy> hotels;
}

class ProgramVendorOption {
  const ProgramVendorOption({
    required this.vendorId,
    required this.name,
    required this.active,
    required this.boundToProgram,
  });

  final String vendorId;
  final String name;
  final bool active;
  final bool boundToProgram;
}

class ProgramMutationResult {
  const ProgramMutationResult({
    required this.entityId,
    required this.revision,
    required this.alreadyApplied,
  });

  factory ProgramMutationResult.fromCallableData(Object? value) {
    final map = requiredMap(value, 'program mutation');
    return ProgramMutationResult(
      entityId: requiredString(map, 'entityId'),
      revision: requiredInt(map, 'revision'),
      alreadyApplied: map['alreadyApplied'] == true,
    );
  }

  final String entityId;
  final int revision;
  final bool alreadyApplied;
}

class DispatchResult {
  const DispatchResult({
    required this.tripId,
    required this.revision,
    required this.alreadyApplied,
    required this.passengerCount,
  });

  factory DispatchResult.fromCallableData(Object? value) {
    final map = requiredMap(value, 'dispatch result');
    return DispatchResult(
      tripId: requiredString(map, 'tripId'),
      revision: requiredInt(map, 'revision'),
      alreadyApplied: map['alreadyApplied'] == true,
      passengerCount: requiredInt(map, 'passengerCount'),
    );
  }

  final String tripId;
  final int revision;
  final bool alreadyApplied;
  final int passengerCount;
}

// ── Parsing helpers (same convention as host_event_staff_repository) ────────

Map<Object?, Object?> requiredMap(Object? value, String label) {
  if (value is Map<Object?, Object?>) return value;
  throw FormatException('Invalid $label.');
}

String requiredString(Map<Object?, Object?> map, String field) {
  final value = map[field];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Invalid $field.');
}

String? requiredNullableString(Map<Object?, Object?> map, String field) {
  if (!map.containsKey(field)) throw FormatException('Missing $field.');
  return map[field] == null ? null : requiredString(map, field);
}

int requiredInt(Map<Object?, Object?> map, String field) {
  return _integer(map[field], field);
}

int _integer(Object? value, String field) {
  // Callable numbers also arrive as doubles on web. Accept exact integers only.
  if (value is num &&
      value.isFinite &&
      value.abs() <= 9007199254740991 &&
      value == value.truncateToDouble()) {
    return value.toInt();
  }
  throw FormatException('Invalid $field.');
}

DateTime requiredDateTime(Map<Object?, Object?> map, String field) =>
    _dateTime(map[field], field);

DateTime _dateTime(Object? value, String field) {
  final millis = _integer(value, field);
  if (millis.abs() > 8640000000000000) {
    throw FormatException('Invalid $field.');
  }
  return DateTime.fromMillisecondsSinceEpoch(millis);
}

DateTime? requiredNullableDateTime(Map<Object?, Object?> map, String field) {
  if (!map.containsKey(field)) throw FormatException('Missing $field.');
  return nullableDateTime(map[field]);
}

DateTime? nullableDateTime(Object? value) {
  if (value == null) return null;
  return _dateTime(value, 'nullable date');
}

T? nullableEnum<T extends Enum>(Object? value, List<T> values) {
  if (value == null) return null;
  if (value is String) {
    for (final entry in values) {
      if (entry.name == value) return entry;
    }
  }
  throw const FormatException('Invalid enum value.');
}

List<String> stringList(Object? value) {
  if (value is List<Object?> && value.every((item) => item is String)) {
    return value.cast<String>();
  }
  throw const FormatException('Invalid string list.');
}

List<Map<Object?, Object?>> mapList(Object? value, String field) {
  if (value is List<Object?>) {
    return value.map((item) => requiredMap(item, field)).toList();
  }
  throw FormatException('Invalid $field.');
}
