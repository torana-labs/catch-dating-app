import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_attendance_export.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_attendance_actions_controller.g.dart';

/// Attendance-report actions for the reconciliation surface. Widgets go
/// through this controller rather than reaching into repository or share
/// providers directly.
@riverpod
class ProgramAttendanceActions extends _$ProgramAttendanceActions {
  @override
  void build() {}

  /// Loads the full report and shares the reconciliation CSV.
  Future<void> exportReport({
    required String programId,
    required String programTitle,
    required String subject,
    required Map<String, String> functionNames,
  }) async {
    final repository = ref.read(programWorkRepositoryProvider);
    final share = ref.read(externalShareControllerProvider);
    final report = await repository.getAttendanceReport(programId);
    final export = buildProgramAttendanceReportExport(
      programId: programId,
      programTitle: programTitle,
      report: report,
      functionNames: functionNames,
      exportedAt: DateTime.now().toUtc(),
    );
    await share.shareCsvFile(
      csv: export.csv,
      fileName: export.fileName,
      subject: subject,
      text: subject,
    );
  }
}
