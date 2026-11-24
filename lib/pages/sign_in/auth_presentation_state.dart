import 'package:catch_dating_app/pages/sign_in/auth_controller.dart';
import 'package:catch_dating_app/pages/sign_in/auth_input.dart';
import 'package:catch_tokens/catch_tokens.dart';

class AuthPhoneEntryViewState {
  const AuthPhoneEntryViewState({
    required this.countryCode,
    required this.shouldAutofocus,
    required this.sendButtonLoading,
    required this.requestControlsEnabled,
  });

  final String countryCode;
  final bool shouldAutofocus;
  final bool sendButtonLoading;
  final bool requestControlsEnabled;

  factory AuthPhoneEntryViewState.from({
    required AuthScreenState data,
    required bool isSendPending,
  }) {
    return AuthPhoneEntryViewState(
      countryCode: data.countryCode,
      shouldAutofocus: data.step == AuthStep.phone,
      sendButtonLoading: isSendPending,
      requestControlsEnabled: !isSendPending,
    );
  }
}

class AuthOtpEntryViewState {
  const AuthOtpEntryViewState({
    required this.displayPhoneNumber,
    required this.maskedDisplayPhoneNumber,
    required this.maskedNationalPhoneNumber,
    required this.shouldAutofocus,
    required this.canVerify,
    required this.verifyButtonLoading,
    required this.canResend,
    required this.secondsUntilResend,
    required this.isSendPending,
    required this.canChangeNumber,
  });

  static const resendCooldown = CatchMotion.authOtpResendCooldown;

  final String displayPhoneNumber;
  final String maskedDisplayPhoneNumber;
  final String maskedNationalPhoneNumber;
  final bool shouldAutofocus;
  final bool canVerify;
  final bool verifyButtonLoading;
  final bool canResend;
  final int secondsUntilResend;
  final bool isSendPending;
  final bool canChangeNumber;

  factory AuthOtpEntryViewState.from({
    required AuthScreenState data,
    required String otpCode,
    required int secondsUntilResend,
    required bool isVerifyPending,
    required bool isSendPending,
  }) {
    return AuthOtpEntryViewState(
      displayPhoneNumber: AuthInput.displayPhoneNumber(
        phoneNumber: data.phoneNumber,
        countryCode: data.countryCode,
      ),
      maskedDisplayPhoneNumber: AuthInput.maskedDisplayPhoneNumber(
        phoneNumber: data.phoneNumber,
        countryCode: data.countryCode,
      ),
      maskedNationalPhoneNumber: AuthInput.maskedNationalPhoneNumber(
        AuthInput.phoneNumberForState(
          phoneNumber: data.phoneNumber,
          countryCode: data.countryCode,
        ),
      ),
      shouldAutofocus: data.step == AuthStep.otp,
      canVerify:
          AuthInput.isCompleteOtpCode(otpCode) &&
          !isVerifyPending &&
          !isSendPending,
      verifyButtonLoading: isVerifyPending,
      canResend:
          secondsUntilResend <= 0 &&
          data.phoneNumber.isNotEmpty &&
          !isVerifyPending &&
          !isSendPending,
      secondsUntilResend: secondsUntilResend,
      isSendPending: isSendPending,
      canChangeNumber: !isVerifyPending && !isSendPending,
    );
  }
}
