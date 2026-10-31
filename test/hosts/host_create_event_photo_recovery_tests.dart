part of 'host_create_event_controller_test.dart';

void runCreateEventPhotoRecoveryIntegrationTests() {
  group('committed event photo recovery integration', () {
    for (final failAt in [0, 1]) {
      test('failure at $failAt retries media on the committed event', () async {
        final h = _RecoveryHarness();
        addTearDown(h.dispose);
        h.images.failOnPosition = failAt;
        final saved = await h.create();
        expect(saved.id, h.event.id);
        expect(h.state.event!.id, h.event.id);
        expect(h.state.receipt!.phase, EventPhotoRecoveryPhase.uploadFailed);
        h.images.failOnPosition = null;
        await h.controller.retryPhotos();
        expect(h.state.receipt!.isResolved, true);
        expect(h.repo.createEventCallCount, 1);
        expect(h.repo.mediaRequests.single.event.id, h.event.id);
        expect(
          h.images.deletedPaths.toSet().intersection(
            h.state.receipt!.uploads.map((p) => p.storagePath).toSet(),
          ),
          isEmpty,
        );
      });
    }

    test(
      'ordinary retry recovers a failed unsent-request sidecar swap',
      () async {
        final storage = _FailingRecoveryStorage();
        final h = _RecoveryHarness(storage: storage);
        addTearDown(h.dispose);
        h.images.failOnPosition = 0;
        await h.create();
        final original = h.state.receipt!;
        storage.shouldFail = (state) =>
            state['version'] == 1 &&
            !jsonEncode(state).contains(original.requestId);
        h.images.failOnPosition = null;
        h.images.pickedImages = [XFile('new-selection.jpg')];
        await h.controller.retryPhotos(reselect: true);
        expect(h.state.photoError, isA<BackendOperationException>());
        expect(
          (await h.journal.load(original.scope))!.requestId,
          original.requestId,
        );
        expect(h.repo.mediaRequests, isEmpty);
        storage.shouldFail = null;
        await h.controller.retryPhotos();
        expect(h.state.receipt!.isResolved, true);
        expect(h.state.receipt!.requestId, isNot(original.requestId));
        expect(h.repo.mediaRequests.single.event.eventPhotos, hasLength(1));
        expect(h.repo.createEventCallCount, 1);
      },
    );

    test(
      'replaced request clears cached selection across ordinary retries',
      () async {
        final h = _RecoveryHarness();
        addTearDown(h.dispose);
        h.images.failOnPosition = 0;
        await h.create();
        final old = h.state.receipt!;
        final replacement = EventPhotoRecovery(
          scope: old.scope,
          requestId: 'request-replacement',
          createdAtMillis: old.createdAtMillis,
          expectedMediaHash: old.expectedMediaHash,
          mediaIds: ['photo-replacement'],
        );
        await h.journal.replaceUnsent(old, replacement);
        h.images.failOnPosition = null;
        await h.controller.retryPhotos();
        await h.controller.retryPhotos();
        expect(h.state.receipt!.requestId, replacement.requestId);
        expect(h.state.requiresPhotoReselection, true);
        expect(h.images.uploadedPositions, isEmpty);
        expect(h.repo.mediaRequests, isEmpty);
        h.images.pickedImages = [XFile('replacement.jpg')];
        await h.controller.retryPhotos(reselect: true);
        expect(h.state.receipt!.isResolved, true);
        expect(h.repo.mediaRequests.single.event.eventPhotos, hasLength(1));
        expect(h.repo.createEventCallCount, 1);
      },
    );

    test('ordinary retry adopts same-request background completion', () async {
      final h = _RecoveryHarness();
      addTearDown(h.dispose);
      h.images.failOnPosition = 0;
      await h.create();
      final old = h.state.receipt!;
      h.images.failOnPosition = null;
      await EventPhotoRecoveryService(
        journal: h.journal,
        images: h.images,
        attach: (command) async {
          h.repo.fetchedEvent = h.event.copyWith(
            photoUrl: command.uploads.first.url,
          );
          return EventPhotoAttachmentReceipt(
            scope: command.scope,
            requestId: command.requestId,
            payloadHash: eventPhotoAttachmentHash(command),
          );
        },
        validateAttachment: (_) {},
      ).resume(old.scope, photos: h.photos, selectedRequestId: old.requestId);
      expect(h.state.receipt!.phase, EventPhotoRecoveryPhase.uploadFailed);
      expect((await h.journal.load(old.scope))!.isResolved, true);
      await h.controller.retryPhotos();
      expect(h.state.receipt!.isResolved, true);
      expect(h.state.receipt!.requestId, old.requestId);
      expect(h.state.photoError, isNull);
      expect(h.images.uploadedPositions, [0, 1]);
      expect(h.repo.mediaRequests, isEmpty);
      expect(h.repo.createEventCallCount, 1);
    });

    test(
      'attachment completion survives presentation refresh failure',
      () async {
        final h = _RecoveryHarness();
        addTearDown(h.dispose);
        h.repo.fetchEventError = TimeoutException('event refresh unavailable');
        await h.create();
        expect(h.state.receipt!.isResolved, true);
        expect(h.state.photoError, isA<TimeoutException>());
        expect(h.repo.mediaRequests, hasLength(1));
        h.images.pickedImages = [XFile('different-count.jpg')];
        h.repo.fetchEventError = null;
        await h.controller.retryPhotos(reselect: true);
        expect(h.state.receipt!.isResolved, true);
        expect(h.state.photoError, isNull);
        expect(h.state.event!.eventPhotos, hasLength(2));
        expect(h.repo.mediaRequests, hasLength(1));
        expect(h.images.uploadedPositions, [0, 1]);
      },
    );

    test(
      'background completion survives reentry until departure and removes only its source draft',
      () async {
        final h = _RecoveryHarness();
        await h.create(sourceDraftId: 'source-draft');
        final saved = h.state.receipt!;
        expect(saved.sourceDraftId, 'source-draft');
        expect(h.drafts.deleted, [('club-7', 'host-1', 'source-draft')]);
        final reopened = h.reopen();
        addTearDown(reopened.dispose);
        await reopened.controller.restore();
        expect(reopened.state.event!.id, h.event.id);
        expect(reopened.state.receipt!.isResolved, true);
        expect(h.repo.createEventCallCount, 1);
        expect(await reopened.controller.acknowledgeDeparture(), true);
        expect(await reopened.journal.load(saved.scope), isNull);
        expect(
          h.drafts.deleted.every(
            (d) => d == ('club-7', 'host-1', 'source-draft'),
          ),
          true,
        );
      },
    );

    test(
      'saved identity is visible and durable before a blocked upload',
      () async {
        final h = _RecoveryHarness();
        addTearDown(h.dispose);
        final started = Completer<void>();
        final finish = Completer<void>();
        h.images.beforeUpload = () async {
          if (!started.isCompleted) {
            started.complete();
            await finish.future;
          }
        };
        final creating = h.create();
        await started.future.timeout(const Duration(seconds: 5));
        expect(h.state.event!.id, h.event.id);
        expect(
          (await h.journal.load(h.state.receipt!.scope))!.scope.eventId,
          h.event.id,
        );
        await expectLater(h.create(), throwsA(isA<ValidationException>()));
        expect(h.repo.createEventCallCount, 1);
        finish.complete();
        await creating;
      },
    );

    test(
      'restart replays exact timestamps after lost attachment acknowledgement',
      () async {
        final h = _RecoveryHarness();
        h.repo.loseMediaAcknowledgement = true;
        await h.create();
        final before = h.repo.mediaRequests.single;
        expect(
          h.state.receipt!.phase,
          EventPhotoRecoveryPhase.attachmentUnknown,
        );
        expect(h.images.deletedPaths, isEmpty);
        final newer = h.repo.updatedEvent!.copyWith(
          name: 'Newer event copy',
          photoUrl: 'https://storage.test/newer-gallery',
          eventPhotos: [
            h.repo.updatedEvent!.eventPhotos.first.copyWith(
              id: 'newer-photo',
              url: 'https://storage.test/newer-gallery',
              storagePath: 'events/committed-7/media/newer-photo/original.jpg',
            ),
          ],
        );
        h.repo.fetchedEvent = newer;
        h.repo.updatedEvent = newer;
        final reopened = h.reopen();
        addTearDown(reopened.dispose);
        await reopened.controller.restore();
        await reopened.controller.retryPhotos();
        expect(reopened.state.receipt!.isResolved, true);
        final after = h.repo.mediaRequests.last;
        expect(after.requestId, before.requestId);
        expect(after.expectedMediaHash, before.expectedMediaHash);
        expect(after.event.eventPhotos, before.event.eventPhotos);
        expect(h.repo.updatedEvent, same(newer));
        expect(reopened.state.event!.eventPhotos, newer.eventPhotos);
        expect(reopened.state.event!.photoUrl, newer.photoUrl);
        expect(h.repo.createEventCallCount, 1);
        expect(h.images.uploadedPositions, [0, 1]);
        expect(h.images.deletedPaths, isEmpty);
      },
    );

    test(
      'cleanup failure survives restart and missing bytes require reselection',
      () async {
        final h = _RecoveryHarness();
        h.images.failOnPosition = 1;
        h.images.failCleanup = true;
        await h.create();
        expect(h.state.receipt!.phase, EventPhotoRecoveryPhase.cleanupPending);
        final reopened = h.reopen();
        addTearDown(reopened.dispose);
        await reopened.controller.restore();
        h.images.failCleanup = false;
        h.images.failOnPosition = null;
        await reopened.controller.retryPhotos();
        expect(
          reopened.state.receipt!.phase,
          EventPhotoRecoveryPhase.uploadFailed,
        );
        expect(reopened.state.requiresPhotoReselection, true);
        expect(h.repo.mediaRequests, isEmpty);
        h.images.pickedImages = h.photos;
        await reopened.controller.retryPhotos(reselect: true);
        expect(reopened.state.receipt!.isResolved, true);
        expect(h.repo.createEventCallCount, 1);
      },
    );

    test(
      'storage failure after commit keeps identity and uploads no bytes',
      () async {
        final storage = _FailingRecoveryStorage();
        final h = _RecoveryHarness(storage: storage);
        addTearDown(h.dispose);
        h.repo.duringCreate = () async {
          storage.fail = true;
        };
        final event = await h.create();
        expect(event.id, h.event.id);
        expect(h.state.event!.id, h.event.id);
        expect(h.state.isDurable, false);
        expect(h.state.photoError, isNotNull);
        expect(h.images.uploadedPositions, isEmpty);
        storage.fail = false;
        await h.controller.retryPhotos();
        expect(h.state.isDurable, true);
        expect(h.state.receipt!.isResolved, true);
        expect(h.repo.createEventCallCount, 1);
      },
    );

    for (final switchBack in [false, true]) {
      test(
        'create acknowledgement across account change ABA=$switchBack is metadata only',
        () async {
          final auth = StreamController<String?>.broadcast();
          final h = _RecoveryHarness(auth: auth.stream);
          addTearDown(h.dispose);
          addTearDown(auth.close);
          auth.add('host-1');
          await h.container.pump();
          final started = Completer<void>();
          final finish = Completer<void>();
          h.repo.duringCreate = () async {
            started.complete();
            await finish.future;
          };
          final creating = h.create();
          final rejected = expectLater(
            creating,
            throwsA(isA<SignInRequiredException>()),
          );
          await started.future.timeout(const Duration(seconds: 5));
          auth.add('host-2');
          await h.container.pump();
          if (switchBack) {
            auth.add('host-1');
            await h.container.pump();
          }
          finish.complete();
          await rejected;
          expect(h.state.event, isNull);
          expect(h.images.uploadedPositions, isEmpty);
          expect(h.repo.mediaRequests, isEmpty);
          expect(
            await h.storage.readRaw(
              eventPhotoRecoveryHash([
                'event-photo-recovery-commands',
                'host-1',
              ]),
            ),
            isNull,
          );
          final reopened = h.reopen();
          addTearDown(reopened.dispose);
          await reopened.controller.restore();
          expect(reopened.state.event!.id, h.event.id);
          expect(reopened.state.requiresPhotoReselection, true);
        },
      );
    }

    test('exact serialized UTF-8 request bound accepts its boundary', () {
      final time = DateTime.fromMillisecondsSinceEpoch(1000, isUtc: true);
      var photos = [
        for (var i = 0; i < 35; i++)
          UploadedPhoto(
            id: 'photo-000$i',
            url: 'https://storage.test/${'a' * 1500}$i🙂',
            storagePath: 'events/committed-7/media/photo-000$i/original.jpg',
            position: i,
            createdAt: time,
            updatedAt: time,
          ),
      ];
      final base = buildEvent(id: 'committed-7', organizerId: 'club-7');
      Event event() =>
          base.copyWith(eventPhotos: photos, photoUrl: photos.first.url);
      Map<String, Object?> payload() => boundedEventPhotoAttachmentPayload(
        event: event(),
        requestId: 'request-0001',
        expectedMediaHash: 'a' * 64,
      );
      int admittedBytes() {
        final value = payload();
        return utf8
            .encode(jsonEncode([value['mediaRecovery'], value['fields']]))
            .length;
      }

      var remaining = 64 * 1024 - admittedBytes();
      expect(remaining, greaterThan(0));
      for (var i = 1; i < photos.length && remaining > 0; i++) {
        final extra = math.min(remaining, 2048 - photos[i].url.length);
        photos[i] = photos[i].copyWith(url: photos[i].url + 'x' * extra);
        remaining -= extra;
      }
      expect(remaining, 0);
      expect(admittedBytes(), 64 * 1024);
      photos.last = photos.last.copyWith(url: '${photos.last.url}x');
      expect(
        payload,
        throwsA(
          isA<ValidationException>().having(
            (e) => e.code,
            'code',
            'event-photo-request-too-large',
          ),
        ),
      );
    });

    test(
      'oversized unsent gallery can reselect fewer photos on the saved event',
      () async {
        final h = _RecoveryHarness(
          photos: [for (var i = 0; i < 50; i++) XFile('photo-$i.jpg')],
        );
        addTearDown(h.dispose);
        h.images.uploadResult = 'https://storage.test/${'a' * 1800}';
        await h.create();
        final original = h.state.receipt!;
        expect(original.phase, EventPhotoRecoveryPhase.uploadFailed);
        expect(h.state.photoError, isA<ValidationException>());
        expect(h.repo.mediaRequests, isEmpty);
        expect(h.images.deletedPaths, hasLength(50));
        h.images.pickedImages = [XFile('reselected.jpg')];
        await h.controller.retryPhotos(reselect: true);
        expect(h.state.receipt!.isResolved, true);
        expect(h.state.receipt!.requestId, isNot(original.requestId));
        expect(h.state.event!.eventPhotos, hasLength(1));
        expect(h.repo.createEventCallCount, 1);
        expect(h.repo.mediaRequests.single.event.id, original.scope.eventId);
        expect(
          h.images.deletedPaths,
          isNot(contains(h.state.receipt!.uploads.single.storagePath)),
        );
      },
    );

    test(
      'disposed create controller retains only the acknowledged receipt',
      () async {
        final h = _RecoveryHarness();
        final started = Completer<void>();
        final finish = Completer<void>();
        h.repo.duringCreate = () async {
          started.complete();
          await finish.future;
        };
        final creating = h.create();
        final rejected = expectLater(
          creating,
          throwsA(isA<SignInRequiredException>()),
        );
        await started.future.timeout(const Duration(seconds: 5));
        h.container.invalidate(
          createEventPhotoRecoveryControllerProvider('club-7'),
        );
        await h.container.pump();
        finish.complete();
        await rejected;
        expect(h.images.uploadedPositions, isEmpty);
        final reopened = h.reopen();
        addTearDown(reopened.dispose);
        await reopened.controller.restore();
        expect(reopened.state.event!.id, h.event.id);
      },
    );
  });
}

