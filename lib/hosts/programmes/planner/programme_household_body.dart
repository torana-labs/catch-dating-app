import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_household_row.dart';
import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_reply_badge.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_view.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One household in board order: its side, groups, size and whether it
/// has replied, the person to call, each member's answer for each
/// function, and Send their link again.
class HostProgrammeHouseholdBody extends StatelessWidget {
  const HostProgrammeHouseholdBody({
    super.key,
    required this.state,
    required this.householdId,
    required this.onCall,
    required this.onSendLink,
    required this.onRetry,
    this.sending = false,
  });

  final HostProgrammeState state;
  final String householdId;

  /// Calls a member's phone.
  final ValueChanged<String> onCall;
  final VoidCallback? onSendLink;
  final VoidCallback onRetry;

  /// The RSVP link is being made.
  final bool sending;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (state.status != HostProgrammeStatus.ready || state.guests == null) {
      return HostProgrammeStateView(
        status: state.status == HostProgrammeStatus.ready
            ? HostProgrammeStatus.loading
            : state.status,
        onRetry: onRetry,
      );
    }
    final household = state.household(householdId);
    if (household == null) {
      return CatchPageBody.screen(
        child: CatchEmptyState(
          icon: CatchIcons.people,
          title: l10n.hostProgrammeHouseholdMissing,
        ),
      );
    }
    final functions = state.functions;
    final contact = household.members
        .where((member) => member.phoneE164 != null)
        .firstOrNull;
    return CatchPageBody.screen(
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g6,
          wrap: true,
          children: [
            for (final group in household.groups) CatchBadge(label: group),
            CatchBadge(
              label: l10n.hostProgrammeGuestCount(
                count: household.members.length,
              ),
            ),
            if (household.replied)
              CatchBadge(
                label: l10n.hostProgrammeHouseholdReplied,
                tone: CatchBadgeTone.success,
                icon: CatchIcons.check,
              )
            else
              CatchBadge(
                label: l10n.hostProgrammeHouseholdWaiting,
                tone: CatchBadgeTone.warning,
              ),
          ],
        ),
        if (contact != null)
          CatchIndexRow(
            key: const ValueKey<String>('host-programme-household-contact'),
            title: contact.displayName,
            subtitle: contact.phoneE164,
            leading: CatchAvatar.system(
              size: CatchAvatarSize.md,
              name: contact.displayName,
            ),
            action: CatchIndexRowAction(
              label: l10n.hostProgrammeCall,
              onPressed: () => onCall(contact.phoneE164!),
            ),
            onTap: null,
          ),
        CatchSection(
          title: l10n.hostProgrammeGuestsGridTitle,
          children: [
            ProgrammeGridKicker(names: [for (final f in functions) f.name]),
            for (final member in household.members)
              CatchIndexRow(
                key: ValueKey<String>(
                  'host-programme-member-${member.guestId}',
                ),
                title: member.displayName,
                footer: CatchStack(
                  direction: CatchStackDirection.row,
                  equal: true,
                  gap: CatchStackGap.g4,
                  children: [
                    for (final function in functions)
                      programmeReplyBadge(l10n, state.reply(member, function)),
                  ],
                ),
                onTap: null,
              ),
          ],
        ),
        CatchButton(
          key: const ValueKey<String>('host-programme-household-link'),
          label: l10n.hostProgrammeHouseholdSendLink,
          variant: CatchButtonVariant.secondary,
          leading: CatchIcon(CatchIcons.send),
          fullWidth: true,
          status: sending ? CatchButtonStatus.loading : CatchButtonStatus.idle,
          onPressed: sending ? null : onSendLink,
        ),
      ],
    );
  }
}
