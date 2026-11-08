import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_reports_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'programme_reports_controller.g.dart';

/// Attendance: the programme (for names) and `getProgramAttendanceReport`.
@riverpod
HostProgrammeReport<ProgramAttendanceReport> hostProgrammeAttendanceController(
  Ref ref,
  String programId,
) {
  final report = ref.watch(programAttendanceReportProvider(programId));
  return HostProgrammeReport(
    programme: ref.watch(hostProgrammeControllerProvider(programId)),
    value: report.value,
    error: report.error,
  );
}

/// The trip ledger: the programme and the first page of `listProgramTrips`.
@riverpod
HostProgrammeReport<ProgramTripList> hostProgrammeTripsController(
  Ref ref,
  String programId,
) {
  final trips = ref.watch(programTripListProvider(programId));
  return HostProgrammeReport(
    programme: ref.watch(hostProgrammeControllerProvider(programId)),
    value: trips.value,
    error: trips.error,
  );
}

/// The counts-only share view: the work access (title, dates and
/// function names, which a family viewer may read) and
/// `getProgramStakeholderCounts`.
@riverpod
HostProgrammeShareState hostProgrammeShareController(
  Ref ref,
  String programId,
) {
  final access = ref.watch(programWorkEntryProvider(programId, null));
  final counts = ref.watch(programStakeholderCountsProvider(programId));
  return HostProgrammeShareState(
    access: access.value?.value,
    counts: counts.value,
    error: counts.error ?? access.error,
  );
}

void refreshHostProgrammeAttendance(WidgetRef ref, String programId) {
  refreshHostProgramme(ref, programId);
  ref.invalidate(programAttendanceReportProvider(programId));
}

void refreshHostProgrammeTrips(WidgetRef ref, String programId) {
  refreshHostProgramme(ref, programId);
  ref.invalidate(programTripListProvider(programId));
}

void refreshHostProgrammeShare(WidgetRef ref, String programId) {
  ref.invalidate(programWorkEntryProvider(programId, null));
  ref.invalidate(programStakeholderCountsProvider(programId));
}
