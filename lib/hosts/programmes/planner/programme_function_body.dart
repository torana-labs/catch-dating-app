import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Who a function invites.
enum HostProgrammeInvitation { everyone, handPicked }

/// One function in board order: the spotlight with its replies, the
/// replies meter, who is invited, what to wear, the door, where, and
/// Cancel this function.
class HostProgrammeFunctionBody extends StatelessWidget {
  const HostProgrammeFunctionBody({
    super.key,
    required this.state,
    required this.functionId,
    required this.onInvitation,
    required this.onOpenDoor,
    required this.onCancel,
    required this.onRetry,
    this.busy = false,
  });

  final HostProgrammeState state;
  final String functionId;
  final ValueChanged<HostProgrammeInvitation> onInvitation;
  final VoidCallback onOpenDoor;
  final VoidCallback onCancel;
  final VoidCallback onRetry;

  /// A change to this function is on its way.
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final function = state.function(functionId);
    if (state.status != HostProgrammeStatus.ready) {
      return HostProgrammeStateBody(status: state.status, onRetry: onRetry);
    }
    if (function == null) {
      return CatchPageBody.screen(
        child: CatchEmptyState(
          icon: CatchIcons.eventUnavailable,
          title: l10n.hostProgrammeFunctionMissing,
        ),
      );
    }
    final replies = state.guests == null ? null : state.replies(function);
    final cancelled = function.status == ProgramFunctionStatus.cancelled;
    final invitation = function.isSelectedGuests
        ? HostProgrammeInvitation.handPicked
        : HostProgrammeInvitation.everyone;
    final dressCode = function.dressCode;
    final instructions = function.instructions;
    return CatchPageBody.screen(
      children: [
        _HostProgrammeFunctionSpotlight(function: function, replies: replies),
        if (replies != null && replies.invited > 0)
          CatchMeter(
            variant: CatchMeterVariant.stack,
            value: replies.coming,
            max: replies.invited,
            label: l10n.hostProgrammeFunctionMeter(name: function.name),
            showLabel: true,
            parts: [
              CatchMeterPart(
                label: l10n.hostProgrammeFunctionComing,
                value: replies.coming,
              ),
              CatchMeterPart(
                label: l10n.hostProgrammeFunctionMaybe,
                value: replies.maybe,
                color: CatchMeterPartColor.games,
              ),
              CatchMeterPart(
                label: l10n.hostProgrammeFunctionNoReply,
                value: replies.noReply,
                color: CatchMeterPartColor.muted,
              ),
            ],
          ),
        CatchSection(
          title: l10n.hostProgrammeFunctionInvitedTitle,
          note: l10n.hostProgrammeFunctionInvitedNote,
          dividers: CatchSectionPlacement.none,
          children: [
            for (final option in HostProgrammeInvitation.values)
              CatchChoiceTile(
                key: ValueKey<String>(
                  'host-programme-invitation-${option.name}',
                ),
                variant: CatchChoiceTileVariant.row,
                contractExemption: 'Function invitation mode.',
                title: switch (option) {
                  HostProgrammeInvitation.everyone =>
                    l10n.hostProgrammeFunctionEveryone,
                  HostProgrammeInvitation.handPicked =>
                    l10n.hostProgrammeFunctionHandPicked,
                },
                subtitle: switch (option) {
                  HostProgrammeInvitation.everyone =>
                    l10n.hostProgrammeFunctionEveryoneBody,
                  HostProgrammeInvitation.handPicked =>
                    l10n.hostProgrammeFunctionHandPickedBody,
                },
                selected: invitation == option,
                onTap: busy || cancelled
                    ? null
                    : () {
                        if (invitation != option) onInvitation(option);
                      },
              ),
          ],
        ),
        if (dressCode != null && dressCode.isNotEmpty)
          CatchSection(
            title: l10n.hostProgrammeFunctionWearTitle,
            children: [
              CatchIndexRow(
                title: dressCode,
                icon: CatchIcons.person,
                onTap: null,
              ),
            ],
          ),
        CatchSection(
          title: l10n.hostProgrammeFunctionNightTitle,
          action: cancelled
              ? null
              : CatchSectionAction(
                  label: l10n.hostProgrammeFunctionOpenDoor,
                  onPressed: onOpenDoor,
                ),
          children: [
            CatchIndexRow(
              title: l10n.hostProgrammeFunctionCheckIn,
              icon: CatchIcons.checkIn,
              value: function.checkInEnabled
                  ? l10n.hostProgrammeOn
                  : l10n.hostProgrammeOff,
              subtitle: function.checkedInCount == null
                  ? null
                  : l10n.hostProgrammeFunctionCheckedIn(
                      count: function.checkedInCount!,
                    ),
              onTap: null,
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeFunctionWhereTitle,
          children: [
            CatchIndexRow(
              title: function.venueName,
              subtitle: instructions == null || instructions.isEmpty
                  ? null
                  : instructions,
              icon: CatchIcons.location,
              onTap: null,
            ),
          ],
        ),
        if (!cancelled)
          CatchButton(
            key: const ValueKey<String>('host-programme-function-cancel'),
            label: l10n.hostProgrammeFunctionCancel(name: function.name),
            variant: CatchButtonVariant.danger,
            fullWidth: true,
            onPressed: busy ? null : onCancel,
          ),
      ],
    );
  }
}

class _HostProgrammeFunctionSpotlight extends StatelessWidget {
  const _HostProgrammeFunctionSpotlight({
    required this.function,
    required this.replies,
  });

  final OrganizerFunctionDetail function;
  final HostProgrammeFunctionReplies? replies;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final replies = this.replies;
    return CatchSurface(
      block: CatchSurfaceBlock.spotlight,
      color: CatchSurfaceColor.nightsOut,
      child: CatchStack(
        children: [
          CatchText(
            l10n.hostProgrammeFunctionWhen(
              day: AppTimeFormatters.weekdayDayMonth(function.startsAt),
              from: AppTimeFormatters.time(function.startsAt),
              to: AppTimeFormatters.time(function.endsAt),
            ),
            variant: CatchTextVariant.labelKicker,
          ),
          CatchText(function.name, variant: CatchTextVariant.displayLg),
          CatchText(function.venueName, variant: CatchTextVariant.bodySmall),
          if (replies != null)
            CatchStack(
              direction: CatchStackDirection.row,
              equal: true,
              children: [
                CatchMetricTile.stat(
                  label: l10n.hostProgrammeFunctionComing,
                  value: '${replies.coming}',
                  mode: CatchMetricTileMode.plain,
                ),
                CatchMetricTile.stat(
                  label: l10n.hostProgrammeFunctionMaybe,
                  value: '${replies.maybe}',
                  mode: CatchMetricTileMode.plain,
                ),
                CatchMetricTile.stat(
                  label: l10n.hostProgrammeFunctionNoReply,
                  value: '${replies.noReply}',
                  mode: CatchMetricTileMode.plain,
                ),
              ],
            ),
        ],
      ),
    );
  }
}
