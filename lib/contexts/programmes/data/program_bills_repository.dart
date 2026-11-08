part of 'program_work_repository.dart';

/// Vendor bill reconcile: the bill re-checked against the recorded trips,
/// saved for offline cold starts like the other programme reads, and the
/// manager's check, question and approve commands.
extension ProgramBillsRepositoryApi on ProgramWorkRepository {
  Future<ProgramVendorBillView> reviewVendorBill({
    required String programId,
    required String vendorId,
    String? snapshotAccountId,
  }) => _call(
    name: 'reconcileProgramVendorBill',
    authorityScopedRead: true,
    payload: ReconcileProgramVendorBillCallableRequest(
      programId: programId,
      vendorId: vendorId,
      action: ProgramBillAction.review.name,
    ).toJson(),
    action: 'load the vendor bill',
    parse: ProgramVendorBillView.fromCallableData,
    snapshotScope: programSnapshotScope('bill', programId, vendorId),
    snapshotAccountId: snapshotAccountId,
  );

  /// Checks [lines] (with [action] check), questions the bill with [note]
  /// or approves it, fenced by [expectedRevision] (0 before the first
  /// check). [requestId] makes a retried tap return the stored bill.
  Future<ProgramVendorBillView> reconcileVendorBill({
    required String programId,
    required String vendorId,
    required ProgramBillAction action,
    required int expectedRevision,
    required String requestId,
    String? invoiceNumber,
    List<ProgramBillLineInput>? lines,
    String? note,
  }) => _call(
    name: 'reconcileProgramVendorBill',
    payload: ReconcileProgramVendorBillCallableRequest(
      programId: programId,
      vendorId: vendorId,
      action: action.name,
      invoiceNumber: invoiceNumber,
      lines: lines?.map((line) => line.toJson()).toList(),
      note: note,
      expectedRevision: expectedRevision,
      requestId: requestId,
    ).toJson(),
    action: 'update the vendor bill',
    parse: ProgramVendorBillView.fromCallableData,
  );
}

/// One vendor's bill, from the live read or a bounded offline snapshot.
@riverpod
Future<ProgramReadView<ProgramVendorBillView>> programVendorBillView(
  Ref ref,
  String programId,
  String vendorId,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await _readView(
    ref,
    accountId,
    programId,
    programSnapshotScope('bill', programId, vendorId),
    () => ref
        .read(programWorkRepositoryProvider)
        .reviewVendorBill(
          programId: programId,
          vendorId: vendorId,
          snapshotAccountId: accountId,
        ),
    ProgramVendorBillView.fromCallableData,
  );
  retainProgramProjection(
    ref,
    programProjectionDeadline(null, result.snapshotExpiresAt),
  );
  return result;
}
