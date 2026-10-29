import 'dart:async';

import 'package:catch_dating_app/auth/presentation/auth_input.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'auth_controller.freezed.dart';
part 'auth_controller.g.dart';

enum AuthStep { phone, otp }

// keepalive: initial phone market is stable auth-flow state reused by phone
// and OTP route rebuilds.
@Riverpod(keepAlive: true)
String authInitialCountryDialCode(Ref ref) {
  if (AppConfig.appRole.isHost) {
    return defaultCountryDialCode;
  }

  final countryCode = WidgetsFlutterBinding.ensureInitialized()
      .platformDispatcher
      .locale
      .countryCode;
  return marketForIsoCode(countryCode).dialCode;
}

@freezed
abstract class AuthScreenState with _$AuthScreenState {
  const factory AuthScreenState({
    @Default('') String phoneNumber,
    @Default(defaultCountryDialCode) String countryCode,
    String? verificationId,
    @Default(AuthStep.phone) AuthStep step,
  }) = _AuthScreenState;
}

extension AuthScreenStateX on AuthScreenState {
  bool get hasPendingVerification =>
      step == AuthStep.otp &&
      verificationId != null &&
      verificationId!.isNotEmpty;
}

/// **Pattern B: Flow controller with freezed state + Mutations**
///
/// Owns the phone-auth screen state while the user moves between phone entry
/// and OTP verification. [sendOtpMutation] and [verifyOtpMutation] expose the
/// async operation lifecycle to the UI; local text/focus/timer concerns stay in
/// the widgets.
///
/// This provider is keepAlive so the OTP step survives route rebuilds during
/// authentication. Call [reset] or invalidate the provider when the auth flow is
/// cancelled, completed, or the user signs out.
// keepalive: OTP state must survive auth route rebuilds until explicit reset.
@Riverpod(keepAlive: true)
class AuthController extends _$AuthController {
  static final sendOtpMutation = Mutation<void>();
  static final verifyOtpMutation = Mutation<void>();

  int? _resendToken;
  Future<void>? _sendOtpInFlight;
  Object? _otpAttempt;
  Completer<void>? _sendOtpCompleter;

  @override
  AuthScreenState build() {
    ref.onDispose(_abandonOtpAttempt);
    return AuthScreenState(
      countryCode: ref.watch(authInitialCountryDialCodeProvider),
    );
  }

  void setCountryCode(String code) {
    if (_sendOtpInFlight != null) return;
    state = state.copyWith(countryCode: code);
    sendOtpMutation.reset(ref);
  }

  void clearSendOtpErrorIfIdle() {
    if (_sendOtpInFlight != null) return;
    sendOtpMutation.reset(ref);
  }

  void goToStep(AuthStep step) {
    if (step == AuthStep.phone) {
      _abandonOtpAttempt();
      state = state.copyWith(step: step, verificationId: null);
      return;
    }
    state = state.copyWith(step: step);
  }

  Future<void> sendOtp(String phoneNumber, String countryCode) {
    final existingRequest = _sendOtpInFlight;
    if (existingRequest != null) return existingRequest;

    late final Future<void> trackedRequest;
    trackedRequest = _sendOtp(phoneNumber, countryCode).whenComplete(() {
      if (identical(_sendOtpInFlight, trackedRequest)) {
        _sendOtpInFlight = null;
      }
    });
    _sendOtpInFlight = trackedRequest;
    return trackedRequest;
  }

