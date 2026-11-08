import 'package:catch_dating_app/contexts/programmes/domain/program_live_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Where the alerts are: reading, showing, or unable to read.
enum StaffAlertsStatus { loading, content, error }

/// The Alerts segments.
enum StaffAlertsFilter { open, mine, done }

/// The alerts for the jobs this person holds (RbProgAlerts): Open, Mine
/// and Done, each row with the action it allows, and what raises one.
class StaffAlertsBody extends StatelessWidget {
  const StaffAlertsBody({
    super.key,
    required this.status,
    required this.now,
    required this.onRetry,
    required this.filter,
    required this.onFilter,
    required this.onAction,
    this.board,
    this.busyAlertId,
  });

  final StaffAlertsStatus status;
  final ProgramLiveBoard? board;
  final DateTime now;
  final VoidCallback onRetry;
  final StaffAlertsFilter filter;
  final ValueChanged<StaffAlertsFilter> onFilter;
  final void Function(ProgramLiveAlert, ProgramAlertAction) onAction;

  /// The alert whose action is in flight; its button waits.
  final String? busyAlertId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (status) {
      case StaffAlertsStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case StaffAlertsStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostStaffAlertsErrorTitle,
            message: l10n.hostStaffJobsErrorBody,
            retryLabel: l10n.hostStaffTryAgain,
            onRetry: onRetry,
          ),
        );
      case StaffAlertsStatus.content:
        break;
    }
    final loaded = board;
    final items = switch (filter) {
      StaffAlertsFilter.open => loaded?.open,
      StaffAlertsFilter.mine => loaded?.mine,
      StaffAlertsFilter.done => loaded?.done,
    };
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchPageTabBar<StaffAlertsFilter>.segmented(
          selected: filter,
          label: l10n.hostStaffAlertsTitle,
          onChanged: onFilter,
          options: [
            for (final value in StaffAlertsFilter.values)
              CatchOption(
                value: value,
                label: switch (value) {
                  StaffAlertsFilter.open => l10n.hostStaffAlertsOpen(
                    count: loaded?.open.length ?? 0,
                  ),
                  StaffAlertsFilter.mine => l10n.hostStaffAlertsMine(
                    count: loaded?.mine.length ?? 0,
                  ),
                  StaffAlertsFilter.done => l10n.hostStaffAlertsDone(
                    count: loaded?.done.length ?? 0,
                  ),
                },
              ),
          ],
        ),
        CatchSection(
          note: loaded?.truncated == true
              ? l10n.hostStaffAlertsTruncated
              : null,
          empty: l10n.hostStaffAlertsEmpty,
          children: [
            for (final alert in items ?? const <ProgramLiveAlert>[])
              StaffLiveAlertRow(
                key: ValueKey<String>('staff-alert-${alert.alertId}'),
                alert: alert,
                busy: busyAlertId == alert.alertId,
                onAction: (action) => onAction(alert, action),
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostStaffAlertsWhatTitle,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchText(
              l10n.hostStaffAlertsWhatBody,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
      ],
    );
  }
}

/// One alert: its tone, title, when it was raised and who has it, with
/// Take it, Done or Reopen.
class StaffLiveAlertRow extends StatelessWidget {
  const StaffLiveAlertRow({
    super.key,
    required this.alert,
    required this.onAction,
    this.busy = false,
  });

  final ProgramLiveAlert alert;
  final ValueChanged<ProgramAlertAction>? onAction;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final open = alert.state == ProgramAlertState.open;
    final action = !open
        ? ProgramAlertAction.reopen
        : alert.assignedToMe
        ? ProgramAlertAction.done
        : ProgramAlertAction.claim;
    final when = AppTimeFormatters.time(alert.createdAt);
    return CatchIndexRow(
      title: alert.title,
      onTap: null,
      marker: !open
          ? CatchIndexRowTone.neutral
          : switch (alert.severity) {
              ProgramAlertSeverity.urgent => CatchIndexRowTone.danger,
              ProgramAlertSeverity.warning => CatchIndexRowTone.warning,
              ProgramAlertSeverity.info => CatchIndexRowTone.info,
            },
      meta: alert.assigneeName == null || alert.assignedToMe
          ? '${AppTimeFormatters.shortWeekday(alert.createdAt)} $when'
          : l10n.hostStaffAlertsWith(name: alert.assigneeName!, time: when),
      action: CatchIndexRowAction(
        label: switch (action) {
          ProgramAlertAction.claim => l10n.hostStaffAlertsTake,
          ProgramAlertAction.done => l10n.hostStaffAlertsMarkDone,
          ProgramAlertAction.reopen => l10n.hostStaffAlertsReopen,
        },
        variant:
            open &&
                alert.severity == ProgramAlertSeverity.urgent &&
                !alert.assignedToMe
            ? CatchIndexRowActionVariant.primary
            : CatchIndexRowActionVariant.secondary,
        onPressed: busy || onAction == null ? null : () => onAction!(action),
      ),
    );
  }
}
