import 'package:catch_dating_app/auth/presentation/auth_controller.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/contexts/organizers/organizers.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/onboarding/onboarding_controller.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_screen.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_dating_app/hosts/onboarding/sign_in_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:flutter/widgets.dart';
import 'package:riverpod/misc.dart' show Override;

import 'onboarding_fixtures.dart';

/// Sign-in and organiser setup capture fixtures: Lantern Lane Social, a
/// Bandra quiz and supper club, signing in on +91 and starting its page.

const _organizerId = 'lantern-lane';

/// Sign in with the number typed.
Widget hostOnboardingSignInCapture() =>
    const HostSignInScreen(initialPhoneNumber: '9820144718');

List<Override> hostOnboardingSignInOverrides() => [
  authInitialCountryDialCodeProvider.overrideWithValue('+91'),
];

/// The code step, 24 seconds before a new code can be sent.
Widget hostOnboardingCodeCapture() =>
    const HostSignInScreen(initialOtpCode: '4819', initialResendSeconds: 24);

List<Override> hostOnboardingCodeOverrides() => [
  authInitialCountryDialCodeProvider.overrideWithValue('+91'),
  authControllerProvider.overrideWith(_CodeStepAuthController.new),
];

/// Setup on [step]: Start your page, details, payouts or Done.
Widget hostOnboardingSetupCapture() =>
    const HostSetupScreen(restoreSavedDraft: false);

List<Override> hostOnboardingSetupOverrides(HostSetupStep step) => [
  hostSetupControllerProvider.overrideWith(
    () => _SeededSetupController(
      onboardingState(
        step: step,
        withDetails: step != HostSetupStep.start,
        organizerId: step.index >= HostSetupStep.payments.index
            ? _organizerId
            : null,
      ),
    ),
  ),
  hostFormPaymentControllerProvider(
    _organizerId,
  ).overrideWith(_NotConnectedPaymentController.new),
  watchOrganizerProvider(_organizerId).overrideWith(
    (ref) => Stream.value(
      HostOperationsFixtures.primaryOrganizer.copyWith(
        id: _organizerId,
        name: 'Lantern Lane Social',
        publicPage: OrganizerPublicPage.fromJson(const {
          'publishStatus': 'published',
          'indexStatus': 'noindex',
          'canonicalPath': '/lanternlane',
        }),
      ),
    ),
  ),
];

class _CodeStepAuthController extends AuthController {
  @override
  AuthScreenState build() => const AuthScreenState(
    phoneNumber: '9820144718',
    verificationId: 'capture',
    step: AuthStep.otp,
  );
}

class _SeededSetupController extends HostSetupController {
  _SeededSetupController(this._seed);

  final HostSetupState _seed;

  @override
  HostSetupState build() => _seed;
}

class _NotConnectedPaymentController extends HostFormPaymentController {
  @override
  Future<HostFormPaymentSetupState> build(String organizerId) async =>
      const HostFormPaymentSetupState(
        setup: HostFormPaymentSetup(available: true, connections: []),
      );
}
