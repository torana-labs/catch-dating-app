part of 'dashboard_screen_test.dart';

void _dashboardFullHomeShellTests() {
  group('Dashboard full home shell', () {
    testWidgets('keeps the focus list while attended enrichment is loading', (
      tester,
    ) async {
      final joinedOrganizerIds = ['club-1'];
      final user = buildUser();
      final event = buildEvent(id: 'booked-event', bookedCount: 1);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchAttendedEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncLoading<List<Event>>()),
            exploreRecommendedEventsProvider(
              recommendationsQueryFor(user.uid, joinedOrganizerIds),
            ).overrideWithValue(noRecommendationCandidates),
            eventRepositoryProvider.overrideWithValue(FakeEventRepository()),
            uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
            eventCheckInLocationServiceProvider.overrideWithValue(
              const _FakeEventCheckInLocationService(),
            ),
            ..._dashboardHostOverrides(user),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: _DashboardFullTestShell(
              user: user,
              followedOrganizerIds: joinedOrganizerIds,
              signedUpEvents: [event],
            ),
          ),
        ),
      );

      await tester.pump();

      expect(find.byType(EventFocusList), findsOneWidget);
      expect(find.text(event.title), findsOneWidget);
      expect(find.text('Your activity · this week'), findsNothing);
    });

    testWidgets('keeps live focus content when attended enrichment fails', (
      tester,
    ) async {
      final joinedOrganizerIds = ['club-1'];
      final user = buildUser();
      final event = buildEvent(id: 'booked-event', bookedCount: 1);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchAttendedEventsProvider(user.uid).overrideWithValue(
              AsyncError<List<Event>>(Exception('boom'), StackTrace.empty),
            ),
            exploreRecommendedEventsProvider(
              recommendationsQueryFor(user.uid, joinedOrganizerIds),
            ).overrideWith(
              (ref) async => const <ExploreEventRecommendationCandidate>[],
            ),
            ..._dashboardHostOverrides(user),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: _DashboardFullTestShell(
              user: user,
              followedOrganizerIds: joinedOrganizerIds,
              signedUpEvents: [event],
            ),
          ),
        ),
      );

      await tester.pump();

      expect(find.byType(EventFocusList), findsOneWidget);
      expect(find.text(event.title), findsOneWidget);
      expect(find.text('Dashboard unavailable'), findsNothing);
    });

    testWidgets('renders the catch window before booked events', (
      tester,
    ) async {
      final now = DateTime.now();
      final joinedOrganizerIds = ['club-1'];
      final user = buildUser();
      final nextEvent = buildEvent(
        id: 'next-event',
        bookedCount: 1,
        startTime: now.add(const Duration(hours: 3)),
      );
      final swipeRun = buildEvent(
        id: 'swipe-event',
        checkedInCount: 1,
        startTime: now.subtract(const Duration(hours: 4)),
        endTime: now.subtract(const Duration(hours: 2)),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchAttendedEventsProvider(
              user.uid,
            ).overrideWithValue(AsyncData<List<Event>>([swipeRun])),
            ..._dashboardHostOverrides(user),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: _DashboardFullTestShell(
              user: user,
              followedOrganizerIds: joinedOrganizerIds,
              signedUpEvents: [nextEvent],
            ),
          ),
        ),
      );

      await _pumpDashboardUi(tester);

      expect(find.text('Event Focus'), findsOneWidget);
      expect(find.textContaining('After the event'), findsOneWidget);
      expect(find.text('Start catching'), findsOneWidget);
      expect(find.byKey(EventFocusList.listKey), findsOneWidget);
      final focusList = tester.widget<EventFocusList>(
        find.byType(EventFocusList),
      );
      expect(focusList.windowedEvents.single.event.id, swipeRun.id);
      expect(focusList.upcomingEvents.map((event) => event.id), [nextEvent.id]);
    });

    testWidgets('shows both open Catch windows without a swipe', (
      tester,
    ) async {
      final now = DateTime.now();
      final user = buildUser();
      final earlier = buildEvent(
        id: 'closing-first',
        name: 'Closing first',
        checkedInCount: 3,
        startTime: now.subtract(const Duration(hours: 8)),
        endTime: now.subtract(const Duration(hours: 6)),
      );
      final later = buildEvent(
        id: 'closing-later',
        name: 'Closing later',
        checkedInCount: 5,
        startTime: now.subtract(const Duration(hours: 4)),
        endTime: now.subtract(const Duration(hours: 2)),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchAttendedEventsProvider(
              user.uid,
            ).overrideWithValue(AsyncData<List<Event>>([later, earlier])),
            ..._dashboardHostOverrides(user),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: _DashboardFullTestShell(
              user: user,
              followedOrganizerIds: const [],
              signedUpEvents: const [],
            ),
          ),
        ),
      );

      await _pumpDashboardUi(tester);
      expect(find.text(earlier.title), findsOneWidget);
      expect(find.text(later.title), findsOneWidget);
      expect(
        tester.getTopLeft(find.text(earlier.title)).dy,
        lessThan(tester.getTopLeft(find.text(later.title)).dy),
      );
    });

    testWidgets('uses the display name in the greeting header', (tester) async {
      tester.view.devicePixelRatio = 1.0;
      tester.view.physicalSize = const Size(390, 560);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final now = DateTime(2026, 5, 13, 8);
      final joinedOrganizerIds = ['club-1'];
      final user = buildUser(name: 'Manan Sethi', displayName: 'Subrath');
      final nextEvent = buildEvent(
        id: 'next-event',
        bookedCount: 1,
        startTime: DateTime.now().add(const Duration(hours: 3)),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            dashboardNowProvider.overrideWithValue(now),
            watchAttendedEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Event>>([])),
            exploreRecommendedEventsProvider(
              recommendationsQueryFor(user.uid, joinedOrganizerIds),
            ).overrideWithValue(noRecommendationCandidates),
            eventRepositoryProvider.overrideWithValue(FakeEventRepository()),
            uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
            eventCheckInLocationServiceProvider.overrideWithValue(
              const _FakeEventCheckInLocationService(),
            ),
            ..._dashboardHostOverrides(user),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: _DashboardFullTestShell(
              user: user,
              followedOrganizerIds: joinedOrganizerIds,
              signedUpEvents: [nextEvent],
            ),
          ),
        ),
      );

      await _pumpDashboardUi(tester);

      final greetingFinder = find.text(
        '${dashboardGreeting(_l10n, now)}, Subrath',
      );
      expect(greetingFinder, findsOneWidget);
      expect(
        find.text('${dashboardGreeting(_l10n, now)}, Manan'),
        findsNothing,
      );
      expect(find.text('WEDNESDAY · MUMBAI'), findsNothing);

      expect(find.byType(DashboardFullSliverBody), findsOneWidget);
    });

    testWidgets('does not render a profile shortcut in the dashboard header', (
      tester,
    ) async {
      final joinedOrganizerIds = ['club-1'];
      final user = buildUser(name: 'Suvrat Garg').copyWith(
        profilePhotos: [
          ProfilePhoto.uploaded(
            position: 0,
            url: 'https://example.test/full-profile.jpg',
            storagePath: 'test-profiles/runner-1/0.jpg',
            now: DateTime(2026),
          ).copyWith(thumbnailUrl: 'https://example.test/profile-thumb.jpg'),
        ],
      );
      final nextEvent = buildEvent(
        id: 'next-event',
        bookedCount: 1,
        startTime: DateTime.now().add(const Duration(hours: 3)),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchAttendedEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Event>>([])),
            exploreRecommendedEventsProvider(
              recommendationsQueryFor(user.uid, joinedOrganizerIds),
            ).overrideWithValue(noRecommendationCandidates),
            ..._dashboardHostOverrides(user),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: _DashboardFullTestShell(
              user: user,
              followedOrganizerIds: joinedOrganizerIds,
              signedUpEvents: [nextEvent],
            ),
          ),
        ),
      );

      await _pumpDashboardUi(tester);

      expect(find.byTooltip('Open profile'), findsNothing);
      expect(find.bySemanticsLabel('Open profile'), findsNothing);
    });

    testWidgets('shows self check-in as the first dashboard content card', (
      tester,
    ) async {
      final now = DateTime.now();
      final user = buildUser();
      final event = buildEvent(
        id: 'check-in-event',
        bookedCount: 1,
        startTime: now.add(const Duration(minutes: 5)),
      );
      final events = FakeEventRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchAttendedEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Event>>([])),
            exploreRecommendedEventsProvider(
              recommendationsQueryFor(user.uid, const []),
            ).overrideWithValue(noRecommendationCandidates),
            eventRepositoryProvider.overrideWithValue(events),
            eventSuccessRepositoryProvider.overrideWithValue(
              _FakeEventSuccessRepository(),
            ),
            uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
            eventCheckInLocationServiceProvider.overrideWithValue(
              const _FakeEventCheckInLocationService(),
            ),
            dashboardNowProvider.overrideWithValue(now),
            ..._dashboardHostOverrides(user),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: _DashboardFullTestShell(
              user: user,
              followedOrganizerIds: const [],
              signedUpEvents: [event],
            ),
          ),
        ),
      );

      await _pumpDashboardUi(tester);

      expect(find.text('Event Focus'), findsOneWidget);
      expect(find.text('Check-in open'), findsOneWidget);
      expect(find.text('Check in'), findsOneWidget);
      expect(find.text('Directions'), findsOneWidget);
      expect(find.textContaining('Next event'), findsNothing);

      await tester.tap(find.text('Check in'));
      await _completeDashboardVenueSessionScan(tester);
      await _pumpDashboardUi(tester);

      expect(events.selfCheckedInVenueSessionToken, 'signed-venue-session');
      expect(find.text('CHECKED IN'), findsOneWidget);
      expect(find.text('Checked in.'), findsOneWidget);
    });

    testWidgets('surfaces self check-in failures inline', (tester) async {
      final now = DateTime.now();
      final user = buildUser();
      final event = buildEvent(
        id: 'check-in-error-event',
        bookedCount: 1,
        startTime: now.add(const Duration(minutes: 5)),
      );
      final events = FakeEventRepository()
        ..selfCheckInError = StateError('Check-in failed');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchAttendedEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Event>>([])),
            exploreRecommendedEventsProvider(
              recommendationsQueryFor(user.uid, const []),
            ).overrideWithValue(noRecommendationCandidates),
            eventRepositoryProvider.overrideWithValue(events),
            eventSuccessRepositoryProvider.overrideWithValue(
              _FakeEventSuccessRepository(),
            ),
            uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
            eventCheckInLocationServiceProvider.overrideWithValue(
              const _FakeEventCheckInLocationService(),
            ),
            dashboardNowProvider.overrideWithValue(now),
            ..._dashboardHostOverrides(user),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: _DashboardFullTestShell(
              user: user,
              followedOrganizerIds: const [],
              signedUpEvents: [event],
            ),
          ),
        ),
      );

      await _pumpDashboardUi(tester);

      await tester.tap(find.text('Check in'));
      await _completeDashboardVenueSessionScan(tester);
      await _pumpDashboardUi(tester);

      expect(
        find.text('Something went wrong. Please try again.'),
        findsWidgets,
      );
      expect(find.text('Try again'), findsOneWidget);
    });

    testWidgets('event focus directions opens the event location externally', (
      tester,
    ) async {
      Uri? launchedUri;
      CalendarEventPayload? calendarEvent;
      final user = buildUser();
      final event = buildEvent(
        id: 'directions-event',
        bookedCount: 1,
        startTime: DateTime.now().add(const Duration(hours: 3)),
        startingPointLat: 22.725848,
        startingPointLng: 75.897401,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchAttendedEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Event>>([])),
            exploreRecommendedEventsProvider(
              recommendationsQueryFor(user.uid, const []),
            ).overrideWithValue(noRecommendationCandidates),
            externalUrlLauncherProvider.overrideWithValue((
              uri, {
              LaunchMode mode = LaunchMode.platformDefault,
            }) async {
              launchedUri = uri;
              return true;
            }),
            nativeCalendarLauncherProvider.overrideWithValue((event) async {
              calendarEvent = event;
              return true;
            }),
            ..._dashboardHostOverrides(user),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: _DashboardFullTestShell(
              user: user,
              followedOrganizerIds: const [],
              signedUpEvents: [event],
            ),
          ),
        ),
      );

      await _pumpDashboardUi(tester);

      await tester.tap(find.text('Directions'));
      await tester.pump();

      expect(launchedUri?.host, 'www.google.com');
      expect(launchedUri?.path, '/maps/dir/');
      expect(
        launchedUri?.queryParameters['destination'],
        '22.725848,75.897401',
      );

      launchedUri = null;
      await tester.tap(find.text('Add to calendar'));
      await tester.pump();

      expect(calendarEvent?.title, event.title);
      expect(calendarEvent?.startTime, event.startTime);
      expect(calendarEvent?.endTime, event.endTime);
    });

    testWidgets(
      'event focus shows full-width cards with a condensed upcoming tail',
      (tester) async {
        final now = DateTime.now();
        final user = buildUser();
        final firstRunStart = now.add(const Duration(days: 1));
        final secondRunStart = now.add(const Duration(days: 2));
        final firstRun = buildEvent(
          id: 'event-focus-first',
          bookedCount: 1,
          startTime: DateTime(
            firstRunStart.year,
            firstRunStart.month,
            firstRunStart.day,
            9,
            10,
          ),
        );
        final secondRun = buildEvent(
          id: 'event-focus-second',
          bookedCount: 1,
          startTime: DateTime(
            secondRunStart.year,
            secondRunStart.month,
            secondRunStart.day,
            9,
            10,
          ),
        );
        final firstRunTitle = firstRun.title;
        final secondRunTitle = secondRun.title;

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              watchAttendedEventsProvider(
                user.uid,
              ).overrideWithValue(const AsyncData<List<Event>>([])),
              exploreRecommendedEventsProvider(
                recommendationsQueryFor(user.uid, const []),
              ).overrideWithValue(noRecommendationCandidates),
              ..._dashboardHostOverrides(user),
            ],
            child: MaterialApp(
              theme: AppTheme.light,
              home: _DashboardFullTestShell(
                user: user,
                followedOrganizerIds: const [],
                signedUpEvents: [firstRun, secondRun],
              ),
            ),
          ),
        );

        await _pumpDashboardUi(tester);

        expect(find.text(firstRunTitle), findsOneWidget);
        expect(find.text(secondRunTitle), findsOneWidget);
        expect(find.byKey(EventFocusList.listKey), findsOneWidget);

        final listWidth = tester
            .getSize(find.byKey(EventFocusList.listKey))
            .width;
        final cardWidth = tester
            .getSize(_runFocusCardSurface(firstRunTitle))
            .width;
        expect(cardWidth, listWidth);
        expect(
          tester.getTopLeft(find.text('Directions').first).dy,
          greaterThan(tester.getTopLeft(find.text('View event').first).dy),
        );
        expect(
          tester.getTopLeft(find.text('Add to calendar').first).dy,
          greaterThan(tester.getTopLeft(find.text('Directions').first).dy),
        );
        expect(
          tester.getTopLeft(find.text(firstRunTitle)).dy,
          lessThan(tester.getTopLeft(find.text(secondRunTitle)).dy),
        );
      },
    );

    testWidgets(
      'event focus combines catching and review for an attended event',
      (tester) async {
        final now = DateTime.now();
        final user = buildUser();
        final attendedRun = buildEvent(
          id: 'attended-event',
          checkedInCount: 2,
          startTime: now.subtract(const Duration(hours: 4)),
          endTime: now.subtract(const Duration(hours: 2)),
        );

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              watchAttendedEventsProvider(
                user.uid,
              ).overrideWithValue(AsyncData<List<Event>>([attendedRun])),
              watchReviewsByUserProvider(
                user.uid,
              ).overrideWithValue(const AsyncData<List<Review>>([])),
              exploreRecommendedEventsProvider(
                recommendationsQueryFor(user.uid, const []),
              ).overrideWithValue(noRecommendationCandidates),
              ..._dashboardHostOverrides(user),
            ],
            child: MaterialApp(
              theme: AppTheme.light,
              home: _DashboardFullTestShell(
                user: user,
                followedOrganizerIds: const [],
                signedUpEvents: const [],
              ),
            ),
          ),
        );

        await _pumpDashboardUi(tester);

        expect(find.text('Event Focus'), findsOneWidget);
        expect(find.textContaining('After the event'), findsOneWidget);
        expect(find.text('Start catching'), findsOneWidget);
        expect(find.text('Write review'), findsOneWidget);
        expect(find.text('Review your event'), findsNothing);
      },
    );
  });
}

Future<void> _completeDashboardVenueSessionScan(WidgetTester tester) async {
  await tester.pump();
  final scanner = tester.widget<EventCheckInQrScanner>(
    find.byType(EventCheckInQrScanner),
  );
  scanner.onResult(
    const EventCheckInQrScan(
      EventCheckInQrScanResult.matchedVenueSession,
      venueSessionToken: 'signed-venue-session',
    ),
  );
}
