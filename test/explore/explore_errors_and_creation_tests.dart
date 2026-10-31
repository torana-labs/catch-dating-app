part of 'explore_widgets_test.dart';

void _registerExploreErrorsAndCreationTests() {
  testWidgets('ExploreMapScreen keeps browsing after location is unavailable', (
    tester,
  ) async {
    final organizer = buildOrganizer(
      id: 'club-map-location-denied',
      name: 'Location Optional Club',
    );
    final event = event_test.buildEvent(
      id: 'event-map-location-denied',
      organizerId: organizer.id,
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
          builder: catchNoticeOverlayBuilder,
          home: const ExploreMapScreen(enableNetworkTiles: false),
        ),
      ),
    );
    await _pumpOrganizerUi(tester);

    await tester.tap(find.text('Use my location'));
    await tester.pump();

    expect(
      find.text('Location is unavailable. You can still browse the map.'),
      findsOneWidget,
    );
    final container = ProviderScope.containerOf(
      tester.element(find.byType(ExploreMapScreen)),
    );
    expect(
      container.read(exploreFiltersProvider).distanceFilter,
      ExploreDistanceFilter.any,
    );
    expect(find.byType(CatchDistanceOverlay), findsNothing);
    expect(find.byType(EventPinsFallbackMap), findsOneWidget);
    expect(find.bySemanticsLabel('Select Carter Road'), findsOneWidget);
  });

  testWidgets('ExploreMapScreen selects pin before navigating from card', (
    tester,
  ) async {
    final organizer = buildOrganizer(
      id: 'club-map-nav',
      name: 'Race Course Road Club',
    );
    final event = event_test.buildEvent(
      id: 'event-map-nav',
      organizerId: organizer.id,
      meetingPoint: 'Race Course Road main gate',
      startTime: DateTime.now().add(const Duration(days: 1)),
    );
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (_, _) => const ExploreMapScreen(enableNetworkTiles: false),
        ),
        GoRoute(
          path: '/events/:organizerId/:eventId',
          name: Routes.eventDetailScreen.name,
          builder: (_, state) {
            final extra = state.extra as EventDetailRouteExtra?;
            return Text(
              [
                'Event ${state.pathParameters['eventId']}',
                extra?.transition.name,
                extra?.heroTag,
              ].whereType<Object>().join(' · '),
              textDirection: TextDirection.ltr,
            );
          },
        ),
      ],
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
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await _pumpOrganizerUi(tester);

    expect(find.byType(EventDateRailCard), findsNothing);
    expect(find.textContaining('Event event-map-nav'), findsNothing);

    await tester.tap(
      find.bySemanticsLabel('Select Race Course Road main gate'),
    );
    await tester.pump(CatchMotion.fast);

    expect(find.byType(EventDateRailCard), findsOneWidget);
    expect(find.text('Social run'), findsOneWidget);
    expect(find.textContaining('Event event-map-nav'), findsNothing);

    await tester.tap(find.text('Social run'));
    await _pumpOrganizerUi(tester);

    expect(
      find.text(
        'Event event-map-nav · mapSelectedCard · event-ticket-map-event-map-nav',
      ),
      findsOneWidget,
    );
  });

  testWidgets('ExploreMapScreen opens selected external event source', (
    tester,
  ) async {
    final externalEvent = _buildExternalExploreEvent(
      id: 'external-map-outbound',
      title: 'Bandra mixer night',
    );
    Uri? openedUri;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          cityListProvider.overrideWith((ref) async => _testCities),
          deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
          appAnalyticsProvider.overrideWithValue(
            AppAnalytics(shouldCollect: false),
          ),
          externalUrlLauncherProvider.overrideWithValue((
            Uri uri, {
            LaunchMode mode = LaunchMode.platformDefault,
          }) async {
            openedUri = uri;
            return true;
          }),
          exploreFeedViewModelProvider.overrideWithValue(
            AsyncData(
              ExploreFeedViewModel(
                items: const [],
                externalItems: [ExploreExternalEventItem(event: externalEvent)],
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

    await tester.tap(find.bySemanticsLabel('Select Bandra Amphitheatre'));
    await tester.pump(CatchMotion.fast);

    expect(find.text('Bandra mixer night'), findsOneWidget);
    final outboundAction = find.widgetWithText(CatchButton, 'Open');
    expect(outboundAction, findsOneWidget);

    await tester.tap(outboundAction);
    await tester.pump();

    expect(
      openedUri,
      Uri.parse('https://district.example/events/external-event-only'),
    );
  });

  testWidgets('ExploreMapScreen background tap dismisses selected card', (
    tester,
  ) async {
    final organizer = buildOrganizer(
      id: 'club-map-clear',
      name: 'Map Clear Club',
    );
    final event = event_test.buildEvent(
      id: 'event-map-clear',
      organizerId: organizer.id,
      meetingPoint: 'Clearable Pin Point',
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
          home: const ExploreMapScreen(enableNetworkTiles: false),
        ),
      ),
    );
    await _pumpOrganizerUi(tester);

    await tester.tap(find.bySemanticsLabel('Select Clearable Pin Point'));
    await tester.pump(CatchMotion.fast);
    expect(find.byType(EventDateRailCard), findsOneWidget);

    await tester.tapAt(const Offset(24, 220));
    await _pumpOrganizerUi(tester);

    expect(find.byType(EventDateRailCard), findsNothing);
  });

  testWidgets(
    'ExploreMapScreen clears selected card when feed refresh drops event',
    (tester) async {
      var showSelectedEvent = true;
      final organizer = buildOrganizer(
        id: 'club-map-refresh',
        name: 'Map Refresh Club',
      );
      final event = event_test.buildEvent(
        id: 'event-map-refresh',
        organizerId: organizer.id,
        meetingPoint: 'Refresh Pin Point',
        startTime: DateTime.now().add(const Duration(days: 1)),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            cityListProvider.overrideWith((ref) async => _testCities),
            deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
            exploreFeedViewModelProvider.overrideWith((ref) {
              return AsyncData(
                ExploreFeedViewModel(
                  items: showSelectedEvent
                      ? [
                          ExploreEventItem(
                            event: event,
                            organizer: organizer,
                            status: EventTileStatus.open,
                          ),
                        ]
                      : const <ExploreEventItem>[],
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

      await tester.tap(find.bySemanticsLabel('Select Refresh Pin Point'));
      await tester.pump(CatchMotion.fast);
      expect(find.byType(EventDateRailCard), findsOneWidget);

      final ProviderContainer container = ProviderScope.containerOf(
        tester.element(find.byType(ExploreMapScreen)),
      );
      showSelectedEvent = false;
      container.invalidate(exploreFeedViewModelProvider);
      await tester.pump();
      await _pumpOrganizerUi(tester);

      expect(find.byType(EventDateRailCard), findsNothing);
    },
  );

  testWidgets(
    'ExploreMapScreen clears selected card when selected event loses its pin',
    (tester) async {
      var showExactPin = true;
      final organizer = buildOrganizer(
        id: 'club-map-pin-loss',
        name: 'Map Pin Club',
      );
      final pinnedEvent = event_test.buildEvent(
        id: 'event-map-pin-loss',
        organizerId: organizer.id,
        meetingPoint: 'Pin Loss Point',
        startTime: DateTime.now().add(const Duration(days: 1)),
      );
      final unpinnedEvent = pinnedEvent.copyWith(
        meetingLocation: null,
        startingPointLat: null,
        startingPointLng: null,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            cityListProvider.overrideWith((ref) async => _testCities),
            deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
            exploreFeedViewModelProvider.overrideWith((ref) {
              return AsyncData(
                ExploreFeedViewModel(
                  items: [
                    ExploreEventItem(
                      event: showExactPin ? pinnedEvent : unpinnedEvent,
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

      await tester.tap(find.bySemanticsLabel('Select Pin Loss Point'));
      await tester.pump(CatchMotion.fast);
      expect(find.byType(EventDateRailCard), findsOneWidget);

      final container = ProviderScope.containerOf(
        tester.element(find.byType(ExploreMapScreen)),
      );
      showExactPin = false;
      container.invalidate(exploreFeedViewModelProvider);
      await tester.pump();
      await _pumpOrganizerUi(tester);

      expect(find.bySemanticsLabel('Select Pin Loss Point'), findsNothing);
      expect(find.byType(EventDateRailCard), findsNothing);
    },
  );

  testWidgets('ExploreScreen shows Explore-specific error copy', (
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
            const AsyncError(
              BackendOperationException(
                code: 'failed-precondition',
                message:
                    'This list is still getting set up. Please try again in a moment.',
                debugMessage:
                    'Firestore query requires a composite required index.',
                context: BackendErrorContext(
                  service: BackendService.firestore,
                  action: 'watch clubs by location',
                  resource: 'clubs',
                ),
                retryable: true,
              ),
              StackTrace.empty,
            ),
          ),
          _emptyExploreFeedOverride,
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ExploreScreen()),
      ),
    );
    await tester.pump();

    final rootScaffold = tester.widget<CatchRootScreenScaffold>(
      find.byType(CatchRootScreenScaffold),
    );
    expect(rootScaffold.actions, isNotNull);
    expect(
      tester
          .widget<CatchRootScreenPageScrollView>(
            find.byType(CatchRootScreenPageScrollView),
          )
          .bodyLayout,
      CatchPageBodyMode.fullBleed,
    );
    expect(
      rootScaffold.topEdge,
      CatchRootScreenScrollViewPlacement.headerOwned,
    );
    expect(find.text('Explore unavailable'), findsOneWidget);
    expect(
      find.text(
        'Explore is still getting set up. Please try again in a moment.',
      ),
      findsOneWidget,
    );
    expect(find.text('Reload Explore'), findsOneWidget);
    expect(find.text('Club unavailable'), findsNothing);
    expect(find.text('Reload club'), findsNothing);
  });

  testWidgets('ExploreScreen listens for join mutation errors', (tester) async {
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        cityListProvider.overrideWith((ref) async => _testCities),
        deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
        watchOrganizersByLocationProvider(
          'mumbai',
        ).overrideWith((ref) => Stream.value([buildOrganizer(id: 'club-err')])),
        exploreOrganizersViewModelProvider.overrideWithValue(
          AsyncData(
            ExploreViewModel(
              joinedOrganizers: const [],
              allOrganizers: [buildOrganizer(id: 'club-err')],
            ),
          ),
        ),
        uidProvider.overrideWith((ref) => Stream.value(null)),
        _emptyExploreFeedOverride,
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          home: const ExploreScreen(),
        ),
      ),
    );
    await tester.pump();

    try {
      await OrganizerMembershipController.joinMutation.run(container, (
        tx,
      ) async {
        throw StateError('join failed');
      });
    } catch (_) {}
    await _pumpOrganizerUi(tester);

    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
  });

  testWidgets(
    'OrganizerDetailScreen uses initialOrganizer while live data is still loading',
    (tester) async {
      final organizer = buildOrganizer(name: 'Initial Club');
      final controller = StreamController<Organizer?>.broadcast();
      addTearDown(controller.close);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchOrganizerProvider(
              organizer.id,
            ).overrideWith((ref) => controller.stream),
            watchEventsForOrganizerProvider(
              organizer.id,
            ).overrideWith((ref) => Stream.value(const <Event>[])),
            watchReviewsForOrganizerProvider(
              organizer.id,
            ).overrideWith((ref) => Stream.value(const <Review>[])),
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            watchUserProfileProvider.overrideWith(
              (ref) => Stream.value(buildUser(uid: 'runner-1')),
            ),
            watchOrganizerMembershipProvider(
              organizer.id,
              'runner-1',
            ).overrideWith((ref) => Stream.value(null)),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: OrganizerDetailScreen(
              organizerId: organizer.id,
              initialOrganizer: organizer,
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Initial Club'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    },
  );

  testWidgets('OrganizerDetailScreen shows detail-provider errors', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value(null)),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
          organizerDetailViewModelProvider('club-err').overrideWithValue(
            AsyncError(StateError('detail failed'), StackTrace.empty),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const OrganizerDetailScreen(organizerId: 'club-err'),
        ),
      ),
    );
    await tester.pump();

    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
  });

  testWidgets('OrganizerDetailScreen shows a not-found state', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value(null)),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
          organizerDetailViewModelProvider(
            'club-missing',
          ).overrideWithValue(const AsyncData(null)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const OrganizerDetailScreen(organizerId: 'club-missing'),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Organizer not found'), findsOneWidget);
    expect(find.text('This organizer is no longer available.'), findsOneWidget);
  });

  testWidgets('OrganizerDetailScreen listens for join mutation errors', (
    tester,
  ) async {
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream.value(buildUser(uid: 'runner-1')),
        ),
        watchOrganizerMembershipProvider(
          'club-1',
          'runner-1',
        ).overrideWith((ref) => Stream.value(null)),
        organizerDetailViewModelProvider('club-1').overrideWithValue(
          AsyncData(
            OrganizerDetailViewModel(
              organizer: buildOrganizer(),
              isHost: false,
              isMember: false,
              upcomingEvents: const [],
              reviews: const [],
              userProfile: buildUser(uid: 'runner-1'),
              uid: 'runner-1',
              isAuthenticated: true,
            ),
          ),
        ),
      ],
    );

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          home: const OrganizerDetailScreen(organizerId: 'club-1'),
        ),
      ),
    );
    await tester.pump();

    try {
      await OrganizerMembershipController.joinMutation.run(container, (
        tx,
      ) async {
        throw StateError('join failed');
      });
    } catch (_) {}
    await tester.pump();

    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
    OrganizerMembershipController.joinMutation.reset(container);
    await tester.pumpWidget(const MaterialApp(home: SizedBox.shrink()));
    container.dispose();
    await _pumpOrganizerUi(tester);
  });

  testWidgets('OrganizerDetailScreen listens for leave mutation errors', (
    tester,
  ) async {
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream.value(buildUser(uid: 'runner-1')),
        ),
        watchOrganizerMembershipProvider(
          'club-1',
          'runner-1',
        ).overrideWith((ref) => Stream.value(null)),
        organizerDetailViewModelProvider('club-1').overrideWithValue(
          AsyncData(
            OrganizerDetailViewModel(
              organizer: buildOrganizer(),
              isHost: false,
              isMember: true,
              upcomingEvents: const [],
              reviews: const [],
              userProfile: buildUser(uid: 'runner-1'),
              uid: 'runner-1',
              isAuthenticated: true,
            ),
          ),
        ),
      ],
    );

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          home: const OrganizerDetailScreen(organizerId: 'club-1'),
        ),
      ),
    );
    await tester.pump();

    try {
      await OrganizerMembershipController.leaveMutation.run(container, (
        tx,
      ) async {
        throw StateError('leave failed');
      });
    } catch (_) {}
    await tester.pump();

    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
    OrganizerMembershipController.leaveMutation.reset(container);
    await tester.pumpWidget(const MaterialApp(home: SizedBox.shrink()));
    container.dispose();
    await _pumpOrganizerUi(tester);
  });

  testWidgets('CreateOrganizerScreen picks and previews club photos', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    const transparentPixel =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==';
    final fakeImageUploadRepository = FakeImageUploadRepository(
      pickedImages: [
        XFile.fromData(
          base64Decode(transparentPixel),
          name: 'club-photo-test.png',
          mimeType: 'image/png',
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          imageUploadRepositoryProvider.overrideWith(
            (ref) => fakeImageUploadRepository,
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const CreateOrganizerScreen(restoreSavedDraft: false),
        ),
      ),
    );
    await _pumpOrganizerUi(tester);

    // Cover picker sits below the fold in the create form — scroll it into
    // view before tapping (standard for a long scrollable form).
    await tester.ensureVisible(find.text('Add organizer photos'));
    await _pumpOrganizerUi(tester);
    await tester.tap(find.text('Add organizer photos'));
    await _pumpOrganizerUi(tester);

    expect(find.bySemanticsLabel('Photo 1'), findsOneWidget);
  });

  testWidgets('CreateOrganizerScreen shows mutation errors inline', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [uidProvider.overrideWith((ref) => Stream.value(null))],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          home: const CreateOrganizerScreen(restoreSavedDraft: false),
        ),
      ),
    );
    await tester.pump();

    try {
      await CreateOrganizerController.submitMutation.run(container, (tx) async {
        throw StateError('create failed');
      });
    } catch (_) {}
    await _pumpOrganizerUi(tester);

    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
  });

  testWidgets(
    'CreateOrganizerScreen freezes route and draft controls while submit is pending',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final pendingSubmit = Completer<void>();

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: AppTheme.light,
            home: const CreateOrganizerScreen(restoreSavedDraft: false),
          ),
        ),
      );
      await tester.pump();

      final request = CreateOrganizerController.submitMutation.run(
        container,
        (_) => pendingSubmit.future,
      );
      await tester.pump();

      expect(
        tester
            .widget<CatchStepHeader>(find.byType(CatchStepHeader))
            .leadingType,
        CatchTopBarNavigationMode.close,
      );
      expect(
        tester
            .widget<CatchField>(
              find.byWidgetPredicate(
                (widget) =>
                    widget is CatchField && widget.title == 'Organizer name',
              ),
            )
            .enabled,
        isFalse,
      );
      expect(find.text('Save draft'), findsNothing);
      expect(
        find.byWidgetPredicate(
          (widget) => widget is PopScope<dynamic> && !widget.canPop,
        ),
        findsWidgets,
      );

      pendingSubmit.complete();
      await request;
      await tester.pump();
    },
  );

  testWidgets(
    'CreateOrganizerScreen reviews and pops after a successful submit',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final fakeRepository = FakeOrganizersRepository();
      final fakeImageUploadRepository = FakeImageUploadRepository(
        pickedImage: XFile('/tmp/club-cover.jpg'),
      );
      final container = ProviderContainer(
        overrides: [
          organizersRepositoryProvider.overrideWith((ref) => fakeRepository),
          imageUploadRepositoryProvider.overrideWith(
            (ref) => fakeImageUploadRepository,
          ),
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(buildUser(uid: 'host-1', name: 'Priya')),
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
      final userProfileSubscription = container.listen(
        watchUserProfileProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(userProfileSubscription.close);
      await container.pump();
      await container.pump();

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: AppTheme.light,
            home: Builder(
              builder: (context) => Scaffold(
                body: Center(
                  child: FilledButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const CreateOrganizerScreen(
                          restoreSavedDraft: false,
                        ),
                      ),
                    ),
                    child: const Text('Open create screen'),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open create screen'));
      await _pumpOrganizerUi(tester);

      await tester.tap(find.text('Next'));
      await _pumpOrganizerUi(tester);

      expect(find.text('Organizer details'), findsOneWidget);
      expect(find.text('Please enter an organizer name'), findsNothing);

      await tester.tap(find.text('Previous'));
      await _pumpOrganizerUi(tester);
      expect(find.text('Organizer basics'), findsOneWidget);

      await tester.enterText(
        find.descendant(
          of: _field('Organizer name'),
          matching: find.byType(EditableText),
        ),
        'Sunset Striders',
      );
      await tester.enterText(
        find.descendant(
          of: _field('Area / neighbourhood'),
          matching: find.byType(EditableText),
        ),
        'Bandra',
      );

      tester.testTextInput.hide();
      await tester.pump();
      final cityField = _field('City');
      await tester.ensureVisible(cityField);
      await tester.tap(cityField);
      await _pumpOrganizerUi(tester);
      await tester.tap(_fieldChoice('Mumbai'));
      await _pumpOrganizerUi(tester);

      await tester.tap(find.text('Next'));
      await _pumpOrganizerUi(tester);

      await tester.tap(find.text('Next'));
      await _pumpOrganizerUi(tester);

      expect(find.text('DEFAULT EVENT POLICY'), findsOneWidget);

      await tester.tap(find.text('Previous'));
      await _pumpOrganizerUi(tester);

      await tester.enterText(
        find.descendant(
          of: _field('Description'),
          matching: find.byType(EditableText),
        ),
        'Easy social club',
      );
      tester.testTextInput.hide();
      await tester.pump();

      await tester.tap(find.text('Next'));
      await _pumpOrganizerUi(tester);

      expect(find.text('DEFAULT EVENT POLICY'), findsOneWidget);
      expect(_field('Cohort caps'), findsOneWidget);
      await tester.tap(_field('Admission format'));
      await _pumpOrganizerUi(tester);
      expect(_fieldOptionCard('OPEN', selected: true), findsOneWidget);

      await tester.tap(find.text('Next'));
      await _pumpOrganizerUi(tester);

      expect(find.text('Live event guide'), findsOneWidget);
      expect(_field('Live event guide'), findsOneWidget);

      await tester.tap(find.text('Review organizer'));
      await _pumpOrganizerUi(tester);

      expect(find.text('COMPLETE'), findsNWidgets(2));
      expect(find.text('OPTIONAL'), findsNWidgets(2));

      await tester.tap(find.text('Create organizer'));
      await _pumpOrganizerUi(tester);

      expect(find.text('Open create screen'), findsOneWidget);
      expect(fakeRepository.lastCreateCall, isNotNull);
      expect(fakeRepository.lastCreateCall!.name, 'Sunset Striders');
    },
  );
}
