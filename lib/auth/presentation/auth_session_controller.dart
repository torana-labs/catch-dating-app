import 'package:catch_dating_app/auth/presentation/auth_controller.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/explore/explore.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:catch_dating_app/platform/push/fcm_service.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'auth_session_controller.g.dart';

// provider-graph: high-fan-out:authSessionControllerProvider accepted -- These eight dependencies belong to one sign-out boundary: auth repository, auth and onboarding flow controllers, four session-scoped Explore browse roots, and the existing FCM service. Installation removal runs while account authorization is still valid, without initializing an unused service; flow state is cleared centrally. Auth session and FCM lifecycle tests cover cleanup, in-flight sign-out deduplication and bounded unregister failure.
// provider-graph: cross-feature-presentation:authSessionControllerProvider->selectedExploreCityWasUserSelectedProvider accepted -- Sign-out is the app-session boundary and invalidates the keepAlive Explore browse roots so a new account cannot inherit the prior account's manual city-selection guard. The focused AuthSessionController test proves reset behavior.
// provider-graph: cross-feature-presentation:authSessionControllerProvider->selectedExploreCityProvider accepted -- Sign-out is the app-session boundary and invalidates the keepAlive Explore browse roots so a new account cannot inherit the prior account's selected city. The focused AuthSessionController test proves reset behavior.
// provider-graph: cross-feature-presentation:authSessionControllerProvider->onboardingControllerProvider accepted -- Sign-out is the app-session boundary and must reset the public onboarding controller plus its Mutations. This is the documented controller-to-controller command seam, not a read-model or widget dependency.
// provider-graph: cross-feature-presentation:authSessionControllerProvider->exploreSearchQueryProvider accepted -- Sign-out is the app-session boundary and invalidates the keepAlive Explore browse roots so a new account cannot inherit the prior account's search query. The focused AuthSessionController test proves reset behavior.
// provider-graph: cross-feature-presentation:authSessionControllerProvider->exploreFiltersProvider accepted -- Sign-out is the app-session boundary and invalidates the keepAlive Explore browse roots so a new account cannot inherit the prior account's filters. The focused AuthSessionController test proves reset behavior.
/// **Pattern A: Action controller + static Mutations**
///
/// Owns session-level auth side effects such as sign-out. This keeps widgets
/// from calling [AuthRepository] directly and centralizes cleanup of keepAlive
/// flow controllers that should not survive a completed sign-out.
@riverpod
class AuthSessionController extends _$AuthSessionController {
  static final signOutMutation = Mutation<void>();

  Future<void>? _signOutInFlight;

  @override
  void build() {}

  Future<void> signOut() {
    final active = _signOutInFlight;
    if (active != null) return active;

    late final Future<void> trackedRequest;
    trackedRequest = _signOut().whenComplete(() {
      if (identical(_signOutInFlight, trackedRequest)) {
        _signOutInFlight = null;
      }
    });
    _signOutInFlight = trackedRequest;
    return trackedRequest;
  }

  Future<void> _signOut() async {
    clearLocalFlowState();
    // Unregister while Firestore still permits this account's installation delete.
    // Do not initialize Firebase solely to sign out on an unsupported platform.
    if (ref.exists(fcmServiceProvider)) {
      await ref.read(fcmServiceProvider).unregisterCurrentInstallation();
    }
    await ref.read(authRepositoryProvider).signOut();
    clearLocalFlowState();
  }

  void clearLocalFlowState() {
    AuthController.sendOtpMutation.reset(ref);
    AuthController.verifyOtpMutation.reset(ref);
    OnboardingController.saveProfileMutation.reset(ref);
    OnboardingController.completeMutation.reset(ref);
    ref.invalidate(authControllerProvider);
    ref.invalidate(onboardingControllerProvider);
    // Explore browse preferences are session-scoped even though they are kept
    // alive across tab switches. Reset all four roots so a new account cannot
    // inherit the previous account's city, manual-selection guard, query, or
    // filters.
    ref.invalidate(selectedExploreCityProvider);
    ref.invalidate(selectedExploreCityWasUserSelectedProvider);
    ref.invalidate(exploreSearchQueryProvider);
    ref.invalidate(exploreFiltersProvider);
  }
}
