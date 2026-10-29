import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_setup_repository.g.dart';

/// Manager-facing program surface: program CRUD, staff grants and the
/// manifest/resources used by the arrivals workspace.
class ProgramSetupRepository {
  const ProgramSetupRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<List<OrganizerProgramListRow>> listPrograms(String organizerId) =>
      _call(
        name: 'listOrganizerPrograms',
        payload: ListOrganizerProgramsCallableRequest(
          organizerId: organizerId,
        ).toJson(),
        action: 'load your programs',
        parse: (value) {
          final map = requiredMap(value, 'organizer programs');
          return mapList(
            map['programs'],
            'programs',
          ).map(OrganizerProgramListRow.fromMap).toList(growable: false);
        },
      );

  /// `archiveProgram`: starts the 14-day anonymization grace window; the
  /// program keeps reading but every mutation surface rejects writes.
  Future<ProgramMutationResult> archiveProgram({
    required String programId,
    required int expectedRevision,
  }) => _call(
    name: 'archiveProgram',
    payload: ArchiveProgramCallableRequest(
      programId: programId,
      expectedRevision: expectedRevision,
    ).toJson(),
    action: 'archive the program',
    parse: ProgramMutationResult.fromCallableData,
  );

  /// `unarchiveProgram`: restores the pre-archive status while the grace
  /// window is still open.
  Future<ProgramMutationResult> unarchiveProgram({
    required String programId,
    required int expectedRevision,
  }) => _call(
    name: 'unarchiveProgram',
    payload: UnarchiveProgramCallableRequest(
      programId: programId,
      expectedRevision: expectedRevision,
    ).toJson(),
    action: 'unarchive the program',
    parse: ProgramMutationResult.fromCallableData,
  );

  /// `issueProgramHouseholdRsvpLink`: mints the guest-facing token; the
  /// client composes `${publicSiteUrl}/rsvp/<token>` for sharing.
  Future<({String token, DateTime expiresAt})> issueHouseholdRsvpLink({
    required String programId,
    required String householdId,
  }) => _call(
    name: 'issueProgramHouseholdRsvpLink',
    payload: IssueProgramHouseholdRsvpLinkCallableRequest(
      programId: programId,
      householdId: householdId,
    ).toJson(),
    action: 'create the RSVP link',
    parse: (value) {
      final map = requiredMap(value, 'household RSVP link');
      return (
        token: requiredString(map, 'token'),
        expiresAt: requiredDateTime(map, 'expiresAtMillis'),
      );
    },
  );

  Future<ProgramMutationResult> createProgram({
    required String organizerId,
    required String kind,
    required String title,
    required String timezone,
    required DateTime startsAt,
    required DateTime endsAt,
    List<String> capabilities = const ['arrivalsTransport'],
    Map<String, Object?>? transportSettings,
  }) => _call(
    name: 'createOrganizerProgram',
    payload: CreateOrganizerProgramCallableRequest(
      organizerId: organizerId,
      kind: kind,
      title: title,
      timezone: timezone,
      startsAtMillis: startsAt.millisecondsSinceEpoch,
      endsAtMillis: endsAt.millisecondsSinceEpoch,
      capabilities: capabilities,
      transportSettings: transportSettings,
    ).toJson(),
    action: 'create the program',
    parse: ProgramMutationResult.fromCallableData,
  );

  Future<ProgramMutationResult> updateProgramSettings({
    required String programId,
    required int expectedRevision,
    String? title,
    String? status,
    Map<String, Object?>? transportSettings,
  }) => _call(
    name: 'updateOrganizerProgram',
    payload: UpdateOrganizerProgramCallableRequest(
      programId: programId,
      expectedRevision: expectedRevision,
      title: title,
      status: status,
      transportSettings: transportSettings,
    ).toJson(),
    action: 'update the program',
    parse: ProgramMutationResult.fromCallableData,
  );

