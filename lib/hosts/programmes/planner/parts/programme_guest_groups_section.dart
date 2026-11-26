import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_reply_badge.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The guest groups: each with its kind, how many guests and the hotel its
/// guests stay at, New group, and a tap to change or delete one. Null
/// [onEditGroup] shows them read-only.
class ProgrammeGuestGroupsSection extends StatelessWidget {
  const ProgrammeGuestGroupsSection({
    super.key,
    required this.groups,
    required this.hotels,
    this.onEditGroup,
  });

  final List<ProgramGuestGroupRow> groups;
  final List<ProgramHotel> hotels;

  /// Opens a group, or a new group for null.
  final ValueChanged<ProgramGuestGroupRow?>? onEditGroup;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final edit = onEditGroup;
    return CatchSection(
      key: const ValueKey<String>('host-programme-groups'),
      title: l10n.programsGuestsGroupsTitle,
      action: edit == null
          ? null
          : CatchSectionAction(
              label: l10n.programsGuestsGroupNew,
              onPressed: () => edit(null),
            ),
      empty: l10n.programsGuestsGroupsEmpty,
      children: [
        for (final group in groups)
          CatchIndexRow(
            key: ValueKey<String>('host-programme-group-${group.groupId}'),
            title: group.label,
            titleMaxLines: 2,
            subtitle: [
              group.dimension,
              l10n.programsGuestsGroupMembers(count: group.memberCount),
              if (group.hotelId case final hotelId?)
                l10n.programsGuestsGroupHotelSummary(
                  hotel:
                      hotels
                          .where((hotel) => hotel.hotelId == hotelId)
                          .firstOrNull
                          ?.name ??
                      l10n.programsGuestsHotelUnavailable,
                ),
            ].join(' · '),
            onTap: edit == null ? null : () => edit(group),
          ),
      ],
    );
  }
}

/// Guests who belong to no household, each with their answer for every
/// function and a tap to change those answers.
class ProgrammeNoHouseholdSection extends StatelessWidget {
  const ProgrammeNoHouseholdSection({
    super.key,
    required this.state,
    required this.guests,
    this.onEditGuest,
  });

  final HostProgrammeState state;
  final List<ProgramGuestRow> guests;
  final ValueChanged<ProgramGuestRow>? onEditGuest;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final edit = onEditGuest;
    return CatchSection(
      key: const ValueKey<String>('host-programme-no-household'),
      title: l10n.programsGuestsNoHousehold,
      children: [
        for (final guest in guests)
          CatchIndexRow(
            key: ValueKey<String>('host-programme-guest-${guest.guestId}'),
            title: guest.displayName,
            footer: CatchStack(
              direction: CatchStackDirection.row,
              equal: true,
              gap: CatchStackGap.g4,
              children: [
                for (final function in state.functions)
                  programmeReplyBadge(l10n, state.reply(guest, function)),
              ],
            ),
            onTap: edit == null ? null : () => edit(guest),
          ),
      ],
    );
  }
}
