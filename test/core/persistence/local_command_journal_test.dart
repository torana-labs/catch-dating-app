import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage_indexed_db.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage_sqlite.dart';
import 'package:catch_dating_app/core/persistence/local_command_journal.dart';
import 'package:catch_dating_app/core/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:idb_shim/idb_client_memory.dart';
import 'package:sqlite3/sqlite3.dart';

ProgramOperationOutboxEntry observation(String id, {String? legId}) =>
    ProgramOperationOutboxEntry.legObservation(
      programId: 'p1',
      legId: legId ?? id,
      action: 'markReady',
      clientOperationId: id,
      expectedRevision: 3,
      createdAt: DateTime.now(),
    );

class FaultStorage implements CommandJournalStorage {
  FaultStorage(this.delegate);
  final CommandJournalStorage delegate;
  bool fail = false;
  @override
  Future<String?> readRaw(String key) => delegate.readRaw(key);
  @override
  Future<T> transact<T>(String key, T Function(Map<String, Object?>) change) =>
      delegate.transact(key, (state) {
        final result = change(state);
        if (fail && (state['records'] as List?)?.length == 2) {
          throw StateError('simulated disk full before commit');
        }
        return result;
      });
  @override
  Future<void> close() => delegate.close();
}

void main() {
  for (final backend in ['sqlite', 'indexedDB']) {
    group(backend, () {
      late CommandJournalStorage storage;
      late String? account;
      late ProgramOperationOutboxStore journal;
      setUp(() async {
        storage = backend == 'sqlite'
            ? SqliteCommandJournalStorage(sqlite3.openInMemory())
            : await IndexedDbCommandJournalStorage.open(newIdbFactoryMemory());
        account = 'a';
        journal = createProgramOperationJournal(
          storage: () async => storage,
          currentAccountId: () => account,
        );
      });
      tearDown(() => storage.close());

      test(
        'concurrent appends and completion do not overwrite pending work',
        () async {
          await Future.wait([
            for (var i = 0; i < 15; i++)
              journal.append('a', observation('op$i')),
          ]);
          final started = Completer<void>();
          final finish = Completer<void>();
          var calls = 0;
          final flushing = journal.flush('a', 'p1', (_) async {
            if (++calls == 1) {
              started.complete();
              await finish.future;
            }
          });
          await started.future;
          await journal.append('a', observation('during-replay'));
          final second = createProgramOperationJournal(
            storage: () async => storage,
            currentAccountId: () => account,
          );
          await second.flush(
            'a',
            'p1',
            (_) async => fail('concurrent lease bypass'),
          );
          finish.complete();
          await flushing;
          expect(calls, 16);
          expect(await journal.load('a'), isEmpty);
        },
      );

      test(
        'lost acknowledgement reuses immutable ID and deduplicates append',
        () async {
          final entry = observation('original');
          await journal.append('a', entry);
          final applied = <String>{};
          var calls = 0;
          Future<void> server(ProgramOperationOutboxEntry command) async {
            calls++;
            applied.add(command.clientOperationId);
            if (calls == 1) {
              throw const NetworkException('timeout', 'Lost response');
            }
          }

          await journal.flush('a', 'p1', server);
          await journal.append('a', entry);
          expect(await journal.load('a'), hasLength(1));
          await journal.flush('a', 'p1', server);
          await journal.append('a', entry);
          await journal.flush('a', 'p1', server);
          expect(calls, 2);
          expect(applied, {'original'});
          expect(await journal.load('a'), isEmpty);
          await expectLater(
            journal.append('a', observation('original', legId: 'changed')),
            throwsA(isA<ValidationException>()),
          );
        },
      );

      test(
        'account change prevents the next replay and exposes no old data',
        () async {
          await journal.append('a', observation('first'));
          await journal.append('a', observation('second'));
          final calls = <String>[];
          await expectLater(
            journal.flush('a', 'p1', (command) async {
              calls.add(command.clientOperationId);
              account = 'b';
            }),
            throwsA(isA<SignInRequiredException>()),
          );
          expect(calls, ['first']);
          await expectLater(
            journal.load('a'),
            throwsA(isA<SignInRequiredException>()),
          );
          expect(await journal.load('b'), isEmpty);
          account = 'a';
          expect((await journal.load('a')).single.clientOperationId, 'second');
        },
      );

      test(
        'failed predecessor quarantines its dependent, independent work proceeds',
        () async {
          await journal.append('a', observation('claim', legId: 'shared'));
          await journal.append('a', observation('ready', legId: 'shared'));
          await journal.append('a', observation('unrelated'));
          final calls = <String>[];
          await journal.flush('a', 'p1', (entry) async {
            calls.add(entry.clientOperationId);
            if (entry.clientOperationId == 'claim') {
              throw const ValidationException(
                'Revision changed',
                code: 'aborted',
              );
            }
          });
          expect(calls, ['claim', 'unrelated']);
          final pending = await journal.load('a');
          expect(
            pending.map((e) => e.status),
            everyElement(ProgramOperationOutboxStatus.needsReview),
          );
          expect(pending.last.lastErrorCode, 'dependency-needs-review');
          await journal.dismissReview('a', 'p1', commandId: 'claim');
          expect((await journal.load('a')).single.clientOperationId, 'ready');
          await journal.dismissReview('a', 'p1', commandId: 'ready');
          expect(await journal.load('a'), isEmpty);
        },
      );

      test(
        'capacity rejection leaves all existing observations intact',
        () async {
          for (var i = 0; i < LocalCommandJournal.maxEntries; i++) {
            await journal.append('a', observation('op$i'));
          }
          await expectLater(
            journal.append('a', observation('overflow')),
            throwsA(
              isA<ValidationException>().having(
                (e) => e.code,
                'code',
                'journal-full',
              ),
            ),
          );
          final entries = await journal.load('a');
          expect(entries, hasLength(LocalCommandJournal.maxEntries));
          expect(entries.first.clientOperationId, 'op0');
        },
      );

      test(
        'failed write rolls back without losing the previous command',
        () async {
          final fault = FaultStorage(storage);
          final queue = createProgramOperationJournal(
            storage: () async => fault,
            currentAccountId: () => account,
          );
          await queue.append('a', observation('before'));
          fault.fail = true;
          await expectLater(
            queue.append('a', observation('not-saved')),
            throwsA(isA<BackendOperationException>()),
          );
          fault.fail = false;
          expect((await queue.load('a')).single.clientOperationId, 'before');
        },
      );
    });
  }

  test('legacy malformed data is preserved and blocks unsafe replay', () async {
    final storage = MemoryCommandJournalStorage();
    for (final raw in [
      'not json',
      jsonEncode([
        observation('good').toJson(),
        {'invalid': true},
      ]),
    ]) {
      final journal = createProgramOperationJournal(
        storage: () async => storage,
        currentAccountId: () => raw,
        loadLegacy: (_) async => raw,
      );
      await expectLater(
        journal.load(raw),
        throwsA(
          isA<ValidationException>().having(
            (e) => e.code,
            'code',
            'local-journal-quarantined',
          ),
        ),
      );
      await expectLater(
        journal.flush(raw, 'p1', (_) async => fail('must not replay')),
        throwsA(isA<ValidationException>()),
      );
    }
  });

  test(
    'SQLite reopening retains a committed command after connection close',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'catch-journal-test',
      );
      final path = '${directory.path}/journal.sqlite';
      var storage = SqliteCommandJournalStorage(sqlite3.open(path));
      ProgramOperationOutboxStore journal() => createProgramOperationJournal(
        storage: () async => storage,
        currentAccountId: () => 'a',
      );
      try {
        await journal().append('a', observation('survives-restart'));
        await storage.close();
        storage = SqliteCommandJournalStorage(sqlite3.open(path));
        expect(
          (await journal().load('a')).single.clientOperationId,
          'survives-restart',
        );
      } finally {
        await storage.close();
        await directory.delete(recursive: true);
      }
    },
  );
}
