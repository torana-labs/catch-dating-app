part of 'go_router.dart';

/// One route index recipe shared by the visible workspace and its navigator.
/// The navigator anchor retains routing state without mounting a second index.
class HostWorkspaceIndexScreen extends StatelessWidget {
  const HostWorkspaceIndexScreen({
    super.key,
    required this.root,
    required this.uri,
    this.initialEvent,
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
    initialOrganizerId: _routeOrganizerIdExtra(state),
  );

  final Uri uri;
  final Event? initialEvent;
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
              : HostEventsTabScreen(initialOrganizerId: organizerId),
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
              {
                'organizerId': selection.organizerId,
                'eventId': selection.eventId,
              },
            ),
            builder: (context) => HostEventManageRouteScreen(
              key: ValueKey('${selection.organizerId}/${selection.eventId}'),
              organizerId: selection.organizerId,
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
        // People draws its own list and detail; a pushed People destination
        // takes the pane, as the legacy screen did.
        _ => HostNavigationWorkspace(
          spec: HostTaskWorkspace(content: hostPeopleScreenForUri(uri)),
        ),
      },
      Routes.hostInboxScreen => HostNavigationWorkspace(
        spec: HostTaskWorkspace(
          content: hostMessagesScreenForUri(
            uri,
            initialOrganizerId: initialOrganizerId,
          ),
        ),
      ),
      // The rebuilt organizer screens sit in a task workspace so a pushed
      // organizer destination takes the pane, as the legacy screen did.
      Routes.hostOrganizerScreen => switch (uri.queryParameters['tab']) {
        'page' || 'edit' when uri.queryParameters['editField'] == null =>
          HostNavigationWorkspace(
            spec: HostTaskWorkspace(
              content: OrganizerPageEditScreen(initialOrganizerId: organizerId),
            ),
          ),
        'settings' => HostNavigationWorkspace(
          spec: HostTaskWorkspace(
            content: OrganizerSettingsScreen(initialOrganizerId: organizerId),
          ),
        ),
        null when uri.queryParameters['editField'] == null =>
          HostNavigationWorkspace(
            spec: HostTaskWorkspace(
              content: OrganizerScreen(initialOrganizerId: organizerId),
            ),
          ),
        _ => hostOrganizerScreenForUri(uri),
      },
      _ => throw StateError('Not a Host workspace root: $root'),
    };
  }
}
