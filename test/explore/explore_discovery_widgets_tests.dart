part of 'explore_widgets_test.dart';

void _registerExploreDiscoveryWidgetsTests() {
  testWidgets('CatchPoster uses title and arrow defaults', (tester) async {
    await pumpTestApp(
      tester,
      CatchPoster(
        media: const ColoredBox(color: Colors.black),
        kicker: 'CLUB TO KNOW',
        title: 'Neighbourhood Club',
        onTap: () {},
      ),
    );

    final title = tester.widget<Text>(find.text('Neighbourhood Club'));
    final titleContext = tester.element(find.text('Neighbourhood Club'));
    expect(
      title.style?.fontSize,
      CatchTextStyles.displayXs(titleContext).fontSize,
    );
    expect(title.style?.fontStyle, isNot(FontStyle.italic));
    expect(find.byIcon(CatchIcons.forwardArrow), findsOneWidget);

    await pumpTestApp(
      tester,
      const CatchPoster(
        media: ColoredBox(color: Colors.black),
        kicker: 'CLUB TO KNOW',
        title: 'Neighbourhood Club',
        showArrow: false,
      ),
    );

    expect(find.byIcon(CatchIcons.forwardArrow), findsNothing);
  });

  testWidgets('ClubsContent renders personal rail and mixed discovery cards', (
    tester,
  ) async {
    await _pumpClubsSlivers(tester, [
      _exploreBodySliverGroup(
        includeClubDirectory: false,
        clubsViewModel: ExploreViewModel(
          joinedClubs: [
            buildClub(id: 'joined-1', nextEventLabel: 'Sat 6:30 AM'),
          ],
          allClubs: [
            buildClub(id: 'joined-1', nextEventLabel: 'Sat 6:30 AM'),
            buildClub(id: 'discover-1'),
          ],
          joinedClubIds: {'joined-1'},
        ),
      ),
    ]);

    expect(find.text('Your organizers'), findsOneWidget);
    expect(find.text('Organizer directory'), findsNothing);
    expect(find.text('You host'), findsNothing);
  });

  testWidgets('Explore body keeps joined rail and club directory together', (
    tester,
  ) async {
    final joinedClub = buildClub(
      id: 'joined-directory-club',
      name: 'Joined Pacers',
      nextEventLabel: 'Sat 6:30 AM',
    );
    final discoverClub = buildClub(
      id: 'discover-directory-club',
      name: 'Discover Social',
    );

    await _pumpClubsSlivers(tester, [
      _exploreBodySliverGroup(
        clubsViewModel: ExploreViewModel(
          joinedClubs: [joinedClub],
          allClubs: [joinedClub, discoverClub],
          joinedClubIds: {joinedClub.id},
        ),
      ),
    ]);

    expect(find.text('Your organizers'), findsOneWidget);
    for (
      var index = 0;
      index < 8 && find.text('Organizer directory').evaluate().isEmpty;
      index += 1
    ) {
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -350));
      await tester.pump();
    }

    expect(find.text('Organizer directory'), findsOneWidget);
  });

  testWidgets('Explore body exposes an honest load-more action', (
    tester,
  ) async {
    final club = buildClub(id: 'cursor-club', name: 'Cursor Club');
    final event = event_test.buildEvent(
      id: 'cursor-event',
      clubId: club.id,
      startTime: DateTime.now().add(const Duration(days: 1)),
    );
    var loadMoreCalls = 0;

    await _pumpClubsSlivers(tester, [
      _exploreBodySliverGroup(
        clubsViewModel: const ExploreViewModel(joinedClubs: [], allClubs: []),
        feedAsync: AsyncData(
          ExploreFeedViewModel(
            items: [ExploreEventItem(event: event, club: club)],
            isExhaustive: false,
          ),
        ),
        onLoadMore: () => loadMoreCalls += 1,
      ),
    ]);

    await tester.scrollUntilVisible(
      find.text('Load more plans'),
      250,
      scrollable: find.descendant(
        of: find.byKey(const ValueKey('explore-test-scroll-view')),
        matching: find.byType(Scrollable),
      ),
    );
    await tester.tap(find.text('Load more plans'));

    expect(loadMoreCalls, 1);
  });

  testWidgets('ExploreEventsSection renders event-first content', (
    tester,
  ) async {
    final club = buildClub(
      id: 'club-event',
      name: 'Pace Social',
      area: 'Necklace Road',
    );
    final referenceNow = DateTime.now();
    // Keep both sparse-market picks on one explicit local calendar day.
    // Relative +2h/+4h fixtures split across UTC midnight on CI.
    final eventDay = DateTime(
      referenceNow.year,
      referenceNow.month,
      referenceNow.day + 1,
    );
    final featuredEvent = event_test.buildEvent(
      id: 'event-featured',
      clubId: club.id,
      startTime: eventDay.add(const Duration(hours: 10)),
      meetingPoint: 'People Plaza',
      bookedCount: 8,
      capacityLimit: 12,
    );
    final bodyEvent = event_test.buildEvent(
      id: 'event-body',
      clubId: club.id,
      startTime: eventDay.add(const Duration(hours: 14)),
      meetingPoint: 'Library steps',
      bookedCount: 8,
      capacityLimit: 12,
      eventFormat: EventFormatSnapshot.custom(
        label: 'board games',
        interactionModel: EventInteractionModel.openFormat,
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CustomScrollView(
            slivers: [
              _exploreEventsSection(
                feedAsync: AsyncData(
                  ExploreFeedViewModel(
                    items: [
                      ExploreEventItem(
                        event: featuredEvent,
                        club: club,
                        availability: resolveViewerEventAvailability(
                          event: featuredEvent,
                          userProfile: null,
                          now: referenceNow,
                        ),
                        status: EventTileStatus.open,
                      ),
                      ExploreEventItem(
                        event: bodyEvent,
                        club: club,
                        availability: resolveViewerEventAvailability(
                          event: bodyEvent,
                          userProfile: null,
                          now: referenceNow,
                        ),
                        status: EventTileStatus.open,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    // Sparse markets should keep the regular Explore feed and skip the
    // weekly strip until there are enough day-level picks to justify it.
    expect(find.text('This week'), findsNothing);
    expect(find.textContaining('COMING UP'), findsNothing);
    expect(find.textContaining('2 PLANS'), findsOneWidget);
    expect(find.byType(FeaturedEventPoster), findsNothing);
    expect(find.text('Social run'), findsOneWidget);
    expect(
      find.textContaining('8 GOING · 4 SPOTS LEFT', findRichText: true),
      findsNWidgets(2),
    );
  });

  testWidgets(
    'Explore mixed feed pins day headers and fuses uninterrupted tickets',
    (tester) async {
      tester.view.physicalSize = const Size(390, 1800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final today = DateUtils.dateOnly(DateTime.now());
      final eventClub = buildClub(id: 'group-event-club');
      final spotlightClub = buildClub(
        id: 'group-spotlight-club',
        name: 'Spotlight Club',
        nextEventLabel: 'Friday',
      );
      final first = event_test.buildEvent(
        id: 'group-first',
        clubId: eventClub.id,
        startTime: today.add(const Duration(hours: 10)),
      );
      final second = event_test.buildEvent(
        id: 'group-second',
        clubId: eventClub.id,
        startTime: today.add(const Duration(hours: 11)),
      );
      final nextDay = event_test.buildEvent(
        id: 'group-next-day',
        clubId: eventClub.id,
        startTime: today.add(const Duration(days: 1, hours: 10)),
      );
      final external =
          _buildExternalExploreEvent(
            id: 'group-external',
            title: 'External Social',
          ).copyWith(
            startTime: today.add(const Duration(hours: 12)),
            endTime: today.add(const Duration(hours: 14)),
          );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CustomScrollView(
              slivers: _exploreEventsSlivers(
                feedAsync: AsyncData(
                  ExploreFeedViewModel(
                    items: [
                      ExploreEventItem(
                        event: first,
                        club: eventClub,
                        status: EventTileStatus.open,
                      ),
                      ExploreEventItem(
                        event: second,
                        club: eventClub,
                        status: EventTileStatus.open,
                      ),
                      ExploreEventItem(
                        event: nextDay,
                        club: eventClub,
                        status: EventTileStatus.open,
                      ),
                    ],
                    externalItems: [ExploreExternalEventItem(event: external)],
                  ),
                ),
                filters: const ExploreFilterSelection(
                  timeFilter: ExploreTimeFilter.anytime,
                ),
                candidateClubs: [spotlightClub],
                now: today,
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is SliverPersistentHeader &&
              widget.delegate is CatchDaySectionHeaderDelegate,
        ),
        findsNWidgets(2),
      );
      expect(find.text('External Social'), findsOneWidget);
      expect(find.text('Spotlight Club'), findsWidgets);
      final tickets = tester
          .widgetList<EventDateRailCard>(find.byType(EventDateRailCard))
          .toList();
      expect(tickets, hasLength(3));
      expect(tickets.map((ticket) => ticket.stripPosition), [
        EventDateRailCardStripPosition.first,
        EventDateRailCardStripPosition.last,
        EventDateRailCardStripPosition.single,
      ]);
    },
  );

  testWidgets('Explore compatibility section uses inline day headers', (
    tester,
  ) async {
    final today = DateUtils.dateOnly(DateTime.now());
    final club = buildClub(id: 'inline-header-club');
    final event = event_test.buildEvent(
      id: 'inline-header-event',
      clubId: club.id,
      startTime: today.add(const Duration(hours: 10)),
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CustomScrollView(
            slivers: _exploreEventsSlivers(
              feedAsync: AsyncData(
                ExploreFeedViewModel(
                  items: [
                    ExploreEventItem(
                      event: event,
                      club: club,
                      status: EventTileStatus.open,
                    ),
                  ],
                ),
              ),
              filters: const ExploreFilterSelection(
                timeFilter: ExploreTimeFilter.anytime,
              ),
              pinnedDayHeaders: false,
              now: today,
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(SliverPersistentHeader), findsNothing);
    expect(find.byType(CatchDaySectionHeader), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('sticky day headers release before trailing Explore lanes', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final today = DateUtils.dateOnly(DateTime.now());
    final eventClub = buildClub(id: 'boundary-event-club');
    final directoryClub = buildClub(
      id: 'boundary-directory-club',
      name: 'Boundary Social',
    );
    final directoryClubs = [
      directoryClub,
      for (var index = 1; index < 10; index += 1)
        buildClub(
          id: 'boundary-directory-club-$index',
          name: 'Boundary Social $index',
        ),
    ];
    final event = event_test.buildEvent(
      id: 'boundary-event',
      clubId: eventClub.id,
      startTime: today.add(const Duration(hours: 10)),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [uidProvider.overrideWith((ref) => Stream.value(null))],
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Builder(
              builder: (context) => CustomScrollView(
                slivers: buildExploreBodySlivers(
                  context: context,
                  feedState: catchAsyncStateFromAsyncValue(
                    AsyncData(
                      ExploreFeedViewModel(
                        items: [
                          ExploreEventItem(
                            event: event,
                            club: eventClub,
                            status: EventTileStatus.open,
                          ),
                        ],
                      ),
                    ),
                  ),
                  clubsViewModel: ExploreViewModel(
                    joinedClubs: const [],
                    allClubs: directoryClubs,
                  ),
                  filters: const ExploreFilterSelection(
                    timeFilter: ExploreTimeFilter.anytime,
                  ),
                  searchQuery: '',
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    final dayHeader = find.byType(CatchDaySectionHeader);
    expect(dayHeader.hitTestable(), findsOneWidget);

    for (
      var index = 0;
      index < 10 && find.text('Organizer directory').evaluate().isEmpty;
      index += 1
    ) {
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -300));
      await tester.pump();
    }

    expect(find.text('Organizer directory'), findsOneWidget);
    for (
      var index = 0;
      index < 10 && dayHeader.hitTestable().evaluate().isNotEmpty;
      index += 1
    ) {
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -300));
      await tester.pump();
    }
    expect(dayHeader.hitTestable(), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Explore body slivers keep feed visible when clubs fail', (
    tester,
  ) async {
    final club = buildClub(id: 'club-feed-only', name: 'Pace Social');
    final featuredEvent = event_test.buildEvent(
      id: 'event-feed-featured',
      clubId: club.id,
      meetingPoint: 'People Plaza',
      bookedCount: 8,
      capacityLimit: 12,
    );
    final bodyEvent = event_test.buildEvent(
      id: 'event-feed-only',
      clubId: club.id,
      startTime: DateTime.now().add(const Duration(hours: 4)),
      meetingPoint: 'People Plaza',
      bookedCount: 8,
      capacityLimit: 12,
    );

    await _pumpClubsSlivers(tester, [
      _exploreBodySliverGroup(
        clubsViewModel: const ExploreViewModel(joinedClubs: [], allClubs: []),
        feedAsync: AsyncData(
          ExploreFeedViewModel(
            items: [
              ExploreEventItem(
                event: featuredEvent,
                club: club,
                availability: resolveViewerEventAvailability(
                  event: featuredEvent,
                  userProfile: null,
                  now: DateTime.now(),
                ),
                status: EventTileStatus.open,
              ),
              ExploreEventItem(
                event: bodyEvent,
                club: club,
                availability: resolveViewerEventAvailability(
                  event: bodyEvent,
                  userProfile: null,
                  now: DateTime.now(),
                ),
                status: EventTileStatus.open,
              ),
            ],
          ),
        ),
        clubSectionError: StateError('clubs failed'),
      ),
    ]);

    expect(find.text('Social run'), findsWidgets);
    expect(find.bySubtype<CatchErrorState>(), findsOneWidget);
  });

  testWidgets('ExploreDiscoveryCoverHeader CTA delegates featured item', (
    tester,
  ) async {
    final club = buildClub(id: 'club-cover', name: 'Pace Social');
    final event = event_test.buildEvent(
      id: 'event-cover',
      clubId: club.id,
      bookedCount: 8,
      capacityLimit: 12,
    );
    final item = ExploreEventItem(
      event: event,
      club: club,
      availability: resolveViewerEventAvailability(
        event: event,
        userProfile: null,
        now: DateTime.now(),
      ),
      status: EventTileStatus.open,
    );
    ExploreEventItem? selectedItem;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: _exploreCoverHeader(
            featuredItem: item,
            onFeaturedEventSelected: (item) => selectedItem = item,
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text(event.title), findsOneWidget);

    await tester.tap(find.text('View and book'));
    await tester.pump();

    expect(selectedItem?.event.id, 'event-cover');
  });

  testWidgets('ExploreDiscoveryCoverHeader paints through the top inset', (
    tester,
  ) async {
    const topInset = 47.0;
    Widget heroAction({required IconData icon, required String tooltip}) {
      return CatchIconAction.toolbar(
        icon: icon,
        tooltip: tooltip,
        onPressed: _noop,
      );
    }

    final club = buildClub(id: 'club-cover-safe', name: 'Pace Social');
    final event = event_test.buildEvent(
      id: 'event-cover-safe',
      clubId: club.id,
      meetingPoint: 'People Plaza',
    );
    final item = ExploreEventItem(
      event: event,
      club: club,
      availability: resolveViewerEventAvailability(
        event: event,
        userProfile: null,
        now: DateTime.now(),
      ),
      status: EventTileStatus.open,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          exploreFeedViewModelProvider.overrideWithValue(
            AsyncData(ExploreFeedViewModel(items: [item])),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: const MediaQueryData(padding: EdgeInsets.only(top: topInset)),
            child: Scaffold(
              body: _exploreCoverHeader(
                featuredItem: item,
                heroActions: [
                  heroAction(
                    icon: CatchIcons.calendarTodayOutlined,
                    tooltip: 'Calendar',
                  ),
                  heroAction(
                    icon: CatchIcons.openActivity,
                    tooltip: 'Activity',
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(tester.getTopLeft(find.byType(ExploreDiscoveryCoverHeader)).dy, 0);
    expect(tester.getTopLeft(find.byType(FeaturedEventPoster)).dy, 0);
    expect(
      tester.getSize(find.byType(ExploreDiscoveryCoverHeader)).height,
      greaterThan(topInset),
    );

    final searchIcon = find.byIcon(CatchIcons.search);
    expect(searchIcon, findsOneWidget);
    final searchHitTargetTop =
        tester.getCenter(searchIcon).dy - CatchIconAction.navSize / 2;
    expect(searchHitTargetTop, greaterThanOrEqualTo(topInset));

    final title = tester.widget<Text>(find.text('Explore'));
    expect(title.style?.color, CatchTokens.dark.ink);
    final cityLabel = tester.widget<Text>(find.text('Mumbai'));
    expect(cityLabel.style?.color, CatchTokens.dark.ink);

    final cityMaterial = tester.widget<Material>(
      find
          .descendant(
            of: find.byType(ExploreCityPicker),
            matching: find.byType(Material),
          )
          .first,
    );
    expect(cityMaterial.color, Colors.transparent);

    final searchShell = tester.widget<CatchSurface>(
      find
          .descendant(
            of: find.byType(CatchSearchField),
            matching: find.byType(CatchSurface),
          )
          .first,
    );
    expect(searchShell.backgroundColor, CatchTokens.dark.surface);
    expect(
      searchShell.borderSpec?.color,
      CatchBorder.interactive(
        CatchTokens.dark,
        CatchInteractiveBorderState.resting,
      ).color,
    );
    expect(tester.widget<Icon>(searchIcon).color, CatchTokens.dark.ink);

    for (final icon in [
      CatchIcons.calendarTodayOutlined,
      CatchIcons.openActivity,
    ]) {
      expect(
        tester.widget<Icon>(find.byIcon(icon)).color,
        CatchTokens.dark.ink,
      );
      final buttonFinder = find.ancestor(
        of: find.byIcon(icon),
        matching: find.byType(CatchIconAction),
      );
      final buttonSurface = tester.widget<CatchSurface>(
        find
            .descendant(of: buttonFinder, matching: find.byType(CatchSurface))
            .first,
      );
      expect(buttonSurface.backgroundColor, CatchTokens.dark.surface);
    }
  });

  testWidgets('ExploreDiscoveryCoverHeader uses compact row without hero', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          _emptyExploreFeedOverride,
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(body: _exploreCoverHeader()),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Explore'), findsOneWidget);
    expect(find.byIcon(CatchIcons.search), findsOneWidget);
    expect(find.text('Mumbai'), findsOneWidget);
    expect(find.text('Find an event worth showing up for.'), findsNothing);
    expect(find.byType(FeaturedEventPoster), findsNothing);
    final cityButton = tester.widget<CatchSurface>(
      find
          .descendant(
            of: find.byType(ExploreCityPicker),
            matching: find.byType(CatchSurface),
          )
          .first,
    );
    expect(cityButton.backgroundColor, CatchTokens.light.surface);
  });
}
