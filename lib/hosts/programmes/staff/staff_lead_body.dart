import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_function_row.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_lead_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The function lead's board in board order: the next function as the
/// spotlight with how long until it starts and its door, the counts for the
/// function on now, and the day's run of show with Alerts.
class StaffLeadBody extends StatelessWidget {
  const StaffLeadBody({
    super.key,
    required this.state,
    required this.onOpenDoor,
    required this.onAlerts,
    required this.onRetry,
  });

  final StaffLeadState state;
  final ValueChanged<ProgramFunction> onOpenDoor;
  final VoidCallback onAlerts;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case StaffLeadStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case StaffLeadStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostStaffLeadErrorTitle,
            message: l10n.hostStaffJobsErrorBody,
            retryLabel: l10n.hostStaffTryAgain,
            onRetry: onRetry,
          ),
        );
      case StaffLeadStatus.content:
        break;
    }
    final now = state.now ?? DateTime.now();
    final lead = state.next ?? state.current;
    final counted = state.current ?? state.next;
    if (lead == null) {
      return CatchPageBody.screen(
        child: CatchEmptyState(
          icon: CatchIcons.event,
          title: l10n.hostStaffLeadEmptyTitle,
          message: l10n.hostStaffLeadEmptyBody,
        ),
      );
    }
    final isNext = lead == state.next;
    final minutes = lead.startsAt.difference(now).inMinutes;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchSurface(
          key: const ValueKey<String>('staff-lead-spotlight'),
          block: CatchSurfaceBlock.spotlight,
          color: CatchSurfaceColor.nightsOut,
          child: CatchStack(
            children: [
              CatchStack(
                direction: CatchStackDirection.row,
                justify: CatchStackJustify.between,
                gap: CatchStackGap.g8,
                children: [
                  Flexible(
                    child: CatchText(
                      isNext
                          ? l10n.hostStaffLeadNext(
                              time: AppTimeFormatters.time(
                                lead.startsAt.toLocal(),
                              ),
                            )
                          : l10n.hostStaffLeadNow(
                              time: AppTimeFormatters.time(
                                lead.endsAt.toLocal(),
                              ),
                            ),
                      variant: CatchTextVariant.labelKicker,
                      maxLines: 1,
                    ),
                  ),
                  if (isNext)
                    CatchText(
                      l10n.hostStaffLeadIn(count: minutes < 0 ? 0 : minutes),
                      variant: CatchTextVariant.labelKicker,
                      numeric: true,
                    ),
                ],
              ),
              CatchText(lead.name, variant: CatchTextVariant.displayLg),
              CatchText(staffFunctionWhen(l10n, lead)),
              CatchButton(
                key: const ValueKey<String>('staff-lead-door'),
                label: l10n.hostStaffLeadOpenDoor,
                variant: CatchButtonVariant.secondary,
                size: CatchButtonSize.md,
                fullWidth: true,
                onPressed: () => onOpenDoor(lead),
              ),
            ],
          ),
        ),
        if (counted != null)
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              CatchMetricTile.stat(
                label: l10n.hostStaffLeadStatIn,
                value: '${counted.checkedInCount}',
                note: counted.name,
              ),
              CatchMetricTile.stat(
                label: l10n.hostStaffLeadStatToCome,
                value:
                    '${(counted.expectedCount - counted.checkedInCount).clamp(0, counted.expectedCount)}',
              ),
            ],
          ),
        CatchSection(
          title: l10n.hostStaffLeadRunOfShow,
          timeline: true,
          dividers: CatchSectionPlacement.none,
          action: CatchSectionAction(
            label: l10n.hostStaffJobsLinkAlerts,
            onPressed: onAlerts,
          ),
          children: [
            for (final function in state.runOfShow)
              StaffFunctionRow(
                key: ValueKey<String>('staff-lead-${function.functionId}'),
                function: function,
                now: now,
                onTap: () => onOpenDoor(function),
              ),
          ],
        ),
      ],
    );
  }
}
