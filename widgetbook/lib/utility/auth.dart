import 'dart:async';

import 'package:catch_dating_app/auth/presentation/auth_controller.dart';
import 'package:catch_dating_app/auth/presentation/auth_screen.dart';
import 'package:catch_dating_app/auth/presentation/host_auth_card.dart';
import 'package:catch_dating_app/auth/presentation/otp_step.dart';
import 'package:catch_dating_app/auth/presentation/phone_step.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/contract_preview.dart';
import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Screen states',
  type: AuthScreen,
  path: '[P3 utility surfaces]/Auth',
)
Widget authScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'AuthScreen',
    contractId: 'screen.auth.flow',
    children: [
      WidgetbookPageStateCard(
        label: 'phone entry',
        child: _authFrame(child: const AuthScreen(appRole: AppRole.host)),
      ),
      WidgetbookPageStateCard(
        label: 'otp entry cooldown',
        child: _authFrame(
          mode: _AuthPreviewMode.otpEntry,
          child: const AuthScreen(appRole: AppRole.host),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'send code pending',
        child: _authFrame(
          mode: _AuthPreviewMode.sendCodePending,
          child: const AuthScreen(appRole: AppRole.host),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'send code error',
        child: _authFrame(
          mode: _AuthPreviewMode.sendCodeError,
          child: const AuthScreen(appRole: AppRole.host),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'verify code pending',
        child: _authFrame(
          mode: _AuthPreviewMode.verifyCodePending,
          child: const AuthScreen(
            appRole: AppRole.host,
            initialOtpCode: '137289',
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'verify code error',
        child: _authFrame(
          mode: _AuthPreviewMode.verifyCodeError,
          child: const AuthScreen(
            appRole: AppRole.host,
            initialOtpCode: '137289',
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'resend pending',
        child: _authFrame(
          mode: _AuthPreviewMode.resendPending,
          child: const AuthScreen(appRole: AppRole.host),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'resend error',
        child: _authFrame(
          mode: _AuthPreviewMode.resendError,
          child: const AuthScreen(appRole: AppRole.host),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'phone entry text scale 2',
        child: _authFrame(
          textScaler: const TextScaler.linear(2),
          child: const AuthScreen(appRole: AppRole.host),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'otp reduced motion',
        child: _authFrame(
          mode: _AuthPreviewMode.otpEntry,
          disableAnimations: true,
          child: const AuthScreen(appRole: AppRole.host),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Phone entry states',
  type: PhoneStep,
  path: '[P3 utility surfaces]/Auth',
)
Widget phonePageStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'PhoneStep',
    contractId: 'screen.auth.phone',
    children: [
      WidgetbookPageStateCard(
        label: 'default country',
        child: _authFrame(child: const PhoneStep()),
      ),
      WidgetbookPageStateCard(
        label: 'send code pending',
        child: _authFrame(
          mode: _AuthPreviewMode.sendCodePending,
          child: const PhoneStep(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'send code error',
        child: _authFrame(
          mode: _AuthPreviewMode.sendCodeError,
          child: const PhoneStep(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2',
        child: _authFrame(
          textScaler: const TextScaler.linear(2),
          child: const PhoneStep(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Scaffold states',
  type: HostAuthScaffold,
  path: '[P3 utility surfaces]/Auth',
)
Widget hostAuthScaffoldStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'HostAuthScaffold',
    contractId: 'screen.auth.host_scaffold',
    children: [
      WidgetbookPageStateCard(
        label: 'brand header over inset card',
        child: SizedBox(
          height: 560,
          child: HostAuthScaffold(
            child: HostAuthCard(
              child: HostAuthHeader(
                title: 'Sign in to Catch Host',
                subtitle: 'We will text a code to your phone.',
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Card states',
  type: HostAuthCard,
  path: '[P3 utility surfaces]/Auth',
)
Widget hostAuthCardStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'HostAuthCard',
    contractId: 'component.auth.host_card',
    children: [
      WidgetbookPageStateCard(
        label: 'header and action',
        child: HostAuthCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              HostAuthHeader(
                title: 'Enter the code',
                subtitle: 'Sent to +91 98765 43210.',
              ),
              SizedBox(height: CatchSpacing.s4),
              HostAuthProgressButton(label: 'Verifying'),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Header states',
  type: HostAuthHeader,
  path: '[P3 utility surfaces]/Auth',
)
Widget hostAuthHeaderStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'HostAuthHeader',
    contractId: 'component.auth.host_header',
    children: [
      WidgetbookPageStateCard(
        label: 'phone step',
        child: HostAuthHeader(
          title: 'Sign in to Catch Host',
          subtitle: 'We will text a code to your phone.',
        ),
      ),
      WidgetbookPageStateCard(
        label: 'long subtitle',
        child: HostAuthHeader(
          title: 'Enter the code',
          subtitle:
              'We sent a six-digit code to +91 98765 43210. It can take a '
              'minute to arrive.',
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Progress button states',
  type: HostAuthProgressButton,
  path: '[P3 utility surfaces]/Auth',
)
Widget hostAuthProgressButtonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'HostAuthProgressButton',
    contractId: 'component.auth.host_progress_button',
    children: [
      WidgetbookPageStateCard(
        label: 'primary in flight',
        child: HostAuthProgressButton(label: 'Sending code'),
      ),
      WidgetbookPageStateCard(
        label: 'secondary in flight',
        child: HostAuthProgressButton(
          label: 'Resending',
          variant: CatchButtonVariant.secondary,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Country code selector states',
  type: PhoneCountryCodePicker,
  path: '[P3 utility surfaces]/Auth',
)
Widget countryCodeSelectorStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'PhoneCountryCodePicker',
    contractId: 'component.auth.country_code_selector',
    children: [
      WidgetbookPageStateCard(
        label: 'India default',
        child: Align(
          alignment: Alignment.centerLeft,
          child: PhoneCountryCodePicker(
            countryCode: '+91',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'US default',
        child: Align(
          alignment: Alignment.centerLeft,
          child: PhoneCountryCodePicker(
            countryCode: '+1',
            onChanged: widgetbookIgnoreString,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'OTP entry states',
  type: OtpStep,
  path: '[P3 utility surfaces]/Auth',
)
Widget otpPageStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'OtpStep',
    contractId: 'screen.auth.otp',
    children: [
      WidgetbookPageStateCard(
        label: 'verification code cooldown',
        child: _authFrame(
          mode: _AuthPreviewMode.otpEntry,
          child: const OtpStep(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'verify pending',
        child: _authFrame(
          mode: _AuthPreviewMode.verifyCodePending,
          child: const OtpStep(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'verify error',
        child: _authFrame(
          mode: _AuthPreviewMode.verifyCodeError,
          child: const OtpStep(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'resend pending',
        child: _authFrame(
          mode: _AuthPreviewMode.resendPending,
          child: const OtpStep(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'resend error',
        child: _authFrame(
          mode: _AuthPreviewMode.resendError,
          child: const OtpStep(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2',
        child: _authFrame(
          mode: _AuthPreviewMode.otpEntry,
          textScaler: const TextScaler.linear(2),
          child: const OtpStep(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: _authFrame(
          mode: _AuthPreviewMode.otpEntry,
          disableAnimations: true,
          child: const OtpStep(),
        ),
      ),
    ],
  );
}

Widget _authFrame({
  required Widget child,
  _AuthPreviewMode mode = _AuthPreviewMode.phoneEntry,
  TextScaler? textScaler,
  bool disableAnimations = false,
}) {
  return WidgetbookUtilityDeviceFrame(
    child: _AuthScope(
      mode: mode,
      textScaler: textScaler,
      disableAnimations: disableAnimations,
      child: child,
    ),
  );
}

enum _AuthPreviewMode {
  phoneEntry,
  otpEntry,
  sendCodePending,
  sendCodeError,
  verifyCodePending,
  verifyCodeError,
  resendPending,
  resendError,
}

class _AuthScope extends StatelessWidget {
  const _AuthScope({
    required this.child,
    this.mode = _AuthPreviewMode.phoneEntry,
    this.textScaler,
    this.disableAnimations = false,
  });

  final Widget child;
  final _AuthPreviewMode mode;
  final TextScaler? textScaler;
  final bool disableAnimations;

  @override
  Widget build(BuildContext context) {
    Widget scoped = WidgetbookFixtureScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(
          const _WidgetbookAuthRepository(),
        ),
        authInitialCountryDialCodeProvider.overrideWithValue('+91'),
      ],
      child: _AuthPreviewSeeder(mode: mode, child: child),
    );

    if (textScaler != null || disableAnimations) {
      scoped = WidgetbookMediaOverride(
        textScaler: textScaler,
        disableAnimations: disableAnimations,
        child: scoped,
      );
    }

    return scoped;
  }
}

class _AuthPreviewSeeder extends ConsumerStatefulWidget {
  const _AuthPreviewSeeder({required this.mode, required this.child});

  final _AuthPreviewMode mode;
  final Widget child;

  @override
  ConsumerState<_AuthPreviewSeeder> createState() => _AuthPreviewSeederState();
}

class _AuthPreviewSeederState extends ConsumerState<_AuthPreviewSeeder> {
  static const _phoneNumber = '9876543210';
  static const _countryCode = '+91';

  Completer<void>? _pendingCompleter;
  var _seeded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(_seed()));
  }

  @override
  void didUpdateWidget(covariant _AuthPreviewSeeder oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.mode != widget.mode) {
      _seeded = false;
      WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(_seed()));
    }
  }

  @override
  void dispose() {
    final completer = _pendingCompleter;
    if (completer != null && !completer.isCompleted) {
      completer.complete();
    }
    super.dispose();
  }

  Future<void> _seed() async {
    if (!mounted || _seeded) return;
    _seeded = true;
    AuthController.sendOtpMutation.reset(ref);
    AuthController.verifyOtpMutation.reset(ref);

    switch (widget.mode) {
      case _AuthPreviewMode.phoneEntry:
        ref.read(authControllerProvider.notifier).goToStep(AuthStep.phone);
        break;
      case _AuthPreviewMode.otpEntry:
        await _seedOtpStep();
        break;
      case _AuthPreviewMode.sendCodePending:
        ref.read(authControllerProvider.notifier).goToStep(AuthStep.phone);
        _runPending(AuthController.sendOtpMutation);
        break;
      case _AuthPreviewMode.sendCodeError:
        ref.read(authControllerProvider.notifier).goToStep(AuthStep.phone);
        _runError(
          AuthController.sendOtpMutation,
          const NetworkException(
            'widgetbook-send-code-failed',
            'We could not send the code. Check your connection and try again.',
            context: BackendErrorContext(
              service: BackendService.auth,
              action: 'send verification code',
              resource: 'phone_auth',
            ),
          ),
        );
        break;
      case _AuthPreviewMode.verifyCodePending:
        await _seedOtpStep();
        _runPending(AuthController.verifyOtpMutation);
        break;
      case _AuthPreviewMode.verifyCodeError:
        await _seedOtpStep();
        _runError(
          AuthController.verifyOtpMutation,
          const ValidationException(
            'That code is invalid. Please try again.',
            code: 'invalid-verification-code',
            context: BackendErrorContext(
              service: BackendService.auth,
              action: 'verify sms code',
              resource: 'phone_auth',
            ),
          ),
        );
        break;
      case _AuthPreviewMode.resendPending:
        await _seedOtpStep();
        _runPending(AuthController.sendOtpMutation);
        break;
      case _AuthPreviewMode.resendError:
        await _seedOtpStep();
        _runError(
          AuthController.sendOtpMutation,
          const NetworkException(
            'widgetbook-resend-code-failed',
            'We could not resend the code. Please try again.',
            context: BackendErrorContext(
              service: BackendService.auth,
              action: 'resend verification code',
              resource: 'phone_auth',
            ),
          ),
        );
        break;
    }
  }

  Future<void> _seedOtpStep() async {
    await ref
        .read(authControllerProvider.notifier)
        .sendOtp(_phoneNumber, _countryCode);
  }

  void _runPending(Mutation<void> mutation) {
    final completer = Completer<void>();
    _pendingCompleter = completer;
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError(Mutation<void> mutation, Object error) {
    unawaited(mutation.run(ref, (_) async => throw error).catchError((_) {}));
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _WidgetbookAuthRepository implements AuthRepository {
  const _WidgetbookAuthRepository();

  @override
  User? get currentUser => null;

  @override
  Stream<User?> authStateChanges() => Stream<User?>.value(null);

  @override
  Future<void> verifyPhoneNumber({
    required String phoneNumber,
    int? forceResendingToken,
    required void Function(String verificationId, int? resendToken) codeSent,
    required void Function(AppException e) verificationFailed,
    required void Function(PhoneAuthCredential credential)
    verificationCompleted,
  }) async {
    codeSent('widgetbook-verification-id', null);
  }

  @override
  Future<void> signInWithOtp({
    required String verificationId,
    required String smsCode,
  }) async {}

  @override
  Future<void> signInWithCredential(AuthCredential credential) async {}

  @override
  Future<void> signOut() async {}
}
