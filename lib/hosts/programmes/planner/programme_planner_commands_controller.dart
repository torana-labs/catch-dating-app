import 'package:catch_dating_app/contexts/programmes/data/program_planner_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_bill_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_id_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_message_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'programme_planner_commands_controller.g.dart';

/// The planner's own commands: branding, links, messages, guest IDs, photos
/// and vendor bills. Planner screens go through this controller rather than
/// reaching into the programme repositories, as the setup screens go through
/// `ProgramWorkspaceController`.
@riverpod
class HostProgrammePlannerCommands extends _$HostProgrammePlannerCommands {
  @override
  void build() {}

  ProgramPlannerRepository get _planner =>
      ref.read(programPlannerRepositoryProvider);

  ProgramWorkRepository get _work => ref.read(programWorkRepositoryProvider);

  Future<int> saveBranding({
    required String programId,
    required int expectedRevision,
    required ProgramBranding branding,
  }) => _planner.saveBranding(
    programId: programId,
    expectedRevision: expectedRevision,
    branding: branding,
  );

  Future<({String token, DateTime expiresAt})> issueWebLink({
    required String programId,
    required ProgramWebLinkKind kind,
    required String subjectId,
  }) => _planner.issueWebLink(
    programId: programId,
    kind: kind,
    subjectId: subjectId,
  );

  Future<String> saveMessage({
    required String programId,
    required String senderConnectionId,
    required ProgramMessageDraft draft,
    String? momentId,
    bool approve = false,
  }) => _planner.saveMessage(
    programId: programId,
    senderConnectionId: senderConnectionId,
    draft: draft,
    momentId: momentId,
    approve: approve,
  );

  Future<ProgramGuestIdResult> decideGuestId({
    required String programId,
    required ProgramIdTrackerRow row,
    required ProgramGuestIdDecision decision,
    required String requestId,
  }) => _work.decideGuestId(
    programId: programId,
    row: row,
    decision: decision,
    requestId: requestId,
  );

  Future<int> upsertPhoto({
    required String programId,
    required String photoId,
    required int expectedRevision,
    required String requestId,
    String? functionId,
  }) => _work.upsertPhoto(
    programId: programId,
    photoId: photoId,
    expectedRevision: expectedRevision,
    requestId: requestId,
    functionId: functionId,
  );

  Future<ProgramVendorBillView> reconcileVendorBill({
    required String programId,
    required String vendorId,
    required ProgramBillAction action,
    required int expectedRevision,
    required String requestId,
    String? invoiceNumber,
    List<ProgramBillLineInput>? lines,
    String? note,
  }) => _work.reconcileVendorBill(
    programId: programId,
    vendorId: vendorId,
    action: action,
    expectedRevision: expectedRevision,
    requestId: requestId,
    invoiceNumber: invoiceNumber,
    lines: lines,
    note: note,
  );
}
