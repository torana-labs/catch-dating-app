import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/programmes/data/phone_import_retry_store.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_contact.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_batch.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_draft.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_storage_sqlite.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/sqlite3.dart';

PhoneImportBatch batch({
  String operation = 'synthetic_operation_01',
  String program = 'wedding',
  String name = 'Synthetic guest',
}) => PhoneImportBatch.fromReview(
  accountId: 'client',
  programId: program,
  organizerId: 'planner',
  familySideLabels: const {},
  review: PhoneImportReview(
    reviewId: operation,
    entries: [
      PhoneImportEntry(
        id: 'synthetic_reference_01',
        displayName: name,
        numbers: const [
          PhoneContactNumber(value: '202-555-0100', label: 'chosen'),
          PhoneContactNumber(value: '+12025550101', label: 'unused'),
        ],
        selectedPhone: '202-555-0100',
        reviewedInternationalPhone: '+1 (202) 555-0100',
      ),
    ],
  ),
);

void main() {
  test(
    'country correction sends only the chosen reviewed international number',
    () {
      expect(batch().rows.single['phoneE164'], '+12025550100');
      expect(jsonEncode(batch().toJson()), isNot(contains('unused')));
      expect(jsonEncode(batch().toJson()), isNot(contains('202-555-0100')));
      expect(
        PhoneImportBatch.fromJson(batch().toJson()).contentKey,
        batch().contentKey,
      );
    },
  );
  test(
    'restoration rejects extra contact fields, wrong phones and duplicate references',
    () {
      final original = batch().toJson();
      final row = batch().rows.single;
      for (final rows in [
        [
          {
            ...row,
            'numbers': ['private unused number'],
          },
        ],
        [
          {...row, 'phoneE164': '2025550100'},
        ],
        [row, row],
        [
          {...row, 'externalReference': 'nativeAddressBookId'},
        ],
      ]) {
        expect(
          () => PhoneImportBatch.fromJson({...original, 'rows': rows}),
          throwsA(isA<ValidationException>()),
        );
      }
    },
  );

  for (final backend in ['memory', 'sqlite']) {
    group(backend, () {
      late CommandJournalStorage storage;
      String? account;
      late PhoneImportRetryStore store;
      setUp(() {
        account = 'client';
        storage = backend == 'sqlite'
            ? SqliteCommandJournalStorage(sqlite3.openInMemory())
            : MemoryCommandJournalStorage();
        store = PhoneImportRetryStore(
          storage: () async => storage,
          currentAccountId: () => account,
        );
      });
      tearDown(() => storage.close());
      test(
        'new store restores identical ordered content and operation without replay',
        () async {
          final command = batch();
          await store.save(command);
          final recreated = PhoneImportRetryStore(
            storage: () async => storage,
            currentAccountId: () => account,
          );
          final restored = await recreated.load('client', 'wedding');
          expect(restored!.contentKey, command.contentKey);
          expect(restored.operationId, command.operationId);
          await recreated.save(command);
          expect(
            (await store.load('client', 'wedding'))!.contentKey,
            command.contentKey,
          );
        },
      );
      test(
        'concurrent competing import cannot replace pending operation',
        () async {
          await store.save(batch());
          await expectLater(
            store.save(batch(operation: 'synthetic_operation_02')),
            throwsA(isA<ValidationException>()),
          );
          await expectLater(
            store.save(batch(name: 'Changed content')),
            throwsA(isA<ValidationException>()),
          );
          expect(
            (await store.load('client', 'wedding'))!.operationId,
            'synthetic_operation_01',
          );
        },
      );
      test(
        'another account cannot read or clear and another wedding is isolated',
        () async {
          final command = batch();
          await store.save(command);
          expect(await store.load('client', 'other-wedding'), isNull);
          account = 'other-account';
          await expectLater(
            store.load('client', 'wedding'),
            throwsA(isA<SignInRequiredException>()),
          );
          await expectLater(
            store.clear(command),
            throwsA(isA<SignInRequiredException>()),
          );
          account = 'client';
          expect(
            (await store.load('client', 'wedding'))!.contentKey,
            command.contentKey,
          );
        },
      );
      test(
        'matching receipt clears selected local data; different receipt cannot clear',
        () async {
          final command = batch();
          await store.save(command);
          await expectLater(
            store.clear(batch(operation: 'synthetic_operation_02')),
            throwsA(isA<ValidationException>()),
          );
          await store.clear(command);
          expect(await store.load('client', 'wedding'), isNull);
        },
      );
    });
  }
  test(
    'SQLite database reopen retains exact retry across process lifetime',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'catch-phone-retry-synthetic-',
      );
      final path = '${directory.path}/commands.sqlite';
      var database = SqliteCommandJournalStorage(sqlite3.open(path));
      try {
        final first = PhoneImportRetryStore(
          storage: () async => database,
          currentAccountId: () => 'client',
        );
        await first.save(batch());
        await database.close();
        database = SqliteCommandJournalStorage(sqlite3.open(path));
        final restarted = PhoneImportRetryStore(
          storage: () async => database,
          currentAccountId: () => 'client',
        );
        final restored = (await restarted.load('client', 'wedding'))!;
        expect(restored.contentKey, batch().contentKey);
        await restarted.clear(restored);
        expect(await restarted.load('client', 'wedding'), isNull);
      } finally {
        await database.close();
        await directory.delete(recursive: true);
      }
    },
  );
}
