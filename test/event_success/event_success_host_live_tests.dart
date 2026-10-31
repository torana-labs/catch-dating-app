part of 'event_success_live_screens_test.dart';

void _registerEventSuccessHostLiveTests() {
  testWidgets('host hides phase navigation during the actual event window', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 5000);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    final now = DateTime(2026, 8, 21, 18);
    final event = buildEvent(
      id: 'event-live-phase-lock',
      startTime: now.subtract(const Duration(minutes: 15)),
      endTime: now.add(const Duration(hours: 2)),
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchEventSuccessPlanProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(plan)),
          watchEventParticipationRosterProvider(event.id).overrideWith(
            (ref) => Stream.value(EventParticipationRoster.empty()),
          ),
          watchEventSuccessAssignmentsProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(const [])),
          watchEventSuccessRotationAssignmentsProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(const [])),
          watchEventSuccessPreferencesProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(const [])),
          watchEventSuccessWingmanRequestsProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(const [])),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: EventSuccessHostSection(event: event, referenceNow: now),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.byType(EventSuccessHostTabBar), findsNothing);
    expect(find.textContaining('LIVE NOW'), findsOneWidget);
  });

  testWidgets(
    'host skips rotation drafts when the saved plan does not use them',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 5000);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final event = buildEvent(id: 'event-without-guided-rotations');
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      );
      final rotationDraftsController =
          StreamController<List<EventSuccessAssignmentDraft>>.broadcast();
      addTearDown(rotationDraftsController.close);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchEventSuccessPlanProvider(
              event.id,
            ).overrideWith((ref) => Stream.value(plan)),
            watchEventParticipationRosterProvider(event.id).overrideWith(
              (ref) => Stream.value(EventParticipationRoster.empty()),
            ),
            watchEventSuccessAssignmentsProvider(
              event.id,
            ).overrideWith((ref) => Stream.value(const [])),
            watchEventSuccessRotationAssignmentsProvider(
              event.id,
            ).overrideWith((ref) => Stream.value(const [])),
            watchEventSuccessRotationDraftsProvider(
              event.id,
            ).overrideWith((ref) => rotationDraftsController.stream),
            watchEventSuccessPreferencesProvider(
              event.id,
            ).overrideWith((ref) => Stream.value(const [])),
            watchEventSuccessWingmanRequestsProvider(
              event.id,
            ).overrideWith((ref) => Stream.value(const [])),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: EventSuccessHostSection(
                event: event,
                initialTab: EventSuccessHostTab.live,
                showTabs: false,
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump();

      expect(
        plan.hasModule(EventSuccessModuleCatalog.guidedRotations.id),
        isFalse,
      );
      expect(plan.structureConfig.rotates, isFalse);
      expect(rotationDraftsController.hasListener, isFalse);
    },
  );
  testWidgets('host live keeps running and names a failed local resource', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final event = buildEvent(id: 'event-host-local-error');
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    final retries = <EventSuccessHostRetryIntent>[];

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: EventSuccessHostWorkspacePageBody(
              event: event,
              plan: plan,
              planIsPersisted: true,
              roster: EventParticipationRoster.empty(),
              initialTab: EventSuccessHostTab.live,
              showTabs: false,
              resourceFailures: [
                EventSuccessHostResourceFailure(
                  retryIntent: EventSuccessHostRetryIntent.roster,
                  error: StateError('roster failed'),
                ),
              ],
              onRetryResource: retries.add,
            ),
          ),
        ),
      ),
    );

    expect(find.text('Guest roster unavailable'), findsOneWidget);
    expect(find.textContaining('LIVE NOW'), findsOneWidget);

    await tester.tap(find.text('Reload event'));
    expect(retries, [EventSuccessHostRetryIntent.roster]);
  });

  testWidgets('quiz points use distinct checked-in roster team names', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(800, 5000);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final now = DateTime(2026, 8, 17, 19);
    final event = buildEvent(
      id: 'quiz-roster-points',
      startTime: now,
      endTime: now.add(const Duration(hours: 2)),
      eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.pubQuiz),
    );
    final plan = EventSuccessPlan.defaultForEvent(
      event,
      now: now,
    ).copyWith(status: EventSuccessPlanStatus.live);

    EventAttendee attendee({
      required String id,
      required String team,
      required EventAttendeeStatus status,
    }) => EventAttendee(
      id: id,
      eventId: event.id,
      organizerId: event.organizerId,
      organizerId: 'host-1',
      displayName: 'Guest $id',
      searchName: 'guest $id',
      source: EventAttendeeSource.hostImport,
      status: status,
      arrivalGroup: team,
      createdAt: now,
      updatedAt: now,
      checkedInAt: status == EventAttendeeStatus.checkedIn ? now : null,
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: EventSuccessHostWorkspacePageBody(
              event: event,
              plan: plan,
              planIsPersisted: true,
              roster: EventParticipationRoster.empty(),
              accountabilityAttendees: [
                attendee(
                  id: 'one',
                  team: 'Team A',
                  status: EventAttendeeStatus.checkedIn,
                ),
                attendee(
                  id: 'two',
                  team: '  team   a  ',
                  status: EventAttendeeStatus.checkedIn,
                ),
                attendee(
                  id: 'three',
                  team: 'Team B',
                  status: EventAttendeeStatus.checkedIn,
                ),
                attendee(
                  id: 'four',
                  team: 'Team C',
                  status: EventAttendeeStatus.registered,
                ),
              ],
              initialTab: EventSuccessHostTab.live,
              showTabs: false,
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(plan.hasModule(EventSuccessModuleCatalog.liveReveal.id), isTrue);
    final liveTab = tester.widget<EventSuccessHostLivePageBody>(
      find.byType(EventSuccessHostLivePageBody),
    );
    expect(liveTab.accountabilityAttendees, hasLength(4));
    expect(liveTab.accountabilityAttendees.first.isCheckedIn, isTrue);
    expect(
      find.byKey(
        const ValueKey('event_success.outcome.0.arrival_group_team_a'),
      ),
      findsOneWidget,
    );
    expect(
      find.byKey(
        const ValueKey('event_success.outcome.0.arrival_group_team_c'),
      ),
      findsNothing,
    );
    expect(
      find.byKey(
        const ValueKey('event_success.outcome.0.arrival_group_team_b'),
      ),
      findsOneWidget,
    );
  });

  testWidgets('host confirms presence changes before the next round', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    final event = buildEvent(bookedCount: 3, checkedInCount: 3);
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    var regenerateCount = 0;
    String? placedUid;

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: EventSuccessHostWorkspacePageBody(
              event: event,
              plan: plan,
              planIsPersisted: true,
              initialTab: EventSuccessHostTab.live,
              showTabs: false,
              roster: const EventParticipationRoster(
                bookedIds: ['guest-1', 'guest-2', 'late-1'],
                checkedInIds: ['guest-1', 'guest-2', 'late-1'],
                waitlistedIds: [],
              ),
              presenceSummary: const EventSuccessPresenceSummary(
                serverTimeMillis: 10,
                liveControlRevision: 4,
                nextRoundIndex: 1,
                policy: EventSuccessPresencePolicy(
                  heartbeatIntervalSeconds: 30,
                  presentWindowSeconds: 90,
                  likelyDepartedAfterSeconds: 300,
                ),
                entries: [
                  EventSuccessPresenceEntry(
                    uid: 'guest-1',
                    displayName: 'Ari',
                    state: EventSuccessPresenceState.likelyDeparted,
                    heartbeatAtMillis: 1,
                  ),
                ],
                lateArrivals: [
                  EventSuccessLateArrivalCandidate(
                    uid: 'late-1',
                    displayName: 'Mina',
                    checkedInAtMillis: 9,
                  ),
                ],
              ),
              onGenerateGuidedRotations: () async => regenerateCount += 1,
              onResolveLateArrival: (uid) async => placedUid = uid,
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.textContaining('1 guests may have left'), findsOneWidget);
    expect(
      find.textContaining('Published rounds stay unchanged'),
      findsOneWidget,
    );
    expect(find.text('Ari'), findsOneWidget);
    expect(find.text('Mina'), findsOneWidget);

    await tester.tap(find.text('Regenerate next round'));
    await tester.pump();
    await tester.tap(find.text('Place next round'));
    await tester.pump();

    expect(regenerateCount, 1);
    expect(placedUid, 'late-1');
  });

  testWidgets('host live mode summarizes generated micro-pod groups', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final event = buildEvent();
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    final now = DateTime(2026, 5, 21, 8);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: EventSuccessHostWorkspacePageBody(
                  event: event,
                  plan: plan,
                  planIsPersisted: true,
                  roster: const EventParticipationRoster(
                    bookedIds: ['runner-1', 'runner-2', 'runner-3'],
                    checkedInIds: ['runner-1'],
                    waitlistedIds: [],
                  ),
                  assignments: [
                    _assignment(
                      event: event,
                      uid: 'runner-1',
                      label: 'Pod A',
                      now: now,
                    ),
                    _assignment(
                      event: event,
                      uid: 'runner-2',
                      label: 'Pod A',
                      now: now,
                    ),
                    _assignment(
                      event: event,
                      uid: 'runner-3',
                      label: 'Pod B',
                      now: now,
                    ),
                  ],
                  preferences: [
                    EventSuccessPreference(
                      id: eventSuccessPreferenceId(
                        eventId: event.id,
                        uid: 'runner-4',
                      ),
                      eventId: event.id,
                      organizerId: event.organizerId,
                      uid: 'runner-4',
                      microPodsOptedOut: true,
                      guidedRotationsOptedOut: false,
                      createdAt: now,
                      updatedAt: now,
                    ),
                  ],
                  initialTab: EventSuccessHostTab.live,
                  showTabs: false,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Arrival check-in'), findsNothing);
    expect(find.text('1 / 3'), findsNothing);
    expect(find.text('1 checked in'), findsNothing);
    expect(find.text('3 assigned'), findsOneWidget);
    expect(find.text('1 opted out'), findsOneWidget);
    expect(find.text('Pod A · 2 assigned'), findsOneWidget);
    expect(find.text('Pod B · 1 assigned'), findsOneWidget);
    expect(find.text('Regenerate'), findsOneWidget);
  });

  testWidgets('host live mode excludes opted-out stale pod assignments', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final event = buildEvent();
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    final now = DateTime(2026, 5, 21, 8);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: EventSuccessHostWorkspacePageBody(
                  event: event,
                  plan: plan,
                  planIsPersisted: true,
                  roster: const EventParticipationRoster(
                    bookedIds: ['runner-1', 'runner-2', 'runner-3'],
                    checkedInIds: ['runner-1'],
                    waitlistedIds: [],
                  ),
                  assignments: [
                    _assignment(
                      event: event,
                      uid: 'runner-1',
                      label: 'Pod A',
                      now: now,
                    ),
                    _assignment(
                      event: event,
                      uid: 'runner-2',
                      label: 'Pod A',
                      now: now,
                    ),
                    _assignment(
                      event: event,
                      uid: 'runner-3',
                      label: 'Pod B',
                      now: now,
                    ),
                  ],
                  preferences: [
                    EventSuccessPreference(
                      id: eventSuccessPreferenceId(
                        eventId: event.id,
                        uid: 'runner-2',
                      ),
                      eventId: event.id,
                      organizerId: event.organizerId,
                      uid: 'runner-2',
                      microPodsOptedOut: true,
                      guidedRotationsOptedOut: false,
                      createdAt: now,
                      updatedAt: now,
                    ),
                  ],
                  initialTab: EventSuccessHostTab.live,
                  showTabs: false,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('2 assigned'), findsOneWidget);
    expect(find.text('1 opted out'), findsOneWidget);
    expect(
      find.text(
        'Regenerate to remove opted-out attendee cards from the current pod set.',
      ),
      findsOneWidget,
    );
    expect(find.text('Pod A · 1 assigned'), findsOneWidget);
    expect(find.text('Pod B · 1 assigned'), findsOneWidget);
    expect(find.text('Pod A · 2 assigned'), findsNothing);
  });

  testWidgets('host live mode surfaces active wingman requests', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime.now().add(const Duration(minutes: 10));
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: EventSuccessHostWorkspacePageBody(
                  event: event,
                  plan: plan,
                  planIsPersisted: true,
                  roster: const EventParticipationRoster(
                    bookedIds: ['runner-1', 'runner-2'],
                    checkedInIds: ['runner-1', 'runner-2'],
                    waitlistedIds: [],
                  ),
                  wingmanRequests: [
                    _wingmanRequest(
                      event: event,
                      requesterUid: 'runner-1',
                      targetUid: 'runner-2',
                      note: 'Please pair us during the second round.',
                      now: start,
                    ),
                  ],
                  wingmanProfiles: [
                    buildPublicProfile(name: 'Arjun'),
                    buildPublicProfile(
                      uid: 'runner-2',
                      name: 'Rhea',
                      gender: Gender.woman,
                    ),
                  ],
                  initialTab: EventSuccessHostTab.live,
                  showTabs: false,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('"HELP ME SAY HI" REQUESTS'), findsOneWidget);
    expect(find.text('1 active'), findsOneWidget);
    expect(find.text('Arjun'), findsOneWidget);
    expect(find.text('Asked for help meeting Rhea'), findsOneWidget);
    expect(
      find.text('Please pair us during the second round.'),
      findsOneWidget,
    );
  });

  testWidgets('host live mode summarizes generated rotation schedules', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime.now().add(const Duration(minutes: 10));
    final event = _racketEvent(
      startTime: start,
      endTime: start.add(const Duration(minutes: 30)),
    );
    final plan = _racketPlan(event);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: EventSuccessHostWorkspacePageBody(
                  event: event,
                  plan: plan,
                  planIsPersisted: true,
                  roster: const EventParticipationRoster(
                    bookedIds: ['runner-1', 'runner-2'],
                    checkedInIds: ['runner-1', 'runner-2'],
                    waitlistedIds: [],
                  ),
                  rotationAssignments: [
                    _rotationAssignment(
                      event: event,
                      uid: 'runner-1',
                      peerUid: 'runner-2',
                      now: start,
                      roundCount: 2,
                    ),
                    _rotationAssignment(
                      event: event,
                      uid: 'runner-2',
                      peerUid: 'runner-1',
                      now: start,
                      roundCount: 2,
                    ),
                  ],
                  initialTab: EventSuccessHostTab.live,
                  showTabs: false,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Timed partner rotations'), findsOneWidget);
    expect(find.text('2 rounds'), findsOneWidget);
    expect(find.text('2 assigned'), findsOneWidget);
    expect(find.text('2 possible'), findsOneWidget);
    expect(find.text('Regenerate'), findsOneWidget);
    expect(find.text('Edit rotations'), findsOneWidget);
  });

  testWidgets('host live mode opens group override editor', (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 2400);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime(2026, 5, 21, 8);
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(minutes: 60)),
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    final assignments = [
      EventSuccessAssignment(
        id: eventSuccessAssignmentId(
          eventId: event.id,
          moduleId: EventSuccessModuleCatalog.microPods.id,
          uid: 'runner-1',
        ),
        eventId: event.id,
        organizerId: event.organizerId,
        uid: 'runner-1',
        moduleId: EventSuccessModuleCatalog.microPods.id,
        label: 'Table A',
        displayTitle: 'Table A',
        displaySubtitle: '3 people at this table.',
        peerUids: const ['runner-2', 'runner-3'],
        source: 'server_v1',
        createdAt: start,
        updatedAt: start,
      ),
      EventSuccessAssignment(
        id: eventSuccessAssignmentId(
          eventId: event.id,
          moduleId: EventSuccessModuleCatalog.microPods.id,
          uid: 'runner-2',
        ),
        eventId: event.id,
        organizerId: event.organizerId,
        uid: 'runner-2',
        moduleId: EventSuccessModuleCatalog.microPods.id,
        label: 'Table A',
        displayTitle: 'Table A',
        displaySubtitle: '3 people at this table.',
        peerUids: const ['runner-1', 'runner-3'],
        source: 'server_v1',
        createdAt: start,
        updatedAt: start,
      ),
    ];

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: EventSuccessHostWorkspacePageBody(
                  event: event,
                  plan: plan,
                  planIsPersisted: true,
                  roster: const EventParticipationRoster(
                    bookedIds: ['runner-1', 'runner-2', 'runner-3'],
                    checkedInIds: ['runner-1', 'runner-2', 'runner-3'],
                    waitlistedIds: [],
                  ),
                  assignments: assignments,
                  assignmentParticipantProfiles: [
                    buildPublicProfile(name: 'Arjun'),
                    buildPublicProfile(uid: 'runner-2', name: 'Rhea'),
                    buildPublicProfile(uid: 'runner-3', name: 'Naina'),
                  ],
                  initialTab: EventSuccessHostTab.live,
                  showTabs: false,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Edit groups'), findsOneWidget);
    await tester.tap(find.text('Edit groups'));
    await pumpFeatureUi(tester);

    expect(find.text('Host override'), findsOneWidget);
    expect(find.text('Round 1'), findsOneWidget);
    expect(find.text('Group label'), findsOneWidget);
    expect(find.text('Table A'), findsWidgets);
    expect(find.text('Arjun'), findsWidgets);
    expect(find.text('Rhea'), findsWidgets);
    expect(find.text('Naina'), findsWidgets);
    expect(find.text('Save overrides'), findsOneWidget);
  });

  testWidgets('host live mode shows the countdown reveal console', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 5000);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime(2026, 5, 21, 8);
    final event = _racketEvent(
      startTime: start,
      endTime: start.add(const Duration(minutes: 30)),
    );
    final plan = _racketPlan(
      event,
    ).copyWith(activeStepIndex: 2, status: EventSuccessPlanStatus.live);
    final runtime = EventSuccessRuntime(plan: plan, event: event, now: start);
    expect(runtime.liveRevealEnabled, isTrue);
    expect(
      runtime.livePlan(bookedCount: 2, checkedInCount: 2)!.activeStep.moduleIds,
      contains(EventSuccessModuleCatalog.liveReveal.id),
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: EventSuccessHostWorkspacePageBody(
                  event: event,
                  plan: plan,
                  planIsPersisted: true,
                  roster: const EventParticipationRoster(
                    bookedIds: ['runner-1', 'runner-2'],
                    checkedInIds: ['runner-1', 'runner-2'],
                    waitlistedIds: [],
                  ),
                  rotationAssignments: [
                    _rotationAssignment(
                      event: event,
                      uid: 'runner-1',
                      peerUid: 'runner-2',
                      now: start,
                      roundCount: 2,
                    ),
                    _rotationAssignment(
                      event: event,
                      uid: 'runner-2',
                      peerUid: 'runner-1',
                      now: start,
                      roundCount: 2,
                    ),
                  ],
                  initialTab: EventSuccessHostTab.live,
                  showTabs: false,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.scrollUntilVisible(
      find.text('SYNCHRONIZED PARTNER REVEAL'),
      700,
      scrollable: verticalScroll(EventSuccessHostKeys.scrollView),
    );
    expect(find.text('SYNCHRONIZED PARTNER REVEAL'), findsOneWidget);
    expect(find.text('ROTATION REVEAL'), findsOneWidget);
    expect(find.textContaining('LIVE NOW'), findsOneWidget);
    expect(find.text('Controls for this step'), findsOneWidget);
    expect(find.textContaining('Attendees at'), findsOneWidget);
    expect(find.text('Create the next room-wide beat'), findsOneWidget);
    expect(find.text('Drop 10s countdown'), findsOneWidget);
    expect(find.text('Reveal now'), findsOneWidget);
  });

  _hostLiveCompletionTests();

  testWidgets('host live mode marks host-edited rotations', (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime(2026, 5, 21, 8);
    final event = _racketEvent(
      startTime: start,
      endTime: start.add(const Duration(minutes: 30)),
    );
    final plan = _racketPlan(event);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: EventSuccessHostWorkspacePageBody(
                  event: event,
                  plan: plan,
                  planIsPersisted: true,
                  roster: const EventParticipationRoster(
                    bookedIds: ['runner-1', 'runner-2'],
                    checkedInIds: ['runner-1', 'runner-2'],
                    waitlistedIds: [],
                  ),
                  rotationAssignments: [
                    _rotationAssignment(
                      event: event,
                      uid: 'runner-1',
                      peerUid: 'runner-2',
                      now: start,
                      roundCount: 1,
                      source: 'host_override_v1',
                    ),
                    _rotationAssignment(
                      event: event,
                      uid: 'runner-2',
                      peerUid: 'runner-1',
                      now: start,
                      roundCount: 1,
                      source: 'host_override_v1',
                    ),
                  ],
                  initialTab: EventSuccessHostTab.live,
                  showTabs: false,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Host edited'), findsOneWidget);
  });

  testWidgets('host live mode opens rotation override editor', (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime(2026, 5, 21, 8);
    final event = _racketEvent(
      startTime: start,
      endTime: start.add(const Duration(minutes: 30)),
    );
    final plan = _racketPlan(event);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: EventSuccessHostWorkspacePageBody(
                  event: event,
                  plan: plan,
                  planIsPersisted: true,
                  roster: const EventParticipationRoster(
                    bookedIds: ['runner-1', 'runner-2'],
                    checkedInIds: ['runner-1', 'runner-2'],
                    waitlistedIds: [],
                  ),
                  rotationAssignments: [
                    _rotationAssignment(
                      event: event,
                      uid: 'runner-1',
                      peerUid: 'runner-2',
                      now: start,
                      roundCount: 1,
                    ),
                    _rotationAssignment(
                      event: event,
                      uid: 'runner-2',
                      peerUid: 'runner-1',
                      now: start,
                      roundCount: 1,
                    ),
                  ],
                  rotationParticipantProfiles: [
                    buildPublicProfile(name: 'Arjun'),
                    buildPublicProfile(
                      uid: 'runner-2',
                      name: 'Rhea',
                      gender: Gender.woman,
                    ),
                  ],
                  initialTab: EventSuccessHostTab.live,
                  showTabs: false,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Edit rotations'));
    await pumpFeatureUi(tester);

    expect(find.text('Host override'), findsOneWidget);
    expect(find.text('Round 1'), findsOneWidget);
    expect(find.text('Arjun'), findsOneWidget);
    expect(find.text('Rhea'), findsOneWidget);
    expect(find.text('Save overrides'), findsOneWidget);
  });
}
