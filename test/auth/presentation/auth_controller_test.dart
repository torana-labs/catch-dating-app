import 'dart:async';
import 'dart:ui' show Locale;

import 'package:catch_dating_app/auth/presentation/auth_controller.dart';
import 'package:catch_dating_app/auth/presentation/auth_input.dart';
import 'package:catch_dating_app/auth/presentation/auth_session_controller.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/fcm_service.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../onboarding/onboarding_test_helpers.dart';
import '../../test_pump_helpers.dart';

void main() {
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  // CAT-166 regression coverage derived from CAT-80's preserved diagnostic
  // commit c3f215917. The original deliberately red evidence remains separate.
  // Fake callbacks may outlive registration and codeSent; fake-clock timeout
  // is the controller deadline, not Firebase's auto-retrieval timeout.
  group('AuthController OTP attempt ownership', () {
    testWidgets(
      'already-dispatched automatic auth cannot clear replacement B',
      (tester) async {
        final credentialGate = Completer<void>();
        final repository = _RetainedAuthRepository()
          ..credentialGate = credentialGate;
        final container = _authControllerContainer(repository);
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        final notifier = container.read(authControllerProvider.notifier);
        final requestA = notifier.sendOtp('9999999999', '+91');
        final credentialA = _otpCredential('A');
        repository.attempts.first.verificationCompleted(credentialA);
        expect(repository.credentials, [same(credentialA)]);
        notifier.reset();
        final requestB = notifier.sendOtp('8888888888', '+91');
        await requestA;
        credentialGate.complete();
        await tester.pump(Duration.zero);
        expect(notifier.sendOtp('7777777777', '+1'), same(requestB));
        expect(repository.attempts, hasLength(2));
        repository.attempts.last.codeSent('B', 51);
        await requestB;
        expect(container.read(authControllerProvider).verificationId, 'B');
      },
    );

    testWidgets('late registration error for A cannot settle pending B', (
      tester,
    ) async {
      final registrationGate = Completer<void>();
      final repository = _RetainedAuthRepository()
        ..registrationGate = registrationGate;
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final notifier = container.read(authControllerProvider.notifier);
      final requestA = notifier.sendOtp('9999999999', '+91');
      repository.attempts.first.codeSent('A', 41);
      await requestA;
      repository.registrationGate = null;
      final requestB = notifier.sendOtp('8888888888', '+91');
      registrationGate.completeError(
        StateError('fake-only registration error'),
      );
      await tester.pump();
      expect(notifier.sendOtp('7777777777', '+1'), same(requestB));
      expect(container.read(authControllerProvider).verificationId, isNull);
      expect(repository.credentials, isEmpty);
      repository.attempts.last.codeSent('B', 51);
      await requestB;
      expect(container.read(authControllerProvider).verificationId, 'B');
    });

    for (final resetFlow in [true, false]) {
      testWidgets(
        '${resetFlow ? 'reset' : 'Change number'} releases pending A without clearing replacement B',
        (tester) async {
          final repository = _RetainedAuthRepository();
          final container = _authControllerContainer(repository);
          addTearDown(repository.dispose);
          addTearDown(container.dispose);
          final notifier = container.read(authControllerProvider.notifier);
          final requestA = notifier.sendOtp('9999999999', '+91');
          if (resetFlow) {
            notifier.reset();
          } else {
            notifier.goToStep(AuthStep.phone);
          }
          // B starts before A's whenComplete runs; old cleanup must not
          // release B's deduplication lease or expire its callbacks.
          final requestB = notifier.sendOtp('8888888888', '+91');
          await requestA;
          final before = container.read(authControllerProvider);
          final attemptA = repository.attempts.first;
          attemptA.codeSent('late-A', 41);
          attemptA.verificationFailed(_otpFailure);
          attemptA.verificationCompleted(_otpCredential('A'));
          await tester.pump(Duration.zero);

          expect(repository.attempts, hasLength(2));
          expect(container.read(authControllerProvider), before);
          expect(repository.credentials, isEmpty);
          expect(notifier.sendOtp('7777777777', '+1'), same(requestB));
          final attemptB = repository.attempts.last;
          expect(attemptB.forceResendingToken, isNull);
          attemptB.codeSent('B', 51);
          await requestB;
          await tester.pump(CatchMotion.authOtpResendCooldown);
          final credentialB = _otpCredential('B');
          attemptB.verificationCompleted(credentialB);
          await tester.pump();
          expect(repository.credentials, [same(credentialB)]);
          expect(container.read(authControllerProvider).verificationId, 'B');
        },
      );
    }

    testWidgets(
      'pending disposal settles A and ignores every retained callback',
      (tester) async {
        final repository = _RetainedAuthRepository();
        final container = _authControllerContainer(repository);
        addTearDown(repository.dispose);
        final notifier = container.read(authControllerProvider.notifier);
        final requestA = notifier.sendOtp('9999999999', '+91');
        container.dispose();
        await requestA;
        final attemptA = repository.attempts.single;
        expect(() => attemptA.codeSent('late-A', 41), returnsNormally);
        attemptA.verificationFailed(_otpFailure);
        attemptA.verificationCompleted(_otpCredential('A'));
        await tester.pump(Duration.zero);
        expect(repository.credentials, isEmpty);
      },
    );

    testWidgets(
      'same-phone resend supersedes A while retaining its own token',
      (tester) async {
        final repository = _RetainedAuthRepository();
        final container = _authControllerContainer(repository);
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        final notifier = container.read(authControllerProvider.notifier);
        final requestA = notifier.sendOtp('9999999999', '+91');
        repository.attempts.first.codeSent('A', 41);
        await requestA;
        final requestB = notifier.sendOtp('+91 9999999999', '+91');
        final attemptB = repository.attempts.last;
        expect(attemptB.forceResendingToken, 41);
        attemptB.codeSent('B', 51);
        await requestB;
        repository.attempts.first.verificationCompleted(_otpCredential('A'));
        await tester.pump();
        expect(repository.credentials, isEmpty);
        final credentialB = _otpCredential('B');
        attemptB.verificationCompleted(credentialB);
        await tester.pump();
        expect(repository.credentials, [same(credentialB)]);
        expect(container.read(authControllerProvider).verificationId, 'B');
      },
    );

    for (final boundary in _OtpBoundary.values) {
      testWidgets('${boundary.name} ignores late A codeSent', (tester) async {
        final repository = _RetainedAuthRepository();
        final container = _authControllerContainer(repository);
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        final notifier = container.read(authControllerProvider.notifier);

        await _reachOtpBoundary(tester, notifier, repository, boundary);
        final before = container.read(authControllerProvider);
        repository.attempts.first.codeSent('late-A', 41);

        expect(container.read(authControllerProvider), before);
      });

      testWidgets('${boundary.name} ignores late A auto verification', (
        tester,
      ) async {
        final repository = _RetainedAuthRepository();
        final container = _authControllerContainer(repository);
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        final notifier = container.read(authControllerProvider.notifier);

        await _reachOtpBoundary(tester, notifier, repository, boundary);
        repository.attempts.first.verificationCompleted(_otpCredential('A'));
        await tester.pump();

        expect(repository.credentials, isEmpty);
      });
    }

    testWidgets('reset ignores all retained A callbacks after B codeSent', (
      tester,
    ) async {
      final repository = _RetainedAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final notifier = container.read(authControllerProvider.notifier);
      final requestA = notifier.sendOtp('9999999999', '+91');
      final attemptA = repository.attempts.single;
      attemptA.codeSent('A', 41);
      await requestA;

      notifier.reset();
      final requestB = notifier.sendOtp('8888888888', '+91');
      repository.attempts.last.codeSent('B', 51);
      await requestB;
      final before = container.read(authControllerProvider);
      attemptA.codeSent('late-A', 41);
      attemptA.verificationFailed(_otpFailure);
      attemptA.verificationCompleted(_otpCredential('A'));
      // Mutation.reset schedules Riverpod's zero-duration disposal timer.
      await tester.pump(Duration.zero);

      expect(container.read(authControllerProvider), before);
      expect(repository.credentials, isEmpty);
      expect(repository.attempts.last.forceResendingToken, isNull);
    });

    testWidgets('reset settles an abandoned pending send on a stale callback', (
      tester,
    ) async {
      final repository = _RetainedAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final notifier = container.read(authControllerProvider.notifier);
      final request = notifier.sendOtp('9999999999', '+91');
      notifier.reset();
      repository.attempts.single.verificationFailed(_otpFailure);
      await request;
      await tester.pump(Duration.zero);

      expect(container.read(authControllerProvider), const AuthScreenState());
      expect(repository.credentials, isEmpty);
    });

    testWidgets('disposal makes retained codeSent a harmless no-op', (
      tester,
    ) async {
      final repository = _RetainedAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      final notifier = container.read(authControllerProvider.notifier);
      await _reachOtpBoundary(
        tester,
        notifier,
        repository,
        _OtpBoundary.timeoutWithoutReplacement,
      );
      container.dispose();

      expect(
        () => repository.attempts.single.codeSent('late-A', 41),
        returnsNormally,
      );
      expect(repository.credentials, isEmpty);
    });

    testWidgets('disposal blocks the repository call for retained auto auth', (
      tester,
    ) async {
      final repository = _RetainedAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      final notifier = container.read(authControllerProvider.notifier);
      await _reachOtpBoundary(
        tester,
        notifier,
        repository,
        _OtpBoundary.timeoutWithoutReplacement,
      );
      container.dispose();
      repository.attempts.single.verificationCompleted(_otpCredential('A'));
      await tester.pump();

      expect(repository.credentials, isEmpty);
    });

    testWidgets('current attempt may auto verify after its codeSent', (
      tester,
    ) async {
      final repository = _RetainedAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final notifier = container.read(authControllerProvider.notifier);
      final request = notifier.sendOtp('9999999999', '+91');
      final attempt = repository.attempts.single;
      attempt.codeSent('A', 41);
      await request;
      final credential = _otpCredential('A');
      attempt.verificationCompleted(credential);
      await tester.pump();

      expect(repository.credentials, [same(credential)]);
      expect(container.read(authControllerProvider).verificationId, 'A');
    });

    testWidgets('deduplication retains one attempt and the exact future', (
      tester,
    ) async {
      final repository = _RetainedAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final notifier = container.read(authControllerProvider.notifier);
      final first = notifier.sendOtp('9999999999', '+91');
      final duplicate = notifier.sendOtp('8888888888', '+1');
      notifier.setCountryCode('+1');
      notifier.clearSendOtpErrorIfIdle();

      expect(duplicate, same(first));
      expect(repository.attempts, hasLength(1));
      expect(repository.attempts.single.phoneNumber, '+919999999999');
      expect(container.read(authControllerProvider).countryCode, '+91');
      repository.attempts.single.codeSent('A', 41);
      await Future.wait([first, duplicate]);
    });

    testWidgets('invalid input preserves an eligible current attempt', (
      tester,
    ) async {
      final repository = _RetainedAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final notifier = container.read(authControllerProvider.notifier);
      final request = notifier.sendOtp('9999999999', '+91');
      repository.attempts.single.codeSent('A', 41);
      await request;
      final before = container.read(authControllerProvider);

      await expectLater(
        notifier.sendOtp('123', '+91'),
        throwsA(isA<AuthInputException>()),
      );
      await expectLater(
        notifier.sendOtp('9999999999', '91'),
        throwsA(isA<AuthInputException>()),
      );
      expect(repository.attempts, hasLength(1));
      expect(container.read(authControllerProvider), before);
      final credential = _otpCredential('A');
      repository.attempts.single.verificationCompleted(credential);
      await tester.pump();
      expect(repository.credentials, [same(credential)]);
    });

    testWidgets('same normalized phone reuses only its own resend token', (
      tester,
    ) async {
      final repository = _RetainedAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final notifier = container.read(authControllerProvider.notifier);
      final requestA = notifier.sendOtp('9999999999', '+91');
      repository.attempts.last.codeSent('A', 41);
      await requestA;
      final requestB = notifier.sendOtp('+91 9999999999', ' +91 ');
      expect(repository.attempts.last.phoneNumber, '+919999999999');
      expect(repository.attempts.last.forceResendingToken, 41);
      repository.attempts.last.codeSent('B', 51);
      await requestB;
      final requestC = notifier.sendOtp('9999999999', '+1');
      expect(repository.attempts.last.forceResendingToken, isNull);
      repository.attempts.last.codeSent('C', 61);
      await requestC;
    });

    testWidgets('late A cannot contaminate a resend token for B phone', (
      tester,
    ) async {
      final repository = _RetainedAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final notifier = container.read(authControllerProvider.notifier);
      await _reachOtpBoundary(
        tester,
        notifier,
        repository,
        _OtpBoundary.newSendAfterTimeout,
      );
      repository.attempts.first.codeSent('late-A', 41);
      final resend = notifier.sendOtp('8888888888', '+91');
      repository.attempts.last.codeSent('B-resend', 61);
      await resend;

      expect(repository.attempts.last.phoneNumber, '+918888888888');
      expect(repository.attempts.last.forceResendingToken, 51);
    });

    testWidgets('current verification failure reaches its own request', (
      tester,
    ) async {
      final repository = _RetainedAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final notifier = container.read(authControllerProvider.notifier);
      final request = notifier.sendOtp('9999999999', '+91');
      final failure = expectLater(request, throwsA(same(_otpFailure)));
      repository.attempts.single.verificationFailed(_otpFailure);
      await failure;

      expect(container.read(authControllerProvider).verificationId, isNull);
      expect(repository.credentials, isEmpty);
    });

    testWidgets('late A failure does not settle or corrupt pending B', (
      tester,
    ) async {
      final repository = _RetainedAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final notifier = container.read(authControllerProvider.notifier);
      final requestA = notifier.sendOtp('9999999999', '+91');
      repository.attempts.first.codeSent('A', 41);
      await requestA;
      var bSettled = false;
      final requestB = notifier.sendOtp('8888888888', '+91');
      final observedB = requestB.then((_) => bSettled = true);
      final before = container.read(authControllerProvider);
      repository.attempts.first.verificationFailed(_otpFailure);
      await tester.pump();

      expect(bSettled, isFalse);
      expect(container.read(authControllerProvider), before);
      repository.attempts.last.codeSent('B', 51);
      await observedB;
      expect(bSettled, isTrue);
      expect(repository.credentials, isEmpty);
    });
  });

  group('AuthController.sendOtp', () {
    test(
      'prefixes +91 and advances to the OTP step when code is sent',
      () async {
        final repository = FakeAuthRepository()
          ..onVerifyPhoneNumber =
              ({
                required verificationCompleted,
                required verificationFailed,
                required codeSent,
                required codeAutoRetrievalTimeout,
              }) {
                codeSent('verification-id', 11);
              };
        final container = _authControllerContainer(repository);
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        AuthController.sendOtpMutation.reset(container);
        AuthController.verifyOtpMutation.reset(container);

        final notifier = container.read(authControllerProvider.notifier);

        await notifier.sendOtp('9999999999', '+91');

        expect(repository.verifiedPhoneNumber, '+919999999999');
        expect(
          container.read(authControllerProvider),
          const AuthScreenState(
            step: AuthStep.otp,
            verificationId: 'verification-id',
            phoneNumber: '9999999999',
          ),
        );
        expect(repository.credential, isNull);
        expect(repository.otpVerificationId, isNull);
      },
    );

    test('uses the previous resend token for repeat OTP requests', () async {
      var verificationRequestCount = 0;
      final repository = FakeAuthRepository()
        ..onVerifyPhoneNumber =
            ({
              required verificationCompleted,
              required verificationFailed,
              required codeSent,
              required codeAutoRetrievalTimeout,
            }) {
              verificationRequestCount += 1;
              codeSent('verification-id-$verificationRequestCount', 11);
            };
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final notifier = container.read(authControllerProvider.notifier);

      await notifier.sendOtp('9999999999', '+91');
      expect(repository.forceResendingToken, isNull);

      await notifier.sendOtp('9999999999', '+91');
      expect(repository.forceResendingToken, 11);
      expect(
        container.read(authControllerProvider).verificationId,
        'verification-id-2',
      );
    });

    test(
      'does not reuse the resend token for a different phone number',
      () async {
        final repository = FakeAuthRepository()
          ..onVerifyPhoneNumber =
              ({
                required verificationCompleted,
                required verificationFailed,
                required codeSent,
                required codeAutoRetrievalTimeout,
              }) {
                codeSent('verification-id', 11);
              };
        final container = _authControllerContainer(repository);
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        final notifier = container.read(authControllerProvider.notifier);

        await notifier.sendOtp('9999999999', '+91');
        await notifier.sendOtp('8888888888', '+91');

        expect(repository.forceResendingToken, isNull);
      },
    );

    test(
      'deduplicates an active request and freezes request-defining state',
      () async {
        final requestGate = Completer<void>();
        final repository = FakeAuthRepository()
          ..onVerifyPhoneNumber =
              ({
                required verificationCompleted,
                required verificationFailed,
                required codeSent,
                required codeAutoRetrievalTimeout,
              }) async {
                await requestGate.future;
                codeSent('verification-id', 11);
              };
        final container = _authControllerContainer(repository);
        addTearDown(repository.dispose);
        addTearDown(container.dispose);
        final notifier = container.read(authControllerProvider.notifier);

        final firstRequest = notifier.sendOtp('9999999999', '+91');
        await flushTestEventQueue();

        notifier.setCountryCode('+1');
        notifier.clearSendOtpErrorIfIdle();
        final duplicateRequest = notifier.sendOtp('8888888888', '+1');

        expect(identical(firstRequest, duplicateRequest), true);
        expect(repository.verifyPhoneNumberCallCount, 1);
        expect(
          container.read(authControllerProvider),
          const AuthScreenState(phoneNumber: '9999999999'),
        );

        requestGate.complete();
        await Future.wait([firstRequest, duplicateRequest]);

        expect(repository.verifyPhoneNumberCallCount, 1);
        expect(
          container.read(authControllerProvider),
          const AuthScreenState(
            step: AuthStep.otp,
            verificationId: 'verification-id',
            phoneNumber: '9999999999',
          ),
        );
      },
    );

    test('reset ignores callbacks from an abandoned OTP request', () async {
      final requestGate = Completer<void>();
      final repository = FakeAuthRepository()
        ..onVerifyPhoneNumber =
            ({
              required verificationCompleted,
              required verificationFailed,
              required codeSent,
              required codeAutoRetrievalTimeout,
            }) async {
              await requestGate.future;
              codeSent('stale-verification-id', 11);
            };
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final notifier = container.read(authControllerProvider.notifier);

      final request = notifier.sendOtp('9999999999', '+91');
      await flushTestEventQueue();
      notifier.reset();
      requestGate.complete();
      await request;

      expect(repository.verifyPhoneNumberCallCount, 1);
      expect(container.read(authControllerProvider), const AuthScreenState());
    });

    test(
      'rejects invalid phone numbers before calling Firebase Auth',
      () async {
        final repository = FakeAuthRepository();
        final container = _authControllerContainer(repository);
        addTearDown(repository.dispose);
        addTearDown(container.dispose);

        await expectLater(
          container.read(authControllerProvider.notifier).sendOtp('123', '+91'),
          throwsA(
            isA<AuthInputException>().having(
              (error) => error.issue,
              'issue',
              AuthInputIssue.invalidPhoneNumber,
            ),
          ),
        );

        expect(repository.verifyPhoneNumberCallCount, 0);
        expect(container.read(authControllerProvider), const AuthScreenState());
      },
    );

    test(
      'rejects invalid country codes before calling Firebase Auth',
      () async {
        final repository = FakeAuthRepository();
        final container = _authControllerContainer(repository);
        addTearDown(repository.dispose);
        addTearDown(container.dispose);

        await expectLater(
          container
              .read(authControllerProvider.notifier)
              .sendOtp('9999999999', '91'),
          throwsA(
            isA<AuthInputException>().having(
              (error) => error.issue,
              'issue',
              AuthInputIssue.invalidCountryCode,
            ),
          ),
        );

        expect(repository.verifyPhoneNumberCallCount, 0);
        expect(container.read(authControllerProvider), const AuthScreenState());
      },
    );

    test('uses signInWithCredential during auto verification', () async {
      final credential = PhoneAuthProvider.credential(
        verificationId: 'verification-id',
        smsCode: '123456',
      );
      final repository = FakeAuthRepository()
        ..onVerifyPhoneNumber =
            ({
              required verificationCompleted,
              required verificationFailed,
              required codeSent,
              required codeAutoRetrievalTimeout,
            }) {
              verificationCompleted(credential);
            };
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      AuthController.sendOtpMutation.reset(container);
      AuthController.verifyOtpMutation.reset(container);

      final notifier = container.read(authControllerProvider.notifier);

      await notifier.sendOtp('9999999999', '+91');

      expect(repository.credential, same(credential));
      expect(repository.otpVerificationId, isNull);
    });
  });

  group('AuthController.verifyOtp', () {
    test('throws when no verification session is active', () async {
      final repository = _SignOutAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      await expectLater(
        container.read(authControllerProvider.notifier).verifyOtp('123456'),
        throwsA(
          isA<StateError>().having(
            (error) => error.message,
            'message',
            'Verification session expired. Please request a new code.',
          ),
        ),
      );
      expect(repository.otpVerificationId, isNull);
    });

    test('signs in with the stored verification id', () async {
      final repository = FakeAuthRepository()
        ..onVerifyPhoneNumber =
            ({
              required verificationCompleted,
              required verificationFailed,
              required codeSent,
              required codeAutoRetrievalTimeout,
            }) {
              codeSent('verification-id', 11);
            };
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      AuthController.sendOtpMutation.reset(container);
      AuthController.verifyOtpMutation.reset(container);
      final notifier = container.read(authControllerProvider.notifier);

      await notifier.sendOtp('9999999999', '+91');
      await notifier.verifyOtp('123456');

      expect(repository.otpVerificationId, 'verification-id');
      expect(repository.otpSmsCode, '123456');
    });

    test('rejects malformed OTP codes before repository sign-in', () async {
      final repository = FakeAuthRepository()
        ..onVerifyPhoneNumber =
            ({
              required verificationCompleted,
              required verificationFailed,
              required codeSent,
              required codeAutoRetrievalTimeout,
            }) {
              codeSent('verification-id', 11);
            };
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final notifier = container.read(authControllerProvider.notifier);

      await notifier.sendOtp('9999999999', '+91');
      await expectLater(
        notifier.verifyOtp('12345a'),
        throwsA(
          isA<AuthInputException>().having(
            (error) => error.issue,
            'issue',
            AuthInputIssue.invalidOtpCode,
          ),
        ),
      );

      expect(repository.otpVerificationId, isNull);
      expect(repository.otpSmsCode, isNull);
    });
  });

  group('AuthController state management', () {
    test('initial country code maps the platform locale', () {
      final binding = TestWidgetsFlutterBinding.ensureInitialized();
      binding.platformDispatcher.localeTestValue = const Locale('en', 'AU');
      addTearDown(binding.platformDispatcher.clearLocaleTestValue);

      final repository = FakeAuthRepository();
      final container = ProviderContainer(
        overrides: [authRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      expect(container.read(authInitialCountryDialCodeProvider), '+61');
      expect(container.read(authControllerProvider).countryCode, '+61');
    });

    test('host app defaults phone auth to the Catch market', () {
      AppConfig.configureEntrypointRole(AppRole.host);
      final binding = TestWidgetsFlutterBinding.ensureInitialized();
      binding.platformDispatcher.localeTestValue = const Locale('en', 'US');
      addTearDown(binding.platformDispatcher.clearLocaleTestValue);

      final repository = FakeAuthRepository();
      final container = ProviderContainer(
        overrides: [authRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      expect(container.read(authInitialCountryDialCodeProvider), '+91');
      expect(container.read(authControllerProvider).countryCode, '+91');
    });

    test('defaults country code from the locale provider', () {
      final repository = FakeAuthRepository();
      final container = _authControllerContainer(
        repository,
        defaultCountryCode: '+61',
      );
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      expect(container.read(authControllerProvider).countryCode, '+61');
    });

    test('setCountryCode updates state and resets mutation', () {
      final repository = FakeAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      container.read(authControllerProvider.notifier).setCountryCode('+1');

      expect(container.read(authControllerProvider).countryCode, '+1');
    });

    test('goToStep changes the current step', () {
      final repository = FakeAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      container.read(authControllerProvider.notifier).goToStep(AuthStep.otp);

      expect(container.read(authControllerProvider).step, AuthStep.otp);
    });

    test('reset clears all state', () {
      final repository = FakeAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      container.read(authControllerProvider.notifier)
        ..goToStep(AuthStep.otp)
        ..setCountryCode('+1');
      container.read(authControllerProvider.notifier).reset();

      expect(container.read(authControllerProvider), const AuthScreenState());
    });

    test('reset restores the locale-derived country code', () {
      final repository = FakeAuthRepository();
      final container = _authControllerContainer(
        repository,
        defaultCountryCode: '+977',
      );
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      container.read(authControllerProvider.notifier)
        ..goToStep(AuthStep.otp)
        ..setCountryCode('+1');
      container.read(authControllerProvider.notifier).reset();

      expect(
        container.read(authControllerProvider),
        const AuthScreenState(countryCode: '+977'),
      );
    });
  });

  group('AuthSessionController', () {
    test('unregisters an existing push service before auth sign-out', () async {
      final repository = _SignOutAuthRepository();
      final push = _SignOutFcmService();
      final container = _authControllerContainer(repository, push: push);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      container.read(fcmServiceProvider);
      final subscription = container.listen(
        authSessionControllerProvider,
        (_, _) {},
      );
      addTearDown(subscription.close);
      final signOut = container
          .read(authSessionControllerProvider.notifier)
          .signOut();
      expect(push.unregisterCalls, 1);
      expect(repository.signOutCallCount, 0);
      push.unregistered.complete();
      await signOut;
      expect(repository.signOutCallCount, 1);
    });
    test(
      'signOut delegates to the repository and clears auth flow state',
      () async {
        final repository = _SignOutAuthRepository();
        final container = _authControllerContainer(repository);
        addTearDown(repository.dispose);
        addTearDown(container.dispose);

        container.read(authControllerProvider.notifier)
          ..setCountryCode('+1')
          ..goToStep(AuthStep.otp);

        await container.read(authSessionControllerProvider.notifier).signOut();

        expect(repository.signOutCallCount, 1);
        expect(container.read(authControllerProvider), const AuthScreenState());
      },
    );

    test('signOut clears keepAlive Explore browse state', () async {
      final repository = _SignOutAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      final defaultCity = container.read(selectedExploreCityProvider);
      final defaultFilters = container.read(exploreFiltersProvider);
      final delhi = cityOptionByName('delhi')!.toCityData();
      container.read(selectedExploreCityProvider.notifier).setCity(delhi);
      container.read(exploreSearchQueryProvider.notifier).setQuery('tempo');
      container
          .read(exploreFiltersProvider.notifier)
          .setDistanceFilter(ExploreDistanceFilter.fiveKm);

      expect(container.read(selectedExploreCityProvider), delhi);
      expect(
        container.read(selectedExploreCityWasUserSelectedProvider),
        isTrue,
      );
      expect(container.read(exploreSearchQueryProvider), 'tempo');
      expect(container.read(exploreFiltersProvider), isNot(defaultFilters));

      await container.read(authSessionControllerProvider.notifier).signOut();

      expect(repository.signOutCallCount, 1);
      expect(container.read(selectedExploreCityProvider), defaultCity);
      expect(
        container.read(selectedExploreCityWasUserSelectedProvider),
        isFalse,
      );
      expect(container.read(exploreSearchQueryProvider), isEmpty);
      expect(container.read(exploreFiltersProvider), defaultFilters);
    });

    test('signOut returns one active session operation', () async {
      final signOutCompleter = Completer<void>();
      final repository = _SignOutAuthRepository(
        signOutCompleter: signOutCompleter,
      );
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      final subscription = container.listen(
        authSessionControllerProvider,
        (_, _) {},
      );
      addTearDown(subscription.close);

      final controller = container.read(authSessionControllerProvider.notifier);
      final first = controller.signOut();
      final duplicate = controller.signOut();

      expect(identical(first, duplicate), isTrue);
      expect(repository.signOutCallCount, 1);

      signOutCompleter.complete();
      await Future.wait([first, duplicate]);
    });
  });
}

ProviderContainer _authControllerContainer(
  FakeAuthRepository repository, {
  String defaultCountryCode = '+91',
  FcmService? push,
}) {
  return ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(repository),
      authInitialCountryDialCodeProvider.overrideWithValue(defaultCountryCode),
      if (push != null) fcmServiceProvider.overrideWithValue(push),
    ],
  );
}

class _SignOutFcmService extends Fake implements FcmService {
  final unregistered = Completer<void>();
  int unregisterCalls = 0;
  @override
  Future<void> unregisterCurrentInstallation() {
    unregisterCalls++;
    return unregistered.future;
  }
}

class _SignOutAuthRepository extends FakeAuthRepository {
  _SignOutAuthRepository({this.signOutCompleter});

  final Completer<void>? signOutCompleter;
  int signOutCallCount = 0;

  @override
  Future<void> signOut() async {
    signOutCallCount += 1;
    await signOutCompleter?.future;
  }
}

enum _OtpBoundary {
  newSendAfterCodeSent,
  newSendAfterTimeout,
  timeoutWithoutReplacement,
  changeNumber,
}

const _otpFailure = NetworkException('fake-only', 'Synthetic OTP failure');

PhoneAuthCredential _otpCredential(String id) =>
    PhoneAuthProvider.credential(verificationId: id, smsCode: '123456');

Future<void> _reachOtpBoundary(
  WidgetTester tester,
  AuthController notifier,
  _RetainedAuthRepository repository,
  _OtpBoundary boundary,
) async {
  final requestA = notifier.sendOtp('9999999999', '+91');
  if (boundary == _OtpBoundary.newSendAfterTimeout ||
      boundary == _OtpBoundary.timeoutWithoutReplacement) {
    final timeout = expectLater(
      requestA,
      throwsA(
        isA<NetworkException>().having(
          (error) => error.code,
          'code',
          'timeout',
        ),
      ),
    );
    await tester.pump(CatchMotion.authOtpResendCooldown);
    await timeout;
  } else {
    repository.attempts.first.codeSent('A', 41);
    await requestA;
  }

  if (boundary == _OtpBoundary.changeNumber) {
    // Both current OTP page Change number callbacks call this exact command.
    notifier.goToStep(AuthStep.phone);
  } else if (boundary != _OtpBoundary.timeoutWithoutReplacement) {
    final requestB = notifier.sendOtp('8888888888', '+91');
    repository.attempts.last.codeSent('B', 51);
    await requestB;
  }
}

class _RetainedAuthRepository extends FakeAuthRepository {
  final attempts = <_RetainedOtpCallbacks>[];
  final credentials = <AuthCredential>[];
  Completer<void>? registrationGate;
  Completer<void>? credentialGate;

  @override
  Future<void> verifyPhoneNumber({
    required String phoneNumber,
    int? forceResendingToken,
    required void Function(String verificationId, int? resendToken) codeSent,
    required void Function(AppException error) verificationFailed,
    required void Function(PhoneAuthCredential credential)
    verificationCompleted,
  }) async {
    verifyPhoneNumberCallCount += 1;
    attempts.add(
      _RetainedOtpCallbacks(
        phoneNumber: phoneNumber,
        forceResendingToken: forceResendingToken,
        codeSent: codeSent,
        verificationFailed: verificationFailed,
        verificationCompleted: verificationCompleted,
      ),
    );
    // Registration completion does not imply callback/session completion.
    // No Firebase instance, backend query, real sign-in or native call occurs.
    await registrationGate?.future;
  }

  @override
  Future<void> signInWithCredential(AuthCredential credential) async {
    credentials.add(credential);
    await credentialGate?.future;
    await super.signInWithCredential(credential);
  }
}

class _RetainedOtpCallbacks {
  const _RetainedOtpCallbacks({
    required this.phoneNumber,
    required this.forceResendingToken,
    required this.codeSent,
    required this.verificationFailed,
    required this.verificationCompleted,
  });

  final String phoneNumber;
  final int? forceResendingToken;
  final void Function(String verificationId, int? resendToken) codeSent;
  final void Function(AppException error) verificationFailed;
  final void Function(PhoneAuthCredential credential) verificationCompleted;
}
