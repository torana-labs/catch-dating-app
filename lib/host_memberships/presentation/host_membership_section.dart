import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/host_memberships/domain/host_membership.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_copy.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// One membership on My memberships: status, billing, tenure, savings and
/// the self-serve actions the server will accept for its status.
class HostMembershipSection extends StatelessWidget {
  const HostMembershipSection({
    super.key,
    required this.row,
    required this.now,
    required this.onAction,
    this.pendingAction,
    this.first = false,
  });

  final MyMembershipRow row;
  final DateTime now;
  final ValueChanged<HostMembershipAction> onAction;
  final HostMembershipAction? pendingAction;
  final bool first;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final membership = row.membership;
    final periodEnd = membership.currentPeriodEnd;
    final memberSince = membership.memberSince;
    final busy = pendingAction != null;
    return CatchSection.fieldRows(
      key: ValueKey('host-membership-${membership.id}'),
      title: membership.planName,
      first: first,
      trailing: CatchBadge.status(
        label: hostMembershipStatusLabel(l10n, membership),
        tone: hostMembershipStatusTone(membership.status),
      ),
      children: [
        CatchField.read(
          copy: catchFieldCopy(l10n),
          title: l10n.membershipsDetailPrice,
          valueText: hostMembershipIntervalPrice(
            l10n,
            membership.priceInPaise,
            membership.interval,
          ),
          icon: CatchIcons.payment,
        ),
        if (periodEnd != null && membership.isCurrent)
          CatchField.read(
            copy: catchFieldCopy(l10n),
            title: switch (membership.status) {
              HostMembershipStatus.trialing => l10n.membershipsDetailTrialEnds,
              HostMembershipStatus.canceling => l10n.membershipsDetailEnds,
              HostMembershipStatus.paused => l10n.membershipsDetailPausedSince,
              _ => l10n.membershipsDetailRenews,
            },
            valueText: EventFormatters.longDate(periodEnd),
            icon: CatchIcons.date,
          ),
        if (memberSince != null)
          CatchField.read(
            copy: catchFieldCopy(l10n),
            title: l10n.membershipsDetailMemberSince,
            valueText: l10n.membershipsDetailMemberSinceValue(
              date: EventFormatters.longDate(memberSince),
              days: membership.tenureAt(now).inDays,
            ),
            icon: CatchIcons.history,
          ),
        CatchField.read(
          copy: catchFieldCopy(l10n),
          key: ValueKey('host-membership-saved-${membership.id}'),
          title: l10n.membershipsDetailSaved,
          valueText: hostMembershipPrice(row.savedInPaise),
          body: l10n.membershipsDetailSavedBody,
          icon: CatchIcons.wallet,
        ),
        if (membership.pausedByHost)
          CatchField.content(
            copy: catchFieldCopy(l10n),
            title: l10n.membershipsDetailHostPausedTitle,
            body: l10n.membershipsDetailHostPausedBody,
            icon: CatchIcons.pause,
          ),
        if (membership.status == HostMembershipStatus.pastDue)
          CatchField.content(
            copy: catchFieldCopy(l10n),
            title: l10n.membershipsDetailPastDueTitle,
            body: l10n.membershipsDetailPastDueBody,
            icon: CatchIcons.warning,
          ),
        for (final action in HostMembershipAction.values)
          if (membership.availableActions.contains(action))
            CatchField.action(
              copy: catchFieldCopy(l10n),
              key: ValueKey('host-membership-${action.name}-${membership.id}'),
              title: switch (action) {
                HostMembershipAction.pause => l10n.membershipsActionPause,
                HostMembershipAction.resume => l10n.membershipsActionResume,
                HostMembershipAction.cancelAtPeriodEnd =>
                  l10n.membershipsActionCancel,
              },
              icon: switch (action) {
                HostMembershipAction.pause => CatchIcons.pause,
                HostMembershipAction.resume => CatchIcons.play,
                HostMembershipAction.cancelAtPeriodEnd => CatchIcons.close,
              },
              tone: action == HostMembershipAction.cancelAtPeriodEnd
                  ? CatchFieldTone.danger
                  : CatchFieldTone.normal,
              status: pendingAction == action
                  ? CatchFieldStatus.saving
                  : CatchFieldStatus.idle,
              onTap: busy ? null : () => onAction(action),
            ),
      ],
    );
  }
}
