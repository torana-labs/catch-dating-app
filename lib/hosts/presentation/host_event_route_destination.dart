import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen_state.dart';

/// Which screen an event link opens.
///
/// Every event link (the Events tab, Today and its needs-you rows, the
/// tablet and desktop split view, the workspace's own tabs, insights and the
/// legacy `/attendance` and `/success` URLs) resolves here, so the rebuilt
/// screens are what a host sees. The old event screen remains only as the
/// [movementConsole]: the live view of a night that moves or has a saved room
/// layout, until the redrawn run and crawl console replaces it.
enum HostEventRouteDestination {
  /// The rebuilt event workspace: Overview and its rows.
  workspace,

  /// The rebuilt guest lists: booked, asked, waitlist and cancelled.
  guests,

  /// The rebuilt live console for a night in one room.
  liveConsole,

  /// The old event screen's movement console and room map.
  movementConsole,

  /// The rebuilt event report.
  report,
}

/// The screen for [section], given the event's [phase] and whether tonight
/// runs on the rebuilt live console ([liveConsoleFits], from
/// `hostLiveConsoleFits`).
HostEventRouteDestination hostEventRouteDestination({
  required HostEventManageSection section,
  required HostEventWorkspacePhase phase,
  required bool liveConsoleFits,
}) {
  return switch (section) {
    HostEventManageSection.setup => HostEventRouteDestination.workspace,
    HostEventManageSection.guests => HostEventRouteDestination.guests,
    HostEventManageSection.report => HostEventRouteDestination.report,
    HostEventManageSection.live =>
      phase == HostEventWorkspacePhase.recap
          ? HostEventRouteDestination.report
          : liveConsoleFits
          ? HostEventRouteDestination.liveConsole
          : HostEventRouteDestination.movementConsole,
  };
}

/// Whether [section] can open without reading the event first: the rebuilt
/// workspace and guest lists read and check access themselves.
bool hostEventRouteOpensWithoutEvent(HostEventManageSection section) =>
    section == HostEventManageSection.setup ||
    section == HostEventManageSection.guests;
