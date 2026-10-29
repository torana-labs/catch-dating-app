import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/event_photo_recovery_journal.dart';
import 'package:catch_dating_app/contexts/events/data/event_photo_recovery_service.dart';
import 'package:catch_dating_app/contexts/events/domain/event_photo_recovery.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

class RecoveryImages extends Fake implements ImageUploadRepository {
  final objects = <String>{};
  final uploadedEvents = <String>[];
  final uploadedMedia = <String>[];
  final deleted = <String>[];
  final failUpload = <int>{};
  final lostUploadAcknowledgement = <int>{};
  final failCleanup = <String>{};
  final lostCleanupAcknowledgement = <String>{};
  Future<void> Function()? duringUpload;
  Future<void> Function()? beforeUpload;

  @override
  Future<UploadedImage> uploadEventPhotoForRecovery({
    required String eventId,
    required int position,
    required XFile image,
    required String mediaId,
  }) async {
    uploadedEvents.add(eventId);
    uploadedMedia.add(mediaId);
    await beforeUpload?.call();
    if (failUpload.contains(position)) throw StateError('upload unavailable');
    final path = 'events/$eventId/media/$mediaId/original.jpg';
    if (!objects.add(path)) throw StateError('immutable object already exists');
    await duringUpload?.call();
    if (lostUploadAcknowledgement.contains(position)) {
      throw TimeoutException('upload acknowledgement lost');
    }
    return UploadedImage(
      url: 'https://storage.test/$mediaId',
      storagePath: path,
    );
  }

  @override
  Future<void> deleteByPathChecked(String path) async {
    deleted.add(path);
    if (failCleanup.contains(path)) throw StateError('cleanup unavailable');
    objects.remove(path);
    if (lostCleanupAcknowledgement.contains(path)) {
      throw TimeoutException('cleanup acknowledgement lost');
    }
  }
}

class PausedPhotoRecoveryJournal extends EventPhotoRecoveryJournal {
  PausedPhotoRecoveryJournal({
    required super.storage,
    required super.currentAccountId,
    required super.currentSession,
  });
  final loaded = Completer<void>();
  final continueLoad = Completer<void>();
  bool pause = true;

  @override
  Future<EventPhotoRecovery?> load(EventPhotoRecoveryScope scope) async {
    final result = await super.load(scope);
    if (pause) {
      pause = false;
      loaded.complete();
      await continueLoad.future;
    }
    return result;
  }
}

