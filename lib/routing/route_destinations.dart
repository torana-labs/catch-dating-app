part of 'go_router.dart';

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

String profileCompletionLocation({
  String? from,
  List<String>? eventRequirements,
}) {
  final safeFrom = _sanitizeFrom(from);
  return Uri(
    path: Routes.onboardingScreen.path,
    queryParameters: {
      _onboardingIntentQueryParam: _completeProfileIntent,
      if (eventRequirements != null)
        'eventRequirements': eventRequirements.join(','),
      if (safeFrom != null &&
          Uri.parse(safeFrom).path != Routes.onboardingScreen.path)
        _fromQueryParam: safeFrom,
    },
  ).toString();
}

/// URL hints choose questions only; event admission rechecks live requirements.
List<String>? _eventRequirementsFromUri(Uri uri) {
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

String runPreferencesCompletionLocation({String? from}) {
  final safeFrom = _sanitizeFrom(from);
  return Uri(
    path: Routes.onboardingScreen.path,
    queryParameters: {
      _onboardingIntentQueryParam: _completeRunPreferencesIntent,
      if (safeFrom != null &&
          Uri.parse(safeFrom).path != Routes.onboardingScreen.path)
        _fromQueryParam: safeFrom,
    },
  ).toString();
}

String? _sanitizeFrom(String? from) {
  if (from == null || from.isEmpty || !from.startsWith('/')) return null;
  final uri = Uri.tryParse(from);
  if (uri == null || uri.hasScheme || uri.hasAuthority) return null;
  return uri.toString();
}

bool _isTransientRoute(String path) =>
    path == Routes.loadingScreen.path ||
    path == Routes.startScreen.path ||
    path == Routes.authScreen.path ||
    path == Routes.onboardingScreen.path;

bool _isHostRoute(String? path) =>
    path == Routes.hostHomeScreen.path ||
    (path?.startsWith('${Routes.hostHomeScreen.path}/') ?? false);

@visibleForTesting
// keepalive: initial app location is startup routing state consumed by the
// app-wide keepAlive GoRouter provider.
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
                _eventRequirementsFromUri(uri) != null)
              'eventRequirements': _eventRequirementsFromUri(uri)!.join(','),
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
            eventRequirements: _eventRequirementsFromUri(uri),
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
      if (_eventRequirementsFromUri(uri) != null) {
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
    final requirements = _eventRequirementsFromUri(uri);
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
