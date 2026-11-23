enum AuthInputIssue { invalidCountryCode, invalidPhoneNumber, invalidOtpCode }

class AuthInputException implements Exception {
  const AuthInputException(this.issue);

  final AuthInputIssue issue;

  @override
  String toString() => 'AuthInputException(${issue.name})';
}

class AuthInput {
  const AuthInput._();

  static const minPhoneDigits = 7;
  static const maxPhoneDigits = 15;
  static const otpCodeLength = 6;

  static String normalizeCountryCode(String countryCode) {
    final normalized = countryCode.trim();
    if (!RegExp(r'^\+\d{1,4}$').hasMatch(normalized)) {
      throw const AuthInputException(AuthInputIssue.invalidCountryCode);
    }
    return normalized;
  }

  static String normalizePhoneInput(String phoneNumber) {
    final trimmed = phoneNumber.trim();
    final digits = trimmed.replaceAll(RegExp(r'\D'), '');
    if (digits.length < minPhoneDigits || digits.length > maxPhoneDigits) {
      throw const AuthInputException(AuthInputIssue.invalidPhoneNumber);
    }
    return trimmed.startsWith('+') ? '+$digits' : digits;
  }

  static String normalizeOtpCode(String code) {
    final normalized = code.trim();
    if (!RegExp('^\\d{$otpCodeLength}\$').hasMatch(normalized)) {
      throw const AuthInputException(AuthInputIssue.invalidOtpCode);
    }
    return normalized;
  }

  static String formatPhoneNumber({
    required String phoneNumber,
    required String countryCode,
  }) {
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    return '$countryCode$phoneNumber';
  }

  static String phoneNumberForState({
    required String phoneNumber,
    required String countryCode,
  }) {
    if (!phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    if (phoneNumber.startsWith(countryCode)) {
      return phoneNumber.substring(countryCode.length);
    }
    return phoneNumber;
  }

  static String displayPhoneNumber({
    required String phoneNumber,
    required String countryCode,
  }) {
    if (phoneNumber.isEmpty) {
      return '';
    }
    return '$countryCode $phoneNumber';
  }

  static String maskedPhoneNumber(String phoneNumber) {
    if (phoneNumber.length <= 4) {
      return '****';
    }
    return '****${phoneNumber.substring(phoneNumber.length - 4)}';
  }

  static String maskedDisplayPhoneNumber({
    required String phoneNumber,
    required String countryCode,
  }) {
    if (phoneNumber.isEmpty) return '';
    final nationalNumber = phoneNumber.startsWith(countryCode)
        ? phoneNumber.substring(countryCode.length)
        : phoneNumber;
    return '$countryCode ${maskedNationalPhoneNumber(nationalNumber)}';
  }

  static String maskedNationalPhoneNumber(String phoneNumber) {
    if (phoneNumber.isEmpty) return '';
    final visibleDigits = phoneNumber.length <= 4
        ? phoneNumber
        : phoneNumber.substring(phoneNumber.length - 4);
    final hiddenCount = (phoneNumber.length - visibleDigits.length)
        .clamp(4, 7)
        .toInt();
    return '${List.filled(hiddenCount, '•').join()} $visibleDigits';
  }

  static bool isCompleteOtpCode(String code) => code.length == otpCodeLength;

  static AuthInputIssue? phoneNumberIssue(String? phoneNumber) {
    try {
      normalizePhoneInput(phoneNumber ?? '');
      return null;
    } on AuthInputException catch (error) {
      return error.issue;
    }
  }
}
