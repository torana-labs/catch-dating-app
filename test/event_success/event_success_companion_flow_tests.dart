part of 'event_success_live_screens_test.dart';

void _registerEventSuccessCompanionFlowTests() {
  testWidgets('host live mode excludes opted-out stale rotations', (
    tester,
  ) async {
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
                  preferences: [
                    EventSuccessPreference(
                      id: eventSuccessPreferenceId(
                        eventId: event.id,
                        uid: 'runner-2',
                      ),
                      eventId: event.id,
                      organizerId: event.organizerId,
                      uid: 'runner-2',
                      microPodsOptedOut: false,
                      guidedRotationsOptedOut: true,
                      createdAt: start,
                      updatedAt: start,
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
    expect(find.text('1 opted out'), findsOneWidget);
    expect(
      find.text(
        'Regenerate to remove opted-out attendees from timed rotations.',
      ),
      findsOneWidget,
    );
    expect(find.text('1 assigned'), findsOneWidget);
  });

  testWidgets(
    'companion screen lets checked-in attendees ask the host for help',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 1600);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final firestore = FakeFirebaseFirestore();
      final start = DateTime(2026, 5, 18, 7);
      final event = buildEvent(
        startTime: start,
        endTime: start.add(const Duration(hours: 2)),
      );
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      ).copyWith(activeStepIndex: 4);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            eventSuccessRepositoryProvider.overrideWithValue(
              EventSuccessRepository(
                firestore,
                functions: _WingmanTestFirebaseFunctions(
                  firestore,
                  requesterUid: 'runner-1',
                ),
              ),
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
                  now: start.add(const Duration(hours: 1)),
                  onSaveWingmanRequest: (target, note) async {
                    await EventSuccessController.wingmanRequestMutation.run(
                      ref,
                      (tx) => tx
                          .get(eventSuccessControllerProvider.notifier)
                          .saveWingmanRequest(
                            event: event,
                            target: target,
                            note: note,
                          ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      );
      await tester.pump();

      await tester.scrollUntilVisible(
        find.text('Ask the host for an intro'),
        400,
        scrollable: verticalScroll(EventSuccessCompanionKeys.scrollView),
      );
      expect(find.text('HOST CAN SEE'), findsOneWidget);
      expect(find.text('Rhea'), findsOneWidget);

      await tester.scrollUntilVisible(
        find.text('Ask host'),
        200,
        scrollable: verticalScroll(EventSuccessCompanionKeys.scrollView),
      );
      await tester.tap(find.text('Ask host'));
      await pumpFeatureUi(tester);

      final request = await firestore
          .collection('eventSuccessWingmanRequests')
          .doc('event-1_runner-1')
          .get();
      expect(request.data()?['targetUid'], 'runner-2');
      expect(request.data()?['status'], 'active');
      expect(request.data()?['hostVisibleConsent'], isTrue);
    },
  );

  testWidgets(
    'companion filters host-help candidates to the attendee interested-in genders',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 1500);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final start = DateTime(2026, 5, 18, 7);
      final event = buildEvent(
        startTime: start,
        endTime: start.add(const Duration(hours: 2)),
      );
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      ).copyWith(activeStepIndex: 4);

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: EventSuccessCompanionScreen(
              event: event,
              plan: plan,
              userProfile: buildUser(
                gender: Gender.woman,
                interestedInGenders: const [Gender.man],
              ),
              participation: buildEventParticipation(
                event: event,
                uid: 'runner-1',
                status: EventParticipationStatus.attended,
              ),
              wingmanRequestCandidates: [
                buildPublicProfile(uid: 'runner-2', name: 'Arjun'),
                buildPublicProfile(
                  uid: 'runner-3',
                  name: 'Rhea',
                  gender: Gender.woman,
                ),
              ],
              now: start.add(const Duration(hours: 1)),
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.scrollUntilVisible(
        find.text('Ask the host for an intro'),
        400,
        scrollable: verticalScroll(EventSuccessCompanionKeys.scrollView),
      );

      expect(find.text('Arjun'), findsOneWidget);
      expect(find.text('Rhea'), findsNothing);
    },
  );

  testWidgets('companion keeps booked attendees in pre-arrival mode', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1700);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime(2026, 5, 18, 7);
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
    );
    final plan = _withLiveReveal(
      _withGuidedRotations(
        EventSuccessPlan.defaultForEvent(event, now: event.startTime),
      ),
    );
    final assignment = _rotationAssignment(
      event: event,
      uid: 'runner-1',
      peerUid: 'runner-2',
      now: start,
      roundCount: 1,
    );
    final completedArrivalMission = EventSuccessArrivalMission(
      id: eventSuccessArrivalMissionId(eventId: event.id, uid: 'runner-1'),
      eventId: event.id,
      organizerId: event.organizerId,
      observerUid: 'runner-1',
      targetUid: 'runner-2',
      targetDisplayName: 'Rhea',
      targetContext: 'Completed before the reveal.',
      question: 'What made the event easy to join?',
      answerOptions: const [],
      status: EventSuccessArrivalMissionStatus.completed,
      createdAt: start.subtract(const Duration(minutes: 10)),
      updatedAt: start,
      completedAt: start,
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
            ),
            wingmanRequestCandidates: const [],
            arrivalMission: completedArrivalMission,
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

    expect(find.text('What to expect'), findsOneWidget);
    expect(
      find.text('Timed partner rotations as the event unfolds.'),
      findsOneWidget,
    );
    expect(find.text('Social prompt'), findsNothing);
    expect(find.text('Conversation cues'), findsNothing);
    expect(find.text('Rotation reveal'), findsNothing);
    expect(find.text('Waiting for the host reveal'), findsNothing);
    expect(find.textContaining('Rhea'), findsNothing);
  });

  testWidgets('companion screen shows assigned First Hello mission', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1900);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime(2026, 5, 18, 19);
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 2)),
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
        .copyWith(
          selectedModuleIds: [
            EventSuccessModuleCatalog.checkIn.id,
            EventSuccessModuleCatalog.firstHelloCheckIn.id,
            EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
          ],
        );
    final mission = EventSuccessArrivalMission(
      id: eventSuccessArrivalMissionId(eventId: event.id, uid: 'runner-1'),
      eventId: event.id,
      organizerId: event.organizerId,
      observerUid: 'runner-1',
      targetUid: 'runner-2',
      targetDisplayName: 'Arjun',
      targetContext: 'Look for Arjun near the host table.',
      question: 'Ask what kind of partner makes an event feel easy to join.',
      answerOptions: const [
        EventSuccessArrivalMissionAnswerOption(
          id: 'warm_intro',
          label: 'Warm intro',
        ),
        EventSuccessArrivalMissionAnswerOption(
          id: 'playful_energy',
          label: 'Playful energy',
        ),
      ],
      status: EventSuccessArrivalMissionStatus.active,
      createdAt: start.subtract(const Duration(minutes: 1)),
      updatedAt: start.subtract(const Duration(minutes: 1)),
    );
    EventSuccessArrivalMission? completedMission;
    String? completedAnswerId;

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
            ),
            wingmanRequestCandidates: const [],
            arrivalMission: mission,
            now: start.subtract(const Duration(minutes: 5)),
            onCompleteArrivalMission: (mission, answerId) async {
              completedMission = mission;
              completedAnswerId = answerId;
            },
          ),
        ),
      ),
    );

    expect(find.text('Your first arrival mission is live.'), findsOneWidget);
    expect(find.text('Find Arjun.'), findsOneWidget);
    expect(
      find.text('Ask what kind of partner makes an event feel easy to join.'),
      findsOneWidget,
    );
    expect(find.text('A few quick questions'), findsNothing);

    await tester.tap(find.text('Playful energy'));
    await tester.pump();
    await tester.tap(find.widgetWithText(CatchButton, 'Complete check-in'));
    await tester.pump();

    expect(completedMission, same(mission));
    expect(completedAnswerId, 'playful_energy');
  });

  testWidgets('companion screen can start First Hello before mission exists', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1700);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final start = DateTime(2026, 5, 18, 19);
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 2)),
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
        .copyWith(
          selectedModuleIds: [
            EventSuccessModuleCatalog.checkIn.id,
            EventSuccessModuleCatalog.firstHelloCheckIn.id,
          ],
        );
    var startCalls = 0;
    var skipCalls = 0;

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
            ),
            wingmanRequestCandidates: const [],
            now: start.subtract(const Duration(minutes: 5)),
            onStartArrivalMission: () async => startCalls++,
            onSkipArrivalMission: () => skipCalls++,
          ),
        ),
      ),
    );

    expect(find.text('Start your First Hello.'), findsOneWidget);
    expect(find.text('A few quick questions'), findsNothing);

    await tester.tap(find.widgetWithText(CatchButton, 'Start First Hello'));
    await tester.pump();
    await tester.tap(find.widgetWithText(CatchButton, 'Use normal check-in'));
    await tester.pump();

    expect(startCalls, 1);
    expect(skipCalls, 1);
  });

  testWidgets('companion screen saves compatibility questionnaire answers', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final firestore = FakeFirebaseFirestore();
    final start = DateTime(2026, 5, 18, 7);
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 2)),
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
        .copyWith(
          selectedModuleIds: [
            EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
          ],
          compatibilityAffectsRanking: true,
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
                ),
                wingmanRequestCandidates: const [],
                now: start.add(const Duration(minutes: 30)),
                onSaveCompatibilityAnswers: (answerIds) async {
                  await EventSuccessController.compatibilityResponseMutation
                      .run(
                        ref,
                        (tx) => tx
                            .get(eventSuccessControllerProvider.notifier)
                            .saveCompatibilityResponse(
                              event: event,
                              answerIds: answerIds,
                              questionnaireConfig: plan.questionnaireConfig,
                            ),
                      );
                },
              ),
            );
          },
        ),
      ),
    );
    await tester.pump();

    expect(
      find.byKey(const ValueKey('eventSuccessCompanionStage')),
      findsOneWidget,
    );
    expect(find.text('A few quick questions'), findsOneWidget);
    expect(find.text('Can guide pairings'), findsOneWidget);

    await tester.tap(find.text('Playful competition'));
    await tester.pump();
    await tester.tap(find.text('Save clues'));
    await pumpFeatureUi(tester);

    final saved = await firestore
        .collection('eventSuccessCompatibilityResponses')
        .doc('event-1_runner-1')
        .get();
    expect(saved.data()?['answerIds'], ['event_energy_playful_competition']);
  });

  testWidgets('companion route shows unanswered questionnaire after check-in', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final firestore = FakeFirebaseFirestore();
    final start = DateTime.now().add(const Duration(minutes: 20));
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 2)),
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
        .copyWith(
          selectedModuleIds: [
            EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
          ],
          compatibilityAffectsRanking: true,
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

    expect(find.text('A few quick questions'), findsOneWidget);
    expect(find.text('Can guide pairings'), findsOneWidget);
    expect(find.text('The host is running the room'), findsNothing);
  });

  testWidgets('companion route refreshes when event clock crosses end time', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final firestore = FakeFirebaseFirestore();
    final clock = StreamController<DateTime>();
    addTearDown(clock.close);
    final start = DateTime(2026, 5, 18, 7);
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);

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
          eventSuccessCompanionClockProvider.overrideWith(
            (ref) => clock.stream,
          ),
          eventSuccessRepositoryProvider.overrideWithValue(
            EventSuccessRepository(firestore),
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

    clock.add(start.add(const Duration(minutes: 30)));
    await tester.pump();
    await tester.pump();
    expect(find.text('Suggested first-message openers'), findsNothing);

    clock.add(start.add(const Duration(hours: 2)));
    await tester.pump();
    await tester.pump();
    expect(find.text('Suggested first-message openers'), findsOneWidget);
    expect(find.textContaining('compare routes'), findsOneWidget);
  });

  testWidgets(
    'companion route keeps chrome and centers progress while loading',
    (tester) async {
      final event = buildEvent(id: 'event-loading-companion');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWithValue(const AsyncData<String?>('runner-1')),
            watchEventProvider(
              event.id,
            ).overrideWithValue(const AsyncLoading<Event?>()),
            watchUserProfileProvider.overrideWithValue(AsyncData(buildUser())),
            watchEventParticipationProvider(
              event.id,
              'runner-1',
            ).overrideWithValue(
              AsyncData<EventParticipation?>(
                buildEventParticipation(
                  event: event,
                  uid: 'runner-1',
                  status: EventParticipationStatus.attended,
                ),
              ),
            ),
            watchEventSuccessPlanProvider(event.id).overrideWithValue(
              AsyncData(
                EventSuccessPlan.defaultForEvent(event, now: event.startTime),
              ),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: EventSuccessCompanionRouteScreen(
              organizerId: event.organizerId,
              eventId: event.id,
            ),
          ),
        ),
      );

      await tester.pump();

      expect(find.byType(CatchScaffold), findsOneWidget);
      expect(find.text('Event companion'), findsOneWidget);
      expect(find.byType(EventSuccessCompanionLoadingPageBody), findsOneWidget);
      expect(find.byType(CatchSkeleton), findsNothing);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    },
  );

  testWidgets('companion route shows loading while uid resolves', (
    tester,
  ) async {
    final event = buildEvent(id: 'event-uid-loading-companion');

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWithValue(const AsyncLoading<String?>()),
          watchEventProvider(
            event.id,
          ).overrideWithValue(AsyncData<Event?>(event)),
          watchEventSuccessPlanProvider(event.id).overrideWithValue(
            AsyncData(
              EventSuccessPlan.defaultForEvent(event, now: event.startTime),
            ),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: EventSuccessCompanionRouteScreen(
            organizerId: event.organizerId,
            eventId: event.id,
          ),
        ),
      ),
    );

    await tester.pump();

    expect(find.text('Event companion'), findsOneWidget);
    expect(find.byType(EventSuccessCompanionLoadingPageBody), findsOneWidget);
    expect(find.text('Sign in required'), findsNothing);
  });

  testWidgets('companion route shows auth errors before signed-out copy', (
    tester,
  ) async {
    final event = buildEvent(id: 'event-uid-error-companion');

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWithValue(
            AsyncError<String?>(Exception('auth failed'), StackTrace.empty),
          ),
          watchEventProvider(
            event.id,
          ).overrideWithValue(AsyncData<Event?>(event)),
          watchEventSuccessPlanProvider(event.id).overrideWithValue(
            AsyncData(
              EventSuccessPlan.defaultForEvent(event, now: event.startTime),
            ),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: EventSuccessCompanionRouteScreen(
            organizerId: event.organizerId,
            eventId: event.id,
          ),
        ),
      ),
    );

    await tester.pump();

    expect(find.text('Sign in problem'), findsOneWidget);
    expect(find.text('Sign in required'), findsNothing);
  });
}
