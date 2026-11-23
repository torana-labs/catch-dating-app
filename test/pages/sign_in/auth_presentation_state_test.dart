import 'package:catch_dating_app/pages/sign_in/auth_controller.dart';
import 'package:catch_dating_app/pages/sign_in/auth_presentation_state.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AuthPhoneEntryViewState', () {
    test('derives country, autofocus, and loading state from auth inputs', () {
      final state = AuthPhoneEntryViewState.from(
        data: const AuthScreenState(countryCode: '+61'),
        isSendPending: true,
      );

      expect(state.countryCode, '+61');
      expect(state.shouldAutofocus, true);
      expect(state.sendButtonLoading, true);
      expect(state.requestControlsEnabled, false);
    });

    test('does not autofocus outside the phone step', () {
      final state = AuthPhoneEntryViewState.from(
        data: const AuthScreenState(step: AuthStep.otp),
        isSendPending: false,
      );

      expect(state.shouldAutofocus, false);
      expect(state.sendButtonLoading, false);
      expect(state.requestControlsEnabled, true);
    });
  });

  group('AuthOtpEntryViewState', () {
    test('enables verification for a complete OTP when mutations are idle', () {
      final state = AuthOtpEntryViewState.from(
        data: const AuthScreenState(
          phoneNumber: '9999999999',
          step: AuthStep.otp,
        ),
        otpCode: '123456',
        secondsUntilResend: 0,
        isVerifyPending: false,
        isSendPending: false,
      );

      expect(state.displayPhoneNumber, '+91 9999999999');
      expect(state.maskedDisplayPhoneNumber, '+91 •••••• 9999');
      expect(state.maskedNationalPhoneNumber, '•••••• 9999');
      expect(state.shouldAutofocus, true);
      expect(state.canVerify, true);
      expect(state.verifyButtonLoading, false);
      expect(state.canResend, true);
      expect(state.secondsUntilResend, 0);
      expect(state.isSendPending, false);
      expect(state.canChangeNumber, true);
    });

    test('disables actions during resend and formats pending copy', () {
      final state = AuthOtpEntryViewState.from(
        data: const AuthScreenState(
          phoneNumber: '9999999999',
          step: AuthStep.otp,
        ),
        otpCode: '123456',
        secondsUntilResend: 7,
        isVerifyPending: false,
        isSendPending: true,
      );

      expect(state.canVerify, false);
      expect(state.canResend, false);
      expect(state.canChangeNumber, false);
      expect(state.secondsUntilResend, 7);
      expect(state.isSendPending, true);
    });

    test(
      'disables verification for incomplete codes and verify pending state',
      () {
        final incomplete = AuthOtpEntryViewState.from(
          data: const AuthScreenState(step: AuthStep.otp),
          otpCode: '12345',
          secondsUntilResend: 0,
          isVerifyPending: false,
          isSendPending: false,
        );
        final pending = AuthOtpEntryViewState.from(
          data: const AuthScreenState(
            phoneNumber: '9999999999',
            step: AuthStep.otp,
          ),
          otpCode: '123456',
          secondsUntilResend: 0,
          isVerifyPending: true,
          isSendPending: false,
        );

        expect(incomplete.canVerify, false);
        expect(incomplete.canResend, false);
        expect(pending.canVerify, false);
        expect(pending.verifyButtonLoading, true);
        expect(pending.canChangeNumber, false);
      },
    );
  });
}
