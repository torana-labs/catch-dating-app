import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_reports_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'programme_team_controller.g.dart';

/// The team: the programme and the first page of `listProgramStaff`.
@riverpod
HostProgrammeReport<ProgramStaffList> hostProgrammeTeamController(
  Ref ref,
  String programId,
) {
  final staff = ref.watch(programStaffListProvider(programId));
  return HostProgrammeReport(
    programme: ref.watch(hostProgrammeControllerProvider(programId)),
    value: staff.value,
    error: staff.error,
  );
}

void refreshHostProgrammeTeam(WidgetRef ref, String programId) {
  refreshHostProgramme(ref, programId);
  ref.invalidate(programStaffListProvider(programId));
}
