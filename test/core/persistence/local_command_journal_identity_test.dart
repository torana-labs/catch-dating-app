import 'dart:convert';

import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage_indexed_db.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage_sqlite.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:idb_shim/idb_client_memory.dart';
import 'package:sqlite3/sqlite3.dart';

final _key = sha256
    .convert(utf8.encode(jsonEncode(['program_operations', 'a'])))
    .toString();
ProgramOperationOutboxEntry _entry(String id, DateTime at) =>
    ProgramOperationOutboxEntry.legObservation(
      programId: 'p',
      legId: 'leg',
      action: 'markReady',
      clientOperationId: id,
      expectedRevision: 1,
      createdAt: at,
    );

// Reproduce the version-1 wire algorithm for a migration fixture, independently
// of the current journal's writer. The old format excluded the stored time.
String _oldHash(Map command) {
  Object? canonical(Object? value) {
    if (value is Map) {
      final keys = value.keys.cast<String>().toList()..sort();
      return {for (final key in keys) key: canonical(value[key])};
    }
    if (value is List) return value.map(canonical).toList();
    return value;
  }

  final immutable = Map<String, Object?>.from(command)
    ..remove('status')
    ..remove('lastErrorCode')
    ..remove('createdAtMillis');
  return sha256
      .convert(utf8.encode(jsonEncode(canonical(immutable))))
      .toString();
}

class _FaultStorage implements CommandJournalStorage {
  _FaultStorage(this.delegate);
  final CommandJournalStorage delegate;
  bool fail = false;
  @override
  Future<String?> readRaw(String key) => delegate.readRaw(key);
  @override
  Future<T> transact<T>(String key, T Function(Map<String, Object?>) change) =>
      delegate.transact(key, (state) {
        final result = change(state);
        if (fail) throw StateError('Interrupted migration');
        return result;
      });
  @override
  Future<void> close() => delegate.close();
}

