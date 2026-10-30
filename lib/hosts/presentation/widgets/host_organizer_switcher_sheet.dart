import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

Future<String?> showHostOrganizerSwitcherSheet({
  required BuildContext context,
  required List<Organizer> organizers,
  required String selectedOrganizerId,
}) {
  assert(
    organizers.length > 1,
    'Organizer switcher requires multiple organizers.',
  );
  return showCatchBottomSheet<String>(
    context: context,
    builder: (sheetContext) => HostOrganizerSwitcherSheet(
      organizers: organizers,
      selectedOrganizerId: selectedOrganizerId,
    ),
  );
}

class HostOrganizerAvatar extends StatelessWidget {
  const HostOrganizerAvatar({
    super.key,
    required this.organizer,
    required this.size,
    this.selected = false,
  });

  final Organizer organizer;
  final double size;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final rawLogoUrl = organizer.logoPhotoUrl?.trim();
    return CatchAvatar(
      size: size,
      name: organizer.name,
      initials: CatchAvatar.initialsOf(organizer.name),
      imageUrl: rawLogoUrl?.isNotEmpty == true ? rawLogoUrl : null,
      colors: ActivityPalette.resolve(
        context,
        organizer.hostDefaults.primaryActivityKind,
      ).avatarColors,
      borderWidth: selected ? CatchStroke.underline : CatchStroke.hairline,
      borderColor: selected ? t.ink : t.line2,
    );
  }
}

class HostOrganizerSwitcherSheet extends StatelessWidget {
  const HostOrganizerSwitcherSheet({
    super.key,
    required this.organizers,
    required this.selectedOrganizerId,
  });

  final List<Organizer> organizers;
  final String selectedOrganizerId;

  @override
  Widget build(BuildContext context) {
    return CatchSelectionSheet<String>(
      key: const ValueKey<String>('host-organizer-switcher-sheet'),
      title: context.l10n.hostsHostTodayTooltipSwitchOrganizer,
      value: selectedOrganizerId,
      items: [
        for (final organizer in organizers)
          CatchSelectionMenuItem(value: organizer.id, label: organizer.name),
      ],
    );
  }
}
