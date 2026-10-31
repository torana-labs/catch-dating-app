part of 'explore_widgets_test.dart';

void _registerExploreScreenFiltersTests() {
  testWidgets(
    'OrganizerDetailBody shows host identity without opening a dating profile',
    (tester) async {
      final organizer = buildOrganizer(
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
              body: OrganizerDetailBody(
                state: OrganizerDetailBodyState.fromDomain(
                  organizer: organizer,
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
      await _pumpOrganizerUi(tester);

      expect(find.text('Host'), findsNothing);
      expect(find.text('Asha Shah'), findsOneWidget);
      expect(find.textContaining('OWNER · EST. JAN 2025'), findsOneWidget);
      expect(find.textContaining('VIEW PROFILE'), findsNothing);
      expect(find.text('Club host'), findsNothing);
      expect(find.text('Hosts events in Bandra'), findsNothing);

      await tester.ensureVisible(find.text('Asha Shah'));
      await _pumpOrganizerUi(tester);

      await tester.tap(find.text('Asha Shah'));
      await _pumpOrganizerUi(tester);

      expect(find.text('Profile host-42'), findsNothing);
    },
  );

  testWidgets('OrganizerDetailBody shows multiple hosts and messages a host', (
    tester,
  ) async {
    final fakeRepository = FakeOrganizersRepository()
      ..nextHostConversationMatchId = 'host-inquiry-1';
    final organizer = buildOrganizer(
      id: 'club-multi-host',
      hostUserId: 'owner-1',
      ownerUserId: 'owner-1',
      hostUserIds: const ['owner-1', 'host-2'],
      hostProfiles: const [
        OrganizerHostProfile(
          uid: 'owner-1',
          displayName: 'Owner Host',
          role: OrganizerHostRole.owner,
        ),
        OrganizerHostProfile(uid: 'host-2', displayName: 'Co Host'),
      ],
    );
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, _) => Scaffold(
            body: OrganizerDetailBody(
              state: OrganizerDetailBodyState.fromDomain(
                organizer: organizer,
                userProfile: buildSocialReadyUser(),
                uid: 'runner-1',
                isAuthenticated: true,
              ),
              onMessageHost: (buttonContext, host) async {
                final matchId = await fakeRepository.startOrganizerConversation(
                  organizerId: organizer.id,
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
        organizersRepositoryProvider.overrideWith((ref) => fakeRepository),
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        // A signed-in guest sees the organizer's membership plans.
        watchPublishedHostMembershipPlansProvider.overrideWith(
          (ref, _) => Stream.value(const []),
        ),
        watchMyHostMembershipsProvider.overrideWith(
          (ref, _) => Stream.value(const []),
        ),
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
    await _pumpOrganizerUi(tester);

    expect(find.text('Owner Host'), findsOneWidget);
    expect(find.text('Co Host'), findsOneWidget);
    expect(find.textContaining('OWNER · '), findsOneWidget);
    expect(find.textContaining('HOST · '), findsOneWidget);

    await tester.ensureVisible(find.text('Co Host'));
    await _pumpOrganizerUi(tester);

    expect(find.byTooltip('Message host'), findsNWidgets(2));

    await tester.tap(
      find.byKey(const ValueKey<String>('club-host-message-host-2')),
    );
    await _pumpOrganizerUi(tester);

    expect(fakeRepository.startedConversationOrganizerId, organizer.id);
    expect(fakeRepository.startedConversationHostUid, 'host-2');
    expect(find.text('Chat host-inquiry-1'), findsOneWidget);
  });

  testWidgets(
    'OrganizerDetailBody owner does not see host team management actions',
    (tester) async {
      AppConfig.configureEntrypointRole(AppRole.host);
      final organizer = buildOrganizer(
        id: 'club-owner-hosts',
        hostUserId: 'owner-1',
        ownerUserId: 'owner-1',
        hostUserIds: const ['owner-1', 'host-2'],
        hostProfiles: const [
          OrganizerHostProfile(
            uid: 'owner-1',
            displayName: 'Owner Host',
            role: OrganizerHostRole.owner,
          ),
          OrganizerHostProfile(uid: 'host-2', displayName: 'Co Host'),
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
              body: OrganizerDetailBody(
                state: OrganizerDetailBodyState.fromDomain(
                  organizer: organizer,
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
      await _pumpOrganizerUi(tester);

      expect(find.text('Host team'), findsNothing);
      expect(find.byTooltip('Add host'), findsNothing);
      expect(find.byTooltip('Host actions'), findsNothing);
      expect(find.text('Transfer ownership'), findsNothing);
      expect(find.text('Remove host'), findsNothing);

      await tester.drag(find.byType(CustomScrollView), const Offset(0, -700));
      await _pumpOrganizerUi(tester);
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
    'OrganizerDetailBody keeps club review aggregate read-only below schedule',
    (tester) async {
      final organizer = buildOrganizer(id: 'club-reviews');
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
              body: OrganizerDetailBody(
                state: OrganizerDetailBodyState.fromDomain(
                  organizer: organizer,
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
      await _pumpOrganizerUi(tester);

      final detailGroup = tester.widget<SliverMainAxisGroup>(
        find.descendant(
          of: find.byType(OrganizerDetailBody),
          matching: find.byType(SliverMainAxisGroup),
        ),
      );
      expect(detailGroup.children[2], isA<OrganizerScheduleSection>());
      expect(detailGroup.children[3], isA<CatchSectionList>());
      final trailingSections = detailGroup.children[3] as CatchSectionList;
      for (
        var i = 0;
        i < 12 && find.text('Most recent.').evaluate().isEmpty;
        i++
      ) {
        await tester.drag(find.byType(CustomScrollView), const Offset(0, -400));
        await _pumpOrganizerUi(tester);
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

  testWidgets(
    'OrganizerDetailBody agenda taps navigate to the selected event',
    (tester) async {
      final organizer = buildOrganizer(id: 'club-schedule');
      final today = DateTime.now();
      final event = buildEvent(
        id: 'event-42',
        clubId: organizer.id,
        startTime: DateTime(today.year, today.month, today.day, 8),
        endTime: DateTime(today.year, today.month, today.day, 9),
      );
      final router = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            builder: (context, _) => Scaffold(
              body: OrganizerDetailBody(
                state: OrganizerDetailBodyState.fromDomain(
                  organizer: organizer,
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
                      'organizerId': organizer.id,
                      'eventId': selectedEvent.id,
                    },
                  ),
                ),
              ),
            ),
          ),
          GoRoute(
            path: '/events/:organizerId/:eventId',
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
          child: MaterialApp.router(
            theme: AppTheme.light,
            routerConfig: router,
          ),
        ),
      );
      await _pumpOrganizerUi(tester);

      await tester.drag(find.byType(CustomScrollView), const Offset(0, -900));
      await _pumpOrganizerUi(tester);

      await tester.tap(
        find.byKey(const ValueKey<String>('club-schedule-event-event-42')),
      );
      await _pumpOrganizerUi(tester);

      expect(find.text('Event event-42'), findsOneWidget);
    },
  );

  testWidgets('ExploreScreen renders a navigable guest club directory', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'club-99', name: 'Pace Social');

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          watchOrganizersByLocationProvider(
            organizer.location,
          ).overrideWith((ref) => Stream.value([organizer])),
          _emptyExploreFeedOverride,
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await _pumpOrganizerUi(tester);

    expect(find.byTooltip('Saved events'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('explore-filter-button')));
    await _pumpOrganizerUi(tester);
    expect(find.byKey(const ValueKey('explore-filter-joined')), findsNothing);
    Navigator.of(tester.element(find.byType(ExploreFilterSheet))).pop();
    await _pumpOrganizerUi(tester);

    expect(find.text('Your organizers'), findsNothing);
    for (
      var index = 0;
      index < 8 && find.text('Organizer directory').evaluate().isEmpty;
      index += 1
    ) {
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -350));
      await _pumpOrganizerUi(tester);
    }

    expect(find.text('Organizer directory'), findsOneWidget);
    expect(find.text('Pace Social'), findsWidgets);
    expect(find.byType(OrganizerCard), findsOneWidget);
    await tester.drag(find.byType(CustomScrollView), const Offset(0, -280));
    await _pumpOrganizerUi(tester);
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
          exploreSourceOrganizersProvider.overrideWithValue(
            const AsyncData(<Organizer>[]),
          ),
          exploreOrganizersViewModelProvider.overrideWithValue(
            const AsyncData(
              ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
            ),
          ),
          exploreRecommendationsProvider.overrideWithValue(
            const AsyncData(<ExploreEventRecommendation>[]),
          ),
          _emptyExploreFeedOverride,
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await _pumpOrganizerUi(tester);

    expect(find.byTooltip('Saved events'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('explore-filter-button')));
    await _pumpOrganizerUi(tester);
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
          exploreSourceOrganizersProvider.overrideWithValue(
            const AsyncData(<Organizer>[]),
          ),
          exploreOrganizersViewModelProvider.overrideWithValue(
            const AsyncData(
              ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
            ),
          ),
          exploreRecommendationsProvider.overrideWithValue(
            const AsyncData(<ExploreEventRecommendation>[]),
          ),
          _emptyExploreFeedOverride,
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await _pumpOrganizerUi(tester);

    expect(find.byTooltip('Saved events'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('explore-filter-button')));
    await _pumpOrganizerUi(tester);
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
          watchOrganizersByLocationProvider(
            'mumbai',
          ).overrideWith((ref) => Stream.value(const [])),
          exploreOrganizersViewModelProvider.overrideWithValue(
            const AsyncLoading(),
          ),
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
    var activeIndex = appShellOrganizersTabIndex;
    var feedBuilds = 0;
    late StateSetter setShellState;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          exploreSourceOrganizersProvider.overrideWithValue(
            const AsyncData(<Organizer>[]),
          ),
          exploreOrganizersViewModelProvider.overrideWithValue(
            const AsyncData(
              ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
            ),
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
    setShellState(() => activeIndex = appShellOrganizersTabIndex);
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
          exploreSourceOrganizersProvider.overrideWithValue(
            const AsyncData(<Organizer>[]),
          ),
          exploreOrganizersViewModelProvider.overrideWithValue(
            const AsyncData(
              ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
            ),
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
            watchOrganizersByLocationProvider(
              'mumbai',
            ).overrideWith((ref) => Stream.value(const [])),
            exploreOrganizersViewModelProvider.overrideWithValue(
              const AsyncData(
                ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
              ),
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
      await _pumpOrganizerUi(tester);
      expect(find.text('City'), findsOneWidget);
      expect(find.text('Delhi'), findsOneWidget);
      await tester.tap(find.text('Delhi'));
      await _pumpOrganizerUi(tester);
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

      await _pumpOrganizerUi(tester);

      final expandedSearchWidth = tester.getSize(_topLevelSearchField()).width;
      expect(expandedSearchWidth, greaterThanOrEqualTo(morphingSearchWidth));
      expect(_topLevelSearchField(), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
    },
  );

  testWidgets('ExploreScreen empty state clears search and filters', (
    tester,
  ) async {
    final sourceOrganizer = buildOrganizer(
      id: 'source-club',
      name: 'Bandra Pacers',
    );
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        cityListProvider.overrideWith((ref) async => _testCities),
        deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
        exploreSourceOrganizersProvider.overrideWithValue(
          AsyncData([sourceOrganizer]),
        ),
        exploreOrganizersViewModelProvider.overrideWithValue(
          const AsyncData(
            ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
          ),
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
      final organizer = buildOrganizer(
        id: 'search-cover-club',
        name: 'Search Social',
      );
      final event = event_test.buildEvent(
        id: 'search-cover-event',
        clubId: organizer.id,
        startTime: DateTime.now().add(const Duration(hours: 3)),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            cityListProvider.overrideWith((ref) async => _testCities),
            deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
            uidProvider.overrideWith((ref) => Stream.value(null)),
            exploreSourceOrganizersProvider.overrideWithValue(
              const AsyncData(<Organizer>[]),
            ),
            exploreOrganizersViewModelProvider.overrideWithValue(
              const AsyncData(
                ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
              ),
            ),
            exploreFeedViewModelProvider.overrideWithValue(
              AsyncData(
                ExploreFeedViewModel(
                  featuredEventId: event.id,
                  items: [
                    ExploreEventItem(
                      event: event,
                      organizer: organizer,
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
      await _pumpOrganizerUi(tester);

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
    final organizer = buildOrganizer(
      id: 'club-event-only',
      name: 'Pace Social',
    );
    final event = event_test.buildEvent(
      id: 'event-only',
      clubId: organizer.id,
      startingPointLat: 19.06,
      startingPointLng: 72.83,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          exploreSourceOrganizersProvider.overrideWithValue(
            const AsyncData(<Organizer>[]),
          ),
          exploreOrganizersViewModelProvider.overrideWithValue(
            const AsyncData(
              ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
            ),
          ),
          exploreFeedViewModelProvider.overrideWithValue(
            AsyncData(
              ExploreFeedViewModel(
                featuredEventId: event.id,
                items: [
                  ExploreEventItem(
                    event: event,
                    organizer: organizer,
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
    await _pumpOrganizerUi(tester);

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
