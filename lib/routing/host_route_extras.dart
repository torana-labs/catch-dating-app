part of 'go_router.dart';

/// Shared `state.extra` casts for routes that accept typed payloads for
/// initial screen state.
Event? _routeEventExtra(GoRouterState state) => switch (state.extra) {
  final Event event => event,
  _ => null,
};

String? _routeOrganizerIdExtra(GoRouterState state) => switch (state.extra) {
  final Organizer organizer => organizer.id,
  _ => null,
};

HostSavedAudience? _routeAudienceExtra(GoRouterState state) =>
    switch (state.extra) {
      final HostSavedAudience audience => audience,
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

String? _routeContactNameExtra(GoRouterState state) => switch (state.extra) {
  HostCustomerDetailRouteArguments(:final displayName) => displayName,
  _ => null,
};

PublicProfile? _routePublicProfileExtra(GoRouterState state) =>
    switch (state.extra) {
      final PublicProfile profile => profile,
      _ => null,
    };

void _wireRouterRefresh(
  Ref ref,
  _RouterRefreshNotifier notifier, {
  required bool isHostApp,
}) {
  ref.listen(uidProvider, (_, _) => notifier.notify());
  ref.listen(authControllerProvider, (previous, next) {
    if (previous?.hasPendingVerification != next.hasPendingVerification) {
      notifier.notify();
    }
  });
  if (!isHostApp) {
    ref.listen(watchUserProfileProvider, (_, _) => notifier.notify());
  }
  ref.onDispose(notifier.dispose);
}

String? _appRedirectFor(
  Ref ref,
  GoRouterState state, {
  required bool isHostApp,
}) {
  return appRedirect(
    uidAsync: ref.read(uidProvider),
    userProfileAsync: isHostApp
        ? const AsyncData<UserProfile?>(null)
        : ref.read(watchUserProfileProvider),
    hasPendingAuthVerification: ref
        .read(authControllerProvider)
        .hasPendingVerification,
    matchedLocation: state.matchedLocation,
    uri: state.uri,
  );
}

/// Compatibility provider for test harnesses that intentionally exercise both
/// role graphs in one Dart process. Installable app roots use one of the two
/// compile-time role providers above.
// keepalive: compatibility tests need one stable role-selected router graph.
@Riverpod(keepAlive: true)
GoRouter goRouter(Ref ref) {
  return _buildGoRouter(ref, isHostApp: AppConfig.appRole.isHost);
}

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

class _RouterRefreshNotifier extends ChangeNotifier {
  void notify() => notifyListeners();
}

// keepalive: GoRouter is the app-wide navigation graph and owns route refresh
// listeners for auth/update state.
@Riverpod(keepAlive: true)
GoRouter consumerGoRouter(Ref ref) => _buildGoRouter(ref, isHostApp: false);

// keepalive: Host navigation is the app-wide route graph for the Host root.
@Riverpod(keepAlive: true)
GoRouter hostGoRouter(Ref ref) => _buildGoRouter(ref, isHostApp: true);

const _fromQueryParam = 'from';
const _onboardingIntentQueryParam = 'intent';
const _completeProfileIntent = 'complete-profile';
const _completeRunPreferencesIntent = 'complete-run-preferences';
const _initialRouteOverride = String.fromEnvironment('CATCH_INITIAL_ROUTE');
