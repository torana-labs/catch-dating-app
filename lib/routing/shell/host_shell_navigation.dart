import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';

/// The Host app's four destinations, in branch order.
enum HostShellDestination { today, events, people, organizer }

/// The Host destinations: Today, Events, People (the audience and the inbox,
/// badged with unread messages) and Organizer (long press switches organizer).
///
/// Provider-free: the shell screen passes every value in.
List<CatchTabBarItem<HostShellDestination>> hostShellDestinations({
  required AppLocalizations l10n,
  required int unreadCount,
  required String? organizerName,
  required VoidCallback? onSwitchOrganizer,
}) => [
  CatchTabBarItem(
    id: HostShellDestination.today,
    icon: CatchIcons.home,
    label: l10n.hostNavigationToday,
  ),
  CatchTabBarItem(
    id: HostShellDestination.events,
    icon: CatchIcons.ticket,
    label: l10n.hostNavigationEvents,
  ),
  CatchTabBarItem(
    id: HostShellDestination.people,
    icon: CatchIcons.people,
    label: l10n.hostNavigationPeople,
    badgeCount: unreadCount,
  ),
  CatchTabBarItem(
    id: HostShellDestination.organizer,
    icon: CatchIcons.organizer,
    label: l10n.hostNavigationOrganizer,
    onLongPress: onSwitchOrganizer,
    semanticValue: organizerName,
    semanticHint: onSwitchOrganizer == null
        ? null
        : l10n.hostsHostTodayTooltipSwitchOrganizer,
  ),
];

/// "New event", the rail and sidebar primary action.
CatchTabBarAction hostShellNewEvent({
  required AppLocalizations l10n,
  required VoidCallback? onPressed,
}) => CatchTabBarAction(
  label: l10n.hostNavigationNewEvent,
  icon: CatchIcons.add,
  onPressed: onPressed,
);

/// Where the navigation sits for a window size. The app has no CatchRoot
/// yet, so the shell resolves the size class itself.
CatchTabBarPlacement hostShellPlacement(CatchWindowSize size) => switch (size) {
  CatchWindowSize.compact => CatchTabBarPlacement.bottom,
  CatchWindowSize.medium => CatchTabBarPlacement.rail,
  CatchWindowSize.expanded => CatchTabBarPlacement.sidebar,
};
