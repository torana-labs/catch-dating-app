import 'package:catch_dating_app/routing/shell/app_shell_keys.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The Host app's four destinations, in branch order.
enum HostShellDestination { today, events, people, organizer }

/// Who the Host app acts as and who is signed in, as the navigation shows
/// them.
@immutable
class HostShellIdentity {
  const HostShellIdentity({required this.name, this.photoUrl});

  final String name;
  final String? photoUrl;
}

/// The Host navigation: Today, Events, People and Organizer, with "New event"
/// as the rail and sidebar primary action, the selected organizer as the
/// header and the signed-in person as the sidebar footer.
///
/// Provider-free: the shell screen passes every value in.
CatchTabBar<HostShellDestination> hostShellNavigation({
  required AppLocalizations l10n,
  required HostShellDestination active,
  required ValueChanged<HostShellDestination> onChanged,
  required CatchWindowSize size,
  required int unreadCount,
  required HostShellIdentity? organizer,
  required HostShellIdentity? person,
  required VoidCallback? onNewEvent,
  required VoidCallback? onSwitchOrganizer,
}) {
  final organizerHint = onSwitchOrganizer == null
      ? null
      : l10n.hostsHostTodayTooltipSwitchOrganizer;
  return CatchTabBar<HostShellDestination>(
    key: AppShellKeys.navigationBar,
    // The app has no CatchRoot yet, so the shell resolves the size class.
    layout: switch (size) {
      CatchWindowSize.compact => CatchTabBarPlacement.bottom,
      CatchWindowSize.medium => CatchTabBarPlacement.rail,
      CatchWindowSize.expanded => CatchTabBarPlacement.sidebar,
    },
    active: active,
    onChanged: onChanged,
    label: l10n.appTitleHost,
    items: [
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
        semanticValue: organizer?.name,
        semanticHint: organizerHint,
      ),
    ],
    primaryAction: CatchTabBarAction(
      label: l10n.hostNavigationNewEvent,
      icon: CatchIcons.add,
      onPressed: onNewEvent,
    ),
    header: organizer == null
        ? null
        : CatchTabBarIdentity(
            key: const ValueKey<String>('host-shell-organizer-identity'),
            name: organizer.name,
            photoUrl: organizer.photoUrl,
            switcher: onSwitchOrganizer != null,
            note: organizerHint,
            onTap: onSwitchOrganizer,
          ),
    footer: person == null
        ? null
        : CatchTabBarIdentity(
            key: const ValueKey<String>('host-shell-person-identity'),
            name: person.name,
            photoUrl: person.photoUrl,
          ),
  );
}
