import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/events/data/event_photo_recovery_journal.dart';
import 'package:catch_dating_app/contexts/events/domain/event_photo_recovery.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage_indexed_db.dart';
import 'package:catch_dating_app/core/persistence/command_journal_storage_sqlite.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:idb_shim/idb_client_memory.dart';
import 'package:sqlite3/sqlite3.dart';

EventPhotoRecovery receipt({
  String account = 'account-a',
  String organizer = 'organizer-a',
  String event = 'saved-event',
  String request = 'request-0001',
  List<String> ids = const ['photo-0001', 'photo-0002'],
  int? createdAtMillis,
}) => EventPhotoRecovery(
  scope: EventPhotoRecoveryScope(
    accountId: account,
    organizerId: organizer,
    eventId: event,
  ),
  requestId: request,
  createdAtMillis: createdAtMillis ?? DateTime.now().millisecondsSinceEpoch,
  expectedMediaHash: eventPhotoRecoveryHash([]),
  mediaIds: ids,
);

EventPhotoRecoveryUpload uploaded(EventPhotoRecovery r, int index) =>
    EventPhotoRecoveryUpload(
      mediaId: r.mediaIds[index],
      position: index,
      storagePath: r.pathFor(r.mediaIds[index]),
      url: 'https://storage.test/${r.mediaIds[index]}',
    );

