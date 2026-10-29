import 'dart:convert';

import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_storage_indexed_db.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_storage_sqlite.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:idb_shim/idb_client_memory.dart';
import 'package:sqlite3/sqlite3.dart';

String _key(String namespace, String account) =>
    sha256.convert(utf8.encode(jsonEncode([namespace, account]))).toString();

void main() {
  test(
    'migration between reads cannot make both source copies disappear',
    () async {
      final storage = _MigratingStorage();
      String? legacy = jsonEncode([
        ProgramOperationOutboxEntry.legObservation(
          programId: 'p',
          legId: 'leg',
          action: 'markReady',
          clientOperationId: 'operation',
          expectedRevision: 1,
          createdAt: DateTime.now(),
        ).toJson(),
      ]);
      final original = legacy;
      final journal = createProgramOperationJournal(
        storage: () async => storage,
        currentAccountId: () => 'a',
        loadLegacy: (_) async => legacy,
        clearLegacy: (_) async {
          legacy = null;
        },
      );
      storage.afterRead = () async {
        await journal.load('a');
      };
      final result = jsonDecode(await journal.exportRecovery('a')) as Map;
      expect(result['journalRaw'], isNull);
      expect(result['legacyRaw'], original);
      expect(legacy, isNull);
      expect((await journal.load('a')).single.clientOperationId, 'operation');
    },
  );
  for (final backend in ['sqlite', 'indexedDB']) {
    group(backend, () {
      late CommandJournalStorage storage;
      late Future<void> Function(String, String) writeRaw;
      late ProgramOperationOutboxStore journal;
      String? account = 'a';
      var clears = 0;
      setUp(() async {
        account = 'a';
        clears = 0;
        if (backend == 'sqlite') {
          final database = sqlite3.openInMemory();
          storage = SqliteCommandJournalStorage(database);
          writeRaw = (key, value) async => database.execute(
            'INSERT OR REPLACE INTO command_journals(account_key, value) VALUES (?, ?)',
            [key, value],
          );
        } else {
          final factory = newIdbFactoryMemory();
          storage = await IndexedDbCommandJournalStorage.open(factory);
          final database = await factory.open('catch_commands_v1');
          addTearDown(database.close);
          writeRaw = (key, value) async {
            final transaction = database.transaction(
              IndexedDbCommandJournalStorage.storeName,
              idbModeReadWrite,
            );
            await transaction
                .objectStore(IndexedDbCommandJournalStorage.storeName)
                .put(value, key);
            await transaction.completed;
          };
        }
        journal = createProgramOperationJournal(
          storage: () async => storage,
          currentAccountId: () => account,
          loadLegacy: (_) async => 'unparseable legacy original',
          clearLegacy: (_) async => clears++,
        );
      });
      tearDown(() => storage.close());

      for (final raw in [
        '{broken JSON with private details',
        '{"version":99,"unknown":"retained"}',
        '{"version":2,"records":[],"quarantine":["damaged record"]}',
      ]) {
        test(
          'exports damaged bytes without parsing or altering $raw',
          () async {
            final key = _key('program_operations', 'a');
            await writeRaw(key, raw);
            await writeRaw(_key('program_operations', 'b'), 'other account');
            await writeRaw(_key('host_attendance', 'a'), 'other namespace');
            final result = jsonDecode(await journal.exportRecovery('a')) as Map;
            expect(result['format'], 'catch-command-journal-recovery');
            expect(result['version'], 1);
            expect(result['namespace'], 'program_operations');
            expect(result['accountId'], 'a');
            expect(result['journalRaw'], raw);
            expect(result['legacyRaw'], 'unparseable legacy original');
            expect(result['exportedAtMillis'], isA<int>());
            expect(await storage.readRaw(key), raw);
            expect(
              await storage.readRaw(_key('program_operations', 'b')),
              'other account',
            );
            expect(
              await storage.readRaw(_key('host_attendance', 'a')),
              'other namespace',
            );
            expect(clears, 0);
          },
        );
      }

      test(
        'legacy-only export does not initialize an empty current journal',
        () async {
          final result = jsonDecode(await journal.exportRecovery('a')) as Map;
          expect(result['journalRaw'], isNull);
          expect(result['legacyRaw'], 'unparseable legacy original');
          expect(
            await storage.readRaw(_key('program_operations', 'a')),
            isNull,
          );
          expect(clears, 0);
        },
      );

      test(
        'wrong-account export is rejected without reading saved records',
        () async {
          account = 'b';
          await expectLater(
            journal.exportRecovery('a'),
            throwsA(isA<SignInRequiredException>()),
          );
        },
      );
    });
  }

  for (final stage in ['opening', 'read', 'legacy']) {
    test(
      'account change during $stage prevents exporting prior account data',
      () async {
        String? account = 'a';
        final storage = _ReadStorage((_) async {
          if (stage == 'read') account = null;
          return 'private original';
        });
        final journal = createProgramOperationJournal(
          storage: () async {
            if (stage == 'opening') account = null;
            return storage;
          },
          currentAccountId: () => account,
          loadLegacy: (_) async {
            if (stage == 'legacy') account = null;
            return 'private legacy';
          },
        );
        await expectLater(
          journal.exportRecovery('a'),
          throwsA(isA<SignInRequiredException>()),
        );
      },
    );
  }

  test(
    'a storage failure is explicit and excludes raw data from the error',
    () async {
      final storage = _ReadStorage(
        (_) async => throw StateError('private record bytes'),
      );
      final journal = createProgramOperationJournal(
        storage: () async => storage,
        currentAccountId: () => 'a',
      );
      await expectLater(
        journal.exportRecovery('a'),
        throwsA(
          isA<BackendOperationException>()
              .having(
                (error) => error.code,
                'code',
                'local-journal-unavailable',
              )
              .having((error) => error.cause, 'cause', isNull)
              .having((error) => error.debugMessage, 'debugMessage', isNull),
        ),
      );
    },
  );
}

class _ReadStorage extends Fake implements CommandJournalStorage {
  _ReadStorage(this.read);
  final Future<String?> Function(String) read;
  @override
  Future<String?> readRaw(String key) => read(key);
}

class _MigratingStorage extends MemoryCommandJournalStorage {
  late Future<void> Function() afterRead;
  @override
  Future<String?> readRaw(String key) async {
    final original = await super.readRaw(key);
    await afterRead();
    return original;
  }
}
