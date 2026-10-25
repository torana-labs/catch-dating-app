part of 'explore_widgets_test.dart';

void _registerExploreClubCardsTests() {
  testWidgets('ExploreDiscoveryCoverHeader search opens the compact field', (
    tester,
  ) async {
    final club = buildClub(id: 'club-cover-search', name: 'Pace Social');
    final event = event_test.buildEvent(
      id: 'event-cover-search',
      clubId: club.id,
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
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(body: _exploreCoverHeader(featuredItem: item)),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(FeaturedEventPoster), findsOneWidget);
    expect(find.text('Explore'), findsOneWidget);
    expect(find.text('Mumbai'), findsOneWidget);
    expect(find.text(event.title), findsOneWidget);
    expect(find.byType(TextField), findsNothing);

    await tester.tap(find.byTooltip('Search events or organizers'));
    await tester.pump();
    await _pumpClubUi(tester);

    expect(find.byType(FeaturedEventPoster), findsNothing);
    expect(_topLevelSearchField(), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    expect(
      tester.getSize(find.byType(ExploreCityPicker)).height,
      CatchSpacing.s12,
    );
    expect(
      tester.getSize(_topLevelSearchField()).height,
      CatchSearchField.heightFor(tester.element(_topLevelSearchField())),
    );
    expect(find.text(event.title), findsNothing);
  });

  testWidgets('FeaturedEventPoster data block stays within narrow widths', (
    tester,
  ) async {
    // Regression guard: the data block must yield to the Expanded CTA (ellipsis)
    // rather than overflow the Row on narrow widths / large text scales.
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 320,
              child: Builder(
                builder: (context) => MediaQuery(
                  data: MediaQuery.of(
                    context,
                  ).copyWith(textScaler: const TextScaler.linear(1.6)),
                  // Vertical scroll keeps the (intentionally tall) cover from
                  // a height overflow so the probe isolates the horizontal
                  // data-Row constraint under test.
                  child: const SingleChildScrollView(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: FeaturedEventPoster(
                        kicker: "This week's pick",
                        title: 'Long-table supper for strangers in Bandra West',
                        body: 'Pace Social - Carter Road - 5km easy run - 5km',
                        cta: 'View event',
                        data: '7:30 AM · ₹1,200',
                        data2: '12 going · 4 spots left',
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(tester.takeException(), isNull);
  });

  testWidgets('FeaturedEventPoster labels tappable location chrome', (
    tester,
  ) async {
    var tapped = false;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: FeaturedEventPoster(
            title: 'Tonight in Mumbai',
            location: 'Mumbai',
            onLocation: () => tapped = true,
          ),
        ),
      ),
    );

    expect(find.byTooltip('Change location'), findsOneWidget);
    expect(find.bySemanticsLabel('Change location, Mumbai'), findsOneWidget);
    expect(
      tester
          .getSize(
            find
                .ancestor(
                  of: find.text('MUMBAI'),
                  matching: find.byType(CatchSurface),
                )
                .first,
          )
          .height,
      greaterThanOrEqualTo(CatchIconAction.defaultSize),
    );

    await tester.tap(find.text('MUMBAI'));
    await tester.pump();

    expect(tapped, isTrue);
  });

  testWidgets('Explore scope city trigger keeps a 44 point tap target', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Align(
            alignment: Alignment.topLeft,
            child: ExploreCityButton(
              city: _testCities.first,
              focused: false,
              presentation: ExploreCityPickerPresentation.scopeLabel,
              onTap: () {},
            ),
          ),
        ),
      ),
    );

    expect(
      tester.getSize(find.byType(ExploreCityButton)).height,
      greaterThanOrEqualTo(CatchIconAction.defaultSize),
    );
  });

  testWidgets('Explore club cover prefers the primary uploaded photo', (
    tester,
  ) async {
    final club = buildClub(
      id: 'club-primary-photo',
      imageUrl: 'https://example.com/legacy.jpg',
      clubPhotos: [
        UploadedPhoto.fromUpload(
          url: 'https://example.com/primary.jpg',
          storagePath: 'clubs/primary.jpg',
          position: 0,
          now: DateTime(2026),
        ),
      ],
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(body: ClubCover(club: club)),
      ),
    );

    expect(
      tester.widget<CatchNetworkImage>(find.byType(CatchNetworkImage)).url,
      'https://example.com/primary.jpg',
    );
  });

  testWidgets('Explore club card composes rating and semantics', (
    tester,
  ) async {
    final club = buildClub(
      id: 'club-semantic-card',
      name: 'Tempo House',
      memberCount: 42,
      rating: 4.9,
      reviewCount: 61,
      nextEventLabel: 'Fri 8 PM',
      hostName: 'Asha Shah',
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SizedBox(
            width: 360,
            child: ClubCard(club: club, onClubSelected: (_) {}),
          ),
        ),
      ),
    );

    expect(find.text('4.9 · 61 REVIEWS'), findsOneWidget);
    expect(find.text('HOSTED BY'), findsOneWidget);
    expect(find.text('Asha Shah'), findsOneWidget);
    expect(find.text('View organizer'), findsNothing);
    expect(
      find.bySemanticsLabel(RegExp('Tempo House.*42 followers.*61 REVIEWS')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('organizer-authority-claimedUnverified')),
      findsOneWidget,
    );
  });

  testWidgets('external event row exposes one composed summary', (
    tester,
  ) async {
    final item = ExploreExternalEventItem(
      event: _buildExternalExploreEvent(
        id: 'external-semantic-row',
        title: 'Afterfly Social',
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: ExploreExternalEventRow(
            item: item,
            onExternalEventOpened: (_) {},
          ),
        ),
      ),
    );

    expect(
      find.bySemanticsLabel(
        RegExp('Afterfly Social.*FROM DISTRICT.*READ-ONLY SUPPLY'),
      ),
      findsOneWidget,
    );
  });

  testWidgets(
    'Explore and detail share organizer poster material and media geometry',
    (tester) async {
      final club = buildClub(
        id: 'club-padding',
        name: 'Padding Pacers',
        imageUrl: 'https://example.com/club.jpg',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CustomScrollView(
              slivers: _exploreEventsSlivers(
                pinnedDayHeaders: false,
                candidateClubs: [club],
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      final cardPoster = tester.widget<CatchPoster>(find.byType(CatchPoster));
      expect(cardPoster.variant, CatchPosterVariant.editorial);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CustomScrollView(
              slivers: [ClubHeroTopBar(club: club, isHost: false)],
            ),
          ),
        ),
      );
      await _pumpClubUi(tester);

      final detailPadding = tester.widget<Padding>(
        find.byKey(const ValueKey('club-detail-hero-poster-padding')),
      );
      final detailPoster = tester.widget<CatchPoster>(find.byType(CatchPoster));
      expect(detailPadding.padding, clubInteractionMediaPadding);
      expect(detailPoster.variant, cardPoster.variant);
      expect(detailPoster.radius, cardPoster.radius);
      expect(detailPoster.media.runtimeType, cardPoster.media.runtimeType);
      expect(
        find.byKey(const ValueKey('club-detail-hero-poster-frame')),
        findsOneWidget,
      );
    },
  );

  testWidgets('ExploreEventsSection shows enough top recommendations by day', (
    tester,
  ) async {
    final club = buildClub(
      id: 'club-week',
      name: 'Weekenders',
      area: 'Indiranagar',
    );
    final today = DateUtils.dateOnly(DateTime.now());
    final dinner = event_test.buildEvent(
      id: 'event-week-dinner',
      clubId: club.id,
      startTime: today.add(const Duration(days: 1, hours: 19)),
      meetingPoint: 'Long table room',
      eventFormat: EventFormatSnapshot.custom(
        label: 'long table',
        interactionModel: EventInteractionModel.seatedTable,
      ),
    );
    final run = event_test.buildEvent(
      id: 'event-week-run',
      clubId: club.id,
      startTime: today.add(const Duration(days: 2, hours: 6)),
      meetingPoint: 'Cubbon Park',
    );
    final art = event_test.buildEvent(
      id: 'event-week-art',
      clubId: club.id,
      startTime: today.add(const Duration(days: 3, hours: 16)),
      meetingPoint: 'NGMA',
      eventFormat: EventFormatSnapshot.custom(
        label: 'sketching strangers',
        interactionModel: EventInteractionModel.openFormat,
      ),
    );
    final brunch = event_test.buildEvent(
      id: 'event-week-brunch',
      clubId: club.id,
      startTime: today.add(const Duration(days: 4, hours: 11)),
      meetingPoint: 'Koramangala',
      eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.dinner),
    );
    final pickleball = event_test.buildEvent(
      id: 'event-week-pickleball',
      clubId: club.id,
      startTime: today.add(const Duration(days: 5, hours: 18)),
      meetingPoint: 'Court 2',
      eventFormat: EventFormatSnapshot.fromActivityKind(
        ActivityKind.pickleball,
      ),
    );
    final quiz = event_test.buildEvent(
      id: 'event-week-quiz',
      clubId: club.id,
      startTime: today.add(const Duration(days: 6, hours: 20)),
      meetingPoint: 'Trivia room',
      eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.pubQuiz),
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CustomScrollView(
            slivers: [
              _exploreEventsSection(
                filters: const ExploreFilterSelection(
                  timeFilter: ExploreTimeFilter.thisWeek,
                ),
                feedAsync: AsyncData(
                  ExploreFeedViewModel(
                    items: [
                      for (final event in [
                        dinner,
                        run,
                        art,
                        brunch,
                        pickleball,
                        quiz,
                      ])
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
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('This week'), findsOneWidget);
    expect(find.text('COMING UP · 6'), findsOneWidget);
    expect(find.textContaining('Long Table'), findsOneWidget);
    expect(find.textContaining('Social run'), findsOneWidget);
    expect(find.textContaining('Sketching Strangers'), findsOneWidget);
    expect(find.textContaining('Dinner'), findsWidgets);
    expect(find.textContaining('Pickleball'), findsWidgets);
    expect(find.textContaining('Pub quiz'), findsWidgets);
    expect(find.byType(EventDateRailCard), findsNWidgets(6));
    expect(find.byType(FeaturedEventPoster), findsNothing);
  });

  testWidgets('ExploreEventsSection does not duplicate full status meta', (
    tester,
  ) async {
    final club = buildClub(
      id: 'club-full',
      name: 'Pace Social',
      area: 'Necklace Road',
    );
    final featuredEvent = event_test.buildEvent(
      id: 'event-featured',
      clubId: club.id,
      meetingPoint: 'People Plaza',
      bookedCount: 2,
      capacityLimit: 6,
    );
    final event = event_test.buildEvent(
      id: 'event-full',
      clubId: club.id,
      meetingPoint: 'People Plaza',
      bookedCount: 6,
      capacityLimit: 6,
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
                          now: DateTime.now(),
                        ),
                        status: EventTileStatus.open,
                      ),
                      ExploreEventItem(
                        event: event,
                        club: club,
                        availability: resolveViewerEventAvailability(
                          event: event,
                          userProfile: null,
                          now: DateTime.now(),
                        ),
                        status: EventTileStatus.full,
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

    expect(
      find.textContaining('6 GOING · FULL', findRichText: true),
      findsOneWidget,
    );
    expect(find.byType(CatchBadge), findsNothing);
  });

  testWidgets('Explore event type browse index updates the activity filter', (
    tester,
  ) async {
    final club = buildClub(
      id: 'club-event-types',
      name: 'Pace Social',
      area: 'Necklace Road',
    );
    final activityKinds = [
      ActivityKind.socialRun,
      ActivityKind.dinner,
      ActivityKind.pubQuiz,
      ActivityKind.pickleball,
      ActivityKind.walking,
      ActivityKind.padel,
      ActivityKind.tennis,
      ActivityKind.yoga,
      ActivityKind.barCrawl,
      ActivityKind.dinner,
      ActivityKind.socialRun,
      ActivityKind.socialRun,
    ];
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final items = [
      for (var index = 0; index < activityKinds.length; index += 1)
        ExploreEventItem(
          event: event_test.buildEvent(
            id: 'event-type-$index',
            clubId: club.id,
            eventFormat: EventFormatSnapshot.fromActivityKind(
              activityKinds[index],
            ),
          ),
          club: club,
          status: EventTileStatus.open,
        ),
    ];

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SingleChildScrollView(
            child: ExploreEventTypeBrowseGrid(
              items: items,
              onCategoryTap: (kind) => container
                  .read(exploreFiltersProvider.notifier)
                  .toggleActivityTag(kind.name),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('BY ACTIVITY'), findsOneWidget);
    expect(find.text('Social run'), findsOneWidget);
    expect(find.text('Dinner'), findsOneWidget);
    expect(find.text('Pub quiz'), findsOneWidget);
    expect(find.text('Pickleball'), findsOneWidget);
    expect(find.text('Walking'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(find.text('2'), findsOneWidget);
    expect(find.text('+ 4 MORE TYPES'), findsOneWidget);
    expect(find.text('Padel'), findsNothing);

    await tester.tap(find.text('Dinner'));
    await tester.pump();

    expect(
      container.read(exploreFiltersProvider).activityTag,
      ActivityKind.dinner.name,
    );

    await tester.tap(find.text('+ 4 MORE TYPES'));
    await tester.pump();

    expect(find.text('Padel'), findsOneWidget);
    expect(find.text('+ 4 MORE TYPES'), findsNothing);
  });

  testWidgets('Explore event type browse index fits iPhone width', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(402, 874);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final club = buildClub(
      id: 'club-event-types-fit',
      name: 'Pace Social',
      area: 'Necklace Road',
    );
    final event = event_test.buildEvent(
      id: 'event-social-run',
      clubId: club.id,
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SingleChildScrollView(
            child: ExploreEventTypeBrowseGrid(
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
      ),
    );
    await tester.pump();

    expect(find.text('BY ACTIVITY'), findsOneWidget);
    expect(find.text('Social run'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ExploreEventsSection empty state can broaden time filter', (
    tester,
  ) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    container
        .read(exploreFiltersProvider.notifier)
        .setTimeFilter(ExploreTimeFilter.thisWeek);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CustomScrollView(
            slivers: [
              _exploreEventsSection(
                filters: container.read(exploreFiltersProvider),
                onSetTimeFilter: (filter) => container
                    .read(exploreFiltersProvider.notifier)
                    .setTimeFilter(filter),
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Nothing this week'), findsOneWidget);
    await tester.tap(find.text('See anytime'));
    await tester.pump();

    expect(
      container.read(exploreFiltersProvider).timeFilter,
      ExploreTimeFilter.anytime,
    );
  });

  testWidgets(
    'ExploreEventsSection empty state clears search and filters together',
    (tester) async {
      final container = ProviderContainer(
        overrides: [
          exploreFeedViewModelProvider.overrideWithValue(
            const AsyncData(ExploreFeedViewModel(items: [])),
          ),
        ],
      );
      addTearDown(container.dispose);
      container.read(exploreSearchQueryProvider.notifier).setQuery('tempo');
      container.read(exploreFiltersProvider.notifier).toggleHighRatedOnly();

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CustomScrollView(
              slivers: [
                _exploreEventsSection(
                  filters: container.read(exploreFiltersProvider),
                  searchQuery: container.read(exploreSearchQueryProvider),
                  onClearSearch: () => container
                      .read(exploreSearchQueryProvider.notifier)
                      .clear(),
                  onClearFilters: () =>
                      container.read(exploreFiltersProvider.notifier).clear(),
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('No events match this search'), findsOneWidget);
      await tester.tap(find.text('Clear search and filters'));
      await tester.pump();

      expect(container.read(exploreSearchQueryProvider), isEmpty);
      expect(container.read(exploreFiltersProvider).hasActiveFilters, false);
    },
  );

  testWidgets('Explore header expands search and updates the search query', (
    tester,
  ) async {
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        cityListProvider.overrideWith((ref) async => _testCities),
        deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
        uidProvider.overrideWith((ref) => Stream.value(null)),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Builder(
              builder: (context) => CustomScrollView(
                slivers: [
                  ...CatchSliverHeader(
                    title: const SizedBox.shrink(),
                    bottomHeight: const CatchTopBar.primaryRail(
                      title: 'Explore',
                    ).contentHeightFor(context),
                    bottom: _exploreCoverHeader(
                      query: container.read(exploreSearchQueryProvider),
                      onQueryChanged: (value) => container
                          .read(exploreSearchQueryProvider.notifier)
                          .setQuery(value),
                    ),
                  ).buildSlivers(context),
                  const SliverToBoxAdapter(child: SizedBox(height: 700)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    await _pumpClubUi(tester);

    final initialCityTriggerSize = tester.getSize(
      find.byType(ExploreCityPicker),
    );
    expect(initialCityTriggerSize.height, CatchToolbarMetrics.targetExtent);
    expect(
      initialCityTriggerSize.width,
      greaterThan(initialCityTriggerSize.height),
    );
    expect(find.text('Mumbai'), findsOneWidget);
    final initialTitleTop = tester.getTopLeft(find.text('Explore')).dy;

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -220));
    await pumpFeatureUi(tester);

    expect(find.text('Explore').hitTestable(), findsOneWidget);
    expect(find.byType(ExploreCityPicker).hitTestable(), findsOneWidget);
    final scrolledTitleTop = tester.getTopLeft(find.text('Explore')).dy;
    expect(scrolledTitleTop, greaterThanOrEqualTo(0));
    expect(scrolledTitleTop, lessThanOrEqualTo(initialTitleTop));
    expect(_topLevelSearchField(), findsOneWidget);
    expect(
      tester.getSize(_topLevelSearchField()).width,
      lessThanOrEqualTo(
        CatchIconAction.targetExtentFor(CatchIconAction.navSize),
      ),
    );
    expect(find.byType(TextField), findsNothing);

    await tester.tap(find.byIcon(CatchIcons.search));
    await tester.pump();
    final midSearchMorphFrame = Duration(
      milliseconds: CatchMotion.base.inMilliseconds ~/ 2,
    );
    await tester.pump(midSearchMorphFrame);

    final morphingSearchWidth = tester.getSize(_topLevelSearchField()).width;
    expect(
      morphingSearchWidth,
      greaterThan(CatchIconAction.targetExtentFor(CatchIconAction.navSize)),
    );

    await _pumpClubUi(tester);

    final expandedSearchWidth = tester.getSize(_topLevelSearchField()).width;
    expect(expandedSearchWidth, greaterThanOrEqualTo(morphingSearchWidth));
    expect(
      tester.getSize(_topLevelSearchField()).height,
      CatchSearchField.heightFor(tester.element(_topLevelSearchField())),
    );
    expect(find.byIcon(CatchIcons.arrowBackRounded), findsNothing);
    expect(find.byIcon(CatchIcons.keyboardHideRounded), findsNothing);
    expect(
      tester.widget<TextField>(find.byType(TextField)).textInputAction,
      TextInputAction.done,
    );

    await tester.enterText(find.byType(TextField), 'asha');
    await tester.pump();

    expect(container.read(exploreSearchQueryProvider), 'asha');

    await tester.tap(find.byIcon(CatchIcons.clearCircle));
    await tester.pump();

    expect(container.read(exploreSearchQueryProvider), isEmpty);

    final searchField = tester.widget<TextField>(find.byType(TextField));
    expect(searchField.controller!.text, isEmpty);

    await tester.tap(find.byIcon(CatchIcons.close));
    await _pumpClubUi(tester);

    expect(_topLevelSearchField(), findsOneWidget);
    expect(
      tester.getSize(_topLevelSearchField()).width,
      lessThanOrEqualTo(
        CatchIconAction.targetExtentFor(CatchIconAction.navSize),
      ),
    );
    expect(find.byType(TextField), findsNothing);
  });
}
