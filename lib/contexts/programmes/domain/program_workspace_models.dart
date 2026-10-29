part of 'program_models.dart';

/// Manager-side workspace models for the organizer program surface. Every
/// class parses only the fields the scoped callable actually returns; the
/// generated contracts remain the source of truth.

/// One row of `listOrganizerPrograms` — includes the lifecycle fields the
/// archive affordance needs (`revision` fences the mutation).
class OrganizerProgramListRow {
  const OrganizerProgramListRow({
    required this.programId,
    required this.title,
    required this.kind,
    required this.status,
    required this.timezone,
    required this.revision,
    this.startsAt,
    this.endsAt,
    this.functionCount,
    this.canArchive = false,
    this.canUnarchive = false,
    this.archivedAt,
    this.anonymizeAt,
    this.anonymizedAt,
  });

  factory OrganizerProgramListRow.fromMap(Map<Object?, Object?> map) {
    final timezone = requiredString(map, 'timezone');
    return OrganizerProgramListRow(
      programId: requiredString(map, 'programId'),
      title: requiredString(map, 'title'),
      kind: requiredString(map, 'kind'),
      status: requiredString(map, 'status'),
      timezone: timezone,
      revision: requiredInt(map, 'revision'),
      canArchive: map['canArchive'] == true,
      canUnarchive: map['canUnarchive'] == true,
      startsAt: programCalendarDateAtInstant(
        requiredDateTime(map, 'startsAtMillis'),
        timezone,
      ),
      endsAt: programCalendarDateAtInstant(
        requiredDateTime(map, 'endsAtMillis'),
        timezone,
      ),
      functionCount: map['functionCount'] is num
          ? (map['functionCount']! as num).toInt()
          : null,
      archivedAt: map['archivedAtMillis'] is num
          ? DateTime.fromMillisecondsSinceEpoch(
              (map['archivedAtMillis']! as num).toInt(),
            )
          : null,
      anonymizeAt: map['anonymizeAtMillis'] is num
          ? DateTime.fromMillisecondsSinceEpoch(
              (map['anonymizeAtMillis']! as num).toInt(),
            )
          : null,
      anonymizedAt: map['anonymizedAtMillis'] is num
          ? DateTime.fromMillisecondsSinceEpoch(
              (map['anonymizedAtMillis']! as num).toInt(),
            )
          : null,
    );
  }

  final String programId;
  final String title;
  final String kind;
  final String status;
  final String timezone;
  final int revision;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final int? functionCount;

  /// Actor-specific authority from the inventory response. Legacy responses
  /// fail closed; organizer membership and a grace deadline grant no authority.
  final bool canArchive;
  final bool canUnarchive;
  final DateTime? archivedAt;
  final DateTime? anonymizeAt;
  final DateTime? anonymizedAt;

  bool get isArchived => status == 'archived';

  bool canUnarchiveAt(DateTime now) =>
      canUnarchive &&
      isArchived &&
      anonymizedAt == null &&
      (anonymizeAt == null || anonymizeAt!.isAfter(now));
}

/// An authorized inventory response handed from creation to Events. The route
/// rechecks account and organizer before rendering it; URL reopen reads the ID.
class OrganizerProgramListAnchor {
  const OrganizerProgramListAnchor({
    required this.accountId,
    required this.organizerId,
    required this.row,
  });
  final String accountId;
  final String organizerId;
  final OrganizerProgramListRow row;
}

class OrganizerProgramInventoryPage {
  const OrganizerProgramInventoryPage({
    required this.programs,
    this.nextCursor,
  });

  factory OrganizerProgramInventoryPage.fromCallableData(Object? value) {
    final map = requiredMap(value, 'program inventory');
    return OrganizerProgramInventoryPage(
      programs: mapList(
        map['programs'],
        'programs',
      ).map(OrganizerProgramListRow.fromMap).toList(growable: false),
      nextCursor: map['nextCursor'] as String?,
    );
  }

  final List<OrganizerProgramListRow> programs;
  final String? nextCursor;
}

class OrganizerProgramSummary {
  const OrganizerProgramSummary({
    required this.programId,
    required this.title,
    required this.kind,
    required this.status,
    required this.revision,
    this.archivedAt,
    this.anonymizeAt,
    this.anonymizedAt,
  });

