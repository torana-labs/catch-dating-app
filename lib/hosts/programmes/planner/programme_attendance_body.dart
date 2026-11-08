import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_reports_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Attendance in board order: who came to what, three numbers, each
/// function as a bar of check-ins against replies, and Wrapping up.
class HostProgrammeAttendanceBody extends StatelessWidget {
  const HostProgrammeAttendanceBody({
    super.key,
    required this.state,
    required this.onExport,
    required this.onArchive,
    required this.onRetry,
    this.exporting = false,
    this.archiving = false,
  });

  final HostProgrammeReport<ProgramAttendanceReport> state;
  final VoidCallback onExport;

  /// Null when the programme cannot be archived (already archived).
  final VoidCallback? onArchive;
  final VoidCallback onRetry;
  final bool exporting;
  final bool archiving;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final report = state.value;
    if (state.status != HostProgrammeStatus.ready || report == null) {
      return HostProgrammeStateBody(status: state.status, onRetry: onRetry);
    }
    final checkIns = report.functions.fold(
      0,
      (sum, f) => sum + f.checkedInHeads,
    );
    final walkIns = report.functions.fold(0, (sum, f) => sum + f.walkInHeads);
    final cameShare = report.programAttendingGuests == 0
        ? 0
        : (report.programCheckedInGuests * 100 / report.programAttendingGuests)
              .round();
    return CatchPageBody.screen(
      children: [
        CatchText(
          l10n.hostProgrammeAttendanceTitle,
          variant: CatchTextVariant.pageTitle,
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: l10n.hostProgrammeAttendanceCheckIns,
              value: '$checkIns',
              mode: CatchMetricTileMode.plain,
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammeAttendanceCame,
              value: l10n.hostProgrammePercent(value: cameShare),
              mode: CatchMetricTileMode.plain,
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammeAttendanceWalkIns,
              value: '$walkIns',
              mode: CatchMetricTileMode.plain,
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeAttendanceByFunction,
          empty: l10n.hostProgrammeScheduleEmpty,
          children: [
            for (final function in report.functions)
              CatchIndexRow(
                key: ValueKey<String>(
                  'host-programme-attendance-${function.functionId}',
                ),
                title: state.functionName(function.functionId),
                subtitle: l10n.hostProgrammeAttendanceLine(
                  came: function.checkedInGuests,
                  coming: function.attendingGuests,
                  missed: function.noShowGuests,
                ),
                value: l10n.hostProgrammePercent(
                  value: function.attendingGuests == 0
                      ? 0
                      : (function.checkedInGuests *
                                100 /
                                function.attendingGuests)
                            .round(),
                ),
                progress: function.attendingGuests == 0
                    ? null
                    : CatchIndexRowProgress(
                        value: function.checkedInGuests,
                        max: function.attendingGuests,
                        label: state.functionName(function.functionId),
                      ),
                onTap: null,
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeAttendanceWrapUp,
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('host-programme-attendance-export'),
              icon: CatchIcons.download,
              title: l10n.hostProgrammeAttendanceExport,
              subtitle: l10n.hostProgrammeAttendanceExportBody,
              action: CatchIndexRowAction(
                label: l10n.hostProgrammeAttendanceExportAction,
                onPressed: exporting ? null : onExport,
              ),
              onTap: null,
            ),
            CatchIndexRow(
              key: const ValueKey<String>('host-programme-attendance-archive'),
              icon: CatchIcons.archive,
              title: l10n.hostProgrammeAttendanceArchive,
              subtitle: l10n.hostProgrammeAttendanceArchiveBody,
              action: CatchIndexRowAction(
                label: l10n.hostProgrammeAttendanceArchiveAction,
                onPressed: archiving ? null : onArchive,
              ),
              onTap: null,
            ),
          ],
        ),
      ],
    );
  }
}
