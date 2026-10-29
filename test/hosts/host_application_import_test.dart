import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_import.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('maps common form columns without dropping proprietary questions', () {
    final draft = buildHostApplicationImportDraft(
      _table(
        headers: const [
          'Full name',
          'WhatsApp number',
          'Date of birth',
          'What are you looking for?',
          'Favorite cocktail',
        ],
        rows: const [
          [
            'Ada Lovelace',
            '+44 7700 900123',
            '1990-12-10',
            'Long-term relationship',
            'Negroni',
          ],
        ],
      ),
    );

    expect(draft.questions.map((question) => question.canonicalFieldId), [
      'displayName',
      'phoneNumber',
      'dateOfBirth',
      'relationshipGoal',
      null,
    ]);
    expect(draft.questions.last.privacyClass, 'organizerCustom');
    expect(draft.questions.last.prefillPolicy, 'never');
    expect(
      draft.mappingJson.last['questionId'],
      draft.questions.last.questionId,
    );
    expect(draft.rowJson.single['values'], [
      'Ada Lovelace',
      '+44 7700 900123',
      '1990-12-10',
      'Long-term relationship',
      'Negroni',
    ]);
  });

  test('supports separate first and last names from any tabular provider', () {
    final draft = buildHostApplicationImportDraft(
      _table(
        headers: const ['First Name', 'Last Name', 'Email Address'],
        rows: const [
          ['Grace', 'Hopper', 'grace@example.com'],
        ],
      ),
    );

    expect(draft.questions[0].canonicalFieldId, 'givenName');
    expect(draft.questions[1].canonicalFieldId, 'familyName');
    expect(draft.questions[2].canonicalFieldId, 'email');
    expect(draft.questions[0].required, isTrue);
  });

  test('uses the canonical catalog for aliases and newer profile fields', () {
    final draft = buildHostApplicationImportDraft(
      _table(
        headers: const [
          'Your name',
          'Birth date',
          'WhatsApp Number',
          'Workout frequency',
          'Dietary preference',
          'Kids',
        ],
        rows: const [
          [
            'Grace Hopper',
            '1906-12-09',
            '+1 202 555 0100',
            'Weekly',
            'Vegetarian',
            'No',
          ],
        ],
      ),
    );

    expect(draft.questions.map((question) => question.canonicalFieldId), [
      'displayName',
      'dateOfBirth',
      'phoneNumber',
      'workout',
      'diet',
      'children',
    ]);
    expect(draft.questions[1].kind, 'date');
    expect(draft.questions[3].kind, 'shortText');
    expect(draft.questions[3].transform, 'trim');
  });

  test('requires a recognizable applicant name for the review queue', () {
    expect(
      () => buildHostApplicationImportDraft(
        _table(
          headers: const ['Email', 'Favorite cocktail'],
          rows: const [
            ['person@example.com', 'Martini'],
          ],
        ),
      ),
      throwsA(
        isA<HostApplicationImportException>().having(
          (error) => error.issue,
          'issue',
          HostApplicationImportIssue.missingNameColumn,
        ),
      ),
    );
  });
}

HostRosterTable _table({
  required List<String> headers,
  required List<List<String>> rows,
}) => HostRosterTable(
  fileName: 'responses.csv',
  format: EventAttendeeImportFormat.csv,
  headers: headers,
  rows: rows,
  suggestedMapping: const {},
  adapter: const HostRosterAdapterDetection(
    adapterId: HostRosterAdapterId.genericV1,
    support: HostRosterAdapterSupport.generic,
    confidence: 1,
  ),
);
