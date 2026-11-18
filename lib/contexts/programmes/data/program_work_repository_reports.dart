part of 'program_work_repository.dart';

/// Lead-facing report providers: attendance rollups and stakeholder counts.
/// Split into a part file so the work repository stays under the
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
