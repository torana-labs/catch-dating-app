import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_attendance_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_commands.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_reports_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_attendance_actions_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Attendance (RbProgAttendance): replies against the door, per function.
///
/// Export shares the reconciliation CSV through the kept attendance action
/// controller; Close and archive runs `archiveProgram`, fenced by the
/// programme revision.
class HostProgrammeAttendanceScreen extends ConsumerStatefulWidget {
  const HostProgrammeAttendanceScreen({super.key, required this.programId});

  final String programId;

  @override
  ConsumerState<HostProgrammeAttendanceScreen> createState() =>
      _HostProgrammeAttendanceScreenState();
}

class _HostProgrammeAttendanceScreenState
    extends ConsumerState<HostProgrammeAttendanceScreen> {
  bool _exporting = false;
  bool _archiving = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(
      hostProgrammeAttendanceControllerProvider(widget.programId),
    );
    final program = state.programme.program;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-attendance-screen'),
        bodyScrolls: false,
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
          kicker: program?.title,
          title: l10n.hostProgrammeAttendanceTopBar,
        ),
        body: HostProgrammeAttendanceBody(
          state: state,
          exporting: _exporting,
          archiving: _archiving,
          onExport: () => unawaited(_export(state.programme.program?.title)),
          onArchive: program == null || program.status == ProgramStatus.archived
              ? null
              : () => unawaited(_archive(program.revision)),
          onRetry: () => refreshHostProgrammeAttendance(ref, widget.programId),
        ),
      ),
    );
  }

  Future<void> _export(String? title) async {
    final l10n = context.l10n;
    final state = ref.read(
      hostProgrammeAttendanceControllerProvider(widget.programId),
    );
    setState(() => _exporting = true);
    try {
      await ref
          .read(programAttendanceActionsProvider.notifier)
          .exportReport(
            programId: widget.programId,
            programTitle: title ?? widget.programId,
            subject: l10n.hostProgrammeAttendanceExportSubject(
              programme: title ?? '',
            ),
            functionNames: {
              for (final function in state.programme.functions)
                function.functionId: function.name,
            },
          );
    } on Object catch (error, stackTrace) {
      ref
          .read(errorLoggerProvider)
          .logError(error, stackTrace, reason: 'export programme attendance');
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.event,
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  Future<void> _archive(int revision) async {
    final l10n = context.l10n;
    final confirmed = await showCatchConfirmDialog(
      context: context,
      copy: catchDialogCopy(l10n),
      title: l10n.hostProgrammeAttendanceArchive,
      message: l10n.hostProgrammeAttendanceArchiveBody,
      confirmLabel: l10n.hostProgrammeAttendanceArchiveAction,
      danger: true,
    );
    if (confirmed != true || !mounted) return;
    setState(() => _archiving = true);
    await runHostProgrammeCommand(
      context,
      ref,
      programId: widget.programId,
      reason: 'archive a programme',
      done: l10n.hostProgrammeAttendanceArchived,
      run: (controller) => controller.archiveProgram(
        programId: widget.programId,
        expectedRevision: revision,
      ),
    );
    if (mounted) setState(() => _archiving = false);
  }
}
