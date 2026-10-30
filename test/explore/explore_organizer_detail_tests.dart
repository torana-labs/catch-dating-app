part of 'explore_widgets_test.dart';

void _registerExploreOrganizerDetailTests() {
  testWidgets('ExploreCityPicker renders a city pill trigger', (tester) async {
    const hyderabad = CityData(
      name: 'hyderabad',
      label: 'Hyderabad',
      latitude: 17.3850,
      longitude: 78.4867,
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Center(
            child: ExploreCityPicker(
              state: ExploreCityPickerState.from(
                selectedCity: hyderabad,
                cities: const [hyderabad],
                cityListLoading: false,
                cityListError: null,
              ),
              onSelected: (_) {},
            ),
          ),
        ),
      ),
    );
    await _pumpOrganizerUi(tester);

    expect(find.byIcon(CatchIcons.location), findsOneWidget);
    expect(find.text('HYD'), findsNothing);
    expect(find.text('Hyderabad'), findsOneWidget);
    final triggerSize = tester.getSize(find.byType(ExploreCityPicker));
    expect(triggerSize.height, CatchToolbarMetrics.targetExtent);
    expect(triggerSize.width, greaterThan(triggerSize.height));
    expect(triggerSize.width, lessThanOrEqualTo(132));
  });

  testWidgets(
    'ExploreCityPicker changes city and clears the Explore search query',
    (tester) async {
      final container = ProviderContainer(retry: (_, _) => null);
      addTearDown(container.dispose);
      container.read(exploreSearchQueryProvider.notifier).setQuery('asha');

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: Center(
                child: ExploreCityPicker(
                  state: _testCityPickerState(),
                  onSelected: (city) => container
                      .read(selectedExploreCityProvider.notifier)
                      .setCity(city),
                ),
              ),
            ),
          ),
        ),
      );
      await _pumpOrganizerUi(tester);

      await tester.tap(find.byType(ExploreCityPicker));
      await _pumpOrganizerUi(tester);
      await tester.tap(find.text('Delhi').hitTestable());
      await _pumpOrganizerUi(tester);

      expect(container.read(selectedExploreCityProvider).name, 'delhi');
      expect(container.read(exploreSearchQueryProvider), isEmpty);
    },
  );

  testWidgets('Explore header hides create-club action in consumer app', (
    tester,
  ) async {
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (_, _) => Scaffold(
            body: Builder(
              builder: (context) => CustomScrollView(
                slivers: CatchSliverHeader(
                  title: const SizedBox.shrink(),
                  bottomHeight: const CatchTopBar.primaryRail(
                    title: 'Explore',
                  ).contentHeightFor(context),
                  bottom: _exploreCoverHeader(),
                ).buildSlivers(context),
              ),
            ),
          ),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [uidProvider.overrideWith((ref) => Stream.value('host-1'))],
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await _pumpOrganizerUi(tester);

    expect(find.byIcon(CatchIcons.add), findsNothing);
    expect(find.text('Create organizer'), findsNothing);
  });

  testWidgets('club index row and avatar chip render club metadata', (
    tester,
  ) async {
    final organizer = buildOrganizer(
      name: 'Night Pacers',
      location: 'in-mp-indore',
      tags: const ['social', 'Indore'],
      imageUrl: 'https://example.com/club-cover.jpg',
      profileImageUrl: 'https://example.com/club-logo.jpg',
      rating: 4.8,
      reviewCount: 12,
      nextEventLabel: 'Race Course Road Main Gate',
    );

    await pumpTestApp(
      tester,
      Column(
        children: [
          Expanded(
            child: OrganizerIndexRow(organizer: organizer, isJoined: true),
          ),
          AvatarChip(organizer: organizer, showLiveBadge: true),
        ],
      ),
      overrides: [uidProvider.overrideWith((ref) => Stream.value('runner-1'))],
    );

    // The index row keeps cover art and rail identity separate:
    // imageUrl is the row thumbnail, profileImageUrl is the avatar-chip image.
    expect(find.text('Night Pacers'), findsNWidgets(2));
    expect(find.text('Following'), findsOneWidget);
    expect(find.text('Follow'), findsNothing);
    expect(find.text('SOCIAL RUN'), findsOneWidget);
    expect(find.text('BANDRA / INDORE · 1 FOLLOWER'), findsOneWidget);
    expect(find.text('RACE COURSE ROAD MAIN GATE'), findsNothing);
    expect(find.text('4.8'), findsNothing);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            _networkImageUrl(widget) == 'https://example.com/club-cover.jpg',
      ),
      findsWidgets,
    );
    expect(
      find.byWidgetPredicate(
        (widget) =>
            _networkImageUrl(widget) == 'https://example.com/club-logo.jpg',
      ),
      findsWidgets,
    );
  });

  testWidgets('OrganizerIndexRow labels joined clubs without host state', (
    tester,
  ) async {
    await pumpTestApp(
      tester,
      OrganizerIndexRow(
        organizer: buildOrganizer(name: 'Host Club'),
        isJoined: true,
      ),
      overrides: [uidProvider.overrideWith((ref) => Stream.value('runner-1'))],
    );

    expect(find.text('You host'), findsNothing);
    expect(find.text('Following'), findsOneWidget);
    expect(find.text('Follow'), findsNothing);
  });

  testWidgets(
    'OrganizerMembershipDock renders the correct action and pending state',
    (tester) async {
      await pumpTestApp(
        tester,
        Column(
          children: [
            OrganizerMembershipDock(
              organizer: buildOrganizer(),
              isMember: false,
              isAuthenticated: true,
              isMutating: false,
              pushNotificationsEnabled: false,
              isPushMutating: false,
            ),
            OrganizerMembershipDock(
              organizer: buildOrganizer(),
              isMember: true,
              isAuthenticated: true,
              isMutating: true,
              pushNotificationsEnabled: false,
              isPushMutating: false,
            ),
          ],
        ),
      );

      expect(find.text('Follow organizer'), findsOneWidget);
      expect(
        tester
            .widget<CatchButton>(
              find.byWidgetPredicate(
                (widget) =>
                    widget is CatchButton && widget.label == 'Following',
              ),
            )
            .isLoading,
        isTrue,
      );
    },
  );

  testWidgets(
    'OrganizerMembershipDock join and leave actions hit the repository',
    (tester) async {
      final fakeRepository = FakeOrganizersRepository();
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          organizersRepositoryProvider.overrideWith((ref) => fakeRepository),
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
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: Column(
                children: [
                  OrganizerMembershipDock(
                    organizer: buildOrganizer(id: 'club-join'),
                    isMember: false,
                    isAuthenticated: true,
                    isMutating: false,
                    pushNotificationsEnabled: false,
                    isPushMutating: false,
                  ),
                  OrganizerMembershipDock(
                    organizer: buildOrganizer(id: 'club-leave'),
                    isMember: true,
                    isAuthenticated: true,
                    isMutating: false,
                    pushNotificationsEnabled: false,
                    isPushMutating: false,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await _pumpOrganizerUi(tester);

      await tester.tap(find.text('Follow organizer'));
      await _pumpOrganizerUi(tester);
      await tester.tap(find.text('Following'));
      await _pumpOrganizerUi(tester);

      expect(fakeRepository.joinedOrganizerId, 'club-join');
      expect(fakeRepository.leftOrganizerId, 'club-leave');
    },
  );

  testWidgets('metric strip shows its provided values', (tester) async {
    await pumpTestApp(
      tester,
      const Column(
        children: [
          CatchMetricSection(
            items: [
              CatchMetricValue(value: '24', label: 'followers'),
              CatchMetricValue(value: '4.7', label: 'rating'),
              CatchMetricValue(value: '12', label: 'reviews'),
              CatchMetricValue(value: 'JAN 2025', label: 'est.'),
            ],
          ),
        ],
      ),
    );

    expect(find.byType(CatchMetricSection), findsOneWidget);
    expect(find.text('followers'), findsOneWidget);
    expect(find.text('reviews'), findsOneWidget);
    expect(find.text('est.'), findsOneWidget);
    expect(find.text('12'), findsOneWidget);
    expect(find.text('JAN 2025'), findsOneWidget);
    expect(find.text('4.7'), findsOneWidget);
  });

  testWidgets('OrganizerHeroTopBar share button invokes share handler', (
    tester,
  ) async {
    var sharedOrganizerId = '';

    await pumpTestApp(
      tester,
      CustomScrollView(
        slivers: [
          OrganizerHeroTopBar(
            organizer: buildOrganizer(),
            isHost: true,
            onShareOrganizer: (_, organizer) async {
              sharedOrganizerId = organizer.id;
            },
          ),
        ],
      ),
    );

    await tester.tap(find.byTooltip('Share organizer'));
    await _pumpOrganizerUi(tester);

    expect(sharedOrganizerId, 'club-1');
  });

  testWidgets(
    'OrganizerHeroTopBar shows club identity and pops back from the detail route',
    (tester) async {
      final router = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => Builder(
              builder: (context) => Scaffold(
                body: Center(
                  child: FilledButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => CustomScrollView(
                          slivers: [
                            OrganizerHeroTopBar(
                              organizer: buildOrganizer(
                                name: 'Rated Club',
                                rating: 4.8,
                                imageUrl: 'https://example.com/club.jpg',
                              ),
                              isHost: false,
                            ),
                          ],
                        ),
                      ),
                    ),
                    child: const Text('Open hero'),
                  ),
                ),
              ),
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
      await tester.tap(find.text('Open hero'));
      await _pumpOrganizerUi(tester);

      expect(find.text('Rated Club'), findsOneWidget);
      expect(find.text('Bandra, Mumbai'), findsOneWidget);
      expect(find.text('4.8'), findsNothing);
      expect(
        find.byKey(const ValueKey('club-detail-hero-poster-frame')),
        findsOneWidget,
      );

      await tester.tap(find.byIcon(CatchIcons.back));
      await _pumpOrganizerUi(tester);

      expect(find.text('Open hero'), findsOneWidget);
    },
  );

  testWidgets(
    'OrganizerHeroTopBar keeps long title location in the poster copy block',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(402, 874);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final organizer = buildOrganizer(
        name: 'Vijay Nagar Event Collective',
        area: 'Vijay Nagar',
        location: 'in-mp-indore',
        imageUrl: 'https://example.com/club.jpg',
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: MediaQuery(
              data: const MediaQueryData(
                size: Size(402, 874),
                padding: EdgeInsets.only(top: 59, bottom: 34),
                viewPadding: EdgeInsets.only(top: 59, bottom: 34),
              ),
              child: Scaffold(
                body: CustomScrollView(
                  slivers: [
                    OrganizerHeroTopBar(organizer: organizer, isHost: false),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      await _pumpOrganizerUi(tester);

      final posterFrame = find.byKey(
        const ValueKey('club-detail-hero-poster-frame'),
      );
      final title = find.text('Vijay Nagar Event Collective');
      final location = find.text('Vijay Nagar, Indore');

      expect(posterFrame, findsOneWidget);
      expect(title, findsOneWidget);
      expect(location, findsOneWidget);
      expect(find.descendant(of: posterFrame, matching: title), findsOneWidget);

      final module = tester.widget<CatchSurface>(
        find.byKey(const ValueKey('club-detail-hero-module')),
      );
      expect(module.backgroundColor, CatchTokens.editorialLight.surface);
    },
  );

  testWidgets('OrganizerDetailBody renders metrics below the hero content', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(402, 874);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    final organizer = buildOrganizer(
      name: 'Sea Face Social',
      imageUrl: 'https://example.com/club.jpg',
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: const MediaQueryData(
              size: Size(402, 874),
              padding: EdgeInsets.only(top: 59, bottom: 34),
              viewPadding: EdgeInsets.only(top: 59, bottom: 34),
            ),
            child: Scaffold(
              body: OrganizerDetailBody(
                state: OrganizerDetailBodyState.fromDomain(
                  organizer: organizer,
                  userProfile: buildUser(uid: 'runner-1'),
                  uid: 'runner-1',
                  isMember: true,
                  isAuthenticated: true,
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await _pumpOrganizerUi(tester);

    final heroFrame = find.byKey(
      const ValueKey('club-detail-hero-poster-frame'),
    );
    final heroLocation = find.descendant(
      of: heroFrame,
      matching: find.text('Bandra, Mumbai'),
    );

    expect(heroFrame, findsOneWidget);
    expect(heroLocation, findsOneWidget);
    final metricTop = tester.getTopLeft(find.byType(CatchMetricSection)).dy;
    final locationBottom = tester.getBottomLeft(heroLocation).dy;
    expect(metricTop, greaterThan(locationBottom));
  });

  testWidgets('OrganizerHeroTopBar uses clean fallback without a cover image', (
    tester,
  ) async {
    await pumpTestApp(
      tester,
      CustomScrollView(
        slivers: [
          OrganizerHeroTopBar(
            organizer: buildOrganizer(name: 'Morning Miles'),
            isHost: false,
          ),
        ],
      ),
    );

    expect(find.byType(OrganizerPlaceholderCover), findsOneWidget);
    expect(find.text('MM'), findsNothing);
    expect(find.text('Morning Miles'), findsOneWidget);
    expect(find.text('Bandra, Mumbai'), findsOneWidget);
  });

  testWidgets(
    'OrganizerHeroTopBar reveals the club name in the collapsed toolbar',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 800);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      await pumpTestApp(
        tester,
        CustomScrollView(
          slivers: [
            OrganizerHeroTopBar(
              organizer: buildOrganizer(
                name: 'Vijay Nagar Event Collective',
                imageUrl: 'https://example.com/club.jpg',
              ),
              isHost: false,
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 900)),
          ],
        ),
      );

      expect(
        find.byKey(const ValueKey('club-detail-collapsed-title')),
        findsNothing,
      );

      await tester.drag(find.byType(CustomScrollView), const Offset(0, -520));
      await _pumpOrganizerUi(tester);

      final collapsedTitle = find.byKey(
        const ValueKey('club-detail-collapsed-title'),
      );
      expect(collapsedTitle, findsOneWidget);
      expect(tester.getTopLeft(collapsedTitle).dy, lessThan(96));
      final collapsedTitleText = tester.widget<Text>(collapsedTitle);
      expect(
        collapsedTitleText.style?.fontFamily,
        contains(CatchFonts.voiceFamily.split(' ').first),
      );
    },
  );

  testWidgets('club index row and avatar chip navigate to detail routes', (
    tester,
  ) async {
    Future<void> pumpRow({
      required String id,
      required Widget Function(BuildContext context, Organizer organizer)
      childBuilder,
    }) async {
      final organizer = buildOrganizer(
        id: id,
        name: 'Club $id',
        imageUrl: 'https://example.com/club.jpg',
      );
      final router = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            builder: (context, _) =>
                Scaffold(body: Center(child: childBuilder(context, organizer))),
          ),
          GoRoute(
            path: '/detail/:clubId',
            name: Routes.organizerDetailScreen.name,
            builder: (_, state) => Text(
              'Detail ${state.pathParameters['clubId']}',
              textDirection: TextDirection.ltr,
            ),
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          ],
          child: MaterialApp.router(
            theme: AppTheme.light,
            routerConfig: router,
          ),
        ),
      );
      await _pumpOrganizerUi(tester);
      await tester.tap(
        find.byWidgetPredicate(
          (widget) =>
              (widget is OrganizerIndexRow &&
                  widget.organizer.id == organizer.id) ||
              (widget is AvatarChip && widget.organizer.id == organizer.id),
        ),
      );
      await _pumpOrganizerUi(tester);

      expect(find.text('Detail ${organizer.id}'), findsOneWidget);
    }

    await pumpRow(
      id: 'index',
      childBuilder: (context, organizer) => OrganizerIndexRow(
        organizer: organizer,
        isJoined: true,
        onTap: () => context.pushNamed(
          Routes.organizerDetailScreen.name,
          pathParameters: {'clubId': organizer.id},
          extra: organizer,
        ),
      ),
    );
    await pumpRow(
      id: 'avatar',
      childBuilder: (context, organizer) => AvatarChip(
        organizer: organizer,
        showLiveBadge: true,
        onTap: () => context.pushNamed(
          Routes.organizerDetailScreen.name,
          pathParameters: {'clubId': organizer.id},
          extra: organizer,
        ),
      ),
    );
  });

  testWidgets(
    'OrganizerIndexRow uses club cover fallback when image is absent',
    (tester) async {
      await pumpTestApp(
        tester,
        OrganizerIndexRow(
          organizer: buildOrganizer(name: 'No Cover Club', area: 'Signal Hill'),
          isJoined: false,
        ),
      );

      expect(find.byType(OrganizerPlaceholderCover), findsWidgets);
      expect(find.text('NC'), findsNothing);
      expect(find.byIcon(CatchIcons.location), findsOneWidget);
      // Index rows use the area/city/member line as the mono meta row; the
      // fallback artwork itself should not add a duplicate footer label.
      expect(find.text('SIGNAL HILL / MUMBAI · 1 FOLLOWER'), findsOneWidget);
    },
  );

  testWidgets('OrganizerIndexRow surfaces directory join failures', (
    tester,
  ) async {
    final fakeRepository = FakeOrganizersRepository()
      ..joinError = StateError('join failed');
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        organizersRepositoryProvider.overrideWith((ref) => fakeRepository),
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
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          home: Scaffold(
            body: Center(
              child: OrganizerIndexRow(
                organizer: buildOrganizer(id: 'club-fail', name: 'Fail Club'),
                isJoined: false,
              ),
            ),
          ),
        ),
      ),
    );
    await _pumpOrganizerUi(tester);

    await tester.tap(find.widgetWithText(CatchButton, 'Follow'));
    await tester.pump();
    await _pumpOrganizerUi(tester);

    expect(fakeRepository.joinedOrganizerId, isNull);
    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
  });

  testWidgets('OrganizerDetailBody host view stays a public club profile', (
    tester,
  ) async {
    AppConfig.configureEntrypointRole(AppRole.host);
    final organizer = buildOrganizer(
      id: 'club-host',
      area: 'Saket',
      hostName: 'Asha Host',
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
                upcomingEvents: [buildEvent(clubId: organizer.id)],
                userProfile: buildUser(uid: 'host-1'),
                uid: 'host-1',
                isHost: true,
                isMember: true,
                isAuthenticated: true,
                appRole: AppRole.host,
              ),
            ),
          ),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await _pumpOrganizerUi(tester);

    expect(find.text('Follow organizer'), findsNothing);
    expect(find.text('Following'), findsNothing);
    final scrollBackground = tester.widget<CatchSurface>(
      find
          .ancestor(
            of: find.byType(CustomScrollView),
            matching: find.byType(CatchSurface),
          )
          .first,
    );
    expect(scrollBackground.backgroundColor, CatchTokens.editorialLight.bg);
    final metrics = tester.widget<CatchMetricSection>(
      find.byType(CatchMetricSection),
    );
    expect(metrics.variant, CatchMetricSectionVariant.grid);
    expect(metrics.items.map((item) => item.label), [
      'Followers',
      'Rating',
      'Reviews',
      'Established',
    ]);
    expect(find.byIcon(CatchIcons.platformShare()), findsOneWidget);
    expect(find.text('Share'), findsNothing);
    expect(find.text('Asha Host'), findsOneWidget);
    expect(find.textContaining('OWNER · EST. JAN 2025'), findsOneWidget);
    expect(find.textContaining('VIEW PROFILE'), findsNothing);
    expect(find.text('Club host'), findsNothing);
    expect(find.text('Hosts events in Saket'), findsNothing);

    expect(find.text('HOST TOOLS'), findsNothing);
    expect(find.text('Edit organizer'), findsNothing);
    expect(find.text('Add event'), findsNothing);
    expect(find.text('Payouts'), findsNothing);
    expect(find.text('Set up payouts'), findsNothing);
    expect(find.text('Host team'), findsNothing);

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -700));
    await _pumpOrganizerUi(tester);
    expect(find.textContaining('HOSTED', findRichText: true), findsOneWidget);
  });
}