void main() {
  for (final backend in ['sqlite', 'indexedDB']) {
    group(backend, () {
      late CommandJournalStorage storage;
      late ProgramOperationOutboxStore journal;
      late DateTime observedAt;
      Future<Map<String, Object?>> snapshot() => storage.transact(
        _key,
        (state) => jsonDecode(jsonEncode(state)) as Map<String, Object?>,
      );
      Future<void> downgrade() => storage.transact(_key, (state) {
        state['version'] = 1;
        for (final record in state['records']! as List) {
          (record as Map)['hash'] = _oldHash(record['command'] as Map);
        }
      });
      setUp(() async {
        storage = backend == 'sqlite'
            ? SqliteCommandJournalStorage(sqlite3.openInMemory())
            : await IndexedDbCommandJournalStorage.open(newIdbFactoryMemory());
        journal = createProgramOperationJournal(
          storage: () async => storage,
          currentAccountId: () => 'a',
        );
        observedAt = DateTime.now();
      });
      tearDown(() => storage.close());

      for (final acknowledged in [false, true]) {
        test(
          'same ID cannot change its time after acknowledgement=$acknowledged',
          () async {
            final original = _entry('operation', observedAt);
            await journal.append('a', original);
            if (acknowledged) await journal.flush('a', 'p', (_) async {});
            await journal.append('a', original);
            await expectLater(
              journal.append(
                'a',
                _entry(
                  'operation',
                  observedAt.add(const Duration(milliseconds: 1)),
                ),
              ),
              throwsA(
                isA<ValidationException>().having(
                  (e) => e.code,
                  'code',
                  'operation-id-reused',
                ),
              ),
            );
          },
        );
      }

      for (final target in ['command', 'envelope', 'both']) {
        test(
          'version 2 rejects altered $target timestamps without erasing data',
          () async {
            await journal.append('a', _entry('operation', observedAt));
            await storage.transact(_key, (state) {
              final record = (state['records']! as List).single as Map;
              if (target != 'envelope') {
                (record['command'] as Map)['createdAtMillis'] =
                    observedAt.millisecondsSinceEpoch + 1;
              }
              if (target != 'command') {
                record['createdAtMillis'] =
                    observedAt.millisecondsSinceEpoch + 1;
              }
            });
            final damaged = await snapshot();
            await expectLater(
              journal.flush('a', 'p', (_) async => fail('must not execute')),
              throwsA(isA<BackendOperationException>()),
            );
            expect(await snapshot(), damaged);
          },
        );
      }

      test(
        'v1 migration retains time, dependency, lease and terminal evidence',
        () async {
          for (final id in ['ack', 'dismissed', 'review', 'pending']) {
            await journal.append('a', _entry(id, observedAt));
          }
          await storage.transact(_key, (state) {
            final records = state['records']! as List;
            (records[0] as Map).addAll(<String, Object?>{
              'status': 'acknowledged',
              'terminalAtMillis': observedAt.millisecondsSinceEpoch,
            });
            (records[1] as Map).addAll(<String, Object?>{
              'status': 'dismissed',
              'terminalAtMillis': observedAt.millisecondsSinceEpoch,
            });
            (records[2] as Map).addAll(<String, Object?>{
              'status': 'needsReview',
              'lastErrorCode': 'aborted',
            });
            (records[3] as Map).addAll(<String, Object?>{
              'leaseToken': 'in-flight',
              'leaseUntil': observedAt
                  .add(const Duration(minutes: 1))
                  .millisecondsSinceEpoch,
            });
          });
          await downgrade();
          final before = await snapshot();
          final loaded = await journal.load('a');
          expect(loaded.map((entry) => entry.clientOperationId), [
            'review',
            'pending',
          ]);
          expect(
            loaded.every(
              (entry) =>
                  entry.createdAt.millisecondsSinceEpoch ==
                  observedAt.millisecondsSinceEpoch,
            ),
            isTrue,
          );
          final after = await snapshot();
          expect(after['version'], 2);
          final oldRecords = before['records']! as List;
          final newRecords = after['records']! as List;
          for (var i = 0; i < oldRecords.length; i++) {
            expect(
              (newRecords[i] as Map)['hash'],
              isNot((oldRecords[i] as Map)['hash']),
            );
            (oldRecords[i] as Map).remove('hash');
            (newRecords[i] as Map).remove('hash');
          }
          expect(newRecords, oldRecords);
          await journal.flush(
            'a',
            'p',
            (_) async => fail('active lease must remain'),
          );
        },
      );

      test(
        'v1 corrupt hash or inconsistent time leaves the original journal intact',
        () async {
          await journal.append('a', _entry('operation', observedAt));
          await downgrade();
          for (final corruption in ['hash', 'time']) {
            await storage.transact(_key, (state) {
              final record = (state['records']! as List).single as Map;
              record['hash'] = corruption == 'hash'
                  ? 'damaged'
                  : _oldHash(record['command'] as Map);
              record['createdAtMillis'] =
                  observedAt.millisecondsSinceEpoch +
                  (corruption == 'time' ? 1 : 0);
            });
            final before = await snapshot();
            await expectLater(
              journal.load('a'),
              throwsA(isA<BackendOperationException>()),
            );
            expect(await snapshot(), before);
            expect(before['version'], 1);
          }
        },
      );

      test(
        'failed v1 migration rolls back and later replays the original time',
        () async {
          await journal.append('a', _entry('operation', observedAt));
          await downgrade();
          final before = await snapshot();
          final fault = _FaultStorage(storage)..fail = true;
          final reopened = createProgramOperationJournal(
            storage: () async => fault,
            currentAccountId: () => 'a',
          );
          await expectLater(
            reopened.load('a'),
            throwsA(isA<BackendOperationException>()),
          );
          expect(await snapshot(), before);
          fault.fail = false;
          DateTime? replayedAt;
          await reopened.flush(
            'a',
            'p',
            (entry) async => replayedAt = entry.createdAt,
          );
          expect(
            replayedAt!.millisecondsSinceEpoch,
            observedAt.millisecondsSinceEpoch,
          );
          expect((await snapshot())['version'], 2);
          expect(await reopened.load('a'), isEmpty);
        },
      );
    });
  }
}
