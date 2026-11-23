part of 'host_router.dart';

/// Shared `state.extra` casts for routes that accept typed payloads for
/// initial screen state.
String? _routeOrganizerIdExtra(GoRouterState state) => switch (state.extra) {
  final Organizer organizer => organizer.id,
  _ => null,
};

String? _routeOrganizerQueryId(GoRouterState state) =>
    state.uri.queryParameters['organizerId'] ??
    state.uri.queryParameters['organizerId'];

/// Tear-off redirects keep the legacy redirect tables to one line per path.
String? _customersUriRedirect(BuildContext _, GoRouterState state) =>
    hostCustomersLegacyRedirect(state.uri);

String? _formsUriRedirect(BuildContext _, GoRouterState state) =>
    hostFormsLegacyRedirect(state.uri);

String? _operatorEventUriRedirect(BuildContext _, GoRouterState state) =>
    hostOperatorEventLegacyRedirect(
      state.uri,
      eventId: state.pathParameters['eventId']!,
    );

PublicProfile? _routePublicProfileExtra(GoRouterState state) =>
    switch (state.extra) {
      final PublicProfile profile => profile,
      _ => null,
    };

OrganizerMomentScope _eventMomentScope(GoRouterState state) =>
    OrganizerMomentScope.event(state.pathParameters['eventId']!);

OrganizerMomentScope _programMomentScope(GoRouterState state) =>
    OrganizerMomentScope.program(state.pathParameters['programId']!);

String? _organizerAudienceUriRedirect(BuildContext _, GoRouterState state) {
  final setting = state.uri.queryParameters['setting'];
  final route = const {
    Routes.hostOrganizerEventDefaultsScreen,
    Routes.hostOrganizerLiveGuideScreen,
    Routes.hostOrganizerTeamScreen,
    Routes.hostOrganizerPaymentsScreen,
    Routes.hostOrganizerMembershipsScreen,
  }.where((route) => route.name == setting).firstOrNull;
  if (route != null && state.uri.queryParameters['organizerId'] != null) {
    return state.uri
        .replace(
          path: route.path,
          queryParameters: {
            for (final entry in state.uri.queryParameters.entries)
              if (entry.key != 'setting') entry.key: entry.value,
          },
        )
        .toString();
  }
  return hostOrganizerAudienceRedirect(state.uri);
}
