part of 'go_router.dart';

HostResponseReviewQueue? _responseReviewQueue(Object? extra) =>
    extra is HostResponseReviewQueue ? extra : null;

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
class _RouterNavigatorKeys {
  final root = GlobalKey<NavigatorState>();
  final dashboard = GlobalKey<NavigatorState>();
  final explore = GlobalKey<NavigatorState>();
  final chats = GlobalKey<NavigatorState>();
  final profile = GlobalKey<NavigatorState>();

  /// One navigator per Host destination, in [HostWorkspaceRoot] order.
  final host = [
    for (final _ in HostWorkspaceRoot.values) GlobalKey<NavigatorState>(),
  ];
}
