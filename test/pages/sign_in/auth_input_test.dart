import 'package:catch_dating_app/pages/sign_in/auth_input.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AuthInput', () {
    test('normalizes national phone numbers', () {
      expect(AuthInput.normalizePhoneInput('98765 43210'), '9876543210');
    });

    test('normalizes international phone numbers', () {
      expect(AuthInput.normalizePhoneInput('+91 98765 43210'), '+919876543210');
    });

    test('returns a semantic issue for invalid phone numbers', () {
      expect(
        AuthInput.phoneNumberIssue('123'),
        AuthInputIssue.invalidPhoneNumber,
      );
    });

    test('rejects malformed country codes with shared UI message', () {
      expect(
        () => AuthInput.normalizeCountryCode('91'),
        throwsA(
          isA<AuthInputException>().having(
            (error) => error.issue,
            'issue',
            AuthInputIssue.invalidCountryCode,
          ),
        ),
      );
    });

    test('normalizes a six digit OTP code', () {
      expect(AuthInput.normalizeOtpCode(' 123456 '), '123456');
    });

    test('rejects malformed OTP codes', () {
      expect(
        () => AuthInput.normalizeOtpCode('12345a'),
        throwsA(
          isA<AuthInputException>().having(
            (error) => error.issue,
            'issue',
            AuthInputIssue.invalidOtpCode,
          ),
        ),
      );
    });

    test('formats and masks phone numbers for UI/logging', () {
      expect(
        AuthInput.formatPhoneNumber(
          phoneNumber: '9876543210',
          countryCode: '+91',
        ),
        '+919876543210',
      );
      expect(
        AuthInput.displayPhoneNumber(
          phoneNumber: '9876543210',
          countryCode: '+91',
        ),
        '+91 9876543210',
      );
      expect(AuthInput.maskedPhoneNumber('+919876543210'), '****3210');
      expect(
        AuthInput.maskedDisplayPhoneNumber(
          phoneNumber: '9876543210',
          countryCode: '+91',
        ),
        '+91 •••••• 3210',
      );
      expect(AuthInput.maskedNationalPhoneNumber('9876543210'), '•••••• 3210');
    });
  });
}
