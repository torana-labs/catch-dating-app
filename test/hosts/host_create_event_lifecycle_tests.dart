part of 'host_create_event_screen_test.dart';

void runHostCreateEventLifecycleTests() {
  testWidgets('host manage exposes one lifecycle workspace and roster action', (
    tester,
  ) async {
    final participationRepository = FakeEventParticipationRepository();
    final now = DateTime(2026, 8, 17, 12);
    final event = buildEvent(
      id: 'event-preview',
      startTime: now.add(const Duration(hours: 2)),
      endTime: now.add(const Duration(hours: 3)),
    );

    var section = HostEventManageSection.setup;
    await pumpEventsTestApp(
      tester,
      StatefulBuilder(
        builder: (context, setState) => HostEventManageScreen(
          organizer: buildOrganizer(),
          event: event,
          onBackToSuccess: () {},
          referenceNow: now,
          initialSection: section,
          onSectionChanged: (next) => setState(() => section = next),
        ),
      ),
      overrides: [
        eventParticipationRepositoryProvider.overrideWith(
          (ref) => participationRepository,
        ),
      ],
      signedInUid: 'host-1',
    );
    await _pumpHostActionFrame(tester);

    expect(find.text('Event preparation'), findsOneWidget);
    expect(find.byType(HostEventRosterSection), findsNothing);
    expect(find.text('SETUP'), findsNothing);
    expect(find.text('GUESTS'), findsNothing);
    expect(find.text('LIVE'), findsNothing);
    expect(find.text('REPORT'), findsNothing);
    expect(find.text('Event success'), findsNothing);
    expect(find.text('Open event success'), findsNothing);

    await tester.scrollUntilVisible(
      find.text('GUEST SOURCES'),
      300,
      scrollable: hostManageScrollable(),
    );
    expect(find.text('Catch registration'), findsOneWidget);
    expect(find.text('Imported guest list'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('TEAM & ACCESS'),
      300,
      scrollable: hostManageScrollable(),
    );
    expect(find.text('Event staff access'), findsOneWidget);

    await tester.tap(find.byType(CatchTopBarPrimaryButton));
    await _pumpTestAnimation(tester);

    final rosterPanel = find.byType(HostEventRosterSection);
    expect(rosterPanel, findsOneWidget);
    expect(
      find.descendant(of: rosterPanel, matching: find.text('Guest roster')),
      findsWidgets,
    );
    expect(
      find.descendant(
        of: rosterPanel,
        matching: find.text('Imported guest list'),
      ),
      findsNothing,
    );
    expect(
      find.descendant(
        of: rosterPanel,
        matching: find.text('Catch registration'),
      ),
      findsNothing,
    );
    expect(
      find.descendant(
        of: rosterPanel,
        matching: find.text('Event staff access'),
      ),
      findsNothing,
    );
    expect(
      find.descendant(
        of: rosterPanel,
        matching: find.text('Import spreadsheet'),
      ),
      findsNothing,
    );
    expect(
      find.descendant(of: rosterPanel, matching: find.text('Add walk-in')),
      findsNothing,
    );
  });

  testWidgets('past event opens recap without setup or live navigation', (
    tester,
  ) async {
    final participationRepository = FakeEventParticipationRepository();
    final now = DateTime(2026, 8, 17, 12);
    final event = buildEvent(
      id: 'event-past-recap',
      startTime: now.subtract(const Duration(hours: 3)),
      endTime: now.subtract(const Duration(hours: 1)),
    );

    var section = HostEventManageSection.setup;
    await pumpEventsTestApp(
      tester,
      StatefulBuilder(
        builder: (context, setState) => HostEventManageScreen(
          organizer: buildOrganizer(),
          event: event,
          onBackToSuccess: () {},
          referenceNow: now,
          initialSection: section,
          onSectionChanged: (next) => setState(() => section = next),
        ),
      ),
      overrides: [
        eventParticipationRepositoryProvider.overrideWith(
          (ref) => participationRepository,
        ),
      ],
      signedInUid: 'host-1',
    );
    await _pumpHostActionFrame(tester);

    expect(find.text('Event recap'), findsOneWidget);
    final topBar = tester.widget<CatchTopBar>(find.byType(CatchTopBar));
    expect(topBar.title, 'Event recap');
    expect(topBar.subtitle, hostManageEventTitle(event));
    expect(find.text('SETUP'), findsNothing);
    expect(find.text('GUESTS'), findsNothing);
    expect(find.text('LIVE'), findsNothing);
    expect(find.text('REPORT'), findsNothing);
    expect(find.byType(HostEventRosterSection), findsNothing);

    await tester.scrollUntilVisible(
      find.text('Review event setup'),
      300,
      scrollable: hostManageScrollable(),
    );
    expect(find.text('Review event setup'), findsOneWidget);

    await tester.tap(find.byType(CatchTopBarPrimaryButton));
    await _pumpTestAnimation(tester);
    final rosterPanel = find.byType(HostEventRosterSection);
    expect(rosterPanel, findsOneWidget);
    expect(
      find.descendant(of: rosterPanel, matching: find.text('Add walk-in')),
      findsNothing,
    );
    expect(
      find.descendant(
        of: rosterPanel,
        matching: find.text('Import spreadsheet'),
      ),
      findsNothing,
    );
  });
}

void runEventPhotoRecoveryUITests() {
  Future<EventPhotoRecovery> seed(
    MemoryCommandJournalStorage storage, {
    bool unknown = false,
  }) async {
    final initial = EventPhotoRecovery(
      scope: EventPhotoRecoveryScope(
        accountId: 'runner-1',
        organizerId: 'club-1',
        eventId: 'saved-event',
      ),
      requestId: 'request-0001',
      createdAtMillis: DateTime.now().millisecondsSinceEpoch,
      expectedMediaHash: eventPhotoMediaHash(null, []),
      mediaIds: ['photo-0001', 'photo-0002'],
    );
    final session = Object();
    final journal = EventPhotoRecoveryJournal(
      storage: () async => storage,
      currentAccountId: () => 'runner-1',
      currentSession: () => session,
    );
    await journal.retain(initial);
    if (!unknown) return initial;
    final ready = initial.next(
      phase: EventPhotoRecoveryPhase.awaitingAttachment,
      uploads: [
        for (var i = 0; i < 2; i++)
          EventPhotoRecoveryUpload(
            mediaId: initial.mediaIds[i],
            position: i,
            storagePath: initial.pathFor(initial.mediaIds[i]),
            url: 'https://storage.test/${initial.mediaIds[i]}',
          ),
      ],
    );
    await journal.checkpoint(initial, ready);
    final sent = ready.next(phase: EventPhotoRecoveryPhase.attachmentUnknown);
    await journal.checkpoint(ready, sent);
    return sent;
  }

  Future<void> showRecovery(
    WidgetTester tester,
    MemoryCommandJournalStorage storage,
    FakeEventRepository repo,
    FakeImageUploadRepository images, {
    Stream<String?>? auth,
  }) async {
    await pumpEventsTestApp(
      tester,
      CreateEventScreen(
        organizer: buildOrganizer(),
        loadMapTiles: false,
        promptForDraftsOnStart: false,
      ),
      recoveryStorage: storage,
      signedInUid: auth == null ? 'runner-1' : null,
      overrides: [
        if (auth != null) uidProvider.overrideWith((ref) => auth),
        eventRepositoryProvider.overrideWith((ref) => repo),
        imageUploadRepositoryProvider.overrideWith((ref) => images),
      ],
    );
    await _pumpTestAnimation(tester);
  }

  testWidgets('leaving nondurable photo recovery requires an explicit choice', (
    tester,
  ) async {
    final storage = _PhotoRecoveryFaultStorage();
    final repo = FakeEventRepository();
    final images = FakeImageUploadRepository();
    await _pumpCreateEventFlow(
      tester,
      recoveryStorage: storage,
      overrides: [
        eventRepositoryProvider.overrideWith((ref) => repo),
        imageUploadRepositoryProvider.overrideWith((ref) => images),
      ],
    );
    await _openCreateEventFlow(tester);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(CreateEventScreen)),
    );
    final controller = container.read(
      createEventPhotoRecoveryControllerProvider('club-1').notifier,
    );
    repo.duringCreate = () async {
      storage.fail = true;
    };
    final event = buildEvent(id: 'saved-event');
    await controller.create(
      event: event,
      photos: [XFile('selected.jpg')],
      commit: () => repo.createEvent(event: event),
    );
    await _pumpTestAnimation(tester);
    expect(find.text('Your event is live.'), findsOneWidget);
    expect(
      find.textContaining('photo recovery could not be saved'),
      findsOneWidget,
    );
    await tester.ensureVisible(find.text('Back to organizer'));
    await tester.tap(find.text('Back to organizer'));
    await _pumpTestAnimation(tester);
    expect(find.text('Leave photo recovery?'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await _pumpTestAnimation(tester);
    expect(find.text('Your event is live.'), findsOneWidget);
    await tester.ensureVisible(find.text('Back to organizer'));
    await tester.tap(find.text('Back to organizer'));
    await _pumpTestAnimation(tester);
    await tester.tap(find.text('Leave saved event'));
    await _pumpTestAnimation(tester);
    expect(find.text('Open'), findsOneWidget);
    expect(repo.createEventCallCount, 1);
    expect(images.lastUploadEventId, isNull);
  });

  testWidgets(
    'photo recovery reentry preserves saved identity and requests missing bytes',
    (tester) async {
      final storage = MemoryCommandJournalStorage();
      await seed(storage);
      final repo = FakeEventRepository()
        ..fetchedEvent = buildEvent(
          id: 'saved-event',
          name: 'Already saved event',
        );
      final images = FakeImageUploadRepository();
      await showRecovery(tester, storage, repo, images);
      expect(find.text('Your event is live.'), findsOneWidget);
      expect(find.text('Event saved · photos pending'), findsOneWidget);
      expect(find.text('Select photos again'), findsOneWidget);
      expect(
        find.textContaining('do not survive every restart'),
        findsOneWidget,
      );
      expect(find.text('Create event'), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
      await showRecovery(tester, storage, repo, images);
      expect(find.text('Event saved · photos pending'), findsOneWidget);
      expect(repo.createEventCallCount, 0);
      images.pickedImages = [
        XFile('reselected-a.jpg'),
        XFile('reselected-b.jpg'),
      ];
      await tester.ensureVisible(find.text('Select photos again'));
      await tester.tap(find.text('Select photos again'));
      await _pumpTestAnimation(tester);
      expect(find.text('Event saved · photos pending'), findsNothing);
      expect(repo.mediaRequests.single.event.id, 'saved-event');
      expect(repo.createEventCallCount, 0);
    },
  );

  for (final conflict in [false, true]) {
    testWidgets(
      'unknown attachment reentry keeps objects, conflict=$conflict',
      (tester) async {
        final storage = MemoryCommandJournalStorage();
        await seed(storage, unknown: true);
        final repo = FakeEventRepository()
          ..fetchedEvent = buildEvent(id: 'saved-event');
        repo.updateEventError = conflict
            ? const ValidationException('Changed elsewhere', code: 'aborted')
            : TimeoutException('Acknowledgement lost');
        final images = FakeImageUploadRepository();
        await showRecovery(tester, storage, repo, images);
        expect(
          find.textContaining('confirm the same request safely'),
          findsOneWidget,
        );
        expect(find.text('Select photos again'), findsNothing);
        await tester.ensureVisible(find.text('Check photo status'));
        await tester.tap(find.text('Check photo status'));
        await _pumpTestAnimation(tester);
        expect(find.text('Event saved · photos pending'), findsOneWidget);
        if (conflict) {
          expect(
            find.textContaining('photos changed elsewhere'),
            findsOneWidget,
          );
        }
        expect(images.deletedStoragePaths, isEmpty);
        expect(images.lastUploadEventId, isNull);
        expect(repo.createEventCallCount, 0);
      },
    );
  }

  for (final status in [EventLifecycleStatus.cancelled]) {
    testWidgets('inactive saved event reentry is honest: $status', (
      tester,
    ) async {
      final storage = MemoryCommandJournalStorage();
      await seed(storage);
      final repo = FakeEventRepository()
        ..fetchedEvent = buildEvent(id: 'saved-event', status: status);
      final images = FakeImageUploadRepository();
      await showRecovery(tester, storage, repo, images);
      expect(find.text('Your event is live.'), findsNothing);
      expect(find.text('Your event is saved.'), findsOneWidget);
      expect(find.text('Retry photos'), findsNothing);
      expect(find.text('Select photos again'), findsNothing);
      expect(images.lastUploadEventId, isNull);
      expect(repo.mediaRequests, isEmpty);
      expect(repo.createEventCallCount, 0);
    });
  }

  testWidgets(
    'account ABA hides saved event and fences recovery until reentry',
    (tester) async {
      final storage = MemoryCommandJournalStorage();
      await seed(storage);
      final repo = FakeEventRepository()
        ..fetchedEvent = buildEvent(id: 'saved-event');
      final images = FakeImageUploadRepository();
      final auth = StreamController<String?>.broadcast();
      addTearDown(auth.close);
      await showRecovery(tester, storage, repo, images, auth: auth.stream);
      auth.add('runner-1');
      await _pumpTestAnimation(tester);
      expect(find.text('Your event is live.'), findsOneWidget);
      auth.add(null);
      await _pumpTestAnimation(tester);
      auth.add('runner-1');
      await _pumpTestAnimation(tester);
      expect(find.text('Your event is live.'), findsNothing);
      expect(find.text('Event saved · photos pending'), findsNothing);
      expect(
        find.textContaining('Your sign-in session changed'),
        findsOneWidget,
      );
      expect(repo.mediaRequests, isEmpty);
      expect(images.lastUploadEventId, isNull);
    },
  );
}

class _PhotoRecoveryFaultStorage implements CommandJournalStorage {
  final delegate = MemoryCommandJournalStorage();
  bool fail = false;
  @override
  Future<String?> readRaw(String key) => delegate.readRaw(key);
  @override
  Future<T> transact<T>(String key, T Function(Map<String, Object?>) change) =>
      delegate.transact(key, (state) {
        final result = change(state);
        if (fail) throw StateError('storage unavailable');
        return result;
      });
  @override
  Future<void> close() => delegate.close();
}
