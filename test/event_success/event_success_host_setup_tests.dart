part of 'event_success_live_screens_test.dart';

void _registerEventSuccessHostSetupTests() {
  testWidgets('question progress rail uses stage press without Material ink', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      var selectedQuestion = -1;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 320,
                child: QuestionProgressRail(
                  activeIndex: 1,
                  answeredCount: 2,
                  questionCount: 3,
                  onSelect: (index) => selectedQuestion = index,
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.byType(CompanionBouncySurface), findsNWidgets(3));
      expect(find.byType(InkWell), findsNothing);
      final activeNode = find.semantics.byLabel('Question 2').evaluate().single;
      expect(
        activeNode,
        matchesSemantics(
          label: 'Question 2',
          hasSelectedState: true,
          isSelected: true,
          isButton: true,
          hasEnabledState: true,
          isEnabled: true,
          hasTapAction: true,
        ),
      );

      await tester.tap(find.text('3'));

      expect(selectedQuestion, 2);
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('host screen exposes setup live mode and report tabs', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 5000);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final event = buildEvent(bookedCount: 0, checkedInCount: 0);
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
                    bookedIds: ['a', 'b', 'c'],
                    checkedInIds: ['a', 'b'],
                    waitlistedIds: [],
                  ),
                  scorecard: const EventSuccessScorecard(
                    bookedCount: 10,
                    checkedInCount: 6,
                    attendeesWhoMetTwoPlusPeople: 4,
                    mutualMatchCount: 2,
                    chatStartedCount: 1,
                    averageWelcomeRating: 4.4,
                    averageStructureRating: 4.1,
                    safetyIncidentCount: 0,
                    catchSentCount: 3,
                    attendeesWhoCaughtSomeone: 2,
                    catchRecipientCount: 3,
                    catchRate: 1 / 3,
                    feedbackResponseCount: 4,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Setup'), findsWidgets);
    expect(find.byType(CatchChoiceInput<EventSuccessHostTab>), findsOneWidget);
    expect(find.byType(CatchPageTabBar<EventSuccessHostTab>), findsOneWidget);
    expect(find.text('Target attendees'), findsOneWidget);
    expect(find.text('How the room is grouped'), findsNothing);
    expect(find.text('Your goal for the event'), findsOneWidget);
    expect(find.text('YOUR PLAN'), findsOneWidget);
    await revealCustomization(tester, find.text('WHEN PEOPLE ARRIVE'));
    expect(find.text('DURING THE EVENT'), findsOneWidget);
    expect(find.text('AFTER THE EVENT'), findsNothing);
    expect(find.text('Save setup'), findsOneWidget);
    // Only host-configurable modules are shown. Platform-owned attendance,
    // safety, balancing, follow-up, and reporting stay active without
    // duplicate setup controls.
    expect(find.text('Attendance and live roster'), findsNothing);
    expect(find.text('Safety layer'), findsNothing);
    expect(find.text('Booking balance preview'), findsNothing);
    expect(find.text('Welcome script'), findsOneWidget);
    expect(find.text('Attendee feedback'), findsNothing);
    expect(find.text('Host recap'), findsNothing);
    expect(find.text('"Help me say hi" requests'), findsNothing);
    expect(find.text('Suggested first-message openers'), findsNothing);
    // Match clue questions is a first-class field, not nested in Advanced.
    expect(find.text('Match clue questions'), findsOneWidget);

    await tester.tap(find.text('Live'));
    await pumpFeatureUi(tester);
    expect(find.textContaining('LIVE NOW'), findsOneWidget);
    expect(find.textContaining('SYNCED'), findsOneWidget);
    expect(find.text('Up next'), findsOneWidget);
    expect(find.text('Guests'), findsOneWidget);
    expect(find.text('Conversation cues'), findsOneWidget);
    expect(find.text('Check guests in'), findsNothing);
    expect(
      find.byKey(const ValueKey('eventSuccessNextStepButton')),
      findsOneWidget,
    );

    await tester.tap(find.text('Report'));
    await pumpFeatureUi(tester);
    expect(find.text('POST-EVENT HOST REPORT'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchMetricSection &&
            widget.variant == CatchMetricSectionVariant.dataQuality,
      ),
      findsWidgets,
    );
  });

  testWidgets('host setup collapses to a read-only plan after bookings start', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final event = buildEvent(bookedCount: 1);
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: EventSuccessHostWorkspacePageBody(
              event: event,
              plan: plan,
              planIsPersisted: true,
              roster: const EventParticipationRoster(
                bookedIds: ['runner-1'],
                checkedInIds: [],
                waitlistedIds: [],
              ),
              showTabs: false,
            ),
          ),
        ),
      ),
    );

    expect(find.text('Settings are locked'), findsOneWidget);
    expect(find.text('YOUR PLAN'), findsOneWidget);
    expect(find.text('Your goal for the event'), findsNothing);
    expect(find.text('Save setup'), findsNothing);
    expect(find.byType(EventSuccessSetupBody), findsNothing);
  });

  testWidgets('host setup preserves custom format interaction model on save', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 5000);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final firestore = FakeFirebaseFirestore();
    final format = EventFormatSnapshot.custom(
      label: 'Salsa night',
      interactionModel: EventInteractionModel.pairedRotations,
    );
    final event = buildEvent(
      eventFormat: format,
      capacityLimit: 24,
      bookedCount: 0,
      checkedInCount: 0,
      waitlistedCount: 0,
    );
    final repository = EventSuccessRepository(firestore);
    final plan = await repository.ensurePlanForEvent(event);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          eventSuccessRepositoryProvider.overrideWithValue(repository),
        ],
        child: Consumer(
          builder: (context, ref, _) {
            ref.watch(uidProvider);
            return MaterialApp(
              theme: AppTheme.light,
              home: Scaffold(
                body: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: EventSuccessHostWorkspacePageBody(
                      event: event,
                      plan: plan,
                      planIsPersisted: true,
                      roster: EventParticipationRoster.empty(),
                      onSaveSetup: (request) =>
                          EventSuccessController.saveSetupMutation.run(
                            ref,
                            (tx) => tx
                                .get(eventSuccessControllerProvider.notifier)
                                .saveSetup(
                                  plan: request.plan,
                                  draft: request.draft,
                                  layoutId: request.layoutId,
                                  attendeePrompt: request.attendeePrompt,
                                ),
                          ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );

    expect(find.text('Salsa night'), findsWidgets);
    await revealCustomization(tester, find.text('Switch partners every'));
    expect(find.text('Open activity'), findsNothing);
    expect(plan.playbookId, EventSuccessPlaybookLibrary.pickleball.id);
    expect(plan.structureConfig.unitKind, EventSuccessUnitKind.pairs);

    await tester.tap(find.text('Save setup'));
    await tester.pump();
    await tester.pump();

    final saved = await repository.fetchPlan(event.id);
    expect(saved, isNotNull);
    expect(saved!.playbookId, EventSuccessPlaybookLibrary.pickleball.id);
    expect(
      saved.selectedModuleIds,
      contains(EventSuccessModuleCatalog.guidedRotations.id),
    );
    expect(
      saved.selectedModuleIds,
      contains(EventSuccessModuleCatalog.liveReveal.id),
    );
    expect(
      saved.selectedModuleIds,
      isNot(contains(EventSuccessModuleCatalog.microPods.id)),
    );
    expect(saved.structureConfig.unitKind, EventSuccessUnitKind.pairs);
    expect(saved.structureConfig.unitSize, 2);
    expect(saved.structureConfig.rotationIntervalMinutes, 15);
  });

  testWidgets('post-creation setup persists the selected room layout', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 5000);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final event = buildEvent(
      eventFormat: EventFormatSnapshot.custom(
        label: 'Table mixer',
        interactionModel: EventInteractionModel.pairedRotations,
      ),
      bookedCount: 0,
      checkedInCount: 0,
      waitlistedCount: 0,
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    final layout = EventSuccessLayout.parametric(
      layoutId: 'room-a',
      label: 'Room A',
      shape: EventSuccessLayoutShape.round,
      unitCount: 6,
      unitCapacity: 4,
      columnCount: 2,
    );
    EventSuccessSetupSaveRequest? captured;

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
              organizerLayoutsState: CatchAsyncState.data([layout]),
              onSaveLayout: (draft) async => draft,
              onSaveSetup: (request) async => captured = request,
            ),
          ),
        ),
      ),
    );

    expect(find.text('ROOM LAYOUT'), findsOneWidget);
    await tester.tap(find.text('Room A'));
    await tester.pump();
    await tester.tap(find.text('Save changes'));
    await tester.pump();

    expect(captured, isNotNull);
    expect(captured!.layoutId, 'room-a');
  });

  testWidgets('host live mode is unavailable until setup is saved', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1600);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final event = buildEvent();
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
                  planIsPersisted: false,
                  roster: EventParticipationRoster.empty(),
                  initialTab: EventSuccessHostTab.live,
                  showTabs: false,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Live mode needs saved setup'), findsOneWidget);
    expect(find.text('Live host mode'), findsNothing);
    expect(find.text('Next'), findsNothing);
    expect(find.text('Mark live guide complete'), findsNothing);
  });

  testWidgets('host live guide skips live streams until setup is saved', (
    tester,
  ) async {
    final event = buildEvent(id: 'event-unsaved-live-guide');
    final rosterController = StreamController<EventParticipationRoster>();
    final assignmentsController =
        StreamController<List<EventSuccessAssignment>>();
    final rotationAssignmentsController =
        StreamController<List<EventSuccessAssignment>>();
    final preferencesController =
        StreamController<List<EventSuccessPreference>>();
    final wingmanRequestsController =
        StreamController<List<EventSuccessWingmanRequest>>();
    addTearDown(() {
      rosterController.close();
      assignmentsController.close();
      rotationAssignmentsController.close();
      preferencesController.close();
      wingmanRequestsController.close();
    });

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchEventSuccessPlanProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(null)),
          watchEventParticipationRosterProvider(
            event.id,
          ).overrideWith((ref) => rosterController.stream),
          watchEventSuccessAssignmentsProvider(
            event.id,
          ).overrideWith((ref) => assignmentsController.stream),
          watchEventSuccessRotationAssignmentsProvider(
            event.id,
          ).overrideWith((ref) => rotationAssignmentsController.stream),
          watchEventSuccessPreferencesProvider(
            event.id,
          ).overrideWith((ref) => preferencesController.stream),
          watchEventSuccessWingmanRequestsProvider(
            event.id,
          ).overrideWith((ref) => wingmanRequestsController.stream),
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

    expect(find.text('Live mode needs saved setup'), findsOneWidget);
    expect(find.text('Live host mode'), findsNothing);
  });

  testWidgets('ended host report skips live streams and keeps scorecard data', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 874);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final now = DateTime.now();
    final event = buildEvent(
      id: 'event-ended-host-report',
      startTime: now.subtract(const Duration(hours: 2)),
      endTime: now.subtract(const Duration(hours: 1)),
      bookedCount: 6,
      checkedInCount: 5,
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    var rosterWatched = false;
    var assignmentsWatched = false;
    var rotationAssignmentsWatched = false;
    var rotationDraftsWatched = false;
    var preferencesWatched = false;
    var wingmanRequestsWatched = false;
    var scorecardWatched = false;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchEventSuccessPlanProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(plan)),
          watchEventParticipationRosterProvider(event.id).overrideWith((ref) {
            rosterWatched = true;
            return Stream.value(EventParticipationRoster.empty());
          }),
          watchEventSuccessAssignmentsProvider(event.id).overrideWith((ref) {
            assignmentsWatched = true;
            return Stream.value(const <EventSuccessAssignment>[]);
          }),
          watchEventSuccessRotationAssignmentsProvider(event.id).overrideWith((
            ref,
          ) {
            rotationAssignmentsWatched = true;
            return Stream.value(const <EventSuccessAssignment>[]);
          }),
          watchEventSuccessRotationDraftsProvider(event.id).overrideWith((ref) {
            rotationDraftsWatched = true;
            return Stream.value(const <EventSuccessAssignmentDraft>[]);
          }),
          watchEventSuccessPreferencesProvider(event.id).overrideWith((ref) {
            preferencesWatched = true;
            return Stream.value(const <EventSuccessPreference>[]);
          }),
          watchEventSuccessWingmanRequestsProvider(event.id).overrideWith((
            ref,
          ) {
            wingmanRequestsWatched = true;
            return Stream.value(const <EventSuccessWingmanRequest>[]);
          }),
          watchEventSuccessScorecardProvider(event.id).overrideWith((ref) {
            scorecardWatched = true;
            return Stream.value(
              const EventSuccessScorecard(
                bookedCount: 6,
                checkedInCount: 5,
                attendeesWhoMetTwoPlusPeople: 3,
                mutualMatchCount: 2,
                chatStartedCount: 1,
                averageWelcomeRating: 4.5,
                averageStructureRating: 4.2,
                safetyIncidentCount: 0,
                feedbackResponseCount: 4,
                assignmentParticipantCount: 3,
                assignmentOptOutCount: 1,
                wingmanRequestCount: 2,
              ),
            );
          }),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SingleChildScrollView(
              // Embedded reports inherit the event workspace scroll owner.
              child: EventSuccessHostSection(
                event: event,
                initialTab: EventSuccessHostTab.report,
                showTabs: false,
              ),
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(scorecardWatched, isTrue);
    expect(rosterWatched, isFalse);
    expect(assignmentsWatched, isFalse);
    expect(rotationAssignmentsWatched, isFalse);
    expect(rotationDraftsWatched, isFalse);
    expect(preferencesWatched, isFalse);
    expect(wingmanRequestsWatched, isFalse);
    expect(find.text('POST-EVENT HOST REPORT'), findsOneWidget);
    expect(find.text('3 assigned'), findsOneWidget);
    expect(find.text('1 opted out'), findsOneWidget);
    expect(find.text('2 host-help requests'), findsOneWidget);
    await tester.ensureVisible(find.text('2 host-help requests'));
    await tester.pump();
    expect(find.text('2 host-help requests').hitTestable(), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('host section keeps real tabs while guide loads', (
    tester,
  ) async {
    final event = buildEvent(id: 'event-loading-host-guide');

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchEventSuccessPlanProvider(
            event.id,
          ).overrideWithValue(const AsyncLoading<EventSuccessPlan?>()),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: SafeArea(
              child: EventSuccessHostSection(
                event: event,
                initialTab: EventSuccessHostTab.live,
              ),
            ),
          ),
        ),
      ),
    );

    await tester.pump();

    expect(find.byType(EventSuccessHostSectionLoadingPageBody), findsOneWidget);
    expect(find.byType(CatchSkeleton), findsNothing);
    expect(find.byType(EventSuccessHostTabBar), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  test('host section retains local provider failures', () {
    final event = buildEvent(id: 'event-host-section-state');
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    const roster = EventParticipationRoster(
      bookedIds: ['runner-1'],
      checkedInIds: [],
      waitlistedIds: [],
    );

    EventSuccessHostSectionState resolve({
      CatchAsyncState<EventSuccessPlan?>? planState,
      CatchAsyncState<EventParticipationRoster>? rosterState,
      CatchAsyncState<EventSuccessScorecard?>? scorecardState,
      CatchAsyncState<List<EventSuccessAssignment>>? assignmentsState,
      CatchAsyncState<List<PublicProfile>>? assignmentProfilesState,
      CatchAsyncState<List<EventSuccessAssignment>>? rotationAssignmentsState,
      CatchAsyncState<List<PublicProfile>>? rotationProfilesState,
      CatchAsyncState<List<EventSuccessPreference>>? preferencesState,
      CatchAsyncState<List<EventSuccessWingmanRequest>>? wingmanRequestsState,
      CatchAsyncState<List<PublicProfile>>? wingmanProfilesState,
    }) {
      return EventSuccessHostSectionState.resolve(
        event: event,
        now: event.startTime,
        planState: planState ?? CatchAsyncState<EventSuccessPlan?>.data(plan),
        rosterState: rosterState ?? const CatchAsyncState.data(roster),
        scorecardState:
            scorecardState ??
            const CatchAsyncState<EventSuccessScorecard?>.data(null),
        assignmentsState:
            assignmentsState ??
            const CatchAsyncState<List<EventSuccessAssignment>>.data([]),
        assignmentParticipantProfilesState:
            assignmentProfilesState ??
            const CatchAsyncState<List<PublicProfile>>.data([]),
        rotationAssignmentsState:
            rotationAssignmentsState ??
            const CatchAsyncState<List<EventSuccessAssignment>>.data([]),
        rotationDraftsState:
            const CatchAsyncState<List<EventSuccessAssignmentDraft>>.data([]),
        rotationParticipantProfilesState:
            rotationProfilesState ??
            const CatchAsyncState<List<PublicProfile>>.data([]),
        preferencesState:
            preferencesState ??
            const CatchAsyncState<List<EventSuccessPreference>>.data([]),
        wingmanRequestsState:
            wingmanRequestsState ??
            const CatchAsyncState<List<EventSuccessWingmanRequest>>.data([]),
        wingmanProfilesState:
            wingmanProfilesState ??
            const CatchAsyncState<List<PublicProfile>>.data([]),
      );
    }

    expect(
      resolve(
        planState: const CatchAsyncState<EventSuccessPlan?>.loading(),
      ).status,
      EventSuccessHostSectionStatus.loading,
    );

    final unsaved = resolve(
      planState: const CatchAsyncState<EventSuccessPlan?>.data(null),
    );
    expect(unsaved.status, EventSuccessHostSectionStatus.ready);
    expect(unsaved.planIsPersisted, isFalse);
    expect(unsaved.plan.eventId, event.id);

    final planError = StateError('plan failed');
    final failedPlan = resolve(
      planState: CatchAsyncState<EventSuccessPlan?>.error(planError),
    );
    expect(failedPlan.status, EventSuccessHostSectionStatus.error);
    expect(failedPlan.retryIntent, EventSuccessHostRetryIntent.plan);
    expect(failedPlan.error, same(planError));

    final rosterError = StateError('roster failed');
    final rosterState = resolve(
      rosterState: CatchAsyncState<EventParticipationRoster>.error(rosterError),
    );
    expect(rosterState.status, EventSuccessHostSectionStatus.ready);
    expect(rosterState.retryIntent, isNull);
    expect(rosterState.error, isNull);
    expect(rosterState.resourceFailures, hasLength(1));
    expect(
      rosterState.resourceFailures.single.retryIntent,
      EventSuccessHostRetryIntent.roster,
    );
    expect(rosterState.resourceFailures.single.error, same(rosterError));

    final profileError = StateError('profiles failed');
    expect(
      resolve(
        assignmentProfilesState: CatchAsyncState<List<PublicProfile>>.error(
          profileError,
        ),
      ).resourceFailures.single.retryIntent,
      EventSuccessHostRetryIntent.assignmentParticipantProfiles,
    );

    final scorecardError = StateError('scorecard failed');
    expect(
      resolve(
        scorecardState: CatchAsyncState<EventSuccessScorecard?>.error(
          scorecardError,
        ),
      ).resourceFailures.single.retryIntent,
      EventSuccessHostRetryIntent.scorecard,
    );
  });

  test(
    'companion route state resolves core loading messages and ready data',
    () {
      final event = buildEvent(id: 'event-companion-route-state');
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      );
      final profile = buildUser();
      final participation = buildEventParticipation(
        event: event,
        uid: 'runner-1',
      );

      final loading = EventSuccessCompanionRouteState.resolveCore(
        l10n: _l10n,
        eventState: const CatchAsyncState<Event?>.loading(),
        initialEvent: null,
        uidState: const CatchAsyncState<String?>.data('runner-1'),
        profileState: null,
        participationState: null,
        planState: CatchAsyncState<EventSuccessPlan?>.data(plan),
        referenceNow: event.startTime,
      );
      expect(loading.status, EventSuccessCompanionRouteStatus.loading);

      final signedOut = EventSuccessCompanionRouteState.resolveCore(
        l10n: _l10n,
        eventState: CatchAsyncState<Event?>.data(event),
        initialEvent: null,
        uidState: const CatchAsyncState<String?>.data(null),
        profileState: null,
        participationState: null,
        planState: CatchAsyncState<EventSuccessPlan?>.data(plan),
        referenceNow: event.startTime,
      );
      expect(signedOut.status, EventSuccessCompanionRouteStatus.message);
      expect(signedOut.message?.title, 'Sign in required');

      final missingPlan = EventSuccessCompanionRouteState.resolveCore(
        l10n: _l10n,
        eventState: CatchAsyncState<Event?>.data(event),
        initialEvent: null,
        uidState: const CatchAsyncState<String?>.data('runner-1'),
        profileState: CatchAsyncState<UserProfile?>.data(profile),
        participationState: CatchAsyncState<EventParticipation?>.data(
          participation,
        ),
        planState: const CatchAsyncState<EventSuccessPlan?>.data(null),
        referenceNow: event.startTime,
      );
      expect(missingPlan.status, EventSuccessCompanionRouteStatus.message);
      expect(missingPlan.message?.title, 'Companion not available');

      final ready = EventSuccessCompanionRouteState.resolveCore(
        l10n: _l10n,
        eventState: CatchAsyncState<Event?>.data(event),
        initialEvent: null,
        uidState: const CatchAsyncState<String?>.data('runner-1'),
        profileState: CatchAsyncState<UserProfile?>.data(profile),
        participationState: CatchAsyncState<EventParticipation?>.data(
          participation,
        ),
        planState: CatchAsyncState<EventSuccessPlan?>.data(plan),
        referenceNow: event.startTime,
      );
      expect(ready.status, EventSuccessCompanionRouteStatus.ready);
      expect(ready.event, event);
      expect(ready.uid, 'runner-1');
      expect(ready.profile, profile);
      expect(ready.participation, participation);
      expect(ready.plan, plan);
    },
  );

  testWidgets('host report remains available for legacy module selections', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1600);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final event = buildEvent();
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime)
        .copyWith(
          selectedModuleIds: EventSuccessPlaybookLibrary.socialRun.moduleIds
              .where((id) => id != EventSuccessModuleCatalog.hostAnalytics.id)
              .toList(),
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
                  roster: EventParticipationRoster.empty(),
                  initialTab: EventSuccessHostTab.report,
                  showTabs: false,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Post-event insights are off'), findsNothing);
    expect(find.text('Waiting for attendee feedback'), findsOneWidget);
  });

  testWidgets('host report summarizes live signal quality', (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 2200);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final event = buildEvent(bookedCount: 6, checkedInCount: 5);
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
                  roster: EventParticipationRoster.empty(),
                  scorecard: const EventSuccessScorecard(
                    bookedCount: 6,
                    checkedInCount: 5,
                    attendeesWhoMetTwoPlusPeople: 2,
                    mutualMatchCount: 0,
                    chatStartedCount: 0,
                    averageWelcomeRating: 5,
                    averageStructureRating: 4,
                    safetyIncidentCount: 0,
                    catchSentCount: 3,
                    attendeesWhoCaughtSomeone: 2,
                    catchRecipientCount: 3,
                    catchRate: 0.4,
                    feedbackResponseCount: 2,
                    conversationGraphResponseCount: 3,
                    conversationExcludedAttendeeCount: 1,
                  ),
                  assignments: [
                    _assignment(
                      event: event,
                      uid: 'runner-1',
                      label: 'Pod A',
                      now: now,
                    ).copyWithPeerUids(['runner-2']),
                  ],
                  rotationAssignments: [
                    _rotationAssignment(
                      event: event,
                      uid: 'runner-3',
                      peerUid: 'runner-4',
                      now: now,
                      roundCount: 1,
                    ),
                  ],
                  preferences: [
                    EventSuccessPreference(
                      id: eventSuccessPreferenceId(
                        eventId: event.id,
                        uid: 'runner-5',
                      ),
                      eventId: event.id,
                      organizerId: event.organizerId,
                      uid: 'runner-5',
                      microPodsOptedOut: false,
                      guidedRotationsOptedOut: true,
                      createdAt: now,
                      updatedAt: now,
                    ),
                  ],
                  wingmanRequests: [
                    _wingmanRequest(
                      event: event,
                      requesterUid: 'runner-1',
                      targetUid: 'runner-2',
                      now: now,
                    ),
                  ],
                  initialTab: EventSuccessHostTab.report,
                  showTabs: false,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('HOW RELIABLE IS THIS REPORT?'), findsOneWidget);
    expect(find.text('Feedback'), findsOneWidget);
    expect(find.text('Conversation exclusions'), findsOneWidget);
    expect(find.text('3/5 responses'), findsOneWidget);
    expect(find.text('Caught someone'), findsWidgets);
    expect(find.text('People included'), findsOneWidget);
    expect(find.text('Opted out'), findsOneWidget);
    expect(find.text('Wingman help'), findsOneWidget);
    expect(find.text('40%'), findsWidgets);
    expect(find.text('80%'), findsWidgets);
    expect(find.text('20%'), findsWidgets);
    expect(find.text('2/5 feedback'), findsOneWidget);
    expect(find.text('2 caught someone'), findsOneWidget);
    expect(find.text('Catches sent'), findsOneWidget);
    expect(find.text('4 assigned'), findsOneWidget);
    expect(find.text('1 opted out'), findsOneWidget);
    expect(find.text('1 host-help requests'), findsOneWidget);
    expect(find.textContaining('Private notes'), findsOneWidget);
    expect(find.text('WORKING WELL'), findsOneWidget);
    expect(find.text('IMPROVE NEXT TIME'), findsOneWidget);
  });
}