  Future<ProgramStaffList> listStaff(String programId, {String? cursor}) =>
      _call(
        name: 'listProgramStaff',
        payload: ListProgramStaffCallableRequest(
          programId: programId,
          cursor: cursor,
        ).toJson(),
        action: 'load program staff',
        parse: ProgramStaffList.fromCallableData,
      );

  /// Grants are keyed by verified phone number; the callable resolves the
  /// phone to a UID and writes one grant per staff member.
  Future<ProgramMutationResult> grantStaff({
    required String programId,
    required String phoneNumber,
    required List<ProgramDutyAssignment> duties,
    required DateTime expiresAt,
  }) => _call(
    name: 'grantProgramStaff',
    payload: GrantProgramStaffCallableRequest(
      programId: programId,
      phoneNumber: phoneNumber,
      duties: duties
          .map(
            (duty) => {
              'duty': duty.duty.name,
              'pickupPointIds': duty.pickupPointIds.toList()..sort(),
              'hotelIds': duty.hotelIds.toList()..sort(),
            },
          )
          .toList(growable: false),
      expiresAtMillis: expiresAt.millisecondsSinceEpoch,
    ).toJson(),
    action: 'grant program staff access',
    parse: ProgramMutationResult.fromCallableData,
  );

  /// Invites bind a phone number to duties before the staff member has an
  /// account; claim-by-verified-phone materializes the grant.
  Future<ProgramMutationResult> inviteStaff({
    required String programId,
    required String phoneNumber,
    required String displayName,
    required List<ProgramDutyAssignment> duties,
    required DateTime expiresAt,
  }) => _call(
    name: 'inviteProgramStaff',
    payload: InviteProgramStaffCallableRequest(
      programId: programId,
      phoneNumber: phoneNumber,
      displayName: displayName,
      duties: duties
          .map(
            (duty) => {
              'duty': duty.duty.name,
              'pickupPointIds': duty.pickupPointIds.toList()..sort(),
              'hotelIds': duty.hotelIds.toList()..sort(),
            },
          )
          .toList(growable: false),
      expiresAtMillis: expiresAt.millisecondsSinceEpoch,
    ).toJson(),
    action: 'invite program staff',
    parse: ProgramMutationResult.fromCallableData,
  );

  Future<ProgramMutationResult> revokeStaffInvite({
    required String programId,
    required String inviteId,
  }) => _call(
    name: 'revokeProgramStaffInvite',
    payload: RevokeProgramStaffInviteCallableRequest(
      programId: programId,
      inviteId: inviteId,
    ).toJson(),
    action: 'revoke the staff invite',
    parse: ProgramMutationResult.fromCallableData,
  );

  Future<ProgramMutationResult> revokeStaff({
    required String programId,
    required ProgramStaffMember member,
  }) => _call(
    name: 'revokeProgramStaff',
    payload: RevokeProgramStaffCallableRequest(
      programId: programId,
      uid: member.uid,
      expectedRevision: member.revision,
    ).toJson(),
    action: 'revoke program staff access',
    parse: ProgramMutationResult.fromCallableData,
  );

  /// `getOrganizerProgram`: program settings, functions, pickup points,
  /// hotels and rollup counts for the manager workspace.
  Future<OrganizerProgramDetail> getProgram(String programId) => _call(
    name: 'getOrganizerProgram',
    payload: ProgramIdCallableRequest(programId: programId).toJson(),
    action: 'load the program',
    parse: OrganizerProgramDetail.fromCallableData,
  );

  /// `listProgramGuests`: one page of guests plus the household, function and
  /// group projections the RSVP grid renders.
  Future<ProgramGuestListPage> listGuests(
    String programId, {
    int? limit,
    String? cursor,
  }) => _call(
    name: 'listProgramGuests',
    payload: ListProgramGuestsCallableRequest(
      programId: programId,
      limit: limit,
      cursor: cursor,
    ).toJson(),
    action: 'load program guests',
    parse: ProgramGuestListPage.fromCallableData,
  );

