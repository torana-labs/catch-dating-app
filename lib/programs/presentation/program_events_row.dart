import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// One identifiable program destination. Its constituent events remain in the
/// program workspace rather than appearing as unrelated timeline duplicates.
class ProgramEventsRow extends StatelessWidget {
  const ProgramEventsRow({
    super.key,
    required this.program,
    required this.now,
    required this.onOpen,
    required this.onLifecycle,
    this.pending = false,
  });

  final OrganizerProgramListRow program;
  final DateTime now;
  final VoidCallback onOpen;
  final ValueChanged<ProgramLifecycleAction> onLifecycle;
  final bool pending;

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: programEventsField(
        context,
        program: program,
        now: now,
        pending: pending,
        onOpen: onOpen,
        onLifecycle: onLifecycle,
      ),
    );
  }
}

/// Builds the closed Field contract consumed by lazy Events row sections.
CatchField programEventsField(
  BuildContext context, {
  required OrganizerProgramListRow program,
  required DateTime now,
  required VoidCallback onOpen,
  required ValueChanged<ProgramLifecycleAction> onLifecycle,
  bool pending = false,
}) {
  final l10n = context.l10n;
  final startsAt = program.startsAt;
  final endsAt = program.endsAt;
  final canManageLifecycle = program.isArchived
      ? program.canUnarchive
      : program.canArchive;
  return CatchField.navigate(
    key: ValueKey('host-program-row-${program.programId}'),
    onActivate: onOpen,
    content: CatchRecordLayout(
      title: program.title,
      icon: CatchIcons.date,
      metadata: l10n.programsEventRowLabel,
      facts: [
        if (startsAt != null && endsAt != null)
          l10n.programsEventDateRange(
            start: AppTimeFormatters.shortDate(startsAt),
            end: AppTimeFormatters.shortDate(endsAt),
          ),
        program.functionCount == null
            ? l10n.programsEventCountUnavailable
            : l10n.programsEventCount(count: program.functionCount!),
        if (program.isArchived) l10n.programsEventArchived,
      ],
      description: program.anonymizedAt != null
          ? l10n.programsListAnonymized
          : program.isArchived && program.anonymizeAt != null
          ? l10n.programsListAnonymizesOn(
              date: AppTimeFormatters.shortDate(program.anonymizeAt!),
            )
          : null,
    ),
    secondaryAction: canManageLifecycle
        ? CatchFieldSecondaryAction.menu<ProgramLifecycleAction>(
            label: l10n.programsListRowActions,
            items: [
              if (program.isArchived)
                CatchActionMenuItem(
                  value: ProgramLifecycleAction.unarchive,
                  label: l10n.programsListUnarchiveAction,
                  icon: CatchIcons.undo,
                  enabled: !pending && program.canUnarchiveAt(now),
                  sublabel: program.anonymizedAt != null
                      ? l10n.programsListAnonymized
                      : program.canUnarchiveAt(now)
                      ? pending
                            ? l10n.coreCatchFieldLabelSaving
                            : null
                      : l10n.programsListRestoreWindowExpiredReason,
                )
              else
                CatchActionMenuItem(
                  value: ProgramLifecycleAction.archive,
                  label: l10n.programsListArchiveAction,
                  icon: CatchIcons.archive,
                  enabled: !pending,
                  sublabel: pending ? l10n.coreCatchFieldLabelSaving : null,
                ),
            ],
            onSelected: onLifecycle,
          )
        : null,
  );
}