void main() {
  late MemoryCommandJournalStorage storage;
  late RecoveryImages images;
  late EventPhotoRecoveryJournal journal;
  late EventPhotoRecoveryService service;
  late Object? session;
  late String? account;
  late EventPhotoRecovery initial;
  late List<EventPhotoRecovery> attachments;
  late Future<EventPhotoAttachmentReceipt> Function(EventPhotoRecovery)
  transport;

  EventPhotoRecoveryJournal reopen() => EventPhotoRecoveryJournal(
    storage: () async => storage,
    currentAccountId: () => account,
    currentSession: () => session,
  );
  EventPhotoRecoveryService reenter() => EventPhotoRecoveryService(
    journal: reopen(),
    images: images,
    attach: (command) => transport(command),
    validateAttachment: (_) {},
  );
  EventPhotoAttachmentReceipt ack(EventPhotoRecovery command) =>
      EventPhotoAttachmentReceipt(
        scope: command.scope,
        requestId: command.requestId,
        payloadHash: eventPhotoAttachmentHash(command),
      );
  List<XFile> selected(int count) => [
    for (var i = 0; i < count; i++)
      XFile.fromData(Uint8List.fromList([i + 1]), name: 'selected-$i.jpg'),
  ];

  setUp(() async {
    storage = MemoryCommandJournalStorage();
    account = 'account-a';
    session = Object();
    images = RecoveryImages();
    attachments = [];
    journal = reopen();
    initial = EventPhotoRecovery(
      scope: EventPhotoRecoveryScope(
        accountId: 'account-a',
        organizerId: 'organizer-a',
        eventId: 'committed-event',
      ),
      requestId: 'request-0001',
      createdAtMillis: DateTime.now().millisecondsSinceEpoch,
      expectedMediaHash: eventPhotoRecoveryHash([]),
      mediaIds: ['photo-0001', 'photo-0002'],
    );
    transport = (command) async {
      attachments.add(command);
      return ack(command);
    };
    service = reenter();
  });

  test('stale selected bytes cannot execute a replacement request', () async {
    await journal.retain(initial);
    final cleanup = initial.next(phase: EventPhotoRecoveryPhase.cleanupPending);
    final failed = cleanup.next(phase: EventPhotoRecoveryPhase.uploadFailed);
    await journal.checkpoint(initial, cleanup);
    await journal.checkpoint(cleanup, failed);
    final paused = PausedPhotoRecoveryJournal(
      storage: () async => storage,
      currentAccountId: () => account,
      currentSession: () => session,
    );
    final oldAttempt =
        EventPhotoRecoveryService(
          journal: paused,
          images: images,
          attach: (command) => transport(command),
          validateAttachment: (_) {},
        ).resume(
          initial.scope,
          photos: selected(2),
          selectedRequestId: initial.requestId,
        );
    await paused.loaded.future;
    final replacement = EventPhotoRecovery(
      scope: initial.scope,
      requestId: 'request-replacement',
      createdAtMillis: initial.createdAtMillis,
      expectedMediaHash: initial.expectedMediaHash,
      mediaIds: ['photo-replacement'],
    );
    await journal.replaceUnsent(failed, replacement);
    paused.continueLoad.complete();
    final stale = await oldAttempt;
    expect(stale!.failure, isA<BackendOperationException>());
    expect(stale.receipt.toJson(), replacement.toJson());
    expect(images.uploadedEvents, isEmpty);
    expect(images.deleted, isEmpty);
    expect(attachments, isEmpty);
    final staleAgain = await reenter().resume(
      initial.scope,
      photos: selected(2),
      selectedRequestId: initial.requestId,
    );
    expect(staleAgain!.failure, isA<ValidationException>());
    expect(images.uploadedEvents, isEmpty);
    final retried = await reenter().resume(
      initial.scope,
      photos: selected(1),
      selectedRequestId: replacement.requestId,
    );
    expect(retried!.receipt.isResolved, true);
    expect(images.uploadedMedia, ['photo-replacement']);
    expect(attachments.single.requestId, replacement.requestId);
  });

  test(
    'normal multi-photo control attaches ordered stable identities on the committed event',
    () async {
      await journal.retain(initial);
      final result = await service.resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      expect(result!.receipt.phase, EventPhotoRecoveryPhase.complete);
      expect(images.uploadedEvents, ['committed-event', 'committed-event']);
      expect(images.uploadedMedia, initial.mediaIds);
      expect(attachments.single.uploads.map((p) => p.position), [0, 1]);
      expect(images.deleted, isEmpty);
      await reenter().resume(initial.scope);
      expect(attachments, hasLength(1));
      expect(images.uploadedEvents, hasLength(2));
    },
  );

  test(
    'normal no-photo control needs no upload, attachment or cleanup',
    () async {
      final empty = EventPhotoRecovery(
        scope: initial.scope,
        requestId: initial.requestId,
        createdAtMillis: initial.createdAtMillis,
        expectedMediaHash: initial.expectedMediaHash,
        mediaIds: [],
      );
      await journal.retain(empty);
      final result = await service.resume(empty.scope);
      expect(result!.receipt.phase, EventPhotoRecoveryPhase.complete);
      expect(result.requiresPhotoReselection, false);
      expect(images.uploadedEvents, isEmpty);
      expect(images.deleted, isEmpty);
      expect(attachments, isEmpty);
    },
  );

  for (final failingPosition in [0, 1]) {
    test(
      'upload failure at $failingPosition retains saved event and retries only its media',
      () async {
        await journal.retain(initial);
        images.failUpload.add(failingPosition);
        final failed = await service.resume(
          initial.scope,
          photos: selected(2),
          selectedRequestId: initial.requestId,
        );
        expect(failed!.receipt.scope.eventId, 'committed-event');
        expect(failed.receipt.phase, EventPhotoRecoveryPhase.uploadFailed);
        expect(failed.failure, isNotNull);
        expect(attachments, isEmpty);
        expect(images.objects, isEmpty);
        expect(images.deleted, [
          for (var i = 0; i <= failingPosition; i++)
            initial.pathFor(initial.mediaIds[i]),
        ]);
        images.failUpload.clear();
        final retried = await service.resume(
          initial.scope,
          photos: selected(2),
          selectedRequestId: initial.requestId,
        );
        expect(retried!.receipt.phase, EventPhotoRecoveryPhase.complete);
        // A delayed delete from the failed attempt must not target an object
        // uploaded by this retry, even if the old replay lease has expired.
        expect(images.objects.intersection(images.deleted.toSet()), isEmpty);
        expect(images.uploadedEvents.toSet(), {'committed-event'});
        expect(attachments.single.requestId, initial.requestId);
      },
    );
  }

  test(
    'committed attachment with lost acknowledgement retains objects and replays the exact request',
    () async {
      await journal.retain(initial);
      EventPhotoAttachmentReceipt? committed;
      transport = (command) async {
        attachments.add(command);
        if (committed != null) return committed!;
        committed = ack(command);
        throw TimeoutException('attachment acknowledgement lost');
      };
      final failed = await service.resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      expect(failed!.receipt.phase, EventPhotoRecoveryPhase.attachmentUnknown);
      expect(images.deleted, isEmpty);
      expect(images.objects, hasLength(2));
      final restored = await reenter().resume(initial.scope);
      expect(restored!.receipt.phase, EventPhotoRecoveryPhase.complete);
      expect(attachments.map(eventPhotoAttachmentHash).toSet(), hasLength(1));
      expect(attachments.map((c) => c.requestId).toSet(), {initial.requestId});
      expect(images.uploadedMedia, hasLength(2));
      expect(images.deleted, isEmpty);
    },
  );

  test(
    'concurrent edit conflict is retained without cleanup or payload rebasing',
    () async {
      await journal.retain(initial);
      transport = (command) async {
        attachments.add(command);
        throw const ValidationException(
          'Newer media exists',
          code: 'event-media-conflict',
        );
      };
      final result = await service.resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      expect(result!.receipt.phase, EventPhotoRecoveryPhase.conflict);
      expect(images.objects, hasLength(2));
      expect(images.deleted, isEmpty);
      await reenter().resume(initial.scope);
      expect(attachments.map(eventPhotoAttachmentHash).toSet(), hasLength(1));
      expect(images.uploadedMedia, hasLength(2));
    },
  );

  for (final mismatch in ['request', 'scope', 'payload']) {
    test(
      '$mismatch acknowledgement mismatch stays unknown and never cleans media',
      () async {
        await journal.retain(initial);
        transport = (command) async => EventPhotoAttachmentReceipt(
          scope: mismatch == 'scope'
              ? EventPhotoRecoveryScope(
                  accountId: 'other-account',
                  organizerId: 'organizer-a',
                  eventId: 'committed-event',
                )
              : command.scope,
          requestId: mismatch == 'request'
              ? 'request-other'
              : command.requestId,
          payloadHash: mismatch == 'payload'
              ? eventPhotoRecoveryHash('other')
              : eventPhotoAttachmentHash(command),
        );
        final result = await service.resume(
          initial.scope,
          photos: selected(2),
          selectedRequestId: initial.requestId,
        );
        expect(
          result!.receipt.phase,
          EventPhotoRecoveryPhase.attachmentUnknown,
        );
        expect(result.failure, isA<FormatException>());
        expect(images.deleted, isEmpty);
        expect(images.objects, hasLength(2));
      },
    );
  }

  test(
    'cleanup failures persist across departure and reentry before same-event retry',
    () async {
      await journal.retain(initial);
      images.failUpload.add(1);
      images.failCleanup.add(initial.pathFor('photo-0001'));
      final failed = await service.resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      expect(failed!.receipt.phase, EventPhotoRecoveryPhase.cleanupPending);
      expect(failed.receipt.cleanupPaths, [initial.pathFor('photo-0001')]);
      expect(images.objects, {initial.pathFor('photo-0001')});
      images.failCleanup.clear();
      images.failUpload.clear();
      final cleaned = await reenter().resume(initial.scope);
      expect(cleaned!.receipt.phase, EventPhotoRecoveryPhase.uploadFailed);
      expect(cleaned.requiresPhotoReselection, true);
      expect(images.objects, isEmpty);
      final retried = await reenter().resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      expect(retried!.receipt.phase, EventPhotoRecoveryPhase.complete);
      expect(images.uploadedEvents.toSet(), {'committed-event'});
    },
  );

  test(
    'lost deletion acknowledgement is retried idempotently after reentry',
    () async {
      await journal.retain(initial);
      images.failUpload.add(1);
      images.lostCleanupAcknowledgement.add(initial.pathFor('photo-0001'));
      final failed = await service.resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      expect(failed!.receipt.cleanupPaths, [initial.pathFor('photo-0001')]);
      expect(images.objects, isEmpty);
      images.lostCleanupAcknowledgement.clear();
      final retried = await reenter().resume(initial.scope);
      expect(retried!.receipt.phase, EventPhotoRecoveryPhase.uploadFailed);
      expect(
        images.deleted.where((p) => p == initial.pathFor('photo-0001')),
        hasLength(2),
      );
    },
  );

  test(
    'upload committed with lost acknowledgement compensates its persisted object path',
    () async {
      await journal.retain(initial);
      images.lostUploadAcknowledgement.add(0);
      final failed = await service.resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      expect(failed!.receipt.phase, EventPhotoRecoveryPhase.uploadFailed);
      expect(images.deleted, [initial.pathFor('photo-0001')]);
      expect(images.objects, isEmpty);
      expect(attachments, isEmpty);
    },
  );

  test(
    'interrupted uploader keeps its cleanup obligation until terminal evidence',
    () async {
      await journal.retain(initial);
      await journal.checkpoint(
        initial,
        initial.next(uploadingMediaId: 'photo-0001'),
      );
      images.objects.add(initial.pathFor('photo-0001'));
      final recovered = await reenter().resume(initial.scope);
      expect(recovered!.receipt.phase, EventPhotoRecoveryPhase.uploadFailed);
      expect(recovered.requiresPhotoReselection, true);
      expect(images.uploadedEvents, isEmpty);
      expect(images.objects, {initial.pathFor('photo-0001')});
      expect(recovered.receipt.abandonedUploads, {
        initial.pathFor('photo-0001'): false,
      });
      expect(attachments, isEmpty);
    },
  );

  test(
    'restart without picker bytes requires reselection and retains committed identity',
    () async {
      await journal.retain(initial);
      final result = await reenter().resume(initial.scope);
      expect(result!.requiresPhotoReselection, true);
      expect(result.receipt.scope, initial.scope);
      expect(result.receipt.phase, EventPhotoRecoveryPhase.uploadFailed);
      expect(images.uploadedEvents, isEmpty);
      expect(attachments, isEmpty);
      await expectLater(
        service.resume(
          initial.scope,
          photos: selected(1),
          selectedRequestId: initial.requestId,
        ),
        throwsA(isA<ValidationException>()),
      );
      final retried = await reenter().resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      expect(retried!.receipt.phase, EventPhotoRecoveryPhase.complete);
    },
  );

  test(
    'account ABA during upload leaves its marker for the new session and stops obsolete cleanup',
    () async {
      await journal.retain(initial);
      images.duringUpload = () async {
        account = null;
        session = null;
        account = 'account-a';
        session = Object();
      };
      await expectLater(
        service.resume(
          initial.scope,
          photos: selected(2),
          selectedRequestId: initial.requestId,
        ),
        throwsA(isA<SignInRequiredException>()),
      );
      expect(images.deleted, isEmpty);
      expect(attachments, isEmpty);
      expect(
        (await journal.load(initial.scope))!.uploadingMediaId,
        'photo-0001',
      );
      images.duringUpload = null;
      final recovered = await reenter().resume(initial.scope);
      expect(recovered!.requiresPhotoReselection, true);
      expect(images.objects, {initial.pathFor('photo-0001')});
      expect(recovered.receipt.abandonedUploads, {
        initial.pathFor('photo-0001'): false,
      });
    },
  );

  test(
    'account ABA after attachment commits preserves unknown outcome for receipt replay',
    () async {
      await journal.retain(initial);
      transport = (command) async {
        attachments.add(command);
        final result = ack(command);
        session = Object();
        return result;
      };
      await expectLater(
        service.resume(
          initial.scope,
          photos: selected(2),
          selectedRequestId: initial.requestId,
        ),
        throwsA(isA<SignInRequiredException>()),
      );
      expect(
        (await journal.load(initial.scope))!.phase,
        EventPhotoRecoveryPhase.attachmentUnknown,
      );
      expect(images.deleted, isEmpty);
      transport = (command) async {
        attachments.add(command);
        return ack(command);
      };
      final recovered = await reenter().resume(initial.scope);
      expect(recovered!.receipt.phase, EventPhotoRecoveryPhase.complete);
      expect(attachments.map(eventPhotoAttachmentHash).toSet(), hasLength(1));
      expect(images.uploadedMedia, hasLength(2));
    },
  );

  test(
    'expired lease retains late upload ownership before the object exists',
    () async {
      await journal.retain(initial);
      final preparing = Completer<void>();
      final finish = Completer<void>();
      images.beforeUpload = () async {
        if (!preparing.isCompleted) {
          preparing.complete();
          await finish.future;
        }
      };
      final first = service.resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      await preparing.future;
      final key = eventPhotoRecoveryHash([
        'event-photo-recovery-commands',
        initial.scope.accountId,
      ]);
      await storage.transact(key, (state) {
        for (final record in state['records']! as List) {
          (record as Map)['leaseUntil'] = 0;
        }
      });
      final reclaimed = await reenter().resume(initial.scope);
      final oldPath = initial.pathFor('photo-0001');
      expect(images.objects, isEmpty);
      expect(reclaimed!.receipt.abandonedUploads, {oldPath: false});
      expect(images.deleted, isNot(contains(oldPath)));
      final retried = await reenter().resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      expect(retried!.receipt.phase, EventPhotoRecoveryPhase.complete);
      expect(retried.receipt.isResolved, false);
      await expectLater(
        journal.forgetCompleted(retried.receipt),
        throwsA(isA<ValidationException>()),
      );
      finish.complete();
      final late = await first;
      expect(late!.receipt.abandonedUploads, {oldPath: true});
      expect(images.objects, contains(oldPath));
      images.failCleanup.add(oldPath);
      final failedCleanup = await reenter().resume(initial.scope);
      expect(failedCleanup!.receipt.abandonedUploads, {oldPath: true});
      images.failCleanup.clear();
      final resolved = await reenter().resume(initial.scope);
      expect(resolved!.receipt.isResolved, true);
      expect(images.objects, hasLength(2));
      expect(images.objects, isNot(contains(oldPath)));
      expect(attachments, hasLength(1));
      await journal.forgetCompleted(resolved.receipt);
    },
  );

  test(
    'late settlement merges while the fresh retry upload is still running',
    () async {
      await journal.retain(initial);
      final oldStarted = Completer<void>();
      final oldFinish = Completer<void>();
      final newStarted = Completer<void>();
      final newFinish = Completer<void>();
      images.beforeUpload = () async {
        if (!oldStarted.isCompleted) {
          oldStarted.complete();
          await oldFinish.future;
        } else if (!newStarted.isCompleted) {
          newStarted.complete();
          await newFinish.future;
        }
      };
      final first = service.resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      await oldStarted.future;
      await storage.transact(
        eventPhotoRecoveryHash([
          'event-photo-recovery-commands',
          initial.scope.accountId,
        ]),
        (state) {
          for (final record in state['records']! as List) {
            (record as Map)['leaseUntil'] = 0;
          }
        },
      );
      await reenter().resume(initial.scope);
      final retry = reenter().resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      await newStarted.future;
      oldFinish.complete();
      await first;
      newFinish.complete();
      final completed = await retry;
      expect(completed!.receipt.phase, EventPhotoRecoveryPhase.complete);
      final resolved = await reenter().resume(initial.scope);
      expect(resolved!.receipt.isResolved, true);
      expect(images.objects, hasLength(2));
      expect(attachments, hasLength(1));
    },
  );

  test(
    'concurrent reentry waits for the existing journal lease instead of uploading twice',
    () async {
      await journal.retain(initial);
      final started = Completer<void>();
      final finish = Completer<void>();
      images.duringUpload = () async {
        if (!started.isCompleted) {
          started.complete();
          await finish.future;
        }
      };
      final first = service.resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      await started.future;
      final second = await reenter().resume(
        initial.scope,
        photos: selected(2),
        selectedRequestId: initial.requestId,
      );
      expect(second!.receipt.phase, EventPhotoRecoveryPhase.uploading);
      expect(images.uploadedMedia, hasLength(1));
      finish.complete();
      expect((await first)!.receipt.phase, EventPhotoRecoveryPhase.complete);
      expect(images.uploadedMedia, hasLength(2));
      expect(attachments, hasLength(1));
    },
  );
}