  Future<ProgramMutationResult> upsertFunction({
    required String programId,
    required String name,
    required DateTime startsAt,
    required DateTime endsAt,
    required String venueName,
    String? functionId,
    int? expectedRevision,
    String? venueNotes,
    String? status,
  }) => _call(
    name: 'upsertProgramFunction',
    payload: UpsertProgramFunctionCallableRequest(
      programId: programId,
      functionId: functionId,
      expectedRevision: expectedRevision,
      name: name,
      startsAtMillis: startsAt.millisecondsSinceEpoch,
      endsAtMillis: endsAt.millisecondsSinceEpoch,
      venueName: venueName,
      venueNotes: venueNotes,
      status: status,
    ).toJson(),
    action: 'save the function',
    parse: ProgramMutationResult.fromCallableData,
  );

  /// Applies the function invitation mode; `selectedGuestIds` only matters
  /// when the mode is `selectedGuests`.
  Future<ProgramMutationResult> applyFunctionInvitations({
    required String programId,
    required String functionId,
    required String invitationMode,
    required int expectedRevision,
    List<String>? selectedGuestIds,
  }) => _call(
    name: 'applyProgramFunctionInvitations',
    payload: ApplyProgramFunctionInvitationsCallableRequest(
      programId: programId,
      functionId: functionId,
      invitationMode: invitationMode,
      selectedGuestIds: selectedGuestIds,
      expectedRevision: expectedRevision,
    ).toJson(),
    action: 'update invitations',
    parse: ProgramMutationResult.fromCallableData,
  );

  /// Organizer-side RSVP correction on the household×function grid.
  Future<ProgramMutationResult> recordFunctionRsvp({
    required String programId,
    required String functionId,
    required String guestId,
    required String rsvpStatus,
    int? partySize,
    String? responseNote,
    bool allowUninvited = false,
  }) => _call(
    name: 'recordProgramFunctionRsvp',
    payload: RecordProgramFunctionRsvpCallableRequest(
      programId: programId,
      functionId: functionId,
      guestId: guestId,
      rsvpStatus: rsvpStatus,
      partySize: partySize,
      responseNote: responseNote,
      allowUninvited: allowUninvited,
    ).toJson(),
    action: 'record the RSVP',
    parse: ProgramMutationResult.fromCallableData,
  );

  Future<ProgramMutationResult> upsertHousehold({
    required String programId,
    required String label,
    required String primaryContactName,
    required List<String> memberGuestIds,
    String? householdId,
    int? expectedRevision,
    String? primaryPhoneE164,
    String? primaryEmail,
    String? deliveryPreference,
  }) => _call(
    name: 'upsertProgramHousehold',
    payload: UpsertProgramHouseholdCallableRequest(
      programId: programId,
      householdId: householdId,
      expectedRevision: expectedRevision,
      label: label,
      primaryContactName: primaryContactName,
      primaryPhoneE164: primaryPhoneE164,
      primaryEmail: primaryEmail,
      memberGuestIds: memberGuestIds,
      deliveryPreference: deliveryPreference,
    ).toJson(),
    action: 'save the household',
    parse: ProgramMutationResult.fromCallableData,
  );

  /// `hotelId` pins the group to a `programHotels` doc (feeds
  /// distance-aware moment lead times). Omitted preserves the link; pass
  /// `clearHotel: true` to send the explicit null that clears it — the
  /// generated request's null-aware `toJson` cannot emit it otherwise.
  Future<ProgramMutationResult> upsertGuestGroup({
    required String programId,
    required String label,
    required String dimension,
    String? groupId,
    int? expectedRevision,
    int? sortOrder,
    String? hotelId,
    bool clearHotel = false,
  }) {
    final payload = UpsertProgramGuestGroupCallableRequest(
      programId: programId,
      groupId: groupId,
      expectedRevision: expectedRevision,
      label: label,
      dimension: dimension,
      sortOrder: sortOrder,
      hotelId: hotelId,
    ).toJson();
    if (clearHotel) {
      payload['hotelId'] = null;
    }
    return _call(
      name: 'upsertProgramGuestGroup',
      payload: payload,
      action: 'save the group',
      parse: ProgramMutationResult.fromCallableData,
    );
  }

