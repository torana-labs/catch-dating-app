import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/routing/route_contract.dart';
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
    icon: CatchIcons.tonight,
    label: l10n.hostNavigationToday,
  ),
  CatchTabBarItem(
    id: HostShellDestination.events,
    icon: CatchIcons.event,
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

/// A weddings company's destinations on the rail and sidebar (RbProgHome):
/// its weddings and its crew.
enum HostPlannerDestination { weddings, crew }

/// The weddings navigation's items. Guest messages and billing across
/// weddings join once those views exist.
List<CatchTabBarItem<HostPlannerDestination>> hostPlannerDestinations({
  required AppLocalizations l10n,
}) => [
  CatchTabBarItem(
    id: HostPlannerDestination.weddings,
    icon: CatchIcons.celebrate,
    label: l10n.hostPlannerNavigationWeddings,
  ),
  CatchTabBarItem(
    id: HostPlannerDestination.crew,
    icon: CatchIcons.people,
    label: l10n.hostPlannerNavigationCrew,
  ),
];

/// "New wedding", the weddings navigation's primary action.
CatchTabBarAction hostPlannerNewWedding({
  required AppLocalizations l10n,
  required VoidCallback? onPressed,
}) => CatchTabBarAction(
  label: l10n.hostPlannerNavigationNewWedding,
  icon: CatchIcons.add,
  onPressed: onPressed,
);

/// Where a weddings navigation destination opens for an organiser.
String hostPlannerDestinationLocation(
  HostPlannerDestination destination,
  String organizerId,
) => switch (destination) {
  HostPlannerDestination.weddings => Uri(
    path: Routes.hostProgramsScreen.path,
    queryParameters: {'view': 'home', 'organizerId': organizerId},
  ).toString(),
  HostPlannerDestination.crew => Uri(
    path: Routes.hostOrganizerTeamScreen.path,
    queryParameters: {'organizerId': organizerId},
  ).toString(),
};

/// Whether [location] is a Host tab's own home, which the weddings
/// navigation replaces with the weddings. A selected record stays.
bool hostPlannerOpensWeddingsFrom(Uri location) =>
    {
      Routes.hostTodayScreen.path,
      Routes.hostEventsScreen.path,
      Routes.hostAudienceScreen.path,
      Routes.hostInboxScreen.path,
      Routes.hostOrganizerScreen.path,
    }.contains(location.path) &&
    !location.queryParameters.containsKey('eventId');

/// Whether the weddings navigation replaces the Host tabs: a weddings
/// company with room for a rail or sidebar. Phones keep the four Host tabs.
bool hostShowsPlannerNavigation({
  required CatchWindowSize size,
  required bool hasWeddingsPlan,
}) =>
    hasWeddingsPlan && hostShellPlacement(size) != CatchTabBarPlacement.bottom;
