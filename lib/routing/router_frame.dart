import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_readiness.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/pages/sign_in/auth_controller.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_platform/routing/onboarding_completion_location.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/schema_contracts/generated/profile_requirements.g.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'router_frame.g.dart';

// What both apps' routers share around their route tables: the refresh
// bridge, the auth and profile redirect, the initial location, the loading
// route's screen and the typed `state.extra` readers for shared pages. Each
// app's router file owns its own GoRoute declarations.

/// The refresh signal for an app's GoRouter: sign-in, sign-out and a pending
/// phone verification, plus the profile document for the guest app. It is
/// disposed with [ref].
Listenable appRouterRefresh(Ref ref, {required bool isHostApp}) {
  final notifier = _RouterRefreshNotifier();
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
  return notifier;
}

/// The GoRouter redirect for an app: [appRedirect] over the current auth and
/// profile state. The Host app never waits on a guest profile.
String? appRedirectFor(
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

// provider-graph: ownership-listenable:_RouterRefreshNotifier:reactive-state accepted-exception -- GoRouter requires a Listenable refresh bridge. This exact class bridges routing invalidation, owns no feature loaded/business state, and must retain listener cleanup; it is not a business controller migration.
class _RouterRefreshNotifier extends ChangeNotifier {
  void notify() => notifyListeners();
}

/// Shared `state.extra` casts for routes that accept typed payloads for
/// initial screen state.
Event? routeEventExtra(GoRouterState state) => switch (state.extra) {
  final Event event => event,
  _ => null,
};

/// The organiser a route was opened with, for its first frame.
Organizer? routeOrganizerExtra(GoRouterState state) => switch (state.extra) {
  final Organizer organizer => organizer,
  _ => null,
};

/// The event page's route payload. A bare [Event] opens the page with the
/// platform transition and the standard presentation.
EventDetailRouteExtra eventDetailRouteExtra(GoRouterState state) =>
    switch (state.extra) {
      final EventDetailRouteExtra extra => extra,
      final Event event => EventDetailRouteExtra(initialEvent: event),
      _ => const EventDetailRouteExtra(),
    };

/// The loading route: a plain loading state, or the guest profile read the
/// redirect is waiting on, with its retry.
class RouteLoadingScreen extends StatelessWidget {
  const RouteLoadingScreen({super.key, required this.isHostApp});

  final bool isHostApp;

  @override
  Widget build(BuildContext context) {
    return CatchScaffold.standalone(
      backgroundColor: CatchTokens.of(context).bg,
      body: Consumer(
        builder: (context, ref, _) {
          const loading = CatchStateViewport.loading(
            accountForBottomOverlay: false,
          );
          final uidAsync = ref.watch(uidProvider);
          final needsProfile =
              !isHostApp && !uidAsync.isLoading && uidAsync.value != null;
          return needsProfile
              ? CatchStateViewport(
                  accountForBottomOverlay: false,
                  child: CatchAsyncBoundary<UserProfile?>(
                    value: ref.watch(watchUserProfileProvider),
                    errorContext: AppErrorContext.profile,
                    retainDataOn: const {},
                    onRetry: () => ref.invalidate(watchUserProfileProvider),
                    loadingBuilder: (_) => loading,
                    // The router refresh resumes the destination once resolved.
                    builder: (_, _) => loading,
                  ),
                )
              : loading;
        },
      ),
    );
  }
}

const _fromQueryParam = routeFromQueryParam;
const _onboardingIntentQueryParam = onboardingIntentQueryParam;
const _completeProfileIntent = completeProfileIntent;
const _completeRunPreferencesIntent = completeRunPreferencesIntent;
const _initialRouteOverride = String.fromEnvironment('CATCH_INITIAL_ROUTE');

String? _pendingDestination({
  required Uri uri,
  required String matchedLocation,
}) {
  final from = _sanitizeFrom(uri.queryParameters[_fromQueryParam]);
  if (from != null) return from;
  if (_isTransientRoute(matchedLocation)) return null;
  return uri.toString();
}

String _resumeDestination(Uri uri) {
  final from = _sanitizeFrom(uri.queryParameters[_fromQueryParam]);
  final defaultPath = AppConfig.appRole.isHost
      ? Routes.hostTodayScreen.path
      : Routes.dashboardScreen.path;
  if (from == null) return defaultPath;

  final targetPath = Uri.parse(from).path;
  if (_isTransientRoute(targetPath)) {
    return defaultPath;
  }
  if (AppConfig.appRole.isHost && !_isHostRoute(targetPath)) {
    return defaultPath;
  }
  return from;
}

String? _hostPendingDestination({
  required Uri uri,
  required String matchedLocation,
}) {
  final from = _sanitizeFrom(uri.queryParameters[_fromQueryParam]);
  if (from != null && _isHostRoute(Uri.parse(from).path)) return from;
  if (_isTransientRoute(matchedLocation)) return null;
  if (_isHostRoute(uri.path)) return uri.toString();
  return null;
}

String _locationWithFrom(String path, {String? from}) {
  final safeFrom = _sanitizeFrom(from);
  if (safeFrom == null || Uri.parse(safeFrom).path == path) {
    return path;
  }
  return Uri(
    path: path,
    queryParameters: {_fromQueryParam: safeFrom},
  ).toString();
}

/// URL hints choose questions only; event admission rechecks live requirements.
List<String>? eventRequirementsFromUri(Uri uri) {
  final value = uri.queryParameters['eventRequirements'];
  if (value == null) return null;
  final requirements = value
      .split(',')
      .where((part) => part.isNotEmpty)
      .toSet()
      .toList();
  return requirements.every(eventProfileRequirements.containsKey)
      ? requirements
      : null;
}

String? _sanitizeFrom(String? from) => sanitizeRouteFrom(from);

bool _isTransientRoute(String path) =>
    path == Routes.loadingScreen.path ||
    path == Routes.startScreen.path ||
    path == Routes.authScreen.path ||
    path == Routes.onboardingScreen.path;

bool _isHostRoute(String? path) =>
    path == Routes.hostHomeScreen.path ||
    (path?.startsWith('${Routes.hostHomeScreen.path}/') ?? false);

// keepalive: account-free: initial app location is startup routing state
// consumed by each app's keepAlive GoRouter provider.
@Riverpod(keepAlive: true)
String initialAppLocation(Ref ref) => _initialLocationFromPlatform();

String _initialLocationFromPlatform() {
  if (_initialRouteOverride.startsWith('/')) {
    return _initialRouteOverride;
  }

  final defaultRouteName =
      WidgetsBinding.instance.platformDispatcher.defaultRouteName;
  if (defaultRouteName.isNotEmpty &&
      defaultRouteName != Navigator.defaultRouteName) {
    if (AppConfig.appRole.isHost) {
      final routePath = Uri.tryParse(defaultRouteName)?.path;
      if (_isHostRoute(routePath) ||
          routePath == Routes.authScreen.path ||
          routePath == Routes.loadingScreen.path) {
        return defaultRouteName;
      }
      return Routes.hostTodayScreen.path;
    }
    return defaultRouteName;
  }
  return AppConfig.appRole.isHost
      ? Routes.hostTodayScreen.path
      : Routes.startScreen.path;
}

/// Routes that unauthenticated users may access for read-only browsing.
///
/// Keep this matcher explicit: nested account-only routes must not become public
/// merely because their parent organizer route is public.
@visibleForTesting
bool isGuestPublicRoute(String matchedLocation) {
  if (matchedLocation == Routes.startScreen.path) return true;
  if (matchedLocation == Routes.authScreen.path) return true;
  if (matchedLocation == Routes.exploreScreen.path) return true;
  if (matchedLocation == Routes.exploreMapScreen.path) return true;

  final segments = Uri.parse(matchedLocation).pathSegments;
  if (segments.length == 2 &&
      segments.first == 'organizers' &&
      segments.last != 'map') {
    return true;
  }

  if (segments.length == 4 &&
      segments[0] == 'organizers' &&
      segments[2] == 'events') {
    return true;
  }

  if (segments.length == 3 &&
      segments.first == 'events' &&
      segments.last == 'location') {
    return true;
  }

  return false;
}

String? appRedirect({
  required AsyncValue<String?> uidAsync,
  required AsyncValue<UserProfile?> userProfileAsync,
  required bool hasPendingAuthVerification,
  required String matchedLocation,
  required Uri uri,
}) {
  final onLoading = matchedLocation == Routes.loadingScreen.path;
  final onStart = matchedLocation == Routes.startScreen.path;
  final onOnboarding = matchedLocation == Routes.onboardingScreen.path;
  final onAuth = matchedLocation == Routes.authScreen.path;
  final isHostApp = AppConfig.appRole.isHost;
  final pendingOnboardingIntent = onOnboarding || onLoading
      ? switch (uri.queryParameters[_onboardingIntentQueryParam]) {
          _completeProfileIntent => _completeProfileIntent,
          _completeRunPreferencesIntent => _completeRunPreferencesIntent,
          _ => null,
        }
      : null;

  final isWaitingOnAuth = uidAsync.isLoading;
  // Owning an account is independent of dating/booking readiness. These exact
  // routes have their own loading and error states and must remain reachable
  // even before a form applicant has created a Consumer profile document.
  if (!isHostApp && !isWaitingOnAuth && uidAsync.value != null) {
    if (_isOwnAccountRoute(matchedLocation)) return null;
    final isAccountResume =
        (onLoading && pendingOnboardingIntent == null) ||
        onStart ||
        onAuth ||
        (onOnboarding &&
            !uri.queryParameters.containsKey(_onboardingIntentQueryParam));
    if (isAccountResume) {
      final resume = _resumeDestination(uri);
      if (_isOwnAccountRoute(Uri.parse(resume).path)) return resume;
    }
  }
  // Only a successful null read establishes that an account needs a profile.
  // A failed refresh may retain a real profile, but cached null is not identity.
  final isBlockedOnProfile =
      !isHostApp &&
      uidAsync.hasValue &&
      uidAsync.value != null &&
      (userProfileAsync.isLoading ||
          (userProfileAsync.hasError && userProfileAsync.value == null));

  if (isWaitingOnAuth || isBlockedOnProfile) {
    if (!isHostApp &&
        isGuestPublicRoute(matchedLocation) &&
        !_isTransientRoute(matchedLocation)) {
      return null;
    }
    if (onLoading) return null;
    final loading = _locationWithFrom(
      Routes.loadingScreen.path,
      from: _pendingDestination(uri: uri, matchedLocation: matchedLocation),
    );
    if (pendingOnboardingIntent == null) return loading;
    final loadingUri = Uri.parse(loading);
    return loadingUri
        .replace(
          queryParameters: {
            ...loadingUri.queryParameters,
            _onboardingIntentQueryParam: pendingOnboardingIntent,
            if (pendingOnboardingIntent == _completeProfileIntent &&
                eventRequirementsFromUri(uri) != null)
              'eventRequirements': eventRequirementsFromUri(uri)!.join(','),
          },
        )
        .toString();
  }

  final uid = uidAsync.value;
  final userProfile = userProfileAsync.value;

  if (uid == null) {
    if (isHostApp) {
      if (onAuth) return null;
      return _locationWithFrom(
        Routes.authScreen.path,
        from: _hostPendingDestination(
          uri: uri,
          matchedLocation: matchedLocation,
        ),
      );
    }

    if (hasPendingAuthVerification && !onAuth) {
      if (!isGuestPublicRoute(matchedLocation) ||
          _isTransientRoute(matchedLocation)) {
        return _locationWithFrom(
          Routes.authScreen.path,
          from: _pendingDestination(uri: uri, matchedLocation: matchedLocation),
        );
      }
    }
    if (isGuestPublicRoute(matchedLocation)) return null;
    return _locationWithFrom(
      Routes.startScreen.path,
      from: _pendingDestination(uri: uri, matchedLocation: matchedLocation),
    );
  }

  if (isHostApp) {
    if (onLoading || onStart || onAuth || onOnboarding) {
      return _resumeDestination(uri);
    }
    return null;
  }

  // Explicit completion flows can return to an otherwise ungated account
  // route. Resume the requested flow before considering that final destination.
  if (onLoading && pendingOnboardingIntent != null) {
    final from = uri.queryParameters[_fromQueryParam];
    return pendingOnboardingIntent == _completeProfileIntent
        ? profileCompletionLocation(
            from: from,
            eventRequirements: eventRequirementsFromUri(uri),
          )
        : runPreferencesCompletionLocation(from: from);
  }

  final onProfileCompletionOnboarding =
      onOnboarding &&
      uri.queryParameters[_onboardingIntentQueryParam] ==
          _completeProfileIntent;
  final onRunPreferencesOnboarding =
      onOnboarding &&
      uri.queryParameters[_onboardingIntentQueryParam] ==
          _completeRunPreferencesIntent;
  final today = DateTime.now();

  if (userProfile == null || !userProfile.hasBookingReadyIdentityOn(today)) {
    if (onOnboarding) {
      if (eventRequirementsFromUri(uri) != null) {
        return _locationWithFrom(
          Routes.onboardingScreen.path,
          from: uri.queryParameters[_fromQueryParam],
        );
      }
      return null;
    }
    // Public discovery remains readable for a signed-in viewer whose profile
    // is incomplete. Only the action that needs profile data is gated.
    if (!isHostApp &&
        isGuestPublicRoute(matchedLocation) &&
        !_isTransientRoute(matchedLocation)) {
      return null;
    }
    return _locationWithFrom(
      Routes.onboardingScreen.path,
      from: _pendingDestination(uri: uri, matchedLocation: matchedLocation),
    );
  }

  if (onProfileCompletionOnboarding) {
    final requirements = eventRequirementsFromUri(uri);
    final ready = requirements == null
        ? userProfile.hasSocialReadyProfileOn(today)
        : userProfile.hasBookingReadyIdentityOn(
            today,
            ageRestricted: requirements.contains('ageRestricted'),
            cohortRestricted: requirements.contains('cohortRestricted'),
          );
    if (!ready) return null;
    return _resumeDestination(uri);
  }

  if (onRunPreferencesOnboarding) {
    if (!userProfile.hasCurrentRunPreferences) return null;
    return _resumeDestination(uri);
  }

  if (_requiresSocialProfile(matchedLocation) &&
      !userProfile.hasSocialReadyProfileOn(today)) {
    return profileCompletionLocation(
      from: _pendingDestination(uri: uri, matchedLocation: matchedLocation),
    );
  }

  if (onLoading || onStart || onAuth || onOnboarding) {
    return _resumeDestination(uri);
  }

  return null;
}

bool _isOwnAccountRoute(String path) =>
    path == Routes.profileScreen.path ||
    path == Routes.matchesListScreen.path ||
    path == Routes.settingsScreen.path ||
    path == Routes.messagingPermissionsScreen.path ||
    path == Routes.formProfilesScreen.path ||
    RegExp(r'^/you/forms/[^/]+$').hasMatch(path) ||
    RegExp(
      r'^/events/[^/]+/chat(?:/profile|/people(?:/[^/]+)?)?$',
    ).hasMatch(path);

// The after-event screen (rating, group chat, follow, next event) and the
// retired deck address that redirects to it are for everyone who came; only
// its Stay in touch picks need a social profile, and that section asks for
// one itself.
bool _requiresSocialProfile(String matchedLocation) =>
    matchedLocation == Routes.filtersScreen.path;
