part of 'explore_widgets_test.dart';

void _registerExploreMapTests() {
  testWidgets('ExploreScreen renders external feed when clubs are empty', (
    tester,
  ) async {
    final externalEvent = _buildExternalExploreEvent(
      id: 'external-event-only',
      title: 'District mixer night',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          exploreSourceOrganizersProvider.overrideWithValue(
            const AsyncData(<Organizer>[]),
          ),
          exploreOrganizersViewModelProvider.overrideWithValue(
            const AsyncData(ExploreViewModel(joinedOrganizers: [], allOrganizers: [])),
          ),
          exploreFeedViewModelProvider.overrideWithValue(
            AsyncData(
              ExploreFeedViewModel(
                items: const [],
                externalItems: [ExploreExternalEventItem(event: externalEvent)],
              ),
            ),
          ),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await _pumpOrganizerUi(tester);

    expect(find.byType(FeaturedEventPoster), findsNothing);
    expect(find.text(externalEvent.title), findsOneWidget);
    expect(find.text('READ-ONLY SUPPLY · NO CATCH BOOKING'), findsOneWidget);
    expect(find.text('Map'), findsOneWidget);
    expect(find.text('No organizers in Mumbai yet'), findsNothing);
  });

  testWidgets('Explore time scope pins while its feed continues scrolling', (
    tester,
  ) async {
    final externalItems = List<ExploreExternalEventItem>.generate(
      24,
      (index) => ExploreExternalEventItem(
        event: _buildExternalExploreEvent(
          id: 'external-pinned-$index',
          title: 'Pinned rail event $index',
        ),
      ),
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          exploreSourceOrganizersProvider.overrideWithValue(
            const AsyncData(<Organizer>[]),
          ),
          exploreOrganizersViewModelProvider.overrideWithValue(
            const AsyncData(ExploreViewModel(joinedOrganizers: [], allOrganizers: [])),
          ),
          exploreFeedViewModelProvider.overrideWithValue(
            AsyncData(
              ExploreFeedViewModel(
                items: const [],
                externalItems: externalItems,
              ),
            ),
          ),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await _pumpOrganizerUi(tester);

    expect(find.byType(NestedScrollView), findsOneWidget);
    final rail = find.byType(ExploreFilterRail);
    final railBefore = tester.getRect(rail);

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -700));
    await _pumpOrganizerUi(tester);
    final railAfterCollapse = tester.getRect(rail);
    expect(railAfterCollapse.top, lessThan(railBefore.top));

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -240));
    await _pumpOrganizerUi(tester);
    expect(tester.getRect(rail).top, closeTo(railAfterCollapse.top, 0.001));
  });

  testWidgets('ExploreScreen filters discover cards from the chip rail', (
    tester,
  ) async {
    final socialOrganizer = buildOrganizer(
      id: 'social-club',
      name: 'Bandra Pacers',
      rating: 4.2,
    );
    final tempoOrganizer = buildOrganizer(
      id: 'tempo-club',
      name: 'Tempo Queens',
      area: 'Juhu',
      tags: const ['tempo'],
      rating: 4.8,
      reviewCount: 9,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          currentUserFollowedOrganizerIdsProvider.overrideWithValue(
            const AsyncData(<String>{}),
          ),
          watchOrganizersByLocationProvider(
            'mumbai',
          ).overrideWith((ref) => Stream.value([socialOrganizer, tempoOrganizer])),
          exploreSourceOrganizersProvider.overrideWithValue(
            AsyncData([socialOrganizer, tempoOrganizer]),
          ),
          _emptyExploreFeedOverride,
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await _pumpOrganizerUi(tester);

    // Handoff chrome: scope tabs stay visible, secondary filters move behind
    // the right-aligned filter glyph.
    expect(find.text('Tonight'), findsOneWidget);
    expect(find.text('Tomorrow'), findsOneWidget);
    expect(find.text('Weekend'), findsNothing);
    expect(find.text('This week'), findsNothing);
    expect(find.text('Any'), findsOneWidget);
    expect(find.byKey(const ValueKey('explore-filter-button')), findsOneWidget);
    expect(find.byIcon(CatchIcons.filters), findsOneWidget);
    expect(find.text('Filters'), findsNothing);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchButton && widget.count != null,
      ),
      findsNothing,
      reason: 'The map launcher stays hidden without mapped event supply.',
    );
    expect(find.text('3 km'), findsNothing);
    expect(find.text('Followed organizers'), findsNothing);
    expect(find.text('Rated 4.5+'), findsNothing);

    await tester.tap(find.text('Tomorrow'));
    await _pumpOrganizerUi(tester);

    expect(find.text('1'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('explore-filter-button')));
    await _pumpOrganizerUi(tester);

    expect(find.text('Explore filters'), findsOneWidget);
    expect(find.text('DISTANCE · EVENTS ONLY'), findsOneWidget);
    expect(find.text('Show 0 plans'), findsOneWidget);
    expect(find.text('3 km'), findsOneWidget);
    expect(find.text('Followed organizers'), findsOneWidget);
    expect(find.text('Following'), findsNothing);
    expect(find.text('Rated 4.5+'), findsOneWidget);
    expect(find.text('ACTIVITY'), findsOneWidget);
    expect(find.text('AREA'), findsOneWidget);
    expect(_selectChip('3 km'), findsOneWidget);
    expect(_selectChip('Followed organizers'), findsOneWidget);
    expect(_selectChip('Rated 4.5+'), findsOneWidget);
    expect(_selectChip('Social run'), findsOneWidget);
    expect(_selectChip('Dinner'), findsOneWidget);
    expect(_selectChip('Bandra'), findsOneWidget);
    expect(_selectChip('Juhu'), findsOneWidget);
    expect(find.text('Clear'), findsOneWidget);
  });

  testWidgets('ExploreFilterSheet toggles secondary filter state', (
    tester,
  ) async {
    final bandraOrganizer = buildOrganizer(id: 'area-bandra', name: 'Bandra Pacers');
    final juhuOrganizer = buildOrganizer(
      id: 'area-juhu',
      name: 'Tempo Queens',
      area: 'Juhu',
    );
    var filters = const ExploreFilterSelection();

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => ExploreFilterSheet(
              filters: filters,
              state: ExploreFilterSheetState.from(
                filters: filters,
                sourceOrganizers: [bandraOrganizer, juhuOrganizer],
                l10n: _l10n,
              ),
              onToggleHighRatedOnly: () {
                setState(() {
                  filters = filters.copyWith(
                    highRatedOnly: !filters.highRatedOnly,
                  );
                });
              },
              onToggleActivityTag: (tag) {
                setState(() {
                  filters = filters.copyWith(
                    activityTag: filters.activityTag == tag ? null : tag,
                  );
                });
              },
              onToggleArea: (area) {
                setState(() {
                  filters = filters.copyWith(
                    area: filters.area == area ? null : area,
                  );
                });
              },
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(_selectChip('Rated 4.5+', active: false), findsOneWidget);
    await tester.tap(_selectChip('Rated 4.5+'));
    await tester.pump();
    expect(filters.highRatedOnly, isTrue);
    expect(_selectChip('Rated 4.5+', active: true), findsOneWidget);

    await tester.ensureVisible(_selectChip('Dinner'));
    await tester.pump();
    await tester.tap(_selectChip('Dinner'));
    await tester.pump();
    expect(filters.activityTag, ActivityKind.dinner.name);
    expect(_selectChip('Dinner', active: true), findsOneWidget);

    await tester.ensureVisible(_selectChip('Juhu'));
    await tester.pump();
    await tester.tap(_selectChip('Juhu'));
    await tester.pump();
    expect(filters.area, 'Juhu');
    expect(_selectChip('Juhu', active: true), findsOneWidget);
  });

  testWidgets('ExploreFilterRail keeps labels whole at phone width', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    const filters = ExploreFilterSelection(highRatedOnly: true);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Column(
            children: [
              ExploreFilterRail(
                filters: filters,
                state: ExploreFilterRailState.from(filters, l10n: _l10n),
                dateStripState: ExploreDateStripState.from(
                  viewModel: null,
                  l10n: _l10n,
                  now: DateTime(2026, 5, 26, 10),
                ),
              ),
              const ExploreAppliedFilterRail(
                filters: filters,
                showJoinedOnly: true,
                onDistanceFilterSelected: null,
                onToggleJoinedOnly: null,
                onToggleHighRatedOnly: null,
                onToggleActivityTag: null,
                onToggleArea: null,
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(find.text('Tonight'), findsOneWidget);
    expect(find.text('Tomorrow'), findsOneWidget);
    expect(find.text('Thu 28'), findsOneWidget);
    expect(find.text('Mon 1'), findsOneWidget);
    expect(find.text('Weekend'), findsNothing);
    expect(find.text('This week'), findsNothing);
    expect(find.text('Any'), findsOneWidget);
    expect(find.byIcon(CatchIcons.filters), findsOneWidget);
    expect(find.text('Filters'), findsNothing);
    expect(find.text('1'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('explore-applied-filter-row')),
      findsOneWidget,
    );
    expect(find.text('Rated 4.5+'), findsOneWidget);

    final iconCenter = tester.getCenter(find.byIcon(CatchIcons.filters));
    final badgeCenter = tester.getCenter(find.text('1'));
    expect(badgeCenter.dx, greaterThan(iconCenter.dx));
    expect(badgeCenter.dy, lessThan(iconCenter.dy));
  });

  testWidgets('ExploreFilterRail suppresses account-only joined controls', (
    tester,
  ) async {
    const filters = ExploreFilterSelection(joinedOnly: true);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: Column(
            children: [
              ExploreFilterRail(filters: filters, showJoinedOnly: false),
              ExploreAppliedFilterRail(
                filters: filters,
                showJoinedOnly: false,
                onDistanceFilterSelected: null,
                onToggleJoinedOnly: null,
                onToggleHighRatedOnly: null,
                onToggleActivityTag: null,
                onToggleArea: null,
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.byKey(const ValueKey('explore-applied-joined')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('explore-filter-button')));
    await _pumpOrganizerUi(tester);
    expect(find.byKey(const ValueKey('explore-filter-joined')), findsNothing);
  });

  testWidgets('ExploreFilterRail removes visible applied filters', (
    tester,
  ) async {
    var filters = const ExploreFilterSelection(
      distanceFilter: ExploreDistanceFilter.threeKm,
      area: 'Bandra',
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => ExploreAppliedFilterRail(
              filters: filters,
              showJoinedOnly: true,
              onDistanceFilterSelected: (distance) => setState(
                () => filters = filters.copyWith(distanceFilter: distance),
              ),
              onToggleJoinedOnly: null,
              onToggleHighRatedOnly: null,
              onToggleActivityTag: null,
              onToggleArea: (area) =>
                  setState(() => filters = filters.copyWith(area: null)),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('3 km · events only'), findsOneWidget);
    expect(find.text('Bandra'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('explore-applied-distance')));
    await tester.pump();

    expect(filters.distanceFilter, ExploreDistanceFilter.any);
    expect(find.text('3 km · events only'), findsNothing);
    expect(find.text('Bandra'), findsOneWidget);
  });

  testWidgets('ExploreFilterSheet updates its live result count', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'filter-count-club');
    final first = ExploreEventItem(
      event: event_test.buildEvent(id: 'filter-count-1', clubId: organizer.id),
      organizer: organizer,
    );
    final second = ExploreEventItem(
      event: event_test.buildEvent(id: 'filter-count-2', clubId: organizer.id),
      organizer: organizer,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          exploreFeedViewModelProvider.overrideWith((ref) {
            final filters = ref.watch(exploreFiltersProvider);
            return AsyncData(
              ExploreFeedViewModel(
                items: filters.highRatedOnly ? [first] : [first, second],
              ),
            );
          }),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Consumer(
              builder: (context, ref, _) {
                final filters = ref.watch(exploreFiltersProvider);
                final initialSheetState = ExploreFilterSheetState.from(
                  filters: filters,
                  sourceOrganizers: [organizer],
                  l10n: _l10n,
                );
                return ExploreFilterRail(
                  filters: filters,
                  sheetState: initialSheetState,
                  onToggleHighRatedOnly: () => ref
                      .read(exploreFiltersProvider.notifier)
                      .toggleHighRatedOnly(),
                  onOpenFilters: () => unawaited(
                    showCatchBottomSheet<void>(
                      context: context,
                      builder: (_) => Consumer(
                        builder: (sheetContext, ref, _) {
                          final liveFilters = ref.watch(exploreFiltersProvider);
                          final liveFeed = ref.watch(
                            exploreFeedViewModelProvider,
                          );
                          return ExploreFilterSheet(
                            filters: liveFilters,
                            state: initialSheetState.withLiveResults(
                              filters: liveFilters,
                              viewModel: liveFeed.asData?.value,
                              feedLoading: liveFeed.isLoading,
                              l10n: _l10n,
                            ),
                            onToggleHighRatedOnly: () => ref
                                .read(exploreFiltersProvider.notifier)
                                .toggleHighRatedOnly(),
                          );
                        },
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    await tester.tap(find.byKey(const ValueKey('explore-filter-button')));
    await _pumpOrganizerUi(tester);
    expect(find.text('Show 2 plans'), findsOneWidget);

    await tester.tap(_selectChip('Rated 4.5+'));
    await _pumpOrganizerUi(tester);
    expect(find.text('Show 1 plan'), findsOneWidget);
  });

  testWidgets('ExploreFeedEventRow demotes ineligible plans with a reason', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'ineligible-club');
    final item = ExploreEventItem(
      event: event_test.buildEvent(id: 'ineligible-event', clubId: organizer.id),
      organizer: organizer,
      availability: const ViewerEventAvailability(
        status: ViewerEventAvailabilityStatus.fullForViewer,
        spotsRemaining: 0,
        isSaved: false,
        isHosted: false,
        isOrganizerMember: false,
      ),
    );

    await pumpTestApp(tester, ExploreFeedEventRow(item: item));

    final opacity = tester.widget<Opacity>(
      find.byKey(const ValueKey('explore-ineligible-event-ineligible-event')),
    );
    expect(opacity.opacity, CatchOpacity.discoveryIneligible);
    expect(
      find.textContaining('YOUR GROUP IS FULL', findRichText: true),
      findsOneWidget,
    );
  });

  testWidgets('ExploreScreen map pill opens the map route', (tester) async {
    final organizer = buildOrganizer(id: 'club-map-pill', name: 'Bandra Pacers');
    final event = event_test.buildEvent(id: 'event-map-pill', clubId: organizer.id);
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(path: '/', builder: (_, _) => const ExploreScreen()),
        GoRoute(
          path: '/map',
          name: Routes.exploreMapScreen.name,
          builder: (_, _) => const ExploreMapScreen(enableNetworkTiles: false),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          watchOrganizersByLocationProvider(
            'mumbai',
          ).overrideWith((ref) => Stream.value([organizer])),
          exploreFeedViewModelProvider.overrideWithValue(
            AsyncData(
              ExploreFeedViewModel(
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
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await _pumpOrganizerUi(tester);

    final mapPill = find.widgetWithText(CatchButton, 'Map');
    expect(mapPill, findsOneWidget);
    expect(find.byType(ExploreMapScreen), findsNothing);

    await tester.tap(mapPill);
    await _pumpOrganizerUi(tester);

    expect(find.byType(ExploreMapScreen), findsOneWidget);
  });

  testWidgets('ExploreScreen map pill clears floating shell tab bar', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    const bottomSafeArea = 34.0;
    const shellBottomOverlayInset =
        CatchLayout.tabBarExtent +
        CatchLayout.tabBarFloatingBottomInset +
        bottomSafeArea;
    final organizer = buildOrganizer(id: 'club-map-clearance', name: 'Bandra Pacers');
    final event = event_test.buildEvent(
      id: 'event-map-clearance',
      clubId: organizer.id,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          watchOrganizersByLocationProvider(
            'mumbai',
          ).overrideWith((ref) => Stream.value([organizer])),
          exploreFeedViewModelProvider.overrideWithValue(
            AsyncData(
              ExploreFeedViewModel(
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
          home: const MediaQuery(
            data: MediaQueryData(
              size: Size(393, 852),
              padding: EdgeInsets.only(bottom: bottomSafeArea),
              viewPadding: EdgeInsets.only(bottom: bottomSafeArea),
            ),
            child: CatchTabViewportScope(
              index: appShellOrganizersTabIndex,
              bottomOverlayInset: shellBottomOverlayInset,
              child: ExploreScreen(),
            ),
          ),
        ),
      ),
    );
    await _pumpOrganizerUi(tester);

    final mapPillRect = tester.getRect(find.widgetWithText(CatchButton, 'Map'));
    final tabBarTop = tester.view.physicalSize.height - shellBottomOverlayInset;

    expect(
      mapPillRect.bottom,
      lessThanOrEqualTo(tabBarTop - CatchSpacing.s5 + 0.5),
    );
    expect(mapPillRect.center.dx, closeTo(393 / 2, 0.5));
  });

  testWidgets('ExploreMapScreen can seed selected pin for captures', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'club-map-selected', name: 'Bandra Map Club');
    final selectedEvent = event_test.buildEvent(
      id: 'event-map-selected',
      clubId: organizer.id,
      meetingPoint: 'Selected Pin Point',
      startTime: DateTime.now().add(const Duration(days: 1)),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          exploreFeedViewModelProvider.overrideWithValue(
            AsyncData(
              ExploreFeedViewModel(
                items: [
                  ExploreEventItem(
                    event: selectedEvent,
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
          home: const ExploreMapScreen(
            enableNetworkTiles: false,
            initialSelectedEventId: 'event-map-selected',
          ),
        ),
      ),
    );
    await _pumpOrganizerUi(tester);

    expect(find.byType(CatchScaffold), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is Semantics && widget.properties.selected == true,
      ),
      findsOneWidget,
    );
    expect(find.byType(EventDateRailCard), findsOneWidget);
    expect(find.text('BANDRA MAP CLUB'), findsOneWidget);
  });

  testWidgets('ExploreMapScreen defaults to the native Google map', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'club-map-default', name: 'Default Map Club');
    final event = event_test.buildEvent(
      id: 'event-map-default',
      clubId: organizer.id,
      meetingPoint: 'Default Pin Point',
      startTime: DateTime.now().add(const Duration(days: 1)),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          exploreFeedViewModelProvider.overrideWithValue(
            AsyncData(
              ExploreFeedViewModel(
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
          home: const ExploreMapScreen(),
        ),
      ),
    );
    await _pumpOrganizerUi(tester);

    expect(find.byType(EventPinsFallbackMap), findsNothing);
    expect(find.byType(gmaps.GoogleMap), findsOneWidget);
  });

  testWidgets('ExploreMapScreen keeps Any until distance is activated', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'club-map-ring', name: 'Ring Map Club');
    final event = event_test.buildEvent(id: 'event-map-ring', clubId: organizer.id);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_FixedDeviceLocation.new),
          exploreFeedViewModelProvider.overrideWithValue(
            AsyncData(
              ExploreFeedViewModel(
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
          home: const ExploreMapScreen(enableNetworkTiles: false),
        ),
      ),
    );
    await _pumpOrganizerUi(tester);
    await tester.pump();

    final container = ProviderScope.containerOf(
      tester.element(find.byType(ExploreMapScreen)),
    );
    expect(
      container.read(exploreFiltersProvider).distanceFilter,
      ExploreDistanceFilter.any,
    );
    expect(find.text('Distance'), findsOneWidget);
    expect(
      find.text(_l10n.exploreExploreMapScreenValueAnyDistance),
      findsOneWidget,
    );
    expect(find.byType(CatchDistanceOverlay), findsNothing);

    await tester.tap(find.text('Distance'));
    await tester.pump();
    expect(
      container.read(exploreFiltersProvider).distanceFilter,
      ExploreDistanceFilter.oneKm,
    );
    expect(
      find.text(
        _l10n.exploreExploreMapScreenLabelWithinDistance(distanceKm: 1),
      ),
      findsOneWidget,
    );

    await tester.tap(
      find.text(
        _l10n.exploreExploreMapScreenLabelWithinDistance(distanceKm: 1),
      ),
    );
    await tester.pump();
    expect(
      container.read(exploreFiltersProvider).distanceFilter,
      ExploreDistanceFilter.threeKm,
    );
    expect(
      find.text(
        _l10n.exploreExploreMapScreenLabelWithinDistance(distanceKm: 3),
      ),
      findsOneWidget,
    );

    await tester.tap(
      find.text(
        _l10n.exploreExploreMapScreenLabelWithinDistance(distanceKm: 3),
      ),
    );
    await tester.pump();
    expect(
      container.read(exploreFiltersProvider).distanceFilter,
      ExploreDistanceFilter.fiveKm,
    );
    expect(
      find.text(
        _l10n.exploreExploreMapScreenLabelWithinDistance(distanceKm: 5),
      ),
      findsOneWidget,
    );

    await tester.tap(
      find.text(
        _l10n.exploreExploreMapScreenLabelWithinDistance(distanceKm: 5),
      ),
    );
    await tester.pump();
    expect(
      container.read(exploreFiltersProvider).distanceFilter,
      ExploreDistanceFilter.tenKm,
    );
    expect(
      find.text(
        _l10n.exploreExploreMapScreenLabelWithinDistance(distanceKm: 10),
      ),
      findsOneWidget,
    );

    await tester.tap(
      find.text(
        _l10n.exploreExploreMapScreenLabelWithinDistance(distanceKm: 10),
      ),
    );
    await tester.pump();
    expect(
      container.read(exploreFiltersProvider).distanceFilter,
      ExploreDistanceFilter.any,
    );
    expect(
      find.text(
        _l10n.exploreExploreMapScreenLabelWithinDistance(distanceKm: 10),
      ),
      findsNothing,
    );
    expect(
      find.text(_l10n.exploreExploreMapScreenValueAnyDistance),
      findsOneWidget,
    );
  });

  testWidgets(
    'ExploreMapScreen keeps the ring on zero results and offers recovery',
    (tester) async {
      final organizer = buildOrganizer(
        id: 'club-map-recovery',
        name: 'Map Recovery Club',
      );
      final event = event_test.buildEvent(
        id: 'event-map-recovery',
        clubId: organizer.id,
        meetingPoint: 'Recovery Pin Point',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            cityListProvider.overrideWith((ref) async => _testCities),
            deviceLocationProvider.overrideWith(_FixedDeviceLocation.new),
            exploreFeedViewModelProvider.overrideWith((ref) {
              final distance = ref.watch(exploreFiltersProvider).distanceFilter;
              final isEmpty =
                  distance == ExploreDistanceFilter.oneKm ||
                  distance == ExploreDistanceFilter.tenKm;
              return AsyncData(
                ExploreFeedViewModel(
                  items: isEmpty
                      ? const []
                      : [
                          ExploreEventItem(
                            event: event,
                            organizer: organizer,
                            status: EventTileStatus.open,
                          ),
                        ],
                ),
              );
            }),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const ExploreMapScreen(enableNetworkTiles: false),
          ),
        ),
      );
      await _pumpOrganizerUi(tester);

      final container = ProviderScope.containerOf(
        tester.element(find.byType(ExploreMapScreen)),
      );
      await tester.tap(find.text('Distance'));
      await _pumpOrganizerUi(tester);

      expect(find.text('No events within 1 km'), findsOneWidget);
      expect(find.byType(EventPinsFallbackMap), findsOneWidget);
      expect(find.byType(CatchDistanceOverlay), findsOneWidget);
      expect(find.text('Expand to 3 km'), findsOneWidget);

      await tester.tap(find.text('Expand to 3 km'));
      await _pumpOrganizerUi(tester);

      expect(
        container.read(exploreFiltersProvider).distanceFilter,
        ExploreDistanceFilter.threeKm,
      );
      expect(find.text('No events within 1 km'), findsNothing);
      expect(
        find.bySemanticsLabel('Select Recovery Pin Point'),
        findsOneWidget,
      );

      container
          .read(exploreFiltersProvider.notifier)
          .setDistanceFilter(ExploreDistanceFilter.tenKm);
      await _pumpOrganizerUi(tester);

      expect(find.text('No events within 10 km'), findsOneWidget);
      expect(find.textContaining('Expand to'), findsNothing);
      expect(find.text('Show all'), findsOneWidget);

      await tester.tap(find.text('Show all'));
      await _pumpOrganizerUi(tester);

      expect(
        container.read(exploreFiltersProvider).distanceFilter,
        ExploreDistanceFilter.any,
      );
      expect(find.byType(CatchDistanceOverlay), findsNothing);
      expect(
        find.bySemanticsLabel('Select Recovery Pin Point'),
        findsOneWidget,
      );
    },
  );
}