class _FailingRecoveryStorage implements CommandJournalStorage {
  final delegate = MemoryCommandJournalStorage();
  bool fail = false;
  bool Function(Map<String, Object?>)? shouldFail;
  @override
  Future<String?> readRaw(String key) => delegate.readRaw(key);
  @override
  Future<T> transact<T>(String key, T Function(Map<String, Object?>) change) =>
      delegate.transact(key, (state) {
        final result = change(state);
        if (fail || (shouldFail?.call(state) ?? false)) {
          throw StateError('storage unavailable');
        }
        return result;
      });
  @override
  Future<void> close() => delegate.close();
}

class _RecoveryHarness {
  _RecoveryHarness({
    CommandJournalStorage? storage,
    FakeEventRepository? repo,
    FakeRunImageUploadRepository? images,
    _RecordingEventDraftRepository? drafts,
    Stream<String?>? auth,
    List<XFile>? photos,
  }) : storage = storage ?? MemoryCommandJournalStorage(),
       repo = repo ?? (FakeEventRepository()..mediaActorUid = 'host-1'),
       images = images ?? FakeRunImageUploadRepository(),
       drafts = drafts ?? _RecordingEventDraftRepository(),
       photos = photos ?? [XFile('event-a.jpg'), XFile('event-b.jpg')] {
    this.repo.fetchedEvent ??= event;
    container = ProviderContainer(
      overrides: [
        commandJournalStorageProvider.overrideWith(
          (ref) =>
              () async => this.storage,
        ),
        if (auth == null)
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1'))
        else
          uidProvider.overrideWith((ref) => auth),
        eventRepositoryProvider.overrideWith((ref) => this.repo),
        imageUploadRepositoryProvider.overrideWith((ref) => this.images),
        eventDraftRepositoryProvider.overrideWith((ref) => this.drafts),
      ],
    );
    container.listen(authenticatedSessionProvider, (_, _) {});
    container.listen(
      createEventPhotoRecoveryControllerProvider('club-7'),
      (_, _) {},
    );
  }
  final CommandJournalStorage storage;
  final FakeEventRepository repo;
  final FakeRunImageUploadRepository images;
  final _RecordingEventDraftRepository drafts;
  final event = buildEvent(
    id: 'committed-7',
    organizerId: 'club-7',
    name: 'Saved event',
  );
  final List<XFile> photos;
  late final ProviderContainer container;
  bool _disposed = false;
  CreateEventPhotoRecoveryController get controller => container.read(
    createEventPhotoRecoveryControllerProvider('club-7').notifier,
  );
  CreateEventRecoveryState get state =>
      container.read(createEventPhotoRecoveryControllerProvider('club-7'));
  EventPhotoRecoveryJournal get journal => EventPhotoRecoveryJournal(
    storage: () async => storage,
    currentAccountId: () => 'host-1',
    currentSession: () =>
        container.read(authenticatedSessionProvider).asData?.value,
  );
  Future<Event> create({String? sourceDraftId}) => controller.create(
    sourceDraftId: sourceDraftId,
    event: event,
    photos: photos,
    commit: () => repo.createEvent(event: event),
  );
  _RecoveryHarness reopen() {
    dispose();
    return _RecoveryHarness(
      storage: storage,
      repo: repo,
      images: images,
      drafts: drafts,
    );
  }

  void dispose() {
    if (!_disposed) {
      _disposed = true;
      container.dispose();
    }
  }
}

class _RecordingEventDraftRepository extends Fake
    implements EventDraftRepository {
  final deleted = <(String, String, String)>[];
  @override
  Future<void> deleteDraft({
    required String organizerId,
    required String userId,
    required String draftId,
  }) async {
    deleted.add((organizerId, userId, draftId));
  }
}
