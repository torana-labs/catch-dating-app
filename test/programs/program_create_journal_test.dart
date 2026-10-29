import 'dart:convert';

import 'package:catch_dating_app/contexts/programmes/data/program_create_journal.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _RejectedPreferences extends Fake implements SharedPreferences {
  _RejectedPreferences({this.raw});
  final String? raw;

  @override
  Future<bool> setString(String key, String value) async => false;

  @override
  String? getString(String key) => raw;

  @override
  Future<bool> remove(String key) async => false;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  const values = ProgramCreateJournalValues(
    title: 'Kapoor–Shah Wedding',
    kind: 'wedding',
    timezone: 'Asia/Kolkata',
    startsAtMillis: 1791158400000,
    endsAtMillis: 1791417600000,
  );

  test(
    'false durable write and cleanup results surface persistence failures',
    () async {
      const entry = ProgramCreateJournalEntry(
        accountId: 'account-1',
        organizerId: 'organizer-1',
        requestId: 'program-request-0001',
        values: values,
        submittedValues: values,
      );
      final journal = ProgramCreateJournal(
        preferences: _RejectedPreferences(raw: jsonEncode(entry.toJson())),
      );
      await expectLater(journal.save(entry), throwsA(isA<AppException>()));
      await expectLater(
        journal.clear(
          accountId: entry.accountId,
          organizerId: entry.organizerId,
          requestId: entry.requestId,
        ),
        throwsA(isA<AppException>()),
      );
    },
  );

  test(
    'blank draft fields roundtrip while identity fields stay strict',
    () async {
      const journal = ProgramCreateJournal();
      const empty = ProgramCreateJournalValues(
        title: '',
        kind: null,
        timezone: '',
        startsAtMillis: null,
        endsAtMillis: null,
      );
      await journal.save(
        const ProgramCreateJournalEntry(
          accountId: 'account-1',
          organizerId: 'organizer-1',
          requestId: 'program-request-0001',
          values: empty,
        ),
      );
      final recovered = await journal.load(
        accountId: 'account-1',
        organizerId: 'organizer-1',
      );
      expect(recovered!.values.title, '');
      expect(recovered.values.timezone, '');
      expect(recovered.submittedValues, isNull);
      final raw = recovered.toJson();
      expect(
        () => ProgramCreateJournalEntry.fromJson({...raw, 'requestId': ''}),
        throwsFormatException,
      );
      expect(
        () => ProgramCreateJournalValues.fromJson({
          ...empty.toJson(),
          'title': null,
        }),
        throwsFormatException,
      );
    },
  );

  test('draft, submitted command and receipt survive a new journal', () async {
    const journal = ProgramCreateJournal();
    const entry = ProgramCreateJournalEntry(
      accountId: 'account-1',
      organizerId: 'organizer-1',
      requestId: 'program-request-0001',
      values: values,
      submittedValues: values,
      programId: 'program-1',
    );

    await journal.save(entry);
    final recovered = await const ProgramCreateJournal().load(
      accountId: 'account-1',
      organizerId: 'organizer-1',
    );

    expect(recovered, isNotNull);
    expect(recovered!.requestId, entry.requestId);
    expect(recovered.programId, entry.programId);
    expect(recovered.submittedValues!.title, values.title);
    expect(recovered.submittedValues!.startsAtMillis, values.startsAtMillis);
  });

  test(
    'account and organizer scopes cannot read or clear each other',
    () async {
      const journal = ProgramCreateJournal();
      const first = ProgramCreateJournalEntry(
        accountId: 'account-1',
        organizerId: 'organizer-1',
        requestId: 'program-request-0001',
        values: values,
      );
      const second = ProgramCreateJournalEntry(
        accountId: 'account-1',
        organizerId: 'organizer-2',
        requestId: 'program-request-0002',
        values: values,
      );
      await journal.save(first);
      await journal.save(second);

      await journal.clear(
        accountId: first.accountId,
        organizerId: first.organizerId,
        requestId: second.requestId,
      );
      expect(
        await journal.load(
          accountId: first.accountId,
          organizerId: first.organizerId,
        ),
        isNotNull,
      );
      await journal.clear(
        accountId: first.accountId,
        organizerId: first.organizerId,
        requestId: first.requestId,
      );
      expect(
        await journal.load(
          accountId: first.accountId,
          organizerId: first.organizerId,
        ),
        isNull,
      );
      expect(
        await journal.load(
          accountId: second.accountId,
          organizerId: second.organizerId,
        ),
        isNotNull,
      );
    },
  );
}
