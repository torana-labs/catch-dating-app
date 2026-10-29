import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

Future<String?> showHostOrganizerSwitcherSheet({
  required BuildContext context,
  required List<Club> clubs,
  required String selectedOrganizerId,
}) {
  assert(clubs.length > 1, 'Organizer switcher requires multiple organizers.');
  return showCatchBottomSheet<String>(
    context: context,
    builder: (sheetContext) => HostOrganizerSwitcherSheet(
      clubs: clubs,
      selectedOrganizerId: selectedOrganizerId,
    ),
  );
}

class HostOrganizerAvatar extends StatelessWidget {
  const HostOrganizerAvatar({
    super.key,
    required this.club,
    required this.size,
    this.selected = false,
  });

  final Club club;
  final double size;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final rawLogoUrl = club.logoPhotoUrl?.trim();
    return CatchAvatar(
      size: size,
      name: club.name,
      initials: CatchAvatar.initialsOf(club.name),
      imageUrl: rawLogoUrl?.isNotEmpty == true ? rawLogoUrl : null,
      colors: ActivityPalette.resolve(
        context,
        club.hostDefaults.primaryActivityKind,
      ).avatarColors,
      borderWidth: selected ? CatchStroke.underline : CatchStroke.hairline,
      borderColor: selected ? t.ink : t.line2,
    );
  }
}

class HostOrganizerSwitcherSheet extends StatelessWidget {
  const HostOrganizerSwitcherSheet({
    super.key,
    required this.clubs,
    required this.selectedOrganizerId,
  });

  final List<Club> clubs;
  final String selectedOrganizerId;

  @override
  Widget build(BuildContext context) {
    return CatchSelectionSheet<String>(
      key: const ValueKey<String>('host-organizer-switcher-sheet'),
      title: context.l10n.hostsHostTodayTooltipSwitchClub,
      value: selectedOrganizerId,
      items: [
        for (final club in clubs)
          CatchSelectionMenuItem(value: club.id, label: club.name),
      ],
    );
  }
}
