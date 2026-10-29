import 'dart:async';

import 'package:catch_dating_app/auth/presentation/auth_controller.dart';
import 'package:catch_dating_app/auth/presentation/auth_form_keys.dart';
import 'package:catch_dating_app/auth/presentation/auth_screen.dart';
import 'package:catch_dating_app/auth/presentation/host_auth_card.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/core/widgets/splash_screen.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:country_code_picker/country_code_picker.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../onboarding/onboarding_test_helpers.dart';
import '../../test_pump_helpers.dart';

Future<void> pumpAuthScreen(
  WidgetTester tester, {
  required ProviderContainer container,
  ThemeMode themeMode = ThemeMode.light,
  AppRole? appRole,
  double textScale = 1,
  double keyboardInset = 0,
  bool disableAnimations = false,
}) async {
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        themeMode: themeMode,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(textScale),
            viewInsets: EdgeInsets.only(bottom: keyboardInset),
            disableAnimations: disableAnimations,
          ),
          child: child!,
        ),
        home: AuthScreen(appRole: appRole),
      ),
    ),
  );
  await tester.pump();
}

void main() {
  group('AuthScreen', () {
    for (final size in [const Size(390, 844), const Size(1024, 1366)]) {
      for (final theme in [ThemeMode.light, ThemeMode.dark]) {
        testWidgets(
          'Host card and brand stay anchored at $size in ${theme.name}',
          (tester) async {
            tester.view.devicePixelRatio = 1;
            tester.view.physicalSize = size;
            addTearDown(tester.view.resetDevicePixelRatio);
            addTearDown(tester.view.resetPhysicalSize);
            final repository = FakeAuthRepository();
            final container = _authControllerContainer(repository);
            addTearDown(repository.dispose);
            addTearDown(container.dispose);
            await pumpAuthScreen(
              tester,
              container: container,
              appRole: AppRole.host,
              themeMode: theme,
              disableAnimations: true,
            );
            final brand = tester.getRect(
              find.byKey(StartupBrandHeader.markKey),
            );
            final card = tester.getRect(find.byType(HostAuthCard));
            final laneLeft = size.width > CatchLayout.maxContentWidth
                ? (size.width - CatchLayout.maxContentWidth) / 2
                : 0.0;
            expect(
              brand.left,
              laneLeft + CatchStartupTokens.hostStartupLogoLeadingInset,
            );
            expect(brand.top, CatchStartupTokens.hostStartupLogoTopInset);
            expect(brand.width, CatchStartupTokens.hostStartupLogoExtent);
            expect(
              card.top,
              CatchStartupTokens.hostStartupBrandStageExtent +
                  CatchInsets.hostAuthStage.top,
            );
            expect(card.left, greaterThan(0));
            expect(card.right, lessThan(size.width));
            container
                .read(authControllerProvider.notifier)
                .goToStep(AuthStep.otp);
            await tester.pump();
            expect(
              tester.getRect(find.byKey(StartupBrandHeader.markKey)),
              brand,
            );
            expect(tester.getRect(find.byType(HostAuthCard)).top, card.top);
            expect(find.text('Sign in with your phone'), findsNothing);
            expect(find.text('Enter the code'), findsOneWidget);
            expect(tester.takeException(), isNull);
            await tester.pumpWidget(const SizedBox.shrink());
          },
        );
      }
    }

    for (final theme in [ThemeMode.light, ThemeMode.dark]) {
      testWidgets(
        'Host short screen reveals scaled controls above keyboard in ${theme.name}',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(320, 480);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          final repository = FakeAuthRepository()
            ..onVerifyPhoneNumber =
                ({
                  required verificationCompleted,
                  required verificationFailed,
                  required codeSent,
                  required codeAutoRetrievalTimeout,
                }) => codeSent('short-screen', 11);
          final container = _authControllerContainer(repository);
          addTearDown(repository.dispose);
          addTearDown(container.dispose);
          await pumpAuthScreen(
            tester,
            container: container,
            appRole: AppRole.host,
            themeMode: theme,
            textScale: 2,
            keyboardInset: 220,
            disableAnimations: true,
          );
          final phone = find.descendant(
            of: find.byKey(AuthFormKeys.phoneField),
            matching: find.byType(EditableText),
          );
          await tester.ensureVisible(phone);
          expect(tester.getRect(phone).top, greaterThanOrEqualTo(0));
          expect(tester.getRect(phone).bottom, lessThanOrEqualTo(260));
          await tester.enterText(phone, '9999999999');
          await tester.pump();
          await tester.ensureVisible(find.byKey(AuthFormKeys.sendCode));
          final send = tester.getRect(find.byKey(AuthFormKeys.sendCode));
          expect(send.top, greaterThanOrEqualTo(0));
          expect(send.bottom, lessThanOrEqualTo(260));
          await tester.tap(find.byKey(AuthFormKeys.sendCode));
          await pumpFeatureUi(tester);
          expect(container.read(authControllerProvider).step, AuthStep.otp);
          await tester.ensureVisible(find.byType(CatchCodeInput));
          final code = tester.getRect(find.byType(CatchCodeInput));
          expect(code.top, greaterThanOrEqualTo(0));
          expect(code.bottom, lessThanOrEqualTo(260));
          await tester.ensureVisible(find.byKey(AuthFormKeys.changeNumber));
          await tester.tap(find.byKey(AuthFormKeys.changeNumber));
          await pumpFeatureUi(tester);
          expect(container.read(authControllerProvider).step, AuthStep.phone);
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox.shrink());
        },
      );
    }

    for (final role in [AppRole.host, AppRole.consumer]) {
      for (final theme in [ThemeMode.light, ThemeMode.dark]) {
        testWidgets(
          'large text keeps ${role.name} auth usable in ${theme.name}',
          (tester) async {
            tester.view.devicePixelRatio = 1;
            tester.view.physicalSize = const Size(320, 700);
            addTearDown(tester.view.resetDevicePixelRatio);
            addTearDown(tester.view.resetPhysicalSize);
            final repository = FakeAuthRepository()
              ..onVerifyPhoneNumber =
                  ({
                    required verificationCompleted,
                    required verificationFailed,
                    required codeSent,
                    required codeAutoRetrievalTimeout,
                  }) => codeSent('large-text-verification', 11);
            final container = _authControllerContainer(repository);
            addTearDown(repository.dispose);
            addTearDown(container.dispose);
            await pumpAuthScreen(
              tester,
              container: container,
              appRole: role,
              themeMode: theme,
              textScale: 2,
              keyboardInset: 260,
            );
            await tester.pump(CatchMotion.authContentEntrance);
            expect(tester.takeException(), isNull);
            await tester.ensureVisible(find.byKey(AuthFormKeys.phoneField));
            await tester.enterText(
              find.descendant(
                of: find.byKey(AuthFormKeys.phoneField),
                matching: find.byType(EditableText),
              ),
              '9999999999',
            );
            await tester.pump();
            await tester.ensureVisible(find.byKey(AuthFormKeys.sendCode));
            await tester.tap(find.byKey(AuthFormKeys.sendCode));
            await pumpFeatureUi(tester);
            expect(container.read(authControllerProvider).step, AuthStep.otp);
            expect(tester.takeException(), isNull);
            await tester.ensureVisible(find.byKey(AuthFormKeys.changeNumber));
            await tester.tap(find.byKey(AuthFormKeys.changeNumber));
            await pumpFeatureUi(tester);
            expect(container.read(authControllerProvider).step, AuthStep.phone);
            expect(find.text('+91'), findsOneWidget);
            expect(tester.takeException(), isNull);
            await tester.pumpWidget(const SizedBox.shrink());
          },
        );
      }
    }

    testWidgets('Host uses the selected inline phone presentation', (
      tester,
    ) async {
      final repository = FakeAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      await pumpAuthScreen(tester, container: container, appRole: AppRole.host);

      expect(find.byType(CatchScaffold), findsOneWidget);
      expect(find.byType(HostAuthScaffold), findsOneWidget);
      expect(find.byType(StartupBrandHeader), findsOneWidget);
      expect(find.byType(HostAuthCard), findsOneWidget);
      expect(find.text('Sign in with your phone'), findsOneWidget);
      expect(
        find.text("We'll send a one-time code to verify your account."),
        findsOneWidget,
      );
      expect(find.byType(CatchStepHeader), findsNothing);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is CatchDock && widget.variant == CatchDockVariant.utility,
        ),
        findsNothing,
      );

      final sendButton = tester.widget<CatchButton>(
        find.byKey(AuthFormKeys.sendCode),
      );
      expect(sendButton.onPressed, isNull);
      expect(sendButton.mode, CatchButtonMode.rounded);
    });

    testWidgets('Host reveals OTP inline and keeps the brand anchor fixed', (
      tester,
    ) async {
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

      await pumpAuthScreen(tester, container: container, appRole: AppRole.host);
      final logoBefore = tester.getCenter(
        find.byKey(StartupBrandHeader.markKey),
      );

      await tester.enterText(
        find.descendant(
          of: find.byKey(AuthFormKeys.phoneField),
          matching: find.byType(EditableText),
        ),
        '9999999999',
      );
      await tester.pump();
      final sendButton = tester.widget<CatchButton>(
        find.byKey(AuthFormKeys.sendCode),
      );
      expect(sendButton.onPressed, isNotNull);

      await tester.tap(find.byKey(AuthFormKeys.sendCode));
      await tester.pump();
      await tester.pump(CatchMotion.pageStep);
      await tester.pump(CatchMotion.fast);

      expect(find.byType(HostAuthScaffold), findsOneWidget);
      expect(find.text('Enter the code'), findsOneWidget);
      expect(find.text('+91'), findsOneWidget);
      expect(find.text('•••••• 9999'), findsOneWidget);
      expect(find.text('Edit number'), findsOneWidget);
      expect(find.textContaining('Resend code in'), findsOneWidget);
      expect(find.text('Verify'), findsNothing);
      expect(
        tester.getCenter(find.byKey(StartupBrandHeader.markKey)),
        logoBefore,
      );
    });

    testWidgets('Host startup and auth share the exact brand anchor', (
      tester,
    ) async {
      AppConfig.configureEntrypointRole(AppRole.host);
      addTearDown(AppConfig.resetEntrypointRoleOverrideForTesting);
      await tester.pumpWidget(
        MaterialApp(theme: AppTheme.light, home: const SplashScreen()),
      );
      await tester.pump();
      final startupLogo = tester.getCenter(
        find.byKey(StartupBrandHeader.markKey),
      );

      final repository = FakeAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);
      await pumpAuthScreen(tester, container: container, appRole: AppRole.host);

      expect(
        tester.getCenter(find.byKey(StartupBrandHeader.markKey)),
        startupLogo,
      );
    });

    testWidgets('starts on phone entry view', (tester) async {
      final repository = FakeAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      await pumpAuthScreen(tester, container: container);

      expect(find.byType(CatchScaffold), findsOneWidget);
      expect(find.byType(CatchPageBody), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is CatchDock && widget.variant == CatchDockVariant.utility,
        ),
        findsOneWidget,
      );
      expect(find.byType(CatchStepHeader), findsOneWidget);
      expect(find.text("What's your number?"), findsOneWidget);
      expect(find.text('Send code'), findsOneWidget);
    });

    testWidgets('defaults the country picker to India', (tester) async {
      final repository = FakeAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      await pumpAuthScreen(tester, container: container);

      expect(find.text('+91'), findsOneWidget);
    });

    testWidgets('uses the locale-derived country picker default', (
      tester,
    ) async {
      final repository = FakeAuthRepository();
      final container = _authControllerContainer(
        repository,
        defaultCountryCode: '+61',
      );
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      await pumpAuthScreen(tester, container: container);

      expect(find.text('+61'), findsOneWidget);
    });

    testWidgets('country picker opens with dark theme styles', (tester) async {
      final repository = FakeAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      await pumpAuthScreen(
        tester,
        container: container,
        themeMode: ThemeMode.dark,
      );

      await tester.tap(find.byKey(AuthFormKeys.countryCode));
      await pumpFeatureUi(tester);

      expect(find.text('Select Country'), findsOneWidget);
      expect(find.byType(Dialog), findsOneWidget);
    });

    testWidgets('switch between phone and OTP views', (tester) async {
      final repository = FakeAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      await pumpAuthScreen(tester, container: container);

      expect(find.text("What's your number?"), findsOneWidget);

      container.read(authControllerProvider.notifier).goToStep(AuthStep.otp);
      await tester.pump();

      expect(find.text('Enter the code'), findsOneWidget);
    });

    testWidgets('change number returns to phone step', (tester) async {
      final repository = FakeAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      container.read(authControllerProvider.notifier).goToStep(AuthStep.otp);
      await pumpAuthScreen(tester, container: container);

      await tester.tap(find.byKey(AuthFormKeys.changeNumber));
      await tester.pump();

      expect(container.read(authControllerProvider).step, AuthStep.phone);
    });

    testWidgets('phone form sends OTP through the controller', (tester) async {
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

      await pumpAuthScreen(tester, container: container);

      await tester.enterText(
        find.descendant(
          of: find.byKey(AuthFormKeys.phoneField),
          matching: find.byType(EditableText),
        ),
        '9999999999',
      );
      await tester.tap(find.byKey(AuthFormKeys.sendCode));
      await tester.pump();
      await tester.pump();

      expect(repository.verifiedPhoneNumber, '+919999999999');
      expect(container.read(authControllerProvider).step, AuthStep.otp);
      expect(find.text('Enter the code'), findsOneWidget);
    });

    testWidgets(
      'phone form freezes request inputs and ignores duplicate sends',
      (tester) async {
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

        await pumpAuthScreen(tester, container: container);

        await tester.enterText(
          find.descendant(
            of: find.byKey(AuthFormKeys.phoneField),
            matching: find.byType(EditableText),
          ),
          '9999999999',
        );
        await tester.tap(find.byKey(AuthFormKeys.sendCode));
        await tester.pump();

        expect(repository.verifyPhoneNumberCallCount, 1);
        expect(
          tester
              .widget<TextField>(
                find.descendant(
                  of: find.byKey(AuthFormKeys.phoneField),
                  matching: find.byType(TextField),
                ),
              )
              .enabled,
          false,
        );
        expect(
          tester
              .widget<CountryCodePicker>(find.byType(CountryCodePicker))
              .enabled,
          false,
        );

        await tester.tap(find.byKey(AuthFormKeys.sendCode));
        await tester.tap(find.byKey(AuthFormKeys.countryCode));
        await tester.pump();

        expect(repository.verifyPhoneNumberCallCount, 1);
        expect(find.text('Select Country'), findsNothing);

        requestGate.complete();
        await pumpFeatureUi(tester);

        expect(container.read(authControllerProvider).step, AuthStep.otp);
      },
    );

    testWidgets('phone form shows validation before sending OTP', (
      tester,
    ) async {
      final repository = FakeAuthRepository();
      final container = _authControllerContainer(repository);
      addTearDown(repository.dispose);
      addTearDown(container.dispose);

      await pumpAuthScreen(tester, container: container);

      await tester.enterText(
        find.descendant(
          of: find.byKey(AuthFormKeys.phoneField),
          matching: find.byType(EditableText),
        ),
        '123',
      );
      await tester.tap(find.byKey(AuthFormKeys.sendCode));
      await tester.pump();

      expect(find.text('Please enter a valid phone number.'), findsOneWidget);
      expect(repository.verifyPhoneNumberCallCount, 0);
      expect(container.read(authControllerProvider).step, AuthStep.phone);
    });

    testWidgets('OTP entry verifies with the stored verification id', (
      tester,
    ) async {
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
      await container
          .read(authControllerProvider.notifier)
          .sendOtp('9999999999', '+91');

      await pumpAuthScreen(tester, container: container);

      await tester.enterText(find.byKey(AuthFormKeys.otpField), '123456');
      await tester.pump();
      await tester.pump();

      expect(repository.otpVerificationId, 'verification-id');
      expect(repository.otpSmsCode, '123456');
    });

    testWidgets('OTP entry ignores duplicate submits while pending', (
      tester,
    ) async {
      final repository = FakeAuthRepository()
        ..signInWithOtpCompleter = Completer<void>()
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
      await container
          .read(authControllerProvider.notifier)
          .sendOtp('9999999999', '+91');

      await pumpAuthScreen(tester, container: container);

      await tester.enterText(find.byKey(AuthFormKeys.otpField), '123456');
      await tester.pump();
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pump();

      expect(repository.signInWithOtpCallCount, 1);

      repository.signInWithOtpCompleter!.complete();
      await pumpFeatureUi(tester);
    });

    testWidgets('OTP verification errors settle back into an editable state', (
      tester,
    ) async {
      final repository = FakeAuthRepository()
        ..signInWithOtpError = FirebaseAuthException(
          code: 'invalid-verification-code',
        )
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
      await container
          .read(authControllerProvider.notifier)
          .sendOtp('9999999999', '+91');

      await pumpAuthScreen(tester, container: container);

      await tester.enterText(find.byKey(AuthFormKeys.otpField), '123456');
      await pumpFeatureUi(tester);

      expect(
        find.text('That code is invalid. Please try again.'),
        findsOneWidget,
      );
      expect(container.read(AuthController.verifyOtpMutation).isPending, false);
      expect(tester.takeException(), isNull);
    });
  });
}

ProviderContainer _authControllerContainer(
  FakeAuthRepository repository, {
  String defaultCountryCode = '+91',
}) {
  return ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(repository),
      authInitialCountryDialCodeProvider.overrideWithValue(defaultCountryCode),
    ],
  );
}
