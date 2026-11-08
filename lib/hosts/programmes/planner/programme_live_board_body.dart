import 'package:catch_dating_app/contexts/programmes/domain/program_live_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_alerts_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// How many open alerts the board shows before All alerts.
const hostProgrammeLiveAlertLimit = 4;

/// The live board (RbProgLiveBoard): the function on now with its door
/// count, travel at a glance, tonight's schedule and the alerts that need
/// someone.
class HostProgrammeLiveBoardBody extends StatelessWidget {
  const HostProgrammeLiveBoardBody({
    super.key,
    required this.status,
    required this.board,
    required this.onRetry,
    required this.onAction,
    required this.onAllAlerts,
    this.busyAlertId,
  });

  final HostProgrammeStatus status;
  final ProgramLiveBoard? board;
  final VoidCallback onRetry;
  final void Function(ProgramLiveAlert, ProgramAlertAction) onAction;
  final VoidCallback onAllAlerts;
  final String? busyAlertId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final loaded = board;
    if (status != HostProgrammeStatus.ready || loaded == null) {
      return HostProgrammeStateBody(status: status, onRetry: onRetry);
    }
    final now = loaded.now;
    final open = loaded.open;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        if (now == null)
          CatchSection(
            empty: l10n.hostProgrammeLiveNothingOn,
            children: const [],
          )
        else
          HostProgrammeLiveSpotlight(function: now, at: loaded.generatedAt),
        CatchSection(
          title: l10n.hostProgrammeLiveTravel,
          children: [
            CatchIndexRow(
              title: l10n.hostProgrammeLiveLanding,
              icon: CatchIcons.arrivals,
              value: '${loaded.expected}',
              onTap: null,
            ),
            CatchIndexRow(
              title: l10n.hostProgrammeLiveAtCurb,
              icon: CatchIcons.taxi,
              value: '${loaded.atCurb}',
              status: loaded.atCurb > 0 ? l10n.hostProgrammeLiveBusy : null,
              statusTone: CatchIndexRowTone.warning,
              onTap: null,
            ),
            CatchIndexRow(
              title: l10n.hostProgrammeLiveDisrupted,
              icon: CatchIcons.safetyAlert,
              value: '${loaded.disrupted}',
              status: loaded.disrupted > 0
                  ? l10n.hostProgrammeLiveCheck
                  : l10n.hostProgrammeLiveOk,
              statusTone: loaded.disrupted > 0
                  ? CatchIndexRowTone.danger
                  : CatchIndexRowTone.success,
              onTap: null,
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeLiveTonight,
          timeline: true,
          dividers: CatchSectionPlacement.none,
          empty: l10n.hostProgrammeLiveTonightEmpty,
          children: [
            for (final function in loaded.tonight)
              CatchIndexRow(
                key: ValueKey<String>(
                  'host-programme-live-${function.functionId}',
                ),
                title: function.name,
                subtitle: function.venueName,
                time: AppTimeFormatters.time(function.startsAt),
                marker: function.phase == ProgramLivePhase.now
                    ? CatchIndexRowTone.info
                    : null,
                emphasis: function.phase == ProgramLivePhase.done
                    ? CatchIndexRowEmphasis.done
                    : CatchIndexRowEmphasis.regular,
                onTap: null,
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeLiveNeedsYou,
          note: l10n.hostProgrammeLiveOpenCount(count: open.length),
          empty: l10n.hostStaffAlertsEmpty,
          children: [
            for (final alert in open.take(hostProgrammeLiveAlertLimit))
              StaffLiveAlertRow(
                key: ValueKey<String>('host-programme-alert-${alert.alertId}'),
                alert: alert,
                busy: busyAlertId == alert.alertId,
                onAction: (action) => onAction(alert, action),
              ),
          ],
        ),
        CatchButton(
          key: const ValueKey<String>('host-programme-live-all-alerts'),
          label: l10n.hostProgrammeLiveAllAlerts,
          variant: CatchButtonVariant.quiet,
          fullWidth: true,
          onPressed: onAllAlerts,
        ),
      ],
    );
  }
}

/// The function on now: when, its name, the door meter and three counts.
class HostProgrammeLiveSpotlight extends StatelessWidget {
  const HostProgrammeLiveSpotlight({
    super.key,
    required this.function,
    required this.at,
  });

  final ProgramLiveFunction function;
  final DateTime at;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final expected = function.expectedCount ?? 0;
    final inHall = function.checkedInCount ?? 0;
    final live = function.phase == ProgramLivePhase.now;
    return CatchSurface(
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
                  live
                      ? l10n.hostProgrammeLiveNow(
                          time: AppTimeFormatters.time(at),
                        )
                      : l10n.hostProgrammeLiveNext(
                          time: AppTimeFormatters.time(function.startsAt),
                        ),
                  variant: CatchTextVariant.labelKicker,
                  maxLines: 1,
                ),
              ),
              if (live)
                CatchBadge(
                  label: l10n.hostProgrammeLiveBadge,
                  format: CatchFormat.nightsOut,
                  dot: true,
                ),
            ],
          ),
          CatchText(function.name, variant: CatchTextVariant.displayLg),
          CatchMeter(
            value: inHall,
            max: expected == 0 ? 1 : expected,
            label: l10n.hostProgrammeLiveCheckedIn(
              count: inHall,
              total: expected,
            ),
            showLabel: true,
          ),
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              CatchMetricTile.stat(
                label: l10n.hostProgrammeLiveInHall,
                value: '$inHall',
                mode: CatchMetricTileMode.plain,
              ),
              CatchMetricTile.stat(
                label: l10n.hostProgrammeLiveExpected,
                value: '$expected',
                mode: CatchMetricTileMode.plain,
              ),
              CatchMetricTile.stat(
                label: l10n.hostProgrammeLiveToCome,
                value: '${(expected - inHall).clamp(0, expected)}',
                mode: CatchMetricTileMode.plain,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