  final String programId;
  final String title;
  final ProgramKind kind;
  final ProgramStatus status;
  final int revision;
  final DateTime? archivedAt;
  final DateTime? anonymizeAt;
  final DateTime? anonymizedAt;

  bool get isArchived => status == ProgramStatus.archived;

  bool canUnarchiveAt(DateTime now) =>
      isArchived &&
      anonymizedAt == null &&
      (anonymizeAt == null || anonymizeAt!.isAfter(now));
}

class OrganizerProgramSettings {
  const OrganizerProgramSettings({
    required this.programId,
    required this.organizerId,
    required this.kind,
    required this.title,
    required this.timezone,
    required this.status,
    required this.startsAt,
    required this.endsAt,
    required this.capabilities,
    required this.revision,
    this.transportSettings,
  });

  final String programId;
  final String organizerId;
  final ProgramKind kind;
  final String title;
  final String timezone;
  final ProgramStatus status;
  final DateTime startsAt;
  final DateTime endsAt;
  final List<String> capabilities;
  final Map<String, Object?>? transportSettings;
  final int revision;
}

class OrganizerFunctionDetail {
  const OrganizerFunctionDetail({
    required this.functionId,
    required this.name,
    required this.startsAt,
    required this.endsAt,
    required this.venueName,
    required this.status,
    required this.invitationMode,
    required this.checkInEnabled,
    required this.revision,
    this.dressCode,
    this.instructions,
    this.expectedCount,
    this.checkedInCount,
  });

  factory OrganizerFunctionDetail.fromMap(Map<Object?, Object?> map) =>
      OrganizerFunctionDetail(
        functionId: requiredString(map, 'functionId'),
        name: requiredString(map, 'name'),
        startsAt: requiredDateTime(map, 'startsAtMillis'),
        endsAt: requiredDateTime(map, 'endsAtMillis'),
        venueName: requiredString(map, 'venueName'),
        status: ProgramFunctionStatus.values.byName(
          requiredString(map, 'status'),
        ),
        invitationMode: requiredString(map, 'invitationMode'),
        checkInEnabled: map['checkInEnabled'] == true,
        dressCode: map['dressCode'] as String?,
        instructions: map['instructions'] as String?,
        expectedCount: map['expectedCount'] is num
            ? (map['expectedCount']! as num).toInt()
            : null,
        checkedInCount: map['checkedInCount'] is num
            ? (map['checkedInCount']! as num).toInt()
            : null,
        revision: requiredInt(map, 'revision'),
      );

  final String functionId;
  final String name;
  final DateTime startsAt;
  final DateTime endsAt;
  final String venueName;
  final ProgramFunctionStatus status;
  final String invitationMode;
  final bool checkInEnabled;
  final String? dressCode;
  final String? instructions;
  final int? expectedCount;
  final int? checkedInCount;
  final int revision;

  bool get isSelectedGuests => invitationMode == 'selectedGuests';
}

/// `getOrganizerProgram`: settings, functions, resources and counts.
class OrganizerProgramDetail {
  const OrganizerProgramDetail({
    required this.program,
    required this.functions,
    required this.pickupPoints,
    required this.hotels,
    required this.counts,
  });

  factory OrganizerProgramDetail.fromCallableData(Object? value) {
    final map = requiredMap(value, 'organizer program');
    final programMap = requiredMap(map['program'], 'program');
    final countsMap = requiredMap(map['counts'], 'counts');
    return OrganizerProgramDetail(
      program: OrganizerProgramSettings(
        programId: requiredString(programMap, 'programId'),
        organizerId: requiredString(programMap, 'organizerId'),
        kind: ProgramKind.values.byName(requiredString(programMap, 'kind')),
        title: requiredString(programMap, 'title'),
        timezone: requiredString(programMap, 'timezone'),
        status: ProgramStatus.values.byName(
          requiredString(programMap, 'status'),
        ),
        startsAt: requiredDateTime(programMap, 'startsAtMillis'),
        endsAt: requiredDateTime(programMap, 'endsAtMillis'),
        capabilities: stringList(programMap['capabilities']),
        transportSettings:
            programMap['transportSettings'] as Map<String, Object?>?,
        revision: requiredInt(programMap, 'revision'),
      ),
      functions: mapList(
        map['functions'],
        'functions',
      ).map(OrganizerFunctionDetail.fromMap).toList(growable: false),
      pickupPoints: mapList(
        map['pickupPoints'],
        'pickupPoints',
      ).map(ProgramStation.fromMap).toList(growable: false),
      hotels: mapList(
        map['hotels'],
        'hotels',
      ).map(ProgramHotel.fromMap).toList(growable: false),
      counts: countsMap.map(
        (key, value) => MapEntry(key.toString(), (value as num).toInt()),
      ),
    );
  }

