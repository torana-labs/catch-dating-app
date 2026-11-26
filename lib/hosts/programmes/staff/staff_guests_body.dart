import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_guest_groups_section.dart';
import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_household_row.dart';
import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_reply_badge.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_guests_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The guest list for staff in board order: Add guest for a coordinator,
/// each household with its members and their answer for every function
/// (tap a guest to change them) and Share RSVP link, the guests with no
/// household, and the guest groups (editable for a coordinator).
class StaffGuestsBody extends StatelessWidget {
  const StaffGuestsBody({
    super.key,
    required this.state,
    required this.onRetry,
    required this.onEditGuest,
    required this.onShareLink,
    required this.onAddGuest,
    required this.onEditGroup,
    this.sharingHouseholdId,
  });

  final StaffGuestsState state;
  final VoidCallback onRetry;

  /// Opens a guest's answers.
  final void Function(ProgramGuestRow guest, String? household) onEditGuest;
  final ValueChanged<ProgramHouseholdRow> onShareLink;
  final VoidCallback onAddGuest;

  /// Opens a group, or a new group for null.
  final ValueChanged<ProgramGuestGroupRow?> onEditGroup;

  /// The household whose RSVP link is being made.
  final String? sharingHouseholdId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case StaffGuestsStatus.loading:
        return HostProgrammeStateBody(
          status: HostProgrammeStatus.loading,
          onRetry: onRetry,
        );
      case StaffGuestsStatus.error:
        return HostProgrammeStateBody(
          status: HostProgrammeStatus.error,
          onRetry: onRetry,
        );
      case StaffGuestsStatus.locked:
        return CatchPageBody.screen(
          child: CatchEmptyState(
            key: const ValueKey<String>('staff-guests-locked'),
            icon: CatchIcons.locked,
            title: l10n.programsGuestDeskAccessTitle,
            message: l10n.programsGuestDeskAccessMessage,
          ),
        );
      case StaffGuestsStatus.content:
        break;
    }
    final functions = state.functions;
    final names = [for (final function in functions) function.name];
    final empty = state.households.isEmpty && state.unaffiliated.isEmpty;
    return CatchPageBody.screen(
      children: [
        if (state.canManage)
          CatchButton(
            key: const ValueKey<String>('staff-guests-add'),
            label: l10n.programsGuestsAddGuest,
            variant: CatchButtonVariant.secondary,
            leading: CatchIcon(CatchIcons.addPerson),
            fullWidth: true,
            onPressed: onAddGuest,
          ),
        if (empty)
          CatchEmptyState(
            icon: CatchIcons.people,
            title: l10n.programsGuestsEmptyTitle,
            message: l10n.programsGuestsEmptyMessage,
          ),
        for (final entry in [
          for (final household in state.households)
            (household.household, household.members),
          if (state.unaffiliated.isNotEmpty) (null, state.unaffiliated),
        ])
          CatchSection(
            key: ValueKey<String>(
              'staff-guests-household-${entry.$1?.householdId ?? 'none'}',
            ),
            title: entry.$1?.label ?? l10n.programsGuestsNoHousehold,
            action: switch (entry.$1) {
              final household? when state.canShareLinks => CatchSectionAction(
                label: l10n.programsGuestsShareRsvpLink,
                onPressed: sharingHouseholdId == null
                    ? () => onShareLink(household)
                    : null,
              ),
              _ => null,
            },
            children: [
              ProgrammeGridHeader(names: names),
              for (final guest in entry.$2)
                CatchIndexRow(
                  key: ValueKey<String>('staff-guests-guest-${guest.guestId}'),
                  title: guest.displayName,
                  footer: CatchStack(
                    direction: CatchStackDirection.row,
                    equal: true,
                    gap: CatchStackGap.g4,
                    children: [
                      for (final function in functions)
                        programmeReplyBadge(l10n, state.reply(guest, function)),
                    ],
                  ),
                  onTap: () => onEditGuest(guest, entry.$1?.label),
                ),
            ],
          ),
        ProgrammeGuestGroupsSection(
          groups: state.groups,
          hotels: state.hotels,
          onEditGroup: state.canManage ? onEditGroup : null,
        ),
      ],
    );
  }
}
