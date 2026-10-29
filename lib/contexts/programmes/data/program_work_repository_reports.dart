part of 'program_work_repository.dart';

/// Lead-facing report and feed providers: attendance rollups, stakeholder
/// counts, the duty-scoped attention feed and the organizer's vendor
/// directory. Split into a part file so the work repository stays under the
/// handwritten-source size budget.
@riverpod
Future<ProgramAttendanceReport> programAttendanceReport(
  Ref ref,
  String programId,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await readWithProgramAuthority(
    ref,
    accountId,
    programId,
    () =>
        ref.read(programWorkRepositoryProvider).getAttendanceReport(programId),
  );
  retainProgramProjection(ref, result.accessExpiresAt);
  return result;
}

@riverpod
Future<ProgramStakeholderCounts> programStakeholderCounts(
  Ref ref,
  String programId,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await readWithProgramAuthority(
    ref,
    accountId,
    programId,
    () =>
        ref.read(programWorkRepositoryProvider).getStakeholderCounts(programId),
  );
  retainProgramProjection(ref, result.accessExpiresAt);
  return result;
}

/// Function-lead attention feed scoped to the caller's duties.
@riverpod
Future<ProgramStaffAttention> programStaffAttention(Ref ref, String programId) {
  final accountId = _watchWorkAccount(ref);
  return readWithProgramAuthority(
    ref,
    accountId,
    programId,
    () => ref.read(programWorkRepositoryProvider).listStaffAttention(programId),
  );
}

/// Organizer-scoped vendor directory for the transport planning surface.
@riverpod
Future<List<ProgramVendorOption>> programTransportVendors(
  Ref ref,
  String organizerId,
  String programId,
) {
  final accountId = _watchWorkAccount(ref);
  return readWithProgramAuthority(
    ref,
    accountId,
    programId,
    () => ref
        .read(programWorkRepositoryProvider)
        .listVendors(organizerId: organizerId, programId: programId),
  );
}
