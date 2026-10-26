part of 'explore_widgets_test.dart';

void _registerExploreScreenFiltersTests() {
  testWidgets(
    'ClubDetailBody shows host identity without opening a dating profile',
    (tester) async {
      final club = buildClub(
        id: 'club-host-profile',
        hostUserId: 'host-42',
        hostName: 'Asha Shah',
      );
      final router = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            builder: (_, _) => Scaffold(
              body: ClubDetailBody(
                state: ClubDetailBodyState.fromDomain(
                  club: club,
                  userProfile: buildUser(uid: 'runner-1'),
                  uid: 'runner-1',
                  isAuthenticated: true,
                ),
              ),
            ),
          ),
          GoRoute(
            path: '/profiles/:uid',
            name: Routes.publicProfileScreen.name,
            builder: (_, state) => Text(
              'Profile ${state.pathParameters['uid']}',
              textDirection: TextDirection.ltr,
            ),
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp.router(
            theme: AppTheme.light,
            routerConfig: router,
          ),
        ),
      );
      await _pumpClubUi(tester);

      expect(find.text('Host'), findsNothing);
      expect(find.text('Asha Shah'), findsOneWidget);
      expect(find.textContaining('OWNER · EST. JAN 2025'), findsOneWidget);
      expect(find.textContaining('VIEW PROFILE'), findsNothing);
      expect(find.text('Club host'), findsNothing);
      expect(find.text('Hosts events in Bandra'), findsNothing);

      await tester.ensureVisible(find.text('Asha Shah'));
      await _pumpClubUi(tester);

      await tester.tap(find.text('Asha Shah'));
      await _pumpClubUi(tester);

      expect(find.text('Profile host-42'), findsNothing);
    },
  );

  testWidgets('ClubDetailBody shows multiple hosts and messages a host', (
    tester,
  ) async {
    final fakeRepository = FakeClubsRepository()
      ..nextHostConversationMatchId = 'host-inquiry-1';
    final club = buildClub(
      id: 'club-multi-host',
      hostUserId: 'owner-1',
      ownerUserId: 'owner-1',
      hostUserIds: const ['owner-1', 'host-2'],
      hostProfiles: const [
        ClubHostProfile(
          uid: 'owner-1',
          displayName: 'Owner Host',
          role: ClubHostRole.owner,
        ),
        ClubHostProfile(uid: 'host-2', displayName: 'Co Host'),
      ],
    );
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, _) => Scaffold(
            body: ClubDetailBody(
              state: ClubDetailBodyState.fromDomain(
                club: club,
                userProfile: buildSocialReadyUser(),
                uid: 'runner-1',
                isAuthenticated: true,
              ),
              onMessageHost: (buttonContext, host) async {
                final matchId = await fakeRepository.startOrganizerConversation(
                  organizerId: club.id,
                  hostUid: host.uid,
                );
                if (!buttonContext.mounted) return;
                await buttonContext.pushNamed<void>(
                  Routes.chatScreen.name,
                  pathParameters: {'matchId': matchId},
                );
              },
            ),
          ),
        ),
        GoRoute(
          path: '/chat/:matchId',
          name: Routes.chatScreen.name,
          builder: (_, state) => Text(
            'Chat ${state.pathParameters['matchId']}',
            textDirection: TextDirection.ltr,
          ),
        ),
        GoRoute(
          path: '/profiles/:uid',
          name: Routes.publicProfileScreen.name,
          builder: (_, state) => Text(
            'Profile ${state.pathParameters['uid']}',
            textDirection: TextDirection.ltr,
          ),
        ),
      ],
    );
    final container = ProviderContainer(
      overrides: [
        clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
      ],
    );
    addTearDown(container.dispose);
    final uidSubscription = container.listen(
      uidProvider,
      (_, _) {},
      fireImmediately: true,
    );
    addTearDown(uidSubscription.close);
    await container.pump();

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await _pumpClubUi(tester);

    expect(find.text('Owner Host'), findsOneWidget);
    expect(find.text('Co Host'), findsOneWidget);
    expect(find.textContaining('OWNER · '), findsOneWidget);
    expect(find.textContaining('HOST · '), findsOneWidget);

    await tester.ensureVisible(find.text('Co Host'));
    await _pumpClubUi(tester);

    expect(find.byTooltip('Message host'), findsNWidgets(2));

    await tester.tap(
      find.byKey(const ValueKey<String>('club-host-message-host-2')),
    );
    await _pumpClubUi(tester);

    expect(fakeRepository.startedConversationClubId, club.id);
    expect(fakeRepository.startedConversationHostUid, 'host-2');
    expect(find.text('Chat host-inquiry-1'), findsOneWidget);
  });

  testWidgets(
    'ClubDetailBody owner does not see host team management actions',
    (tester) async {
      AppConfig.configureEntrypointRole(AppRole.host);
      final club = buildClub(
        id: 'club-owner-hosts',
        hostUserId: 'owner-1',
        ownerUserId: 'owner-1',
        hostUserIds: const ['owner-1', 'host-2'],
        hostProfiles: const [
          ClubHostProfile(
            uid: 'owner-1',
            displayName: 'Owner Host',
            role: ClubHostRole.owner,
          ),
          ClubHostProfile(uid: 'host-2', displayName: 'Co Host'),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('owner-1')),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: ClubDetailBody(
                state: ClubDetailBodyState.fromDomain(
                  club: club,
                  userProfile: buildUser(uid: 'owner-1'),
                  uid: 'owner-1',
                  isHost: true,
                  isMember: true,
                  isAuthenticated: true,
                  appRole: AppRole.host,
                ),
              ),
            ),
          ),
        ),
      );
      await _pumpClubUi(tester);

      expect(find.text('Host team'), findsNothing);
      expect(find.byTooltip('Add host'), findsNothing);
      expect(find.byTooltip('Host actions'), findsNothing);
      expect(find.text('Transfer ownership'), findsNothing);
      expect(find.text('Remove host'), findsNothing);

      await tester.drag(find.byType(CustomScrollView), const Offset(0, -700));
      await _pumpClubUi(tester);
      expect(
        find.text('Publish an event when this club is ready to meet.'),
        findsNothing,
      );
      expect(
        find.text(
          'Future events will appear here once the host publishes one.',
        ),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'ClubDetailBody keeps club review aggregate read-only below schedule',
    (tester) async {
      final club = buildClub(id: 'club-reviews');
      final reviews = [
        buildReview(comment: 'Most recent.'),
        buildReview(id: 'review-2', comment: 'Second recent.'),
        buildReview(id: 'review-3', comment: 'Third recent.'),
        buildReview(id: 'review-4', comment: 'Fourth hidden.'),
      ];

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: ClubDetailBody(
                state: ClubDetailBodyState.fromDomain(
                  club: club,
                  reviews: reviews,
                  userProfile: buildUser(uid: 'runner-1'),
                  uid: 'runner-1',
                  isMember: true,
                  isAuthenticated: true,
                ),
              ),
            ),
          ),
        ),
      );
      await _pumpClubUi(tester);

      final detailGroup = tester.widget<SliverMainAxisGroup>(
        find.descendant(
          of: find.byType(ClubDetailBody),
          matching: find.byType(SliverMainAxisGroup),
        ),
      );
      expect(detailGroup.children[2], isA<ClubScheduleSection>());
      expect(detailGroup.children[3], isA<CatchSectionList>());
      final trailingSections = detailGroup.children[3] as CatchSectionList;
      for (
        var i = 0;
        i < 12 && find.text('Most recent.').evaluate().isEmpty;
        i++
      ) {
        await tester.drag(find.byType(CustomScrollView), const Offset(0, -400));
        await _pumpClubUi(tester);
      }

      expect(
        tester
            .widgetList<CatchSection>(
              find.descendant(
                of: find.byWidget(trailingSections),
                matching: find.byType(CatchSection),
              ),
            )
            .map((section) => section.title),
        contains('Reviews'),
      );

      expect(find.text('Most recent.'), findsOneWidget);
      expect(find.text('Second recent.'), findsOneWidget);
      expect(find.text('Third recent.'), findsOneWidget);
      expect(find.text('Fourth hidden.'), findsNothing);
      expect(find.text('Write a review'), findsNothing);
      expect(find.text('Edit your review'), findsNothing);
    },
  );

  testWidgets('ClubDetailBody agenda taps navigate to the selected event', (
    tester,
  ) async {
    final club = buildClub(id: 'club-schedule');
    final today = DateTime.now();
    final event = buildEvent(
      id: 'event-42',
      clubId: club.id,
      startTime: DateTime(today.year, today.month, today.day, 8),
      endTime: DateTime(today.year, today.month, today.day, 9),
    );
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, _) => Scaffold(
            body: ClubDetailBody(
              state: ClubDetailBodyState.fromDomain(
                club: club,
                upcomingEvents: [event],
                userProfile: buildUser(uid: 'runner-1'),
                uid: 'runner-1',
                isMember: true,
                isAuthenticated: true,
              ),
              onEventSelected: (selectedEvent) => unawaited(
                context.pushNamed<void>(
                  Routes.eventDetailScreen.name,
                  pathParameters: {
                    'clubId': club.id,
                    'eventId': selectedEvent.id,
                  },
                ),
              ),
            ),
          ),
        ),
        GoRoute(
          path: '/events/:clubId/:eventId',
          name: Routes.eventDetailScreen.name,
          builder: (_, state) => Text(
            'Event ${state.pathParameters['eventId']}',
            textDirection: TextDirection.ltr,
          ),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await _pumpClubUi(tester);

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -900));
    await _pumpClubUi(tester);

    await tester.tap(
      find.byKey(const ValueKey<String>('club-schedule-event-event-42')),
    );
    await _pumpClubUi(tester);

    expect(find.text('Event event-42'), findsOneWidget);
  });

  testWidgets('ExploreScreen renders a navigable guest club directory', (
    tester,
  ) async {
    final club = buildClub(id: 'club-99', name: 'Pace Social');

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          watchClubsByLocationProvider(
            club.location,
          ).overrideWith((ref) => Stream.value([club])),
          _emptyExploreFeedOverride,
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await _pumpClubUi(tester);

    expect(find.byTooltip('Saved events'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('explore-filter-button')));
    await _pumpClubUi(tester);
    expect(find.byKey(const ValueKey('explore-filter-joined')), findsNothing);
    Navigator.of(tester.element(find.byType(ExploreFilterSheet))).pop();
    await _pumpClubUi(tester);

    expect(find.text('Your organizers'), findsNothing);
    for (
      var index = 0;
      index < 8 && find.text('Organizer directory').evaluate().isEmpty;
      index += 1
    ) {
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -350));
      await _pumpClubUi(tester);
    }

    expect(find.text('Organizer directory'), findsOneWidget);
    expect(find.text('Pace Social'), findsWidgets);
    expect(find.byType(ClubCard), findsOneWidget);
    await tester.drag(find.byType(CustomScrollView), const Offset(0, -280));
    await _pumpClubUi(tester);
    expect(_catchButtonWithLabel('Follow'), findsOneWidget);
  });

  testWidgets('ExploreScreen hides account controls while auth resolves', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          uidProvider.overrideWithValue(const AsyncLoading<String?>()),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
          exploreSourceClubsProvider.overrideWithValue(
            const AsyncData(<Club>[]),
          ),
          exploreClubsViewModelProvider.overrideWithValue(
            const AsyncData(ExploreViewModel(joinedClubs: [], allClubs: [])),
          ),
          exploreRecommendationsProvider.overrideWithValue(
            const AsyncData(<ExploreEventRecommendation>[]),
          ),
          _emptyExploreFeedOverride,
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await _pumpClubUi(tester);

    expect(find.byTooltip('Saved events'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('explore-filter-button')));
    await _pumpClubUi(tester);
    expect(find.byKey(const ValueKey('explore-filter-joined')), findsNothing);
  });

  testWidgets('ExploreScreen shows account controls after sign-in resolves', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
          exploreSourceClubsProvider.overrideWithValue(
            const AsyncData(<Club>[]),
          ),
          exploreClubsViewModelProvider.overrideWithValue(
            const AsyncData(ExploreViewModel(joinedClubs: [], allClubs: [])),
          ),
          exploreRecommendationsProvider.overrideWithValue(
            const AsyncData(<ExploreEventRecommendation>[]),
          ),
          _emptyExploreFeedOverride,
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await _pumpClubUi(tester);

    expect(find.byTooltip('Saved events'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('explore-filter-button')));
    await _pumpClubUi(tester);
    expect(find.byKey(const ValueKey('explore-filter-joined')), findsOneWidget);
  });

  testWidgets('ExploreScreen shows skeleton cards while loading', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          watchClubsByLocationProvider(
            'mumbai',
          ).overrideWith((ref) => Stream.value(const [])),
          exploreClubsViewModelProvider.overrideWithValue(const AsyncLoading()),
          _emptyExploreFeedOverride,
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await tester.pump();

    // Loading sheet renders a 3-card skeleton column inside the sheet,
    // not the old multi-piece per-card skeleton. The exact count is a
    // visual choice; assert "at least one" so future tightening doesn't
    // re-break the test.
    expect(find.byType(CatchSkeleton), findsAtLeastNWidgets(1));
    expect(find.byType(RefreshIndicator), findsOneWidget);
    expect(_topLevelSearchField(), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
  });

  testWidgets('ExploreScreen revalidates when its shell tab is re-entered', (
    tester,
  ) async {
    var activeIndex = appShellClubsTabIndex;
    var feedBuilds = 0;
    late StateSetter setShellState;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          exploreSourceClubsProvider.overrideWithValue(
            const AsyncData(<Club>[]),
          ),
          exploreClubsViewModelProvider.overrideWithValue(
            const AsyncData(ExploreViewModel(joinedClubs: [], allClubs: [])),
          ),
          exploreFeedViewModelProvider.overrideWith((ref) {
            feedBuilds += 1;
            return const AsyncData(ExploreFeedViewModel(items: []));
          }),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: StatefulBuilder(
            builder: (context, setState) {
              setShellState = setState;
              return CatchTabViewportScope(
                index: activeIndex,
                child: const ExploreScreen(),
              );
            },
          ),
        ),
      ),
    );
    await tester.pump();
    final initialBuilds = feedBuilds;

    setShellState(() => activeIndex = appShellHomeTabIndex);
    await tester.pump();
    setShellState(() => activeIndex = appShellClubsTabIndex);
    await tester.pump();
    await pumpFeatureUi(tester);

    expect(feedBuilds, greaterThan(initialBuilds));
  });

  testWidgets('ExploreScreen pull-to-refresh revalidates the feed', (
    tester,
  ) async {
    var feedBuilds = 0;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          exploreSourceClubsProvider.overrideWithValue(
            const AsyncData(<Club>[]),
          ),
          exploreClubsViewModelProvider.overrideWithValue(
            const AsyncData(ExploreViewModel(joinedClubs: [], allClubs: [])),
          ),
          exploreFeedViewModelProvider.overrideWith((ref) {
            feedBuilds += 1;
            return const AsyncData(ExploreFeedViewModel(items: []));
          }),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await tester.pump();
    final initialBuilds = feedBuilds;

    unawaited(
      tester.state<RefreshIndicatorState>(find.byType(RefreshIndicator)).show(),
    );
    await pumpFeatureUi(tester);

    expect(feedBuilds, greaterThan(initialBuilds));
  });

  testWidgets(
    'ExploreScreen keeps search reachable when the selected city is empty',
    (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            cityListProvider.overrideWith((ref) async => _testCities),
            deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
            watchClubsByLocationProvider(
              'mumbai',
            ).overrideWith((ref) => Stream.value(const [])),
            exploreClubsViewModelProvider.overrideWithValue(
              const AsyncData(ExploreViewModel(joinedClubs: [], allClubs: [])),
            ),
            _emptyExploreFeedOverride,
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const ExploreScreen(),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(ExploreCityPicker), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(ExploreCityPicker),
          matching: find.byIcon(CatchIcons.location),
        ),
        findsOneWidget,
      );
      expect(_topLevelSearchField(), findsOneWidget);
      expect(find.byType(TextField), findsNothing);
      expect(find.text('No organizers in Mumbai yet'), findsOneWidget);
      expect(find.text('Change city'), findsOneWidget);

      await tester.tap(find.text('Change city'));
      await _pumpClubUi(tester);
      expect(find.text('City'), findsOneWidget);
      expect(find.text('Delhi'), findsOneWidget);
      await tester.tap(find.text('Delhi'));
      await _pumpClubUi(tester);
      expect(
        ProviderScope.containerOf(
          tester.element(find.byType(ExploreScreen)),
        ).read(selectedExploreCityProvider).label,
        'Delhi',
      );

      await tester.tap(find.byTooltip('Search events or organizers'));
      await tester.pump();
      final midSearchMorphFrame = Duration(
        milliseconds: CatchMotion.base.inMilliseconds ~/ 2,
      );
      await tester.pump(midSearchMorphFrame);

      final morphingSearchWidth = tester.getSize(_topLevelSearchField()).width;
      expect(morphingSearchWidth, greaterThan(CatchIconAction.navSize));

      await _pumpClubUi(tester);

      final expandedSearchWidth = tester.getSize(_topLevelSearchField()).width;
      expect(expandedSearchWidth, greaterThanOrEqualTo(morphingSearchWidth));
      expect(_topLevelSearchField(), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
    },
  );

  testWidgets('ExploreScreen empty state clears search and filters', (
    tester,
  ) async {
    final sourceClub = buildClub(id: 'source-club', name: 'Bandra Pacers');
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        cityListProvider.overrideWith((ref) async => _testCities),
        deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
        exploreSourceClubsProvider.overrideWithValue(AsyncData([sourceClub])),
        exploreClubsViewModelProvider.overrideWithValue(
          const AsyncData(ExploreViewModel(joinedClubs: [], allClubs: [])),
        ),
        _emptyExploreFeedOverride,
      ],
    );
    addTearDown(container.dispose);
    container.read(exploreSearchQueryProvider.notifier).setQuery('tempo');
    container.read(exploreFiltersProvider.notifier).toggleHighRatedOnly();

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await tester.pump();

    expect(find.text('No organizers match this search'), findsOneWidget);
    await tester.tap(find.text('Clear search and filters'));
    await tester.pump();

    expect(container.read(exploreSearchQueryProvider), isEmpty);
    expect(container.read(exploreFiltersProvider).hasActiveFilters, false);
  });

  testWidgets(
    'ExploreScreen keeps the featured event in the feed during search',
    (tester) async {
      final club = buildClub(id: 'search-cover-club', name: 'Search Social');
      final event = event_test.buildEvent(
        id: 'search-cover-event',
        clubId: club.id,
        startTime: DateTime.now().add(const Duration(hours: 3)),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            cityListProvider.overrideWith((ref) async => _testCities),
            deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
            uidProvider.overrideWith((ref) => Stream.value(null)),
            exploreSourceClubsProvider.overrideWithValue(
              const AsyncData(<Club>[]),
            ),
            exploreClubsViewModelProvider.overrideWithValue(
              const AsyncData(ExploreViewModel(joinedClubs: [], allClubs: [])),
            ),
            exploreFeedViewModelProvider.overrideWithValue(
              AsyncData(
                ExploreFeedViewModel(
                  featuredEventId: event.id,
                  items: [
                    ExploreEventItem(
                      event: event,
                      club: club,
                      status: EventTileStatus.open,
                    ),
                  ],
                ),
              ),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const ExploreScreen(),
          ),
        ),
      );
      await _pumpClubUi(tester);

      expect(find.byType(FeaturedEventPoster), findsOneWidget);
      expect(find.byType(EventDateRailCard), findsOneWidget);
      expect(find.textContaining('1 PLAN'), findsOneWidget);

      await tester.tap(find.byTooltip('Search events or organizers'));
      await tester.pump(CatchMotion.base);
      await tester.pump();

      expect(find.byType(FeaturedEventPoster), findsNothing);
      expect(find.byType(EventDateRailCard), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(EventDateRailCard),
          matching: find.text('Social run'),
        ),
        findsOneWidget,
      );
      expect(find.textContaining('1 PLAN'), findsOneWidget);

      await tester.tap(find.byTooltip('Close search'));
      await tester.pump(CatchMotion.base);
      await tester.pump();

      expect(find.byType(FeaturedEventPoster), findsOneWidget);
      expect(find.byType(EventDateRailCard), findsOneWidget);
    },
  );

  testWidgets('ExploreScreen renders internal feed when clubs are empty', (
    tester,
  ) async {
    final club = buildClub(id: 'club-event-only', name: 'Pace Social');
    final event = event_test.buildEvent(
      id: 'event-only',
      clubId: club.id,
      startingPointLat: 19.06,
      startingPointLng: 72.83,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          exploreSourceClubsProvider.overrideWithValue(
            const AsyncData(<Club>[]),
          ),
          exploreClubsViewModelProvider.overrideWithValue(
            const AsyncData(ExploreViewModel(joinedClubs: [], allClubs: [])),
          ),
          exploreFeedViewModelProvider.overrideWithValue(
            AsyncData(
              ExploreFeedViewModel(
                featuredEventId: event.id,
                items: [
                  ExploreEventItem(
                    event: event,
                    club: club,
                    availability: resolveViewerEventAvailability(
                      event: event,
                      userProfile: null,
                      now: DateTime.now(),
                    ),
                    status: EventTileStatus.open,
                  ),
                ],
              ),
            ),
          ),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await _pumpClubUi(tester);

    expect(find.text(event.title), findsWidgets);
    expect(find.byType(FeaturedEventPoster), findsOneWidget);
    expect(find.text('Map'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byWidgetPredicate(
          (widget) => widget is CatchButton && widget.count != null,
        ),
        matching: find.text('1'),
      ),
      findsOneWidget,
    );
    expect(find.text('No organizers in Mumbai yet'), findsNothing);
  });
}