  Future<void> _sendOtp(String phoneNumber, String countryCode) async {
    final normalizedCountryCode = AuthInput.normalizeCountryCode(countryCode);
    final normalizedPhoneNumber = AuthInput.normalizePhoneInput(phoneNumber);
    final formatted = AuthInput.formatPhoneNumber(
      phoneNumber: normalizedPhoneNumber,
      countryCode: normalizedCountryCode,
    );
    final phoneNumberForState = AuthInput.phoneNumberForState(
      phoneNumber: normalizedPhoneNumber,
      countryCode: normalizedCountryCode,
    );
    final forceResendingToken =
        state.phoneNumber == phoneNumberForState &&
            state.countryCode == normalizedCountryCode
        ? _resendToken
        : null;
    if (forceResendingToken == null) _resendToken = null;

    // Rejected input and duplicate dispatches do not supersede the current
    // attempt. codeSent settles the send, but keeps automatic verification
    // eligible until a newer accepted send or explicit abandonment.
    final attempt = Object();
    _otpAttempt = attempt;
    bool isCurrentRequest() => ref.mounted && identical(_otpAttempt, attempt);

    state = state.copyWith(
      verificationId: null,
      phoneNumber: phoneNumberForState,
      countryCode: normalizedCountryCode,
    );

    _debugLogOtpRequest(formatted);

    final completer = Completer<void>();
    _sendOtpCompleter = completer;

    unawaited(
      ref
          .read(authRepositoryProvider)
          .verifyPhoneNumber(
            phoneNumber: formatted,
            forceResendingToken: forceResendingToken,
            codeSent: (verificationId, resendToken) {
              if (!isCurrentRequest()) {
                if (!completer.isCompleted) completer.complete();
                return;
              }
              _debugLog('AuthController.sendOtp: codeSent');
              _resendToken = resendToken;
              state = state.copyWith(
                verificationId: verificationId,
                step: AuthStep.otp,
              );
              if (!completer.isCompleted) completer.complete();
            },
            verificationFailed: (e) {
              if (!isCurrentRequest()) {
                if (!completer.isCompleted) completer.complete();
                return;
              }
              _debugLogAppException(
                'AuthController.sendOtp verificationFailed',
                e,
              );
              if (!completer.isCompleted) completer.completeError(e);
            },
            verificationCompleted: (credential) async {
              if (!isCurrentRequest()) {
                if (!completer.isCompleted) completer.complete();
                return;
              }
              _debugLog('AuthController.sendOtp: verificationCompleted (auto)');
              try {
                await withBackendErrorContext(
                  () => ref
                      .read(authRepositoryProvider)
                      .signInWithCredential(credential),
                  context: const BackendErrorContext(
                    service: BackendService.auth,
                    action: 'sign in with credential',
                    resource: 'phone_auth',
                  ),
                );
                if (!completer.isCompleted) completer.complete();
              } catch (e, st) {
                if (!completer.isCompleted) completer.completeError(e, st);
              }
            },
          )
          .catchError((Object e, StackTrace st) {
            _debugLog('AuthController.sendOtp catchError: $e');
            if (!completer.isCompleted) {
              if (isCurrentRequest()) {
                completer.completeError(e, st);
              } else {
                completer.complete();
              }
            }
          }),
    );

    return completer.future.timeout(
      CatchMotion.authOtpResendCooldown,
      onTimeout: () {
        if (isCurrentRequest()) _abandonOtpAttempt();
        throw const NetworkException(
          'timeout',
          'The verification request timed out. Please check your connection and try again.',
          context: BackendErrorContext(
            service: BackendService.auth,
            action: 'send verification code',
            resource: 'phone_auth',
          ),
        );
      },
    );
  }

  Future<void> verifyOtp(String code) async {
    final verificationId = state.verificationId;
    if (verificationId == null || verificationId.isEmpty) {
      throw StateError(
        'Verification session expired. Please request a new code.',
      );
    }

    final smsCode = AuthInput.normalizeOtpCode(code);
    await ref
        .read(authRepositoryProvider)
        .signInWithOtp(verificationId: verificationId, smsCode: smsCode);
  }

  void reset() {
    _abandonOtpAttempt();
    state = AuthScreenState(
      countryCode: ref.read(authInitialCountryDialCodeProvider),
    );
    sendOtpMutation.reset(ref);
    verifyOtpMutation.reset(ref);
  }

  void _abandonOtpAttempt() {
    _otpAttempt = null;
    _resendToken = null;
    _sendOtpInFlight = null;
    final completer = _sendOtpCompleter;
    _sendOtpCompleter = null;
    if (completer != null && !completer.isCompleted) completer.complete();
  }

  void _debugLogOtpRequest(String formattedPhoneNumber) {
    _debugLog('── AuthController.sendOtp ──');
    _debugLog('  phone: ${AuthInput.maskedPhoneNumber(formattedPhoneNumber)}');
    _debugLog(
      '  appCheckDebugToken configured: ${AppConfig.firebaseAppCheckDebugToken.isNotEmpty}',
    );
  }

  void _debugLog(String message) {
    if (!kDebugMode || !AppConfig.verboseAuthDebugLogs) {
      return;
    }
    debugPrint(message);
  }

  void _debugLogAppException(String label, AppException error) {
    _debugLog('$label: code=${error.code}');
    final debugMessage = error.debugMessage;
    if (debugMessage != null && debugMessage.isNotEmpty) {
      _debugLog('$label debug: $debugMessage');
    }
    final cause = error.cause;
    if (cause != null) {
      _debugLog('$label cause: ${cause.runtimeType}: $cause');
    }
  }
}
