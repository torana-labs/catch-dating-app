import 'package:catch_platform/routing/route_contract.dart';

/// Query parameter holding the in-app location to return to after a detour.
const routeFromQueryParam = 'from';

/// Query parameter that tells onboarding why the user was sent there.
const onboardingIntentQueryParam = 'intent';
const completeProfileIntent = 'complete-profile';
const completeRunPreferencesIntent = 'complete-run-preferences';

/// [from] when it is a relative in-app location, otherwise null.
String? sanitizeRouteFrom(String? from) {
  if (from == null || from.isEmpty || !from.startsWith('/')) return null;
  final uri = Uri.tryParse(from);
  if (uri == null || uri.hasScheme || uri.hasAuthority) return null;
  return uri.toString();
}

/// Onboarding, opened to finish the profile, then back to [from].
String profileCompletionLocation({
  String? from,
  List<String>? eventRequirements,
}) {
  final safeFrom = sanitizeRouteFrom(from);
  return Uri(
    path: Routes.onboardingScreen.path,
    queryParameters: {
      onboardingIntentQueryParam: completeProfileIntent,
      if (eventRequirements != null)
        'eventRequirements': eventRequirements.join(','),
      if (safeFrom != null &&
          Uri.parse(safeFrom).path != Routes.onboardingScreen.path)
        routeFromQueryParam: safeFrom,
    },
  ).toString();
}

/// Onboarding, opened to finish run preferences, then back to [from].
String runPreferencesCompletionLocation({String? from}) {
  final safeFrom = sanitizeRouteFrom(from);
  return Uri(
    path: Routes.onboardingScreen.path,
    queryParameters: {
      onboardingIntentQueryParam: completeRunPreferencesIntent,
      if (safeFrom != null &&
          Uri.parse(safeFrom).path != Routes.onboardingScreen.path)
        routeFromQueryParam: safeFrom,
    },
  ).toString();
}