  Future<ProgramMutationResult> deleteGuestGroup({
    required String programId,
    required String groupId,
    required int expectedRevision,
  }) => _call(
    name: 'deleteProgramGuestGroup',
    payload: DeleteProgramGuestGroupCallableRequest(
      programId: programId,
      groupId: groupId,
      expectedRevision: expectedRevision,
    ).toJson(),
    action: 'delete the group',
    parse: ProgramMutationResult.fromCallableData,
  );

  /// `importProgramManifest`: `preview` returns counts and row errors without
  /// writing; `commit` applies. `clientOperationId` makes retries idempotent.
  Future<ProgramManifestImportResult> importManifest({
    required String programId,
    required String mode,
    required String clientOperationId,
    required List<Map<String, Object?>> rows,
  }) => _importManifestWithCallable(
    callable: 'importProgramManifest',
    programId: programId,
    mode: mode,
    clientOperationId: clientOperationId,
    rows: rows,
  );

  /// The phone picker uses a separately gated server entry point. Both
  /// endpoints share the canonical manifest schema and authority checks.
  Future<ProgramManifestImportResult> importWeddingPhoneContacts({
    required String programId,
    required String mode,
    required String clientOperationId,
    required List<Map<String, Object?>> rows,
  }) => _importManifestWithCallable(
    callable: 'importWeddingPhoneContacts',
    programId: programId,
    mode: mode,
    clientOperationId: clientOperationId,
    rows: rows,
  );

  Future<ProgramManifestImportResult> _importManifestWithCallable({
    required String callable,
    required String programId,
    required String mode,
    required String clientOperationId,
    required List<Map<String, Object?>> rows,
  }) => _call(
    name: callable,
    payload: ImportProgramManifestCallableRequest(
      programId: programId,
      mode: mode,
      clientOperationId: clientOperationId,
      rows: rows,
    ).toJson(),
    action: mode == 'commit' ? 'import the manifest' : 'preview the import',
    parse: ProgramManifestImportResult.fromCallableData,
  );

  Future<ProgramMutationResult> upsertGuest({
    required String programId,
    required String displayName,
    String? guestId,
    int? expectedRevision,
    String? householdId,
    List<String>? groupIds,
    String? phoneE164,
    String? email,
    String? externalReference,
    String rsvpStatus = 'pending',
  }) => _call(
    name: 'upsertProgramGuest',
    payload: UpsertProgramGuestCallableRequest(
      programId: programId,
      guestId: guestId,
      expectedRevision: expectedRevision,
      displayName: displayName,
      householdId: householdId,
      groupIds: groupIds,
      phoneE164: phoneE164,
      email: email,
      externalReference: externalReference,
      rsvpStatus: rsvpStatus,
    ).toJson(),
    action: 'save the guest',
    parse: ProgramMutationResult.fromCallableData,
  );

  Future<ProgramMutationResult> upsertPickupPoint({
    required String programId,
    required String kind,
    required String label,
    String? pickupPointId,
    int? expectedRevision,
    String? iataCode,
    String? terminal,
    String? meetingZone,
    String? instructions,
    bool? active,
  }) => _call(
    name: 'upsertProgramPickupPoint',
    payload: UpsertProgramPickupPointCallableRequest(
      programId: programId,
      pickupPointId: pickupPointId,
      expectedRevision: expectedRevision,
      kind: kind,
      label: label,
      iataCode: iataCode,
      terminal: terminal,
      meetingZone: meetingZone,
      instructions: instructions,
      active: active,
    ).toJson(),
    action: 'save the pickup point',
    parse: ProgramMutationResult.fromCallableData,
  );

  Future<ProgramMutationResult> upsertHotel({
    required String programId,
    required String name,
    String? hotelId,
    int? expectedRevision,
    String? address,
    String? receptionContact,
    String? notes,
    bool? active,
  }) => _call(
    name: 'upsertProgramHotel',
    payload: UpsertProgramHotelCallableRequest(
      programId: programId,
      hotelId: hotelId,
      expectedRevision: expectedRevision,
      name: name,
      address: address ?? '',
      receptionContact: receptionContact,
      notes: notes,
      active: active,
    ).toJson(),
    action: 'save the hotel',
    parse: ProgramMutationResult.fromCallableData,
  );

