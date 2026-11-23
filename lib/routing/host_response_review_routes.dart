part of 'host_router.dart';

HostEventManageSection _hostManageSectionFromState(GoRouterState state) {
  return switch (state.uri.queryParameters['section']) {
    'guests' => HostEventManageSection.guests,
    'live' => HostEventManageSection.live,
    'report' => HostEventManageSection.report,
    _ => HostEventManageSection.setup,
  };
}

/// Navigator identity belongs to one [GoRouter] lifecycle. Keeping these keys
/// beside the provider instance prevents disposed test/app containers from
/// retaining navigators that block a fresh router from mounting.
class _HostNavigatorKeys {
  final root = GlobalKey<NavigatorState>();
  final hostToday = GlobalKey<NavigatorState>();
  final hostEvents = GlobalKey<NavigatorState>();
  final hostPeople = GlobalKey<NavigatorState>();
  final hostOrganizer = GlobalKey<NavigatorState>();
}
