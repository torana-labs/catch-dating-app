import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_workspace_controller.g.dart';

/// Organizer workspace mutations for the program screens. Widgets go through
/// this controller rather than reaching into repository providers directly.
@riverpod
class ProgramWorkspaceController extends _$ProgramWorkspaceController {
  @override
  void build() {}

  ProgramSetupRepository get _repository =>
      ref.read(programSetupRepositoryProvider);

  Future<ProgramMutationResult> createProgram({
    required String organizerId,
    required String kind,
    required String title,
    required String timezone,
    required DateTime startsAt,
    required DateTime endsAt,
  }) => _repository.createProgram(
    organizerId: organizerId,
    kind: kind,
    title: title,
    timezone: timezone,
    startsAt: startsAt,
    endsAt: endsAt,
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
  }) => _repository.upsertFunction(
    programId: programId,
    name: name,
    startsAt: startsAt,
    endsAt: endsAt,
    venueName: venueName,
    functionId: functionId,
    expectedRevision: expectedRevision,
    venueNotes: venueNotes,
    status: status,
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
  }) => _repository.upsertPickupPoint(
    programId: programId,
    kind: kind,
    label: label,
    pickupPointId: pickupPointId,
    expectedRevision: expectedRevision,
    iataCode: iataCode,
    terminal: terminal,
    meetingZone: meetingZone,
    instructions: instructions,
    active: active,
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
  }) => _repository.upsertHotel(
    programId: programId,
    name: name,
    hotelId: hotelId,
    expectedRevision: expectedRevision,
    address: address,
    receptionContact: receptionContact,
    notes: notes,
    active: active,
  );

  Future<ProgramMutationResult> applyFunctionInvitations({
    required String programId,
    required String functionId,
    required String invitationMode,
    required int expectedRevision,
    List<String>? selectedGuestIds,
  }) => _repository.applyFunctionInvitations(
    programId: programId,
    functionId: functionId,
    invitationMode: invitationMode,
    expectedRevision: expectedRevision,
    selectedGuestIds: selectedGuestIds,
  );

  Future<ProgramMutationResult> recordFunctionRsvp({
    required String programId,
    required String functionId,
    required String guestId,
    required String rsvpStatus,
    int? partySize,
    bool allowUninvited = false,
  }) => _repository.recordFunctionRsvp(
    programId: programId,
    functionId: functionId,
    guestId: guestId,
    rsvpStatus: rsvpStatus,
    partySize: partySize,
    allowUninvited: allowUninvited,
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
  }) => _repository.upsertGuest(
    programId: programId,
    displayName: displayName,
    guestId: guestId,
    expectedRevision: expectedRevision,
    householdId: householdId,
    groupIds: groupIds,
    phoneE164: phoneE164,
    email: email,
    externalReference: externalReference,
  );

  Future<ProgramMutationResult> upsertGuestGroup({
    required String programId,
    required String label,
    required String dimension,
    String? groupId,
    int? expectedRevision,
    int? sortOrder,
    String? hotelId,
    bool clearHotel = false,
  }) => _repository.upsertGuestGroup(
    programId: programId,
    label: label,
    dimension: dimension,
    groupId: groupId,
    expectedRevision: expectedRevision,
    sortOrder: sortOrder,
    hotelId: hotelId,
    clearHotel: clearHotel,
  );

  Future<ProgramMutationResult> deleteGuestGroup({
    required String programId,
    required String groupId,
    required int expectedRevision,
  }) => _repository.deleteGuestGroup(
    programId: programId,
    groupId: groupId,
    expectedRevision: expectedRevision,
  );

  Future<ProgramMutationResult> inviteStaff({
    required String programId,
    required String phoneNumber,
    required String displayName,
    required List<ProgramDutyAssignment> duties,
    required DateTime expiresAt,
  }) => _repository.inviteStaff(
    programId: programId,
    phoneNumber: phoneNumber,
    displayName: displayName,
    duties: duties,
    expiresAt: expiresAt,
  );

  Future<ProgramMutationResult> grantStaff({
    required String programId,
    required String phoneNumber,
    required List<ProgramDutyAssignment> duties,
    required DateTime expiresAt,
  }) => _repository.grantStaff(
    programId: programId,
    phoneNumber: phoneNumber,
    duties: duties,
    expiresAt: expiresAt,
  );

  Future<ProgramMutationResult> revokeStaff({
    required String programId,
    required ProgramStaffMember member,
  }) => _repository.revokeStaff(programId: programId, member: member);

  Future<ProgramMutationResult> archiveProgram({
    required String programId,
    required int expectedRevision,
  }) => _repository.archiveProgram(
    programId: programId,
    expectedRevision: expectedRevision,
  );

  Future<ProgramMutationResult> unarchiveProgram({
    required String programId,
    required int expectedRevision,
  }) => _repository.unarchiveProgram(
    programId: programId,
    expectedRevision: expectedRevision,
  );

  Future<({String token, DateTime expiresAt})> issueHouseholdRsvpLink({
    required String programId,
    required String householdId,
  }) => _repository.issueHouseholdRsvpLink(
    programId: programId,
    householdId: householdId,
  );

  Future<ProgramManifestImportResult> importManifest({
    required String programId,
    required String mode,
    required String clientOperationId,
    required List<Map<String, Object?>> rows,
  }) => _repository.importManifest(
    programId: programId,
    mode: mode,
    clientOperationId: clientOperationId,
    rows: rows,
  );
}