  Future<ProgramMutationResult> upsertVendor({
    required String organizerId,
    required String name,
    String? vendorId,
    int? expectedRevision,
    String? contactName,
    String? phoneE164,
    List<String>? programIds,
    bool? active,
  }) => _call(
    name: 'upsertTransportVendor',
    payload: UpsertTransportVendorCallableRequest(
      organizerId: organizerId,
      vendorId: vendorId,
      expectedRevision: expectedRevision,
      name: name,
      contactName: contactName,
      phoneE164: phoneE164,
      programIds: programIds,
      active: active,
    ).toJson(),
    action: 'save the vendor',
    parse: ProgramMutationResult.fromCallableData,
  );

  Future<ProgramMutationResult> upsertTravelLeg({
    required String programId,
    required String guestId,
    required String kind,
    String? legId,
    int? expectedRevision,
    String? flightNumber,
    String? carrierCode,
    String? originIata,
    String? destinationIata,
    DateTime? scheduledArrivalAt,
    bool? international,
    String? pickupPointId,
    String? destinationHotelId,
    String? destinationLabel,
    int passengers = 1,
    int luggageUnits = 0,
    List<String> requiredCapabilities = const [],
    bool dedicatedVehicle = false,
  }) => _call(
    name: 'upsertProgramTravelLeg',
    payload: UpsertProgramTravelLegCallableRequest(
      programId: programId,
      legId: legId,
      expectedRevision: expectedRevision,
      guestId: guestId,
      kind: kind,
      flightNumber: flightNumber,
      carrierCode: carrierCode,
      originIata: originIata,
      destinationIata: destinationIata,
      scheduledArrivalAtMillis: scheduledArrivalAt?.millisecondsSinceEpoch,
      international: international,
      pickupPointId: pickupPointId,
      destinationHotelId: destinationHotelId,
      destinationLabel: destinationLabel,
      passengers: passengers,
      luggageUnits: luggageUnits,
      requiredCapabilities: requiredCapabilities,
      dedicatedVehicle: dedicatedVehicle,
    ).toJson(),
    action: 'save the travel leg',
    parse: ProgramMutationResult.fromCallableData,
  );

  Future<T> _call<T>({
    required String name,
    required Map<String, Object?> payload,
    required String action,
    required T Function(Object?) parse,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable(name)
          .call<Object?>(payload);
      return parse(result.data);
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: action,
      resource: name,
    ),
  );
}

@riverpod
ProgramSetupRepository programSetupRepository(Ref ref) =>
    ProgramSetupRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
Future<ProgramStaffList> programStaffList(
  Ref ref,
  String programId, {
  String? cursor,
}) => ref
    .read(programSetupRepositoryProvider)
    .listStaff(programId, cursor: cursor);

@riverpod
Future<List<OrganizerProgramSummary>> organizerProgramList(
  Ref ref,
  String organizerId,
) async {
  final rows = await ref
      .watch(programSetupRepositoryProvider)
      .listPrograms(organizerId);
  return rows
      .map(
        (row) => OrganizerProgramSummary(
          programId: row.programId,
          title: row.title,
          kind: ProgramKind.values.byName(row.kind),
          status: ProgramStatus.values.byName(row.status),
          revision: row.revision,
          archivedAt: row.archivedAt,
          anonymizeAt: row.anonymizeAt,
          anonymizedAt: row.anonymizedAt,
        ),
      )
      .toList(growable: false);
}

@riverpod
Future<OrganizerProgramDetail> organizerProgramDetail(
  Ref ref,
  String programId,
) => ref.watch(programSetupRepositoryProvider).getProgram(programId);

@riverpod
Future<ProgramGuestListPage> programGuestList(Ref ref, String programId) =>
    ref.watch(programSetupRepositoryProvider).listGuests(programId);
