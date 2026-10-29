import 'package:catch_dating_app/auth/presentation/auth_form_keys.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/shell/app_shell_keys.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test/clubs/clubs_test_helpers.dart' as club_helpers;
import '../test/events/events_test_helpers.dart' as event_helpers;
import '../test/onboarding/onboarding_test_helpers.dart' as onboarding_helpers;
import '../test/support/profile_readiness_fixtures.dart';
import 'support/app_shell_test_binding.dart';
import 'support/app_shell_test_harness.dart';
import 'support/app_shell_workflow_steps.dart';

void main() {
  ensureAppShellTestBinding();

  testWidgets('unauthenticated launch opens public Explore discovery', (
    tester,
  ) async {
    final club = club_helpers.buildClub();

    await pumpCatchAppShell(
      tester,
      initialRoute: Routes.exploreScreen.path,
      overrides: appShellTestOverrides(uid: null, user: null, clubs: [club]),
    );

    expect(find.text('Explore'), findsOneWidget);
    expect(find.text('Home'), findsNothing);
    expect(find.text('Profile'), findsNothing);
  });

  testWidgets('phone auth route sends and verifies an OTP', (tester) async {
    final club = club_helpers.buildClub();
    final authRepository = onboarding_helpers.FakeAuthRepository()
      ..onVerifyPhoneNumber =
          ({
            required codeSent,
            required verificationCompleted,
            required verificationFailed,
            required codeAutoRetrievalTimeout,
          }) {
            codeSent('verification-id', null);
          };

    await pumpCatchAppShell(
      tester,
      initialRoute: Routes.exploreScreen.path,
      overrides: appShellTestOverrides(
        uid: null,
        user: null,
        clubs: [club],
        authRepository: authRepository,
      ),
    );

    await openClubDetail(tester, club);
    await pumpAppShellFrames(tester);
    await tapCatchButton(tester, 'Sign in to follow');

    await tester.enterText(find.byKey(AuthFormKeys.phoneField), '9876543210');
    await tester.tap(find.byKey(AuthFormKeys.sendCode));
    await flushAppShellCallbacks(tester);
    await pumpAppShellFrames(tester);

    expect(authRepository.verifyPhoneNumberCallCount, 1);
    expect(authRepository.verifiedPhoneNumber, '+19876543210');
    expect(find.text('Enter the code'), findsOneWidget);

    await tester.enterText(find.byKey(AuthFormKeys.otpField), '123456');
    await flushAppShellCallbacks(tester);
    await pumpAppShellFrames(tester);

    expect(authRepository.otpVerificationId, 'verification-id');
    expect(authRepository.otpSmsCode, '123456');
  });

  testWidgets(
    'authenticated shell initializes push messaging and crash context',
    (tester) async {
      final user = buildSocialReadyUser(name: 'Suvrat Garg');
      final fcmService = RecordingFcmService();
      final crashReporter = RecordingCrashReporter();
      final errorLogger = ErrorLogger(
        crashReporter: crashReporter,
        shouldReportErrors: true,
      );

      await pumpCatchAppShell(
        tester,
        overrides: appShellTestOverrides(
          uid: user.uid,
          user: user,
          errorLogger: errorLogger,
          fcmService: fcmService,
          initializeFcm: true,
        ),
      );
      await pumpAppShellFrames(tester);

      expect(fcmService.initializedUids, [user.uid]);
      expect(crashReporter.customKeys['user_id'], user.uid);
    },
  );

  testWidgets('booking-ready incomplete profiles can enter the app shell', (
    tester,
  ) async {
    final user = buildBookingReadyIncompleteUser(name: 'Suvrat Garg');

    await pumpCatchAppShell(
      tester,
      overrides: appShellTestOverrides(uid: user.uid, user: user),
    );

    expect(find.text('Find an event near me'), findsOneWidget);
    expect(find.byKey(AppShellKeys.navigationBar), findsOneWidget);
    expect(find.text('Home'), findsOneWidget);
  });

  testWidgets('authenticated shell loads the four primary feature tabs', (
    tester,
  ) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final joinedClub = club_helpers.buildClub(nextEventLabel: 'Sat 6:30 AM');
    final nextRun = event_helpers.buildEvent(
      id: 'run-1',
      clubId: joinedClub.id,
      startTime: DateTime.now().add(const Duration(hours: 3)),
      bookedCount: 1,
    );
    await pumpCatchAppShell(
      tester,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        clubs: [joinedClub],
        joinedClubIds: {joinedClub.id},
        signedUpEvents: [nextRun],
      ),
    );
    await pumpAppShellFrames(tester);

    expect(find.text('Event Focus'), findsOneWidget);

    await openAppTab(tester, 'Explore');
    expect(find.text('Explore'), findsWidgets);

    await openAppTab(tester, 'Chats');
    expect(find.text('Your event conversations'), findsOneWidget);
    await tester.tap(find.text('Direct messages'));
    await pumpAppShellFrames(tester);
    expect(find.text('Chats'), findsWidgets);
    expect(find.text('No catches yet'), findsOneWidget);

    await openAppTab(tester, 'You');
    expect(find.text('Your profile'), findsOneWidget);
  });
}
