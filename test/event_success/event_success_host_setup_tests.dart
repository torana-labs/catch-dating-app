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
    expect(find.text('Conversation questions'), findsOneWidget);

    await tester.tap(find.text('Live'));
    await pumpFeatureUi(tester);
    expect(find.textContaining('Live now'), findsOneWidget);
    expect(find.textContaining('Synced'), findsOneWidget);
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
    expect(find.text('Picked someone'), findsWidgets);
    expect(find.text('People included'), findsOneWidget);
    expect(find.text('Opted out'), findsOneWidget);
    expect(find.text('Host-help requests'), findsOneWidget);
    expect(find.text('40%'), findsWidgets);
    expect(find.text('80%'), findsWidgets);
    expect(find.text('20%'), findsWidgets);
    expect(find.text('2/5 feedback'), findsOneWidget);
    expect(find.text('2 picked someone'), findsOneWidget);
    expect(find.text('Picks sent'), findsOneWidget);
    expect(find.text('4 assigned'), findsOneWidget);
    expect(find.text('1 opted out'), findsOneWidget);
    expect(find.text('1 host-help requests'), findsOneWidget);
    expect(find.textContaining('Private notes'), findsOneWidget);
    expect(find.text('WORKING WELL'), findsOneWidget);
    expect(find.text('IMPROVE NEXT TIME'), findsOneWidget);
  });
}
