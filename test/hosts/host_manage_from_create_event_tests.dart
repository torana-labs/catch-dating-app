part of 'host_create_event_screen_test.dart';

void _registerHostManageFromCreateEventTests() {
  testWidgets('host manage roster renders public profile rows', (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 3000);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final publicProfiles = FakePublicProfileRepository()
      ..profiles = [
        buildPublicProfile(uid: 'runner-2', name: 'Taylor'),
        buildPublicProfile(uid: 'runner-3', name: 'Avery'),
      ];
    final participationRepository = FakeEventParticipationRepository();
    final event = buildEvent(
      priceInPaise: 10000,
      bookedCount: 1,
      waitlistedCount: 1,
    );
    participationRepository.eventParticipations[event.id] = [
      buildEventParticipation(event: event, uid: 'runner-2'),
      buildEventParticipation(
        event: event,
        uid: 'runner-3',
        status: EventParticipationStatus.waitlisted,
      ),
    ];

    await pumpEventsTestApp(
      tester,
      HostEventManageScreen(
        organizer: buildOrganizer(),
        event: event,
        onBackToSuccess: () {},
        initialSection: HostEventManageSection.guests,
        referenceNow: event.startTime.subtract(const Duration(hours: 2)),
      ),
      overrides: [
        watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
        publicProfileRepositoryProvider.overrideWith((ref) => publicProfiles),
        eventParticipationRepositoryProvider.overrideWith(
          (ref) => participationRepository,
        ),
      ],
    );
    await _pumpTestAnimation(tester);

    await tester.scrollUntilVisible(
      find.text('Taylor'),
      300,
      scrollable: find
          .descendant(
            of: find.byKey(const ValueKey<String>('host-event-roster-scroll')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await _pumpTestAnimation(tester);

    expect(find.text('Taylor'), findsOneWidget);
    expect(find.text('Avery'), findsOneWidget);
    expect(find.text('runner-2'), findsNothing);
    expect(find.text('runner-3'), findsNothing);
    expect(find.textContaining('Booked'), findsWidgets);
    expect(find.textContaining('Waitlist'), findsWidgets);
  });

  runHostCreateEventLifecycleTests();

  testWidgets(
    'host manage keeps ritual controls in Live and check-in in Guests',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 3000);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final participationRepository = FakeEventParticipationRepository();
      final publicProfiles = FakePublicProfileRepository()
        ..profiles = [
          buildPublicProfile(name: 'Harsh'),
          buildPublicProfile(uid: 'runner-2', name: 'Manan'),
        ];
      final now = DateTime.now();
      final event = buildEvent(
        id: 'event-live-roster',
        startTime: now.add(const Duration(minutes: 5)),
        endTime: now.add(const Duration(hours: 1)),
        bookedCount: 2,
        checkedInCount: 1,
        eventFormat: EventFormatSnapshot.fromActivityKind(
          ActivityKind.pickleball,
        ),
      );
      participationRepository.eventParticipations[event.id] = [
        buildEventParticipation(
          event: event,
          uid: 'runner-1',
          status: EventParticipationStatus.attended,
        ),
        buildEventParticipation(event: event, uid: 'runner-2'),
      ];
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      ).copyWith(status: EventSuccessPlanStatus.live);
      final operationalAttendees = buildOperationalAttendees(
        event: event,
        now: now,
      );

      var section = HostEventManageSection.live;
      await pumpEventsTestApp(
        tester,
        StatefulBuilder(
          builder: (context, setState) => HostEventManageScreen(
            organizer: buildOrganizer(),
            event: event,
            onBackToSuccess: () {},
            initialSection: section,
            onSectionChanged: (next) => setState(() => section = next),
            referenceNow: now,
          ),
        ),
        overrides: [
          watchEventProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(event)),
          eventParticipationRepositoryProvider.overrideWith(
            (ref) => participationRepository,
          ),
          watchEventAttendeesProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(operationalAttendees)),
          hostEventRosterInsightsProvider(event.id).overrideWith(
            (ref) async => HostEventRosterInsights(
              eventId: event.id,
              organizerId: event.organizerId,
              cutoffAt: event.startTime,
              sourceCoverage: HostRosterInsightCoverage.exact,
              spendCoverage: HostRosterSpendCoverage.catchPaymentsOnly,
              rows: const <HostEventRosterInsight>[],
              computedAt: now,
            ),
          ),
          publicProfileRepositoryProvider.overrideWith((ref) => publicProfiles),
          watchEventSuccessPlanProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(plan)),
          watchEventSuccessAssignmentsProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(const [])),
          ...emptyEventSuccessLiveOverrides(event.id),
        ],
        signedInUid: 'host-1',
      );
      await _pumpHostActionFrame(tester);
      await _pumpTestAnimation(tester);

      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is CatchBadge && widget.label.startsWith('Live now'),
        ),
        findsOneWidget,
      );
      expect(find.text('1 checked in · 2 expected'), findsOneWidget);
      expect(find.text('Check guests in'), findsNothing);
      expect(find.text('1 of 2 arrived'), findsNothing);
      expect(find.text('Editable roster'), findsNothing);
      expect(find.text('GUEST'), findsNothing);
      expect(find.text('STATUS'), findsNothing);
      expect(find.text('HOST ACTION'), findsNothing);
      expect(find.text('Harsh'), findsNothing);
      expect(find.text('Manan'), findsNothing);
      expect(find.text('Host check-in QR'), findsNothing);
      expect(find.text('Live attendance'), findsNothing);
      expect(find.text('Needs check-in'), findsNothing);
      expect(find.text('Recently checked in'), findsNothing);
      expect(
        find.textContaining('Tap a booked participant to toggle check-in'),
        findsNothing,
      );
      expect(find.text('Arrival check-in'), findsNothing);

      await tester.tap(find.byType(CatchTopBarPrimaryButton));
      await _pumpTestAnimation(tester);

      expect(publicProfiles.fetchPublicProfilesCalls, hasLength(1));
      expect(find.text('Add walk-in'), findsOneWidget);
      expect(find.text('Import spreadsheet'), findsNothing);
      expect(find.text('Forward CSV'), findsNothing);
      expect(find.text('Check-in QR'), findsOneWidget);
      await tester.tap(find.text('Check-in QR'));
      await _pumpHostActionFrame(tester);
      await _pumpTestAnimation(tester);

      expect(find.byType(HostEventCheckInQrSection), findsOneWidget);
      await tester.tap(find.text('Check-in QR'));
      await _pumpTestAnimation(tester);
      await tester.drag(
        find.byKey(const ValueKey<String>('host-event-roster-scroll')),
        const Offset(0, -800),
      );
      await _pumpTestAnimation(tester);
      expect(find.text('CHECK-IN BOARD'), findsOneWidget);
      expect(find.byType(CatchSearchField), findsOneWidget);
      expect(find.text('Harsh'), findsOneWidget);
      expect(find.text('Manan'), findsOneWidget);
    },
  );

  testWidgets('host manage renders demand revenue once without a stat strip', (
    tester,
  ) async {
    final participationRepository = FakeEventParticipationRepository();
    final event = buildEvent(
      id: 'event-demand',
      bookedCount: 3,
      priceInPaise: 40000,
      eventPolicy: EventPolicyBundle.demandPricedBalancedSinglesEvent(
        capacityLimit: 20,
        basePriceInPaise: 40000,
        stepAdjustmentInPaise: 20000,
        maxAdjustmentInPaise: 100000,
      ),
    );

    await pumpEventsTestApp(
      tester,
      HostEventManageScreen(
        organizer: buildOrganizer(),
        event: event,
        onBackToSuccess: () {},
      ),
      overrides: [
        eventParticipationRepositoryProvider.overrideWith(
          (ref) => participationRepository,
        ),
      ],
      signedInUid: 'host-1',
    );
    await _pumpHostActionFrame(tester);

    expect(find.text('Base est.'), findsNothing);
    expect(find.text('Revenue'), findsNothing);
    expect(find.text('₹1,200'), findsOneWidget);
    expect(
      find.textContaining('Demand-priced bookings may settle higher'),
      findsNothing,
    );
    expect(find.text('Event preparation'), findsOneWidget);
  });

  testWidgets('host manage exposes invite code and private link', (
    tester,
  ) async {
    final fakeEventRepository = FakeEventRepository();
    final participationRepository = FakeEventParticipationRepository();
    final event = buildEvent(
      id: 'event-private',
      eventPolicy: EventPolicyBundle.inviteOnlyEvent(
        capacityLimit: 12,
        basePriceInPaise: 0,
      ),
    );
    fakeEventRepository.privateAccessByEventId[event.id] = EventPrivateAccess(
      id: event.id,
      eventId: event.id,
      organizerId: event.organizerId,
      inviteCode: 'CATCH-DELHI',
      createdAt: DateTime(2026, 5),
    );

    await pumpEventsTestApp(
      tester,
      HostEventManageScreen(
        organizer: buildOrganizer(),
        event: event,
        onBackToSuccess: () {},
      ),
      overrides: [
        eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
        eventParticipationRepositoryProvider.overrideWith(
          (ref) => participationRepository,
        ),
      ],
      signedInUid: 'host-1',
    );
    await _pumpHostActionFrame(tester);

    await tester.scrollUntilVisible(
      find.text('Private access'),
      300,
      scrollable: hostManageScrollable(),
    );
    await _pumpHostActionFrame(tester);

    expect(find.text('Private access'), findsOneWidget);
    expect(find.text('CATCH-DELHI'), findsOneWidget);
    expect(find.textContaining('This event can stay listed'), findsOneWidget);
    expect(find.textContaining('?invite=CATCH-DELHI'), findsOneWidget);
    expect(
      find.widgetWithText(CatchButton, 'Share private link'),
      findsOneWidget,
    );
  });

  testWidgets('host manage confirms and cancels an active event', (
    tester,
  ) async {
    final fakeEventRepository = FakeEventRepository();
    final participationRepository = FakeEventParticipationRepository();
    final event = buildEvent(id: 'event-cancel', bookedCount: 1);

    await pumpEventsTestApp(
      tester,
      HostEventManageScreen(
        organizer: buildOrganizer(),
        event: event,
        onBackToSuccess: () {},
      ),
      overrides: [
        eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
        eventParticipationRepositoryProvider.overrideWith(
          (ref) => participationRepository,
        ),
      ],
      signedInUid: 'host-1',
    );
    await _pumpHostActionFrame(tester);

    final cancelButton = find.text('Cancel event');
    await tester.scrollUntilVisible(
      cancelButton,
      300,
      scrollable: hostManageScrollable(),
    );
    await _pumpHostActionFrame(tester);
    await tester.tap(cancelButton.hitTestable());
    await _pumpHostActionFrame(tester);

    expect(find.text('Cancel this event?'), findsOneWidget);
    await tester.tap(_dialogAction('Cancel event'));
    await _pumpHostActionFrame(tester);

    expect(fakeEventRepository.hostCancelledEventId, 'event-cancel');
    expect(find.text('Event cancelled.'), findsOneWidget);
  });

  testWidgets('host manage confirms and deletes an unused event', (
    tester,
  ) async {
    final fakeEventRepository = FakeEventRepository();
    final participationRepository = FakeEventParticipationRepository();
    final event = buildEvent(id: 'event-delete');
    var returned = false;

    await pumpEventsTestApp(
      tester,
      HostEventManageScreen(
        organizer: buildOrganizer(),
        event: event,
        onBackToSuccess: () => returned = true,
      ),
      overrides: [
        eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
        eventParticipationRepositoryProvider.overrideWith(
          (ref) => participationRepository,
        ),
      ],
      signedInUid: 'host-1',
    );
    await _pumpHostActionFrame(tester);

    final deleteButton = find.text('Delete unused event');
    await tester.scrollUntilVisible(
      deleteButton,
      300,
      scrollable: hostManageScrollable(),
    );
    await _pumpHostActionFrame(tester);
    await tester.tap(deleteButton);
    await _pumpHostActionFrame(tester);

    expect(find.text('Delete unused event?'), findsOneWidget);
    await tester.tap(_dialogAction('Delete unused event'));
    await _pumpHostActionFrame(tester);

    expect(fakeEventRepository.deletedEventId, 'event-delete');
    expect(returned, isTrue);
  });

  testWidgets('host manage hides delete when event activity is visible', (
    tester,
  ) async {
    final participationRepository = FakeEventParticipationRepository();
    final event = buildEvent(id: 'event-with-activity', bookedCount: 1);

    await pumpEventsTestApp(
      tester,
      HostEventManageScreen(
        organizer: buildOrganizer(),
        event: event,
        onBackToSuccess: () {},
      ),
      overrides: [
        eventParticipationRepositoryProvider.overrideWith(
          (ref) => participationRepository,
        ),
      ],
      signedInUid: 'host-1',
    );
    await _pumpHostActionFrame(tester);

    expect(find.text('Delete unused event'), findsNothing);
  });
}
