part of 'go_router.dart';

/// One route index recipe shared by the visible workspace and its navigator.
/// The navigator anchor retains routing state without mounting a second index.
class HostWorkspaceIndexScreen extends StatelessWidget {
  const HostWorkspaceIndexScreen({
    super.key,
    required this.root,
    required this.uri,
    this.initialEvent,
    this.initialProgramAnchor,
    this.initialContactDisplayName,
    this.initialOrganizerId,
  });
  final Routes root;
  factory HostWorkspaceIndexScreen.route({
    Key? key,
    required Routes root,
    required GoRouterState state,
  }) => HostWorkspaceIndexScreen(
    key: key,
    root: root,
    uri: _hostWorkspaceUri(root, state),
    initialEvent: _routeEventExtra(state),
    initialProgramAnchor: state.extra is OrganizerProgramListAnchor
        ? state.extra as OrganizerProgramListAnchor
        : null,
    initialContactDisplayName: _routeContactNameExtra(state),
    initialOrganizerId: _routeClubIdExtra(state),
  );

  final Uri uri;
  final Event? initialEvent;
  final OrganizerProgramListAnchor? initialProgramAnchor;
  final String? initialContactDisplayName;
  final String? initialOrganizerId;

  @override
  Widget build(BuildContext context) {
    if (HostWorkspaceRouteScope.isNavigatorRoot(context)) {
      return const SizedBox.shrink();
    }
    final organizerId = uri.queryParameters['organizerId'];
    final eventId = uri.queryParameters['eventId'];
    return switch (root) {
      Routes.hostTodayScreen ||
      Routes.hostEventsScreen => HostNavigationWorkspace(
        spec: HostDirectoryWorkspace<({String organizerId, String eventId})>(
          index: root == Routes.hostTodayScreen
              ? HostTodayScreen(initialOrganizerId: organizerId)
              : HostEventsScreen(
                  initialOrganizerId: organizerId,
                  initialProgramId: uri.queryParameters['programId'],
                  initialProgramAnchor: initialProgramAnchor,
                ),
          selection: organizerId == null || eventId == null
              ? null
              : (organizerId: organizerId, eventId: eventId),
          unselected: CatchEmptyState(
            icon: CatchIcons.disclosure,
            title: context.l10n.coreCatchFieldVisiblecopySelect,
          ),
          onBack: () => context.go(hostWorkspaceIndexUri(uri).toString()),
          recordId: (_) => Routes.hostAppEventManageScreen.name,
          detailBuilder: (selection) => HostWorkspaceRouteContent(
            id: hostWorkspaceContentId(
              Routes.hostAppEventManageScreen.name,
              Routes.hostAppEventManageScreen.path,
              {'clubId': selection.organizerId, 'eventId': selection.eventId},
            ),
            builder: (context) => HostEventManageRouteScreen(
              key: ValueKey('${selection.organizerId}/${selection.eventId}'),
              clubId: selection.organizerId,
              eventId: selection.eventId,
              initialEvent: initialEvent,
              initialSection: switch (uri.queryParameters['section']) {
                'live' => HostEventManageSection.live,
                'report' => HostEventManageSection.report,
                'guests' => HostEventManageSection.guests,
                _ => HostEventManageSection.setup,
              },
            ),
          ),
        ),
      ),
      Routes.hostAudienceScreen => switch (hostAudienceViewFromName(
        uri.queryParameters['view'],
      )) {
        HostAudienceView.forms ||
        HostAudienceView.responses => HostNavigationWorkspace(
          spec: HostDirectoryWorkspace<String>(
            index: hostAudienceScreenForUri(uri),
            selection: null,
            detailBuilder: (_) => const SizedBox.shrink(),
            unselected: CatchEmptyState(
              icon: CatchIcons.disclosure,
              title: context.l10n.coreCatchFieldVisiblecopySelect,
            ),
          ),
        ),
        _ => hostAudienceScreenForUri(
          uri,
          initialContactDisplayName: initialContactDisplayName,
        ),
      },
      Routes.hostInboxScreen => hostInboxScreenForUri(
        uri,
        initialOrganizerId: initialOrganizerId,
      ),
      Routes.hostOrganizerScreen => hostOrganizerScreenForUri(uri),
      _ => throw StateError('Not a Host workspace root: $root'),
    };
  }
}