class FaultStorage implements CommandJournalStorage {
  FaultStorage(this.delegate);
  final CommandJournalStorage delegate;
  bool fail = false;
  bool Function(Map<String, Object?>)? shouldFail;
  @override
  Future<String?> readRaw(String key) => delegate.readRaw(key);
  @override
  Future<T> transact<T>(String key, T Function(Map<String, Object?>) change) =>
      delegate.transact(key, (state) {
        final result = change(state);
        if (fail || (shouldFail?.call(state) ?? false)) {
          throw StateError('private disk failure');
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
      late Object? session;
      late EventPhotoRecoveryJournal journal;
      EventPhotoRecoveryJournal reopen({
        Future<CommandJournalStorage> Function()? open,
      }) => EventPhotoRecoveryJournal(
        storage: open ?? () async => storage,
        currentAccountId: () => account,
        currentSession: () => session,
      );
      setUp(() async {
        storage = backend == 'sqlite'
            ? SqliteCommandJournalStorage(sqlite3.openInMemory())
            : await IndexedDbCommandJournalStorage.open(newIdbFactoryMemory());
        account = 'account-a';
        session = Object();
        journal = reopen();
      });
      tearDown(() => storage.close());

      test(
        'late create acknowledgement retains metadata across sign-out and ABA',
        () async {
          final initial = receipt();
          final originalSession = journal.captureSession(initial.scope);
          final retain = await journal.prepareCommittedRetention(initial);
          account = 'account-b';
          session = Object();
          await Future.wait([retain(), retain()]);
          await retain();
          await expectLater(
            journal.load(initial.scope),
            throwsA(isA<SignInRequiredException>()),
          );
          expect(
            await storage.readRaw(
              eventPhotoRecoveryHash([
                'event-photo-recovery-commands',
                initial.scope.accountId,
              ]),
            ),
            isNull,
          );
          account = 'account-a';
          session = Object();
          expect(
            () => journal.requireSession(initial.scope, originalSession),
            throwsA(isA<SignInRequiredException>()),
          );
          expect(
            (await reopen().load(initial.scope))!.toJson(),
            initial.toJson(),
          );
        },
      );

      test(
        'late retention preserves newer same-intent progress and conflicts',
        () async {
          final initial = receipt();
          final retain = await journal.prepareCommittedRetention(initial);
          await journal.retain(initial);
          final progress = initial.next(uploads: [uploaded(initial, 0)]);
          await journal.checkpoint(initial, progress);
          await retain();
          expect(
            (await journal.load(initial.scope))!.toJson(),
            progress.toJson(),
          );
          final conflicting = receipt(request: 'request-other');
          final retainOther = await journal.prepareCommittedRetention(
            conflicting,
          );
          await expectLater(retainOther(), throwsA(isA<ValidationException>()));
          expect(
            (await journal.load(initial.scope))!.toJson(),
            progress.toJson(),
          );
        },
      );

      test(
        'retention holds the opened store and can retry a failed transaction',
        () async {
          final initial = receipt();
          final faulty = FaultStorage(storage);
          var opens = 0;
          final writer = reopen(
            open: () async {
              opens++;
              return faulty;
            },
          );
          final retain = await writer.prepareCommittedRetention(initial);
          faulty.fail = true;
          account = null;
          session = null;
          await expectLater(retain(), throwsStateError);
          faulty.fail = false;
          await retain();
          expect(opens, 1);
          account = 'account-a';
          session = Object();
          expect(
            (await reopen().load(initial.scope))!.toJson(),
            initial.toJson(),
          );
        },
      );

      test(
        'selection replacement is limited to cleaned unsent requests',
        () async {
          final initial = receipt();
          await journal.retain(initial);
          final failed = initial
              .next(phase: EventPhotoRecoveryPhase.cleanupPending)
              .next(phase: EventPhotoRecoveryPhase.uploadFailed);
          final cleanup = initial.next(
            phase: EventPhotoRecoveryPhase.cleanupPending,
          );
          await journal.checkpoint(initial, cleanup);
          await journal.checkpoint(cleanup, failed);
          final replacement = receipt(
            request: 'request-other',
            ids: ['photo-other'],
          );
          final faulty = FaultStorage(storage)
            ..shouldFail = (state) =>
                state['version'] == 1 &&
                jsonEncode(state).contains('request-other');
          final reselector = reopen(open: () async => faulty);
          await expectLater(
            reselector.replaceUnsent(failed, replacement),
            throwsA(isA<BackendOperationException>()),
          );
          expect(
            (await journal.load(initial.scope))!.scope.eventId,
            initial.scope.eventId,
          );
          expect(
            (await journal.load(initial.scope))!.requestId,
            initial.requestId,
          );
          faulty.shouldFail = null;
          final replaced = await reselector.replaceUnsent(failed, replacement);
          expect(replaced.toJson(), replacement.toJson());
          var executions = 0;
          await journal.replay(initial.scope, (current) async {
            expect(current.requestId, replacement.requestId);
            executions++;
          });
          expect(executions, 1);
          await expectLater(
            journal.replaceUnsent(replacement, initial),
            throwsA(isA<ValidationException>()),
          );
        },
      );

      test(
        'committed identity and metadata survive a reconstructed journal without picker bytes',
        () async {
          final saved = receipt();
          await journal.retain(saved);
          final restored = await reopen().load(saved.scope);
          expect(restored!.toJson(), saved.toJson());
          expect(
            jsonEncode(restored.toJson()),
            isNot(contains('selected-photo.jpg')),
          );
          expect(
            await journal.pendingForOrganizer(
              accountId: 'account-a',
              organizerId: 'organizer-a',
            ),
            hasLength(1),
          );
        },
      );

      test('account, organizer and event scopes stay isolated', () async {
        final a = receipt();
        final otherOrganizer = receipt(
          organizer: 'organizer-b',
          request: 'request-0002',
        );
        final otherEvent = receipt(event: 'event-b', request: 'request-0003');
        await Future.wait([
          journal.retain(a),
          journal.retain(otherOrganizer),
          journal.retain(otherEvent),
        ]);
        expect(
          await journal.pendingForOrganizer(
            accountId: 'account-a',
            organizerId: 'organizer-a',
          ),
          hasLength(2),
        );
        account = 'account-b';
        session = Object();
        expect(
          await journal.pendingForOrganizer(
            accountId: 'account-b',
            organizerId: 'organizer-a',
          ),
          isEmpty,
        );
        await expectLater(
          journal.load(a.scope),
          throwsA(isA<SignInRequiredException>()),
        );
        await journal.retain(receipt(account: 'account-b'));
        account = 'account-a';
        session = Object();
        expect((await journal.load(a.scope))!.toJson(), a.toJson());
      });

      test(
        'same operation replays original progress; changed payload or operation conflicts',
        () async {
          final initial = receipt();
          await journal.retain(initial);
          final progress = initial.next(uploads: [uploaded(initial, 0)]);
          await journal.checkpoint(initial, progress);
          expect((await journal.retain(initial)).toJson(), progress.toJson());
          for (final changed in [
            receipt(
              request: 'request-0002',
              createdAtMillis: initial.createdAtMillis,
            ),
            receipt(
              ids: ['different-photo'],
              createdAtMillis: initial.createdAtMillis,
            ),
            receipt(createdAtMillis: initial.createdAtMillis + 1),
          ]) {
            await expectLater(
              journal.retain(changed),
              throwsA(
                isA<ValidationException>().having(
                  (e) => e.code,
                  'code',
                  'event-photo-recovery-conflict',
                ),
              ),
            );
          }
          expect(
            (await journal.load(initial.scope))!.toJson(),
            progress.toJson(),
          );
        },
      );

      test(
        'concurrent checkpoint writers cannot overwrite each other',
        () async {
          final initial = receipt();
          await journal.retain(initial);
          final outcomes = await Future.wait([
            for (var i = 0; i < 2; i++)
              journal
                  .checkpoint(
                    initial,
                    initial.next(uploads: [uploaded(initial, 0)]),
                  )
                  .then<Object>(
                    (value) => value,
                    onError: (Object error) => error,
                  ),
          ]);
          expect(outcomes.whereType<EventPhotoRecovery>(), hasLength(1));
          expect(outcomes.whereType<BackendOperationException>(), hasLength(1));
          expect(
            outcomes.whereType<BackendOperationException>().single.retryable,
            true,
          );
          expect((await journal.load(initial.scope))!.revision, 1);
        },
      );

      test(
        'unknown attachment cannot transition to compensation or lose its exact media',
        () async {
          final initial = receipt();
          await journal.retain(initial);
          final ready = initial.next(
            phase: EventPhotoRecoveryPhase.awaitingAttachment,
            uploads: [uploaded(initial, 0), uploaded(initial, 1)],
          );
          await journal.checkpoint(initial, ready);
          final unknown = ready.next(
            phase: EventPhotoRecoveryPhase.attachmentUnknown,
          );
          await journal.checkpoint(ready, unknown);
          await expectLater(
            journal.checkpoint(
              unknown,
              unknown.next(
                phase: EventPhotoRecoveryPhase.cleanupPending,
                cleanupPaths: [initial.pathFor(initial.mediaIds.first)],
              ),
            ),
            throwsA(isA<BackendOperationException>()),
          );
          await expectLater(
            journal.forgetCompleted(unknown),
            throwsA(isA<ValidationException>()),
          );
          expect(
            (await reopen().load(initial.scope))!.toJson(),
            unknown.toJson(),
          );
        },
      );

      test(
        'cleanup failure and partial cleanup remain recoverable after reentry',
        () async {
          final initial = receipt();
          await journal.retain(initial);
          final cleanup = initial.next(
            phase: EventPhotoRecoveryPhase.cleanupPending,
            cleanupPaths: initial.mediaIds.map(initial.pathFor),
          );
          await journal.checkpoint(initial, cleanup);
          final partial = cleanup.next(
            cleanupPaths: cleanup.cleanupPaths.skip(1),
          );
          await journal.checkpoint(cleanup, partial);
          expect((await reopen().load(initial.scope))!.cleanupPaths, [
            initial.pathFor('photo-0002'),
          ]);
          await expectLater(
            journal.checkpoint(cleanup, cleanup.next(cleanupPaths: [])),
            throwsA(
              isA<BackendOperationException>().having(
                (error) => error.retryable,
                'retryable',
                true,
              ),
            ),
          );
          final retriable = partial.next(
            phase: EventPhotoRecoveryPhase.uploadFailed,
            uploads: [],
            cleanupPaths: [],
          );
          await journal.checkpoint(partial, retriable);
          expect(
            (await journal.load(initial.scope))!.phase,
            EventPhotoRecoveryPhase.uploadFailed,
          );
        },
      );

      test(
        'unresolved recovery is retained past draft and command review ages',
        () async {
          final initial = receipt(
            createdAtMillis: DateTime.now()
                .subtract(const Duration(days: 90))
                .millisecondsSinceEpoch,
          );
          await journal.retain(initial);
          var executions = 0;
          await expectLater(
            journal.replay(initial.scope, (_) async {
              executions++;
            }),
            throwsA(
              isA<ValidationException>().having(
                (e) => e.code,
                'code',
                'event-photo-review-required',
              ),
            ),
          );
          expect(executions, 0);
          expect(
            (await reopen().load(initial.scope))!.toJson(),
            initial.toJson(),
          );
        },
      );

      test(
        'real storage rollback preserves prior checkpoint when commit fails',
        () async {
          final initial = receipt();
          final faulty = FaultStorage(storage);
          final subject = reopen(open: () async => faulty);
          await subject.retain(initial);
          faulty.fail = true;
          await expectLater(
            subject.checkpoint(
              initial,
              initial.next(uploads: [uploaded(initial, 0)]),
            ),
            throwsA(isA<BackendOperationException>()),
          );
          expect(
            (await journal.load(initial.scope))!.toJson(),
            initial.toJson(),
          );
        },
      );

      test(
        'corrupt checkpoint is preserved and blocks destructive replacement',
        () async {
          final initial = receipt();
          await journal.retain(initial);
          final key = eventPhotoRecoveryHash([
            'event-photo-recovery-checkpoints',
            'account-a',
          ]);
          await storage.transact(key, (state) {
            final record =
                ((state['records']! as Map)[initial.scope.key]
                        as Map)['receipt']
                    as Map;
            record['revision'] = 999;
          });
          final original = await storage.readRaw(key);
          await expectLater(
            journal.load(initial.scope),
            throwsA(isA<BackendOperationException>()),
          );
          await expectLater(
            journal.retain(receipt(event: 'other-event')),
            throwsA(isA<BackendOperationException>()),
          );
          expect(await storage.readRaw(key), original);
        },
      );

      test(
        'account ABA while opening storage fences obsolete work before its transaction',
        () async {
          final gate = Completer<CommandJournalStorage>();
          final subject = reopen(open: () => gate.future);
          final initial = receipt();
          final pending = subject.retain(initial);
          final assertion = expectLater(
            pending,
            throwsA(isA<SignInRequiredException>()),
          );
          account = null;
          session = null;
          account = 'account-a';
          session = Object();
          gate.complete(storage);
          await assertion;
          expect(await journal.load(initial.scope), isNull);
        },
      );

      test('existing command leases serialize two recovery owners', () async {
        final initial = receipt(ids: []);
        await journal.retain(initial);
        final started = Completer<void>();
        final finish = Completer<void>();
        var executions = 0;
        final first = journal.replay(initial.scope, (current) async {
          executions++;
          started.complete();
          await finish.future;
          await journal.checkpoint(
            current,
            current.next(phase: EventPhotoRecoveryPhase.complete),
          );
        });
        await started.future;
        await reopen().replay(initial.scope, (_) async {
          executions++;
        });
        expect(executions, 1);
        finish.complete();
        await first;
        final complete = (await journal.load(initial.scope))!;
        await journal.forgetCompleted(complete);
        expect(await journal.load(initial.scope), isNull);
      });

      test(
        'late success acknowledgement cannot clear a new operation',
        () async {
          final initial = receipt(ids: []);
          await journal.retain(initial);
          await journal.replay(initial.scope, (current) async {
            await journal.checkpoint(
              current,
              current.next(phase: EventPhotoRecoveryPhase.complete),
            );
          });
          final complete = (await journal.load(initial.scope))!;
          await journal.forgetCompleted(complete);
          final replacement = receipt(ids: [], request: 'request-0002');
          await journal.retain(replacement);
          await expectLater(
            journal.forgetCompleted(complete),
            throwsA(isA<ValidationException>()),
          );
          expect(
            (await journal.load(initial.scope))!.requestId,
            replacement.requestId,
          );
        },
      );
    });
  }

  test(
    'native database close and restart preserve an unresolved attachment',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'event-photo-recovery-',
      );
      addTearDown(() => directory.delete(recursive: true));
      final path = '${directory.path}/commands.sqlite';
      var storage = SqliteCommandJournalStorage(sqlite3.open(path));
      EventPhotoRecoveryJournal open() => EventPhotoRecoveryJournal(
        storage: () async => storage,
        currentAccountId: () => 'account-a',
        currentSession: () => session,
      );
      var journal = open();
      final initial = receipt(ids: ['photo-0001']);
      await journal.retain(initial);
      final ready = initial.next(
        phase: EventPhotoRecoveryPhase.awaitingAttachment,
        uploads: [uploaded(initial, 0)],
      );
      await journal.checkpoint(initial, ready);
      final unknown = ready.next(
        phase: EventPhotoRecoveryPhase.attachmentUnknown,
      );
      await journal.checkpoint(ready, unknown);
      await storage.close();
      storage = SqliteCommandJournalStorage(sqlite3.open(path));
      addTearDown(storage.close);
      journal = open();
      expect((await journal.load(initial.scope))!.toJson(), unknown.toJson());
    },
  );
}

final session = Object();
