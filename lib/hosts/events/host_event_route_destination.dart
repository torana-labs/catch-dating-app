import 'package:catch_dating_app/hosts/events/host_event_manage_screen_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_moving_night.dart';

/// Which screen an event link opens.
///
/// Every event link (the Events tab, Today and its needs-you rows, the
/// tablet and desktop split view, the workspace's own tabs, insights and the
/// legacy `/attendance` and `/success` URLs) resolves here, so the rebuilt
/// screens are what a host sees.
enum HostEventRouteDestination {
  /// The rebuilt event workspace: Overview and its rows.
  workspace,

  /// The rebuilt guest lists: booked, asked, waitlist and cancelled.
  guests,

  /// The rebuilt live console for a night in one room.
  liveConsole,

  /// The rebuilt run console: a social run or any night in pace pods.
  runConsole,

  /// The rebuilt crawl board: a pub crawl or any night with located stops.
  crawlBoard,

  /// The rebuilt event report.
  report,
}

/// The screen for [section], given the event's [phase], whether tonight
/// runs on the rebuilt one-room console ([liveConsoleFits], from
/// `hostLiveConsoleFits`) and, when it does not, which rebuilt console a
/// night that moves runs on ([movingNight], from `hostMovingNightView`).
///
/// Every night the one-room console does not fit moves, so [movingNight] is
/// set whenever [liveConsoleFits] is false; the one-room console stays the
/// answer if it ever is not.
HostEventRouteDestination hostEventRouteDestination({
  required HostEventManageSection section,
  required HostEventWorkspacePhase phase,
  required bool liveConsoleFits,
  HostMovingNightView? movingNight,
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
          : switch (movingNight) {
              HostMovingNightView.run => HostEventRouteDestination.runConsole,
              HostMovingNightView.crawl => HostEventRouteDestination.crawlBoard,
              null => HostEventRouteDestination.liveConsole,
            },
  };
}

/// Whether [section] can open without reading the event first: the rebuilt
/// workspace and guest lists read and check access themselves.
bool hostEventRouteOpensWithoutEvent(HostEventManageSection section) =>
    section == HostEventManageSection.setup ||
    section == HostEventManageSection.guests;
