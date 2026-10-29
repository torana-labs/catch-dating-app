import 'package:catch_dating_app/contexts/profiles/domain/profile_validation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('profile_validation', () {
    test('calculateAge handles birthdays before and after today', () {
      final today = DateTime(2026, 4, 22);

      expect(calculateAge(DateTime(1996, 4, 22), today: today), 30);
      expect(calculateAge(DateTime(1996, 4, 23), today: today), 29);
    });

    test('uses calendar arithmetic for the latest allowed date of birth', () {
      final today = DateTime(2026, 4, 22, 17, 30);

      expect(latestAllowedDateOfBirth(today: today), DateTime(2008, 4, 22));
      expect(isAtLeastAge(DateTime(2008, 4, 22), today: today), isTrue);
      expect(isAtLeastAge(DateTime(2008, 4, 23), today: today), isFalse);
    });

    test('normalizes reversed and out-of-range age preferences', () {
      expect(
        normalizeAgePreferenceRange(minAgePreference: 40, maxAgePreference: 20),
        (minAge: 20, maxAge: 40),
      );
      expect(
        normalizeAgePreferenceRange(
          minAgePreference: 12,
          maxAgePreference: 120,
        ),
        (minAge: 18, maxAge: 99),
      );
    });

    test('formats open ended preferred match age as 60 plus', () {
      expect(
        formatPreferredMatchAgeRange(
          minAgePreference: 18,
          maxAgePreference: 99,
        ),
        '18 – 60+',
      );
      expect(preferredMatchAgeStorageValue(59), 59);
      expect(preferredMatchAgeStorageValue(60), 99);
    });

    test('validates shared profile input fields', () {
      expect(
        validateRequiredProfileName('', label: 'Name'),
        'Name is required',
      );
      expect(validateRequiredProfileName('Suvrat', label: 'Name'), isNull);
      expect(validateRequiredDisplayName('   '), 'Display name is required');
      expect(validateRequiredDisplayName('S.'), isNull);
      expect(validateRequiredPhoneNumber(''), 'Phone is required');
      expect(validateOptionalEmail('not-an-email'), 'Enter a valid email');
      expect(validateOptionalEmail('runner@example.com'), isNull);
      expect(validateOptionalEmail(''), isNull);
      expect(
        validateOptionalProfilePromptAnswer(
          'a' * maximumProfilePromptAnswerLength,
        ),
        isNull,
      );
      expect(validateOptionalProfilePromptAnswer('first\n\nsecond'), isNull);
      expect(
        validateOptionalProfilePromptAnswer(
          'a' * (maximumProfilePromptAnswerLength + 1),
        ),
        'Prompt must be $maximumProfilePromptAnswerLength characters or fewer',
      );
      expect(validateOptionalProfilePromptAnswer('first\n\n\nsecond'), isNull);
      expect(
        collapseStackedPromptBlankLines('first\r\n\r\n\r\nsecond\n \n \nthird'),
        'first\n\nsecond\n\nthird',
      );
      expect(
        validateOptionalPhotoPromptCaption(
          'a' * (maximumPhotoPromptCaptionLength + 1),
        ),
        'Caption must be $maximumPhotoPromptCaptionLength characters or fewer',
      );
    });

    test('normalizes and validates profile height', () {
      expect(normalizeHeightCm(null), defaultHeightCm);
      expect(normalizeHeightCm(80), minimumHeightCm);
      expect(normalizeHeightCm(250), maximumHeightCm);
      expect(validateOptionalHeightCm(119), contains('$minimumHeightCm cm'));
      expect(validateOptionalHeightCm(221), contains('$maximumHeightCm cm'));
      expect(validateOptionalHeightCm(170), isNull);
    });
  });
}
