part of 'event_success_live_screens_test.dart';

void _registerEventSuccessCompanionProfilesTests() {
  testWidgets(
    'companion screen shows post-event openers and feedback after attendance',
    (tester) async {
      final firestore = FakeFirebaseFirestore();
      final start = DateTime(2026, 5, 18, 7);
      final event = buildEvent(
        startTime: start,
        endTime: start.add(const Duration(hours: 1)),
      );
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            eventSuccessRepositoryProvider.overrideWithValue(
              EventSuccessRepository(firestore),
            ),
          ],
          child: Consumer(
            builder: (context, ref, _) {
              ref.watch(uidProvider);
              return MaterialApp(
                theme: AppTheme.light,
                home: EventSuccessCompanionScreen(
                  event: event,
                  plan: plan,
                  userProfile: buildUser(),
                  participation: buildEventParticipation(
                    event: event,
                    uid: 'runner-1',
                    status: EventParticipationStatus.attended,
                  ),
                  wingmanRequestCandidates: [
                    buildPublicProfile(
                      uid: 'runner-2',
                      name: 'Rhea',
                      gender: Gender.woman,
                    ),
                  ],
                  now: start.add(const Duration(hours: 2)),
                  onSubmitFeedback: (feedback) async {
                    await EventSuccessController.feedbackMutation.run(
                      ref,
                      (tx) => tx
                          .get(eventSuccessControllerProvider.notifier)
                          .submitFeedback(feedback),
                    );
                  },
                ),
              );
            },
          ),
        ),
      );
      await tester.pump();
      final scroll = verticalScroll(EventSuccessCompanionKeys.scrollView);

      expect(find.text('Event companion'), findsOneWidget);
      expect(find.text('Social prompt'), findsNothing);
      expect(find.text('Private afterglow'), findsOneWidget);
      expect(find.textContaining('not a public share card'), findsOneWidget);
      expect(find.text('Suggested first-message openers'), findsOneWidget);
      final copyOpener = findTooltipIn<StageCueCard>(
        'compare routes',
        'Copy opener',
      );
      await tester.ensureVisible(copyOpener);
      await tester.pump();

      await tester.scrollUntilVisible(
        find.text('How did it feel?'),
        400,
        scrollable: scroll,
      );
      expect(find.text('Submit feedback'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Submit feedback'),
        400,
        scrollable: scroll,
      );
      final safetyConcernToggle = _toggle(
        'I want Catch to review a safety or comfort concern',
      );
      await tester.ensureVisible(safetyConcernToggle);
      await tester.pump();
      await tester.tap(safetyConcernToggle);
      await tester.pump();
      await tester.drag(scroll, const Offset(0, -180));
      await tester.pump();
      await tester.tap(find.text('Submit feedback'));
      await pumpFeatureUi(tester);

      final feedback = await firestore
          .collection('eventSuccessFeedback')
          .doc('event-1_runner-1')
          .get();
      expect(feedback.data()?['welcomeRating'], 4);
      expect(feedback.data()?['safetyConcern'], true);
    },
  );

  testWidgets('companion screen shows assigned micro-pod card', (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1600);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime(2026, 5, 18, 7);
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    final assignment = EventSuccessAssignment(
      id: eventSuccessAssignmentId(
        eventId: event.id,
        moduleId: EventSuccessModuleCatalog.microPods.id,
        uid: 'runner-1',
      ),
      eventId: event.id,
      organizerId: event.organizerId,
      uid: 'runner-1',
      moduleId: EventSuccessModuleCatalog.microPods.id,
      label: 'Pod A',
      displayTitle: 'Pod A',
      displaySubtitle: '4 people in this event pod.',
      peerUids: const ['runner-2', 'runner-3', 'runner-4'],
      source: 'server_v1',
      createdAt: start,
      updatedAt: start,
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: EventSuccessCompanionScreen(
            event: event,
            plan: plan,
            userProfile: buildUser(),
            participation: buildEventParticipation(
              event: event,
              uid: 'runner-1',
              status: EventParticipationStatus.attended,
            ),
            wingmanRequestCandidates: const [],
            assignment: assignment,
            assignmentPeerProfiles: [
              buildPublicProfile(
                uid: 'runner-2',
                name: 'Rhea',
                gender: Gender.woman,
              ),
              buildPublicProfile(uid: 'runner-3', name: 'Naina'),
            ],
            now: start.subtract(const Duration(hours: 1)),
          ),
        ),
      ),
    );

    expect(find.text('Pod A'), findsOneWidget);
    expect(find.text('4 people in this event pod.'), findsOneWidget);
    expect(find.text('4 people'), findsOneWidget);
    expect(find.text('Rhea'), findsOneWidget);
    expect(find.text('Naina'), findsOneWidget);
  });

  testWidgets('companion screen shows rotating group slots as tables', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1600);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime(2026, 5, 18, 7);
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    final assignment = EventSuccessAssignment(
      id: eventSuccessAssignmentId(
        eventId: event.id,
        moduleId: EventSuccessModuleCatalog.microPods.id,
        uid: 'runner-1',
      ),
      eventId: event.id,
      organizerId: event.organizerId,
      uid: 'runner-1',
      moduleId: EventSuccessModuleCatalog.microPods.id,
      label: 'Table rotations',
      displayTitle: '2 table rotations',
      displaySubtitle: '20-minute tables across the event.',
      peerUids: const ['runner-2', 'runner-3', 'runner-4', 'runner-5'],
      groupRotationSlots: [
        EventSuccessGroupRotationSlot(
          roundIndex: 0,
          label: 'Round 1',
          unitLabel: 'Table A',
          startsAt: start,
          endsAt: start.add(const Duration(minutes: 20)),
          peerUids: const ['runner-2', 'runner-3'],
          compatibility: 'mixed',
        ),
        EventSuccessGroupRotationSlot(
          roundIndex: 1,
          label: 'Round 2',
          unitLabel: 'Table B',
          startsAt: start.add(const Duration(minutes: 20)),
          endsAt: start.add(const Duration(minutes: 40)),
          peerUids: const ['runner-4', 'runner-5'],
          compatibility: 'social',
        ),
      ],
      source: 'server_v1',
      createdAt: start,
      updatedAt: start,
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: EventSuccessCompanionScreen(
            event: event,
            plan: plan,
            userProfile: buildUser(),
            participation: buildEventParticipation(
              event: event,
              uid: 'runner-1',
              status: EventParticipationStatus.attended,
            ),
            wingmanRequestCandidates: const [],
            assignment: assignment,
            assignmentPeerProfiles: [
              buildPublicProfile(uid: 'runner-2', name: 'Rhea'),
              buildPublicProfile(uid: 'runner-3', name: 'Naina'),
              buildPublicProfile(uid: 'runner-4', name: 'Kabir'),
              buildPublicProfile(uid: 'runner-5', name: 'Dev'),
            ],
            now: start,
          ),
        ),
      ),
    );

    expect(find.text('2 table rotations'), findsOneWidget);
    expect(find.text('Round 1'), findsOneWidget);
    expect(find.text('Table A'), findsOneWidget);
    expect(find.text('Round 2'), findsOneWidget);
    expect(find.text('Table B'), findsOneWidget);
    expect(find.text('Rhea'), findsOneWidget);
    expect(find.text('Naina'), findsOneWidget);
    expect(find.text('Kabir'), findsOneWidget);
    expect(find.text('Dev'), findsOneWidget);
  });

  testWidgets('companion screen shows assigned rotation schedule', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1600);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime(2026, 5, 18, 7);
    final event = _racketEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
    );
    final plan = withoutModule(
      _racketPlan(event),
      EventSuccessModuleCatalog.liveReveal.id,
    );
    final assignment = _rotationAssignment(
      event: event,
      uid: 'runner-1',
      peerUid: 'runner-2',
      now: start,
      roundCount: 1,
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: EventSuccessCompanionScreen(
            event: event,
            plan: plan,
            userProfile: buildUser(),
            participation: buildEventParticipation(
              event: event,
              uid: 'runner-1',
              status: EventParticipationStatus.attended,
            ),
            wingmanRequestCandidates: const [],
            rotationAssignment: assignment,
            rotationPeerProfiles: [
              buildPublicProfile(
                uid: 'runner-2',
                name: 'Rhea',
                gender: Gender.woman,
              ),
            ],
            now: start.subtract(const Duration(hours: 1)),
          ),
        ),
      ),
    );

    expect(find.text('1 guided rotation'), findsOneWidget);
    expect(find.text('Round 1'), findsOneWidget);
    expect(find.textContaining('Rhea'), findsOneWidget);
    expect(find.text('Include me in timed rotations'), findsOneWidget);
  });

  testWidgets('companion live reveal hides rotation partner until revealed', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1700);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime(2026, 5, 18, 7);
    final event = _racketEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
    );
    final plan = _racketPlan(event).copyWith(
      activeStepIndex: 1,
      revealStatus: EventSuccessRevealStatus.countingDown,
      activeRevealRoundIndex: 0,
      revealStartedAt: start.subtract(const Duration(seconds: 2)),
    );
    final assignment = _rotationAssignment(
      event: event,
      uid: 'runner-1',
      peerUid: 'runner-2',
      now: start,
      roundCount: 1,
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: EventSuccessCompanionScreen(
            event: event,
            plan: plan,
            userProfile: buildUser(),
            participation: buildEventParticipation(
              event: event,
              uid: 'runner-1',
              status: EventParticipationStatus.attended,
            ),
            wingmanRequestCandidates: const [],
            rotationAssignment: assignment,
            rotationPeerProfiles: [
              buildPublicProfile(
                uid: 'runner-2',
                name: 'Rhea',
                gender: Gender.woman,
              ),
            ],
            now: start,
          ),
        ),
      ),
    );

    expect(find.text('ROTATION REVEAL'), findsWidgets);
    expect(find.text('No names shown yet'), findsWidgets);
    expect(find.textContaining('Next reveal in'), findsOneWidget);
    expect(find.textContaining('Rhea'), findsNothing);
  });

  testWidgets('companion live reveal shows unlocked rotation partner', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime(2026, 5, 18, 7);
    final event = _racketEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
    );
    final plan = _racketPlan(event).copyWith(
      activeStepIndex: 1,
      revealStatus: EventSuccessRevealStatus.revealed,
      activeRevealRoundIndex: 0,
    );
    final assignment = _rotationAssignment(
      event: event,
      uid: 'runner-1',
      peerUid: 'runner-2',
      now: start,
      roundCount: 1,
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: EventSuccessCompanionScreen(
            event: event,
            plan: plan,
            userProfile: buildUser(),
            participation: buildEventParticipation(
              event: event,
              uid: 'runner-1',
              status: EventParticipationStatus.attended,
            ),
            wingmanRequestCandidates: const [],
            rotationAssignment: assignment,
            rotationPeerProfiles: [
              buildPublicProfile(
                uid: 'runner-2',
                name: 'Rhea',
                gender: Gender.woman,
              ),
            ],
            now: start.subtract(const Duration(hours: 1)),
          ),
        ),
      ),
    );

    expect(find.text('Revealed'), findsOneWidget);
    expect(find.text('Unlocked together'), findsOneWidget);
    expect(find.textContaining('Rhea'), findsOneWidget);
    expect(find.textContaining('stronger interest'), findsOneWidget);
  });

  testWidgets('companion reveal dispatches a single stable reveal effect', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final effects = _FakeEventSuccessLiveEffectsController();
    final start = DateTime(2026, 5, 18, 7);
    final event = _racketEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
    );
    final plan = _racketPlan(event).copyWith(
      activeStepIndex: 1,
      revealStatus: EventSuccessRevealStatus.revealed,
      activeRevealRoundIndex: 0,
    );
    final assignment = _rotationAssignment(
      event: event,
      uid: 'runner-1',
      peerUid: 'runner-2',
      now: start,
      roundCount: 1,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          eventSuccessLiveEffectsControllerProvider.overrideWithValue(effects),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: EventSuccessCompanionScreen(
            event: event,
            plan: plan,
            userProfile: buildUser(),
            participation: buildEventParticipation(
              event: event,
              uid: 'runner-1',
              status: EventParticipationStatus.attended,
            ),
            wingmanRequestCandidates: const [],
            rotationAssignment: assignment,
            rotationPeerProfiles: [
              buildPublicProfile(
                uid: 'runner-2',
                name: 'Rhea',
                gender: Gender.woman,
              ),
            ],
            now: start.subtract(const Duration(hours: 1)),
            onPlayLiveEffect: effects.play,
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(effects.playedKinds, [
      EventSuccessLiveEffectKind.assignmentRevealed,
    ]);
  });

  testWidgets(
    'companion screen hides stale rotation assignment after opt-out',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 1600);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final start = DateTime(2026, 5, 18, 7);
      final event = _racketEvent(
        startTime: start,
        endTime: start.add(const Duration(hours: 1)),
      );
      final plan = withoutModule(
        _racketPlan(event),
        EventSuccessModuleCatalog.liveReveal.id,
      );
      final assignment = _rotationAssignment(
        event: event,
        uid: 'runner-1',
        peerUid: 'runner-2',
        now: start,
        roundCount: 1,
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: EventSuccessCompanionScreen(
              event: event,
              plan: plan,
              userProfile: buildUser(),
              participation: buildEventParticipation(
                event: event,
                uid: 'runner-1',
                status: EventParticipationStatus.attended,
              ),
              wingmanRequestCandidates: const [],
              rotationAssignment: assignment,
              guidedRotationsOptedOut: true,
              now: start.subtract(const Duration(hours: 1)),
            ),
          ),
        ),
      );

      expect(find.text('Timed rotations paused for you'), findsOneWidget);
      expect(
        find.text("You won't be included when the host runs the generator."),
        findsOneWidget,
      );
      expect(find.text('Include me in timed rotations'), findsOneWidget);
      expect(find.text('1 guided rotation'), findsNothing);
    },
  );

  testWidgets('companion screen hides stale pod assignment after opt-out', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1600);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime(2026, 5, 18, 7);
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    final assignment = _assignment(
      event: event,
      uid: 'runner-1',
      label: 'Pod A',
      now: start,
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: EventSuccessCompanionScreen(
            event: event,
            plan: plan,
            userProfile: buildUser(),
            participation: buildEventParticipation(
              event: event,
              uid: 'runner-1',
              status: EventParticipationStatus.attended,
            ),
            wingmanRequestCandidates: const [],
            assignment: assignment,
            microPodsOptedOut: true,
            now: start.subtract(const Duration(hours: 1)),
          ),
        ),
      ),
    );

    expect(find.text('Starter groups paused for you'), findsOneWidget);
    expect(
      find.text("You won't be included when the host runs the generator."),
      findsOneWidget,
    );
    expect(find.text('Include me in starter groups'), findsOneWidget);
    expect(find.text('Pod A'), findsNothing);
  });

  testWidgets('companion route fetches assigned podmate public profiles', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1600);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final firestore = FakeFirebaseFirestore();
    final event = buildEvent();
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    final assignment = _assignment(
      event: event,
      uid: 'runner-1',
      label: 'Pod A',
      now: DateTime(2026, 5, 21, 8),
    ).copyWithPeerUids(['runner-2', 'runner-3']);
    await firestore
        .collection('eventSuccessAssignments')
        .doc(assignment.id)
        .set(assignment.toJson());
    await firestore
        .collection('publicProfiles')
        .doc('runner-2')
        .set(
          buildPublicProfile(
            uid: 'runner-2',
            name: 'Rhea',
            gender: Gender.woman,
          ).toJson(),
        );
    await firestore
        .collection('publicProfiles')
        .doc('runner-3')
        .set(buildPublicProfile(uid: 'runner-3', name: 'Naina').toJson());

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          watchEventProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(event)),
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(buildUser()),
          ),
          watchEventParticipationProvider(event.id, 'runner-1').overrideWith(
            (ref) => Stream.value(
              buildEventParticipation(
                event: event,
                uid: 'runner-1',
                status: EventParticipationStatus.attended,
              ),
            ),
          ),
          watchEventSuccessPlanProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(plan)),
          eventSuccessRepositoryProvider.overrideWithValue(
            EventSuccessRepository(firestore),
          ),
          publicProfileRepositoryProvider.overrideWithValue(
            PublicProfileRepository(firestore),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: EventSuccessCompanionRouteScreen(
            organizerId: event.organizerId,
            eventId: event.id,
            initialEvent: event,
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.text('Pod A'), findsOneWidget);
    expect(find.text('Rhea'), findsOneWidget);
    expect(find.text('Naina'), findsOneWidget);
  });

  testWidgets('companion route fetches assigned rotation partner profiles', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1600);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final firestore = FakeFirebaseFirestore();
    final start = DateTime.now().add(const Duration(minutes: 10));
    final event = _racketEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
    );
    final plan = withoutModule(
      _racketPlan(event),
      EventSuccessModuleCatalog.liveReveal.id,
    );
    final assignment = _rotationAssignment(
      event: event,
      uid: 'runner-1',
      peerUid: 'runner-2',
      now: start,
      roundCount: 1,
    );
    await firestore
        .collection('eventSuccessAssignments')
        .doc(assignment.id)
        .set(assignment.toJson());
    await firestore
        .collection('publicProfiles')
        .doc('runner-2')
        .set(
          buildPublicProfile(
            uid: 'runner-2',
            name: 'Rhea',
            gender: Gender.woman,
          ).toJson(),
        );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          watchEventProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(event)),
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(buildUser()),
          ),
          watchEventParticipationProvider(event.id, 'runner-1').overrideWith(
            (ref) => Stream.value(
              buildEventParticipation(
                event: event,
                uid: 'runner-1',
                status: EventParticipationStatus.attended,
              ),
            ),
          ),
          watchEventSuccessPlanProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(plan)),
          eventSuccessRepositoryProvider.overrideWithValue(
            EventSuccessRepository(firestore),
          ),
          publicProfileRepositoryProvider.overrideWithValue(
            PublicProfileRepository(firestore),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: EventSuccessCompanionRouteScreen(
            organizerId: event.organizerId,
            eventId: event.id,
            initialEvent: event,
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.text('1 guided rotation'), findsOneWidget);
    expect(find.text('Round 1'), findsOneWidget);
    expect(find.textContaining('Rhea'), findsOneWidget);
  });

  testWidgets(
    'companion keeps always-on post-event sections for legacy selections',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 1600);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final start = DateTime(2026, 5, 18, 7);
      final event = buildEvent(
        startTime: start,
        endTime: start.add(const Duration(hours: 1)),
      );
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      ).copyWith(selectedModuleIds: [EventSuccessModuleCatalog.checkIn.id]);

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: EventSuccessCompanionScreen(
              event: event,
              plan: plan,
              userProfile: buildUser(),
              participation: buildEventParticipation(
                event: event,
                uid: 'runner-1',
                status: EventParticipationStatus.attended,
              ),
              wingmanRequestCandidates: [
                buildPublicProfile(
                  uid: 'runner-2',
                  name: 'Rhea',
                  gender: Gender.woman,
                ),
              ],
              now: start.add(const Duration(hours: 2)),
            ),
          ),
        ),
      );

      expect(find.text('Ask host for help'), findsNothing);
      expect(find.text('How did it feel?'), findsOneWidget);
      expect(find.text('The host is running the room'), findsNothing);
    },
  );

  testWidgets('companion route is unavailable until host saves setup', (
    tester,
  ) async {
    final event = buildEvent(id: 'event-no-plan');
    final participation = buildEventParticipation(
      event: event,
      uid: 'runner-1',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          watchEventProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(event)),
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(buildUser()),
          ),
          watchEventParticipationProvider(
            event.id,
            'runner-1',
          ).overrideWith((ref) => Stream.value(participation)),
          watchEventSuccessPlanProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(null)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: EventSuccessCompanionRouteScreen(
            organizerId: event.organizerId,
            eventId: event.id,
            initialEvent: event,
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.text('Companion not available'), findsOneWidget);
    expect(
      find.text(
        'The host has not enabled the live event guide for this event yet.',
      ),
      findsOneWidget,
    );
    expect(find.text('Social prompt'), findsNothing);
  });
}
