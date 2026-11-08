import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_function_sheet.dart';
import 'package:catch_dating_app/programs/presentation/program_workspace_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Runs one planner command, refreshes the programme on success and shows
/// the error as a notice on failure. Returns whether it succeeded.
Future<bool> runHostProgrammeCommand(
  BuildContext context,
  WidgetRef ref, {
  required String programId,
  required String reason,
  required Future<Object?> Function(ProgramWorkspaceController controller) run,
  String? done,
}) async {
  try {
    await run(ref.read(programWorkspaceControllerProvider.notifier));
  } on Object catch (error, stackTrace) {
    ref.read(errorLoggerProvider).logError(error, stackTrace, reason: reason);
    if (context.mounted) {
      showCatchNoticeError(context, error, errorContext: AppErrorContext.event);
    }
    return false;
  }
  refreshHostProgramme(ref, programId);
  if (done != null && context.mounted) showCatchNotice(context, done);
  return true;
}

/// Opens the function sheet and saves what it returns through
/// `upsertProgramFunction`, fenced by the function revision.
Future<void> editHostProgrammeFunction(
  BuildContext context,
  WidgetRef ref, {
  required OrganizerProgramSettings program,
  OrganizerFunctionDetail? function,
}) async {
  final draft = await showCatchBottomSheet<HostProgrammeFunctionDraft>(
    context: context,
    builder: (_) =>
        HostProgrammeFunctionSheet(program: program, function: function),
  );
  if (draft == null || !context.mounted) return;
  unawaited(
    runHostProgrammeCommand(
      context,
      ref,
      programId: program.programId,
      reason: 'save a programme function',
      done: context.l10n.hostProgrammeFunctionSaved,
      run: (controller) => controller.upsertFunction(
        programId: program.programId,
        functionId: function?.functionId,
        expectedRevision: function?.revision,
        name: draft.name,
        venueName: draft.venue,
        startsAt: draft.startsAt,
        endsAt: draft.endsAt,
      ),
    ),
  );
}