  final OrganizerProgramSettings program;
  final List<OrganizerFunctionDetail> functions;
  final List<ProgramStation> pickupPoints;
  final List<ProgramHotel> hotels;
  final Map<String, int> counts;
}

class ProgramGuestRow {
  const ProgramGuestRow({
    required this.guestId,
    required this.displayName,
    required this.groupIds,
    required this.invitationStatus,
    required this.rsvpStatus,
    required this.revision,
    this.householdId,
    this.contactId,
    this.phoneE164,
    this.email,
    this.externalReference,
  });

  factory ProgramGuestRow.fromMap(Map<Object?, Object?> map) => ProgramGuestRow(
    guestId: requiredString(map, 'guestId'),
    displayName: requiredString(map, 'displayName'),
    householdId: map['householdId'] as String?,
    contactId: map['contactId'] as String?,
    phoneE164: map['phoneE164'] as String?,
    email: map['email'] as String?,
    externalReference: map['externalReference'] as String?,
    groupIds: map['groupIds'] == null ? const [] : stringList(map['groupIds']),
    invitationStatus: requiredString(map, 'invitationStatus'),
    rsvpStatus: requiredString(map, 'rsvpStatus'),
    revision: requiredInt(map, 'revision'),
  );

  final String guestId;
  final String displayName;
  final String? householdId;

  /// Optional `organizerContacts` link; the program-scoped inbox uses it to
  /// attribute contact-linked threads to this program's guests.
  final String? contactId;
  final String? phoneE164;
  final String? email;
  final String? externalReference;
  final List<String> groupIds;
  final String invitationStatus;
  final String rsvpStatus;
  final int revision;
}

class ProgramHouseholdRow {
  const ProgramHouseholdRow({
    required this.householdId,
    required this.label,
    required this.memberGuestIds,
    required this.revision,
  });

  factory ProgramHouseholdRow.fromMap(Map<Object?, Object?> map) =>
      ProgramHouseholdRow(
        householdId: requiredString(map, 'householdId'),
        label: requiredString(map, 'label'),
        memberGuestIds: stringList(map['memberGuestIds']),
        revision: requiredInt(map, 'revision'),
      );

  final String householdId;
  final String label;
  final List<String> memberGuestIds;
  final int revision;
}

/// One `programFunctionGuests` join row covering a paged guest. Missing rows
/// mean "implicitly invited, pending" for allGuests functions.
class ProgramFunctionGuestRow {
  const ProgramFunctionGuestRow({
    required this.guestId,
    required this.functionId,
    required this.invited,
    required this.rsvpStatus,
    required this.attendanceStatus,
    this.partySize,
  });

  factory ProgramFunctionGuestRow.fromMap(Map<Object?, Object?> map) =>
      ProgramFunctionGuestRow(
        guestId: requiredString(map, 'guestId'),
        functionId: requiredString(map, 'functionId'),
        invited: map['invited'] == true,
        rsvpStatus: requiredString(map, 'rsvpStatus'),
        attendanceStatus: requiredString(map, 'attendanceStatus'),
        partySize: map['partySize'] is num
            ? (map['partySize']! as num).toInt()
            : null,
      );

  final String guestId;
  final String functionId;
  final bool invited;
  final String rsvpStatus;
  final String attendanceStatus;
  final int? partySize;
}

class ProgramGuestGroupRow {
  const ProgramGuestGroupRow({
    required this.groupId,
    required this.label,
    required this.dimension,
    required this.memberCount,
    required this.revision,
    this.sortOrder,
    this.hotelId,
  });

  factory ProgramGuestGroupRow.fromMap(Map<Object?, Object?> map) =>
      ProgramGuestGroupRow(
        groupId: requiredString(map, 'groupId'),
        label: requiredString(map, 'label'),
        dimension: requiredString(map, 'dimension'),
        memberCount: map['memberCount'] is num
            ? (map['memberCount']! as num).toInt()
            : 0,
        sortOrder: map['sortOrder'] is num
            ? (map['sortOrder']! as num).toInt()
            : null,
        hotelId: map['hotelId'] is String ? map['hotelId']! as String : null,
        revision: requiredInt(map, 'revision'),
      );

  final String groupId;
  final String label;
  final String dimension;
  final int memberCount;
  final int? sortOrder;

  /// `programHotels` link — where this group stays; feeds distance-aware
  /// moment lead times.
  final String? hotelId;
  final int revision;
}

/// `listProgramGuests` page: guests plus the household/function/group joins
/// needed to render the household×function RSVP grid.
class ProgramGuestListPage {
  const ProgramGuestListPage({
    required this.programId,
    required this.guests,
    required this.households,
    required this.functionGuests,
    required this.groups,
    this.nextCursor,
  });

  factory ProgramGuestListPage.fromCallableData(Object? value) {
    final map = requiredMap(value, 'program guest list');
    return ProgramGuestListPage(
      programId: requiredString(map, 'programId'),
      guests: mapList(
        map['guests'],
        'guests',
      ).map(ProgramGuestRow.fromMap).toList(growable: false),
      households: map['households'] == null
          ? const []
          : mapList(
              map['households'],
              'households',
            ).map(ProgramHouseholdRow.fromMap).toList(growable: false),
      functionGuests: map['functionGuests'] == null
          ? const []
          : mapList(
              map['functionGuests'],
              'functionGuests',
            ).map(ProgramFunctionGuestRow.fromMap).toList(growable: false),
      groups: map['groups'] == null
          ? const []
          : mapList(
              map['groups'],
              'groups',
            ).map(ProgramGuestGroupRow.fromMap).toList(growable: false),
      nextCursor: map['nextCursor'] as String?,
    );
  }

  final String programId;
  final List<ProgramGuestRow> guests;
  final List<ProgramHouseholdRow> households;
  final List<ProgramFunctionGuestRow> functionGuests;
  final List<ProgramGuestGroupRow> groups;
  final String? nextCursor;
}

/// Field keys for the manifest import column mapper. Labels are resolved
/// server-side; `groupLabels` accepts a comma/semicolon-separated list.
enum ProgramManifestField {
  displayName,
  phoneE164,
  email,
  externalReference,
  householdLabel,
  groupLabels,
  partyLabel,
  flightNumber,
  originIata,
  destinationIata,
  scheduledArrivalAt,
  passengers,
  luggageUnits,
  pickupPointLabel,
  destinationHotelName,
  destinationLabel,
}

class ProgramManifestImportResult {
  const ProgramManifestImportResult({
    required this.mode,
    required this.totalRows,
    required this.guestsCreated,
    required this.guestsUpdated,
    required this.legsCreated,
    required this.legsUpdated,
    required this.householdsCreated,
    required this.partiesCreated,
    required this.groupsCreated,
    required this.rowErrors,
    required this.alreadyApplied,
  });

  factory ProgramManifestImportResult.fromCallableData(Object? value) {
    final map = requiredMap(value, 'program manifest import');
    return ProgramManifestImportResult(
      mode: requiredString(map, 'mode'),
      totalRows: requiredInt(map, 'totalRows'),
      guestsCreated: requiredInt(map, 'guestsCreated'),
      guestsUpdated: requiredInt(map, 'guestsUpdated'),
      legsCreated: requiredInt(map, 'legsCreated'),
      legsUpdated: requiredInt(map, 'legsUpdated'),
      householdsCreated: requiredInt(map, 'householdsCreated'),
      partiesCreated: requiredInt(map, 'partiesCreated'),
      groupsCreated: requiredInt(map, 'groupsCreated'),
      rowErrors: mapList(map['rowErrors'], 'rowErrors')
          .map(
            (entry) => (
              index: requiredInt(entry, 'index'),
              message: requiredString(entry, 'message'),
            ),
          )
          .toList(growable: false),
      alreadyApplied: map['alreadyApplied'] == true,
    );
  }

  final String mode;
  final int totalRows;
  final int guestsCreated;
  final int guestsUpdated;
  final int legsCreated;
  final int legsUpdated;
  final int householdsCreated;
  final int partiesCreated;
  final int groupsCreated;
  final List<({int index, String message})> rowErrors;
  final bool alreadyApplied;
}
