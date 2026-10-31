part of 'host_operations_screen_test.dart';

void _registerHostOperationsOrganizerWorkspaceTests() {
  testWidgets(
    'Host clubs keeps root primary-rail composition for auth and data errors',
    (tester) async {
      void expectStateChrome() {
        expect(find.byType(CatchRootScreenScaffold), findsOneWidget);
        expect(find.byType(CatchRootScreenPageScrollView), findsOneWidget);
        expect(find.byType(NestedScrollView), findsNothing);
        expect(
          find.byKey(const ValueKey('host-club-tab-rail')),
          findsOneWidget,
        );
        expect(find.bySubtype<CatchSliverErrorState>(), findsOneWidget);
        expect(find.byType(CatchStateViewport), findsOneWidget);
        expect(find.byType(CatchErrorScaffold), findsNothing);
        expect(find.byType(HostLoadingScreen), findsNothing);
        expect(find.byType(CatchRouteScaffold), findsNothing);
        expect(
          tester
              .widget<CatchRootScreenPageScrollView>(
                find.byType(CatchRootScreenPageScrollView),
              )
              .bodyLayout,
          CatchPageBodyMode.standard,
        );
      }

      await _pumpHostScreen(
        tester,
        const HostOrganizersScreen(),
        overrides: [
          uidProvider.overrideWithValue(
            AsyncError<String?>(StateError('auth failed'), StackTrace.current),
          ),
        ],
        resetProviderScope: true,
      );

      expectStateChrome();
      expect(find.text('Organizer'), findsOneWidget);

      await _pumpHostScreen(
        tester,
        const HostOrganizersScreen(),
        overrides: [
          uidProvider.overrideWithValue(const AsyncData<String?>(null)),
        ],
        resetProviderScope: true,
      );

      expectStateChrome();
      expect(find.text('Sign in required'), findsOneWidget);

      await _pumpHostScreen(
        tester,
        const HostOrganizersScreen(),
        overrides: [
          uidProvider.overrideWithValue(const AsyncData<String?>(_hostUid)),
          watchOrganizersHostedByProvider(
            _hostUid,
          ).overrideWithValue(const AsyncData<List<Organizer>>([])),
          watchOrganizersOwnedByProvider(_hostUid).overrideWithValue(
            AsyncError<List<Organizer>>(
              StateError('clubs failed'),
              StackTrace.current,
            ),
          ),
        ],
        resetProviderScope: true,
      );

      expectStateChrome();
      expect(find.text('Organizer'), findsOneWidget);
    },
  );

  testWidgets(
    'Host clubs keeps root primary-rail composition without an organizer',
    (tester) async {
      await _pumpHostScreen(
        tester,
        const HostOrganizersScreen(),
        overrides: _hostOrganizerOverrides(),
      );

      expect(find.byType(HostOrganizersScaffold), findsOneWidget);
      expect(find.byType(CatchRootScreenScaffold), findsOneWidget);
      expect(find.byType(CatchRootScreenPageScrollView), findsOneWidget);
      expect(find.byType(CatchSliverEmptyState), findsOneWidget);
      expect(find.byType(CatchStateViewport), findsOneWidget);
      expect(find.byKey(const ValueKey('host-club-tab-rail')), findsOneWidget);
      expect(find.text('Organizer'), findsOneWidget);
      expect(find.text('No hosted organizers yet'), findsOneWidget);
    },
  );

  testWidgets('Host Today keeps root composition for auth and route errors', (
    tester,
  ) async {
    await _pumpHostScreen(
      tester,
      HostTodayScreen(now: DateTime(2026, 6, 15, 12)),
      overrides: [
        uidProvider.overrideWithValue(const AsyncData<String?>(null)),
      ],
    );

    expect(find.byType(CatchRootScreenScaffold), findsOneWidget);
    expect(find.bySubtype<CatchSliverErrorState>(), findsOneWidget);
    expect(find.byType(CatchStateViewport), findsOneWidget);
    expect(find.byType(CatchErrorScaffold), findsNothing);
    expect(find.text('Today'), findsOneWidget);
    expect(find.text('Sign in required'), findsOneWidget);

    await _pumpHostScreen(
      tester,
      HostTodayScreen(now: DateTime(2026, 6, 15, 12)),
      overrides: [
        uidProvider.overrideWithValue(
          AsyncError<String?>(StateError('auth failed'), StackTrace.current),
        ),
      ],
    );

    expect(find.byType(CatchRootScreenScaffold), findsOneWidget);
    expect(find.bySubtype<CatchSliverErrorState>(), findsOneWidget);
    expect(find.byType(CatchStateViewport), findsOneWidget);
    expect(find.byType(CatchErrorScaffold), findsNothing);
    expect(find.text('Today'), findsOneWidget);
  });

  testWidgets('Host Today uses real countdown and routes cross-event tasks', (
    tester,
  ) async {
    final now = DateTime(2026, 6, 15, 12);
    final organizer = buildOrganizer(id: 'today-club', ownerUserId: _hostUid);
    final hero = buildEvent(
      id: 'hero-event',
      organizerId: organizer.id,
      startTime: DateTime(2026, 6, 15, 17),
    );
    final later = buildEvent(
      id: 'later-event',
      organizerId: organizer.id,
      startTime: DateTime(2026, 6, 16, 20),
      waitlistedCount: 3,
    );

    await _pumpHostScreen(
      tester,
      HostTodayScreen(now: now),
      overrides: [
        ..._hostOrganizerOverrides(
          owned: [organizer],
          timelineEventsByOrganizer: {
            organizer.id: [hero, later],
          },
        ),
        watchEventsForOrganizerProvider(
          organizer.id,
        ).overrideWithValue(AsyncData<List<Event>>([hero, later])),
      ],
    );

    expect(find.text('STARTS IN 5H 0M'), findsOneWidget);
    expect(find.text('Review waitlist'), findsOneWidget);
    expect(
      find.text('3 people are waiting for ${later.title}.'),
      findsOneWidget,
    );
    expect(find.text('Check host setup'), findsNothing);
    expect(
      tester
          .widget<HostTodayEventSection>(find.byType(HostTodayEventSection))
          .event,
      hero,
    );

    await tester.ensureVisible(find.text('Review waitlist'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Review waitlist'));
    await pumpFeatureUi(tester);
    expect(find.text('Manage ${later.id}'), findsOneWidget);
    expect(find.text('Section guests'), findsOneWidget);
  });

  testWidgets('Host Today opens a live spotlight in the run-of-show', (
    tester,
  ) async {
    final now = DateTime(2026, 6, 15, 12);
    final organizer = buildOrganizer(id: 'live-club', ownerUserId: _hostUid);
    final live = buildEvent(
      id: 'live-event',
      organizerId: organizer.id,
      startTime: DateTime(2026, 6, 15, 11),
      endTime: DateTime(2026, 6, 15, 13),
    );

    await _pumpHostScreen(
      tester,
      HostTodayScreen(now: now),
      overrides: [
        ..._hostOrganizerOverrides(
          owned: [organizer],
          timelineEventsByOrganizer: {
            organizer.id: [live],
          },
        ),
        watchEventsForOrganizerProvider(
          organizer.id,
        ).overrideWithValue(AsyncData<List<Event>>([live])),
      ],
    );

    expect(find.text('LIVE NOW'), findsOneWidget);
    expect(find.text('Open run-of-show'), findsOneWidget);
    await tester.tap(find.text('Open run-of-show'));
    await pumpFeatureUi(tester);
    expect(find.text('Manage live-event'), findsOneWidget);
    expect(find.text('Section live'), findsOneWidget);
  });

  testWidgets(
    'Host Today loading centers progress below the persistent root title',
    (tester) async {
      final now = DateTime(2026, 6, 15, 12);
      final organizer = buildOrganizer(
        id: 'today-loading-club',
        ownerUserId: _hostUid,
      );
      await _pumpHostScreen(
        tester,
        CatchRootScreenScaffold.sections(
          title: HostTodayHeader(now: now),
          children: [
            HostTodayBody(
              organizer: organizer,
              state: const HostTodayState(status: HostTodayStatus.loading),
              now: now,
              onRetry: () {},
              onOpenEvent: (_) {},
              onOpenAttention: (_) {},
              onCreateEvent: () {},
              onViewEvents: () {},
              onStartRehearsal: () {},
            ),
          ],
        ),
        settle: false,
      );
      expect(
        tester
            .widget<CatchRootScreenScaffold>(
              find.byType(CatchRootScreenScaffold),
            )
            .bodyLayout,
        CatchPageBodyMode.fullBleed,
      );
      expect(find.byType(CatchTopBar), findsOneWidget);
      expect(find.byType(HostTodayEventSection), findsNothing);
      expect(find.byType(CatchSkeleton), findsNothing);
      expect(find.byType(CatchLoadingIndicator), findsOneWidget);
      final headerBottom = tester.getRect(find.byType(CatchTopBar)).bottom;
      final progress = tester.getRect(find.byType(CircularProgressIndicator));
      expect(progress.center.dy, greaterThan(headerBottom));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Host Today error stays in the root state viewport without a club subtitle',
    (tester) async {
      final organizer = buildOrganizer(
        id: 'today-error-club',
        name: 'Saket Run Club',
        ownerUserId: _hostUid,
      );

      await _pumpHostScreen(
        tester,
        CatchRootScreenScaffold.sections(
          title: const HostTodayHeader(),
          children: [
            HostTodayBody(
              organizer: organizer,
              state: HostTodayState(
                status: HostTodayStatus.error,
                error: StateError('Event not found'),
              ),
              now: DateTime(2026, 6, 15, 12),
              onRetry: () {},
              onOpenEvent: (_) {},
              onOpenAttention: (_) {},
              onCreateEvent: () {},
              onViewEvents: () {},
              onStartRehearsal: () {},
            ),
          ],
        ),
      );

      expect(find.byType(CatchRootScreenScaffold), findsOneWidget);
      expect(find.bySubtype<CatchSliverErrorState>(), findsOneWidget);
      expect(find.byType(CatchStateViewport), findsOneWidget);
      expect(find.text('Saket Run Club'), findsNothing);
      expect(
        find.ancestor(
          of: find.byType(CatchErrorState),
          matching: find.byType(Center),
        ),
        findsNothing,
      );
    },
  );

  testWidgets('Host Today spotlight reflows at 200 percent text', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(393, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final now = DateTime(2026, 6, 15, 12);
    final organizer = buildOrganizer(
      id: 'large-text-club',
      ownerUserId: _hostUid,
    );
    final event = buildEvent(
      id: 'large-text-event',
      organizerId: organizer.id,
      startTime: DateTime(2026, 6, 15, 17),
      waitlistedCount: 23,
    );

    await _pumpHostScreen(
      tester,
      MediaQuery(
        data: const MediaQueryData(textScaler: TextScaler.linear(2)),
        child: HostTodayScreen(now: now),
      ),
      overrides: [
        ..._hostOrganizerOverrides(
          owned: [organizer],
          timelineEventsByOrganizer: {
            organizer.id: [event],
          },
        ),
        watchEventsForOrganizerProvider(
          organizer.id,
        ).overrideWithValue(AsyncData<List<Event>>([event])),
      ],
    );

    expect(find.text('STARTS IN 5H 0M'), findsOneWidget);
    expect(find.text('Continue setup'), findsOneWidget);
    final createAction = find.byKey(
      const ValueKey<String>('host-today-create-event'),
    );
    expect(createAction, findsNothing);
    expect(find.byTooltip('Create event'), findsNothing);
    expect(
      find.byKey(const ValueKey<String>('host-today-overview')),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('Today metric value and label share one wrapping text flow', (
    tester,
  ) async {
    Future<void> mount(double width) => _pumpHostScreen(
      tester,
      Scaffold(
        body: SizedBox(
          width: width,
          child: const HostTodayEventMetricTile(
            value: '1+',
            label: 'things to finish',
          ),
        ),
      ),
    );
    final text = find.byWidgetPredicate(
      (widget) =>
          widget is Text &&
          widget.textSpan?.toPlainText() == '1+ things to finish',
    );
    await mount(340);
    final wideHeight = tester.getSize(text).height;
    expect(wideHeight, lessThan(60));
    await mount(135);
    final paragraph = tester.renderObject<RenderParagraph>(
      find.descendant(of: text, matching: find.byType(RichText)),
    );
    expect(tester.getSize(text).height, greaterThan(wideHeight));
    expect(paragraph.didExceedMaxLines, isFalse);
  });

  testWidgets('Host Today retains one hierarchy on wide screens', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1200, 900);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final now = DateTime(2026, 6, 15, 12);
    final organizer = buildOrganizer(
      id: 'wide-today-club',
      ownerUserId: _hostUid,
    );
    final hero = buildEvent(
      id: 'wide-hero-event',
      organizerId: organizer.id,
      startTime: DateTime(2026, 6, 15, 17),
    );
    final later = buildEvent(
      id: 'wide-later-event',
      organizerId: organizer.id,
      startTime: DateTime(2026, 6, 16, 20),
      waitlistedCount: 3,
    );

    await _pumpHostScreen(
      tester,
      HostTodayScreen(now: now),
      overrides: [
        ..._hostOrganizerOverrides(
          owned: [organizer],
          timelineEventsByOrganizer: {
            organizer.id: [hero, later],
          },
        ),
        watchEventsForOrganizerProvider(
          organizer.id,
        ).overrideWithValue(AsyncData<List<Event>>([hero, later])),
      ],
    );

    expect(
      find.byKey(const ValueKey<String>('host-today-wide-layout')),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey<String>('host-today-primary-pane')),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey<String>('host-today-attention-pane')),
      findsNothing,
    );
    expect(find.text('Review waitlist'), findsOneWidget);
    expect(find.text('NEXT 7 DAYS'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  registerHostEventEntryTests();

  testWidgets('Host Events keeps root composition for auth and route errors', (
    tester,
  ) async {
    await _pumpHostScreen(
      tester,
      HostEventsScreen(now: DateTime(2026, 6, 15, 12)),
      overrides: [
        uidProvider.overrideWithValue(const AsyncData<String?>(null)),
      ],
    );

    expect(find.byType(CatchRootScreenScaffold), findsOneWidget);
    expect(find.bySubtype<CatchSliverErrorState>(), findsOneWidget);
    expect(find.byType(CatchStateViewport), findsOneWidget);
    expect(find.byType(CatchErrorScaffold), findsNothing);
    expect(find.text('Events'), findsOneWidget);
    expect(find.text('Sign in required'), findsOneWidget);

    await _pumpHostScreen(
      tester,
      HostEventsScreen(now: DateTime(2026, 6, 15, 12)),
      overrides: [
        uidProvider.overrideWithValue(
          AsyncError<String?>(StateError('auth failed'), StackTrace.current),
        ),
      ],
    );

    expect(find.byType(CatchRootScreenScaffold), findsOneWidget);
    expect(find.bySubtype<CatchSliverErrorState>(), findsOneWidget);
    expect(find.byType(CatchStateViewport), findsOneWidget);
    expect(find.byType(CatchErrorScaffold), findsNothing);
    expect(find.text('Events'), findsOneWidget);
  });

  testWidgets('Host events centers its canonical empty-state primitive', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'empty-club', ownerUserId: _hostUid);

    await _pumpHostScreen(
      tester,
      HostEventsScreen(now: DateTime(2026, 6, 15, 12)),
      overrides: [
        ..._hostOrganizerOverrides(owned: [organizer]),
        watchEventsForOrganizerProvider(
          organizer.id,
        ).overrideWithValue(const AsyncData<List<Event>>([])),
      ],
    );

    expect(find.text('No upcoming events'), findsOneWidget);
    final emptyState = find.byType(CatchEmptyState);
    final content = find.byType(CatchEmptyState);
    expect(find.byType(CatchStateViewport), findsOneWidget);
    expect(
      find.ancestor(of: emptyState, matching: find.byType(Center)),
      findsNothing,
    );
    final fill = tester.widget<SliverFillRemaining>(
      find
          .ancestor(of: emptyState, matching: find.byType(SliverFillRemaining))
          .first,
    );
    expect(fill.hasScrollBody, isTrue);
    expect(
      tester.getCenter(content).dx,
      closeTo(tester.getCenter(emptyState).dx, 0.5),
    );
    expect(
      tester.getCenter(content).dy,
      closeTo(tester.getCenter(emptyState).dy, 0.5),
    );
  });

  testWidgets('Host events past-only history starts at standard body rhythm', (
    tester,
  ) async {
    final now = DateTime(2026, 6, 15, 12);
    final organizer = buildOrganizer(
      id: 'history-only-club',
      ownerUserId: _hostUid,
    );
    final past = buildEvent(
      id: 'history-only-event',
      organizerId: organizer.id,
      startTime: DateTime(2026, 5, 27, 9),
      endTime: DateTime(2026, 5, 27, 10),
    );

    await _pumpHostScreen(
      tester,
      HostEventsScreen(now: now),
      overrides: [
        ..._hostOrganizerOverrides(
          owned: [organizer],
          timelineEventsByOrganizer: {
            organizer.id: [past],
          },
        ),
        watchEventsForOrganizerProvider(
          organizer.id,
        ).overrideWithValue(AsyncData<List<Event>>([past])),
      ],
    );

    expect(find.text('No upcoming events'), findsOneWidget);
    await tester.tap(find.text('Past'));
    await pumpFeatureUi(tester);
    final railRect = tester.getRect(
      find.byKey(const ValueKey('host-events-tabs')),
    );
    final historyRect = tester.getRect(find.text('MAY 2026'));
    expect(
      historyRect.top - railRect.bottom,
      closeTo(CatchInsets.pageBody.top, 0.5),
    );
  });

  testWidgets('Host events unifies lifecycle rows and repeats a past event', (
    tester,
  ) async {
    final now = DateTime(2026, 6, 15, 12);
    final organizer = buildOrganizer(id: 'club-host', ownerUserId: _hostUid);
    final past = buildEvent(
      id: 'past-event',
      organizerId: organizer.id,
      startTime: DateTime(2026, 6, 14, 9),
      endTime: DateTime(2026, 6, 14, 10),
    );
    final olderPast = buildEvent(
      id: 'older-past-event',
      organizerId: organizer.id,
      startTime: DateTime(2026, 5, 27, 9),
      endTime: DateTime(2026, 5, 27, 10),
    );
    final oldestPast = buildEvent(
      id: 'oldest-past-event',
      organizerId: organizer.id,
      startTime: DateTime(2026, 5, 18, 9),
      endTime: DateTime(2026, 5, 18, 10),
    );
    final live = buildEvent(
      id: 'live-event',
      organizerId: organizer.id,
      startTime: DateTime(2026, 6, 15, 11),
      endTime: DateTime(2026, 6, 15, 13),
    );
    final upcoming = buildEvent(
      id: 'upcoming-event',
      organizerId: organizer.id,
      startTime: DateTime(2026, 6, 16, 18),
    );

    await _pumpHostScreen(
      tester,
      HostEventsScreen(now: now),
      overrides: [
        ..._hostOrganizerOverrides(
          owned: [organizer],
          timelineEventsByOrganizer: {
            organizer.id: [oldestPast, olderPast, past, live, upcoming],
          },
        ),
        watchEventsForOrganizerProvider(organizer.id).overrideWithValue(
          AsyncData<List<Event>>([oldestPast, olderPast, past, live, upcoming]),
        ),
      ],
    );

    expect(find.text('Upcoming'), findsOneWidget);
    expect(find.text('Live'), findsNothing);
    expect(find.text('Past'), findsOneWidget);
    expect(find.text('SCHEDULE'), findsNothing);
    expect(find.byType(HostTodayEventSection), findsNothing);
    expect(
      find.byKey(const ValueKey<String>('host-event-row-live-event')),
      findsOneWidget,
    );
    expect(find.text('Repeat last event'), findsNothing);
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey<String>('host-event-row-upcoming-event')),
      300,
      scrollable: _hostEventsScrollable(),
    );
    expect(
      find.byKey(const ValueKey<String>('host-event-row-upcoming-event')),
      findsOneWidget,
    );

    await tester.tap(find.text('Past'));
    await pumpFeatureUi(tester);
    expect(
      find.byKey(const ValueKey<String>('host-event-row-past-event')),
      findsOneWidget,
    );
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey<String>('host-events-month-2026-5')),
      300,
      scrollable: _hostEventsScrollable(),
    );
    expect(
      find.byKey(const ValueKey<String>('host-event-row-older-past-event')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey<String>('host-event-row-oldest-past-event')),
      findsOneWidget,
    );

    final juneSection = find.byKey(
      const ValueKey<String>('host-events-month-2026-6'),
    );
    final maySection = find.byKey(
      const ValueKey<String>('host-events-month-2026-5'),
    );
    expect(juneSection, findsOneWidget);
    expect(maySection, findsOneWidget);
    expect(tester.widget<CatchSection>(juneSection).title, 'June 2026');
    expect(tester.widget<CatchSection>(maySection).title, 'May 2026');

    final juneFieldFinder = find.descendant(
      of: juneSection,
      matching: find.byType(CatchField),
    );
    final mayFieldFinder = find.descendant(
      of: maySection,
      matching: find.byType(CatchField),
    );
    expect(juneFieldFinder, findsOneWidget);
    expect(mayFieldFinder, findsNWidgets(2));
    expect(
      find.descendant(of: juneFieldFinder, matching: find.text(past.title)),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: juneFieldFinder,
        matching: find.textContaining('attended'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: juneFieldFinder,
        matching: find.byIcon(
          ActivityPalette.resolve(
            tester.element(juneSection),
            past.activityKind,
          ).glyph,
        ),
      ),
      findsOneWidget,
    );
    final mayDividers = tester
        .widgetList<CatchDivider>(
          find.descendant(of: maySection, matching: find.byType(CatchDivider)),
        )
        .toList();
    expect(mayDividers.map((divider) => divider.variant), [
      CatchDividerVariant.section,
      CatchDividerVariant.fieldRow,
    ]);
    final tokens = CatchTokens.of(tester.element(maySection));
    expect(
      CatchDivider.colorFor(tokens, mayDividers.last.variant),
      tokens.line.withValues(
        alpha: tokens.line.a * CatchOpacity.fieldRowDivider,
      ),
    );
    final mayRowDivider = find.descendant(
      of: maySection,
      matching: find.byWidgetPredicate(
        (widget) =>
            widget is CatchDivider &&
            widget.variant == CatchDividerVariant.fieldRow,
      ),
    );
    final mayTitle = find
        .descendant(of: mayFieldFinder.first, matching: find.byType(Text))
        .first;
    final mayHeaderRule = find.descendant(
      of: maySection,
      matching: find.byWidgetPredicate(
        (widget) =>
            widget is CatchDivider &&
            widget.variant == CatchDividerVariant.section,
      ),
    );
    expect(
      tester.getTopLeft(mayRowDivider).dx,
      closeTo(tester.getTopLeft(mayTitle).dx, 0.5),
    );
    expect(
      tester.getTopRight(mayRowDivider).dx,
      closeTo(tester.getTopRight(mayHeaderRule).dx, 0.5),
    );

    await tester.fling(_hostEventsScrollable(), const Offset(0, 1200), 10000);
    await pumpFeatureUi(tester);
    final createButton = find.byKey(
      const ValueKey<String>('host-events-create-event'),
    );
    await tester.ensureVisible(createButton);
    await pumpFeatureUi(tester);
    await tester.tap(createButton);
    await pumpFeatureUi(tester);
    expect(find.text('Repeat last event'), findsOneWidget);
    expect(
      find.text('Reuse the setup from ${past.title} and choose a new date.'),
      findsOneWidget,
    );
    await tester.tap(find.text('Repeat last event'));
    await pumpFeatureUi(tester);
    expect(find.text('Repeat ${past.id}'), findsOneWidget);
  });

  testWidgets('Host Today follows the shared organizer selection', (
    tester,
  ) async {
    final ownedOrganizer = buildOrganizer(
      id: 'owned-club',
      name: 'Sunday sea-face crew',
      ownerUserId: _hostUid,
    );
    final cohostOrganizer = buildOrganizer(
      id: 'cohost-club',
      name: 'Quizzicals',
      hostUserId: 'owner-2',
      hostUserIds: const [_hostUid],
    );
    final ownedEvent = buildEvent(
      id: 'owned-event',
      organizerId: ownedOrganizer.id,
      startTime: DateTime(2026, 6, 15, 17),
    );
    final hostedEvent = buildEvent(
      id: 'hosted-event',
      organizerId: cohostOrganizer.id,
      startTime: DateTime(2026, 6, 16, 20),
    );

    await _pumpHostScreen(
      tester,
      HostTodayScreen(now: DateTime(2026, 6, 15, 12)),
      overrides: [
        ..._hostOrganizerOverrides(
          owned: [ownedOrganizer],
          hosted: [cohostOrganizer],
          timelineEventsByOrganizer: {
            ownedOrganizer.id: [ownedEvent],
            cohostOrganizer.id: [hostedEvent],
          },
        ),
        watchEventsForOrganizerProvider(
          ownedOrganizer.id,
        ).overrideWithValue(AsyncData<List<Event>>([ownedEvent])),
        watchEventsForOrganizerProvider(
          cohostOrganizer.id,
        ).overrideWithValue(AsyncData<List<Event>>([hostedEvent])),
      ],
    );

    expect(
      tester.widget<HostTodayBody>(find.byType(HostTodayBody)).organizer,
      ownedOrganizer,
    );
    expect(
      tester
          .widget<HostTodayEventSection>(find.byType(HostTodayEventSection))
          .event,
      ownedEvent,
    );

    expect(find.byTooltip('Switch organizer'), findsNothing);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(HostTodayScreen)),
    );
    container
        .read(hostOrganizerSelectionProvider(_hostUid).notifier)
        .select(cohostOrganizer.id);
    await pumpFeatureUi(tester);

    expect(
      tester.widget<HostTodayBody>(find.byType(HostTodayBody)).organizer,
      cohostOrganizer,
    );
    expect(
      tester
          .widget<HostTodayEventSection>(find.byType(HostTodayEventSection))
          .event,
      hostedEvent,
    );
  });

  testWidgets('Host Customers follows the shared organizer selection', (
    tester,
  ) async {
    final ownedOrganizer = buildOrganizer(
      id: 'owned-club',
      name: 'Sunday sea-face crew',
      ownerUserId: _hostUid,
    );
    final cohostOrganizer = buildOrganizer(
      id: 'cohost-club',
      name: 'Quizzicals',
      hostUserId: 'owner-2',
      hostUserIds: const [_hostUid],
    );
    final directoryRequests = <HostCustomersDirectoryRequest>[];
    await _pumpHostScreen(
      tester,
      const HostCustomersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(
          owned: [ownedOrganizer],
          hosted: [cohostOrganizer],
        ),
        for (final organizer in [ownedOrganizer, cohostOrganizer])
          hostCustomerSegmentCountProvider(
            HostCustomerSegmentCountRequest(
              organizerId: organizer.id,
              filter: HostCustomerFilter.newToOrganizer,
            ),
          ).overrideWithValue(
            const AsyncData(
              HostCustomerSegmentCount(
                count: 0,
                coverage: HostCustomerMatchCountCoverage.exact,
              ),
            ),
          ),
        hostCustomersDirectoryControllerProvider.overrideWith2(
          (_) => _EmptyHostCustomersDirectoryController(directoryRequests),
        ),
      ],
    );

    expect(directoryRequests.last.organizerId, ownedOrganizer.id);
    expect(find.byTooltip('Switch organizer'), findsNothing);
    expect(find.text('People'), findsOneWidget);
    expect(find.text('Groups'), findsOneWidget);
    expect(find.text('Campaigns'), findsNothing);
    expect(
      tester.widget<CatchTopBar>(find.byType(CatchTopBar)).subtitle,
      isNull,
    );
    expect(
      find.descendant(
        of: find.byType(CatchTopBar),
        matching: find.byKey(
          const ValueKey<String>('host-customers-add-customer'),
        ),
      ),
      findsOneWidget,
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(HostCustomersScreen)),
    );
    container
        .read(hostOrganizerSelectionProvider(_hostUid).notifier)
        .select(cohostOrganizer.id);
    await pumpFeatureUi(tester);

    expect(directoryRequests.last.organizerId, cohostOrganizer.id);
  });

  testWidgets('Host clubs defaults to the consolidated edit workspace', (
    tester,
  ) async {
    final ownedOrganizer = buildOrganizer(
      id: 'owned-club',
      name: 'Sunday sea-face crew',
      description: 'Dawn runs along the Bandra seafront, every Sunday.',
      location: 'in-dl-delhi-ncr',
      ownerUserId: _hostUid,
      tags: const ['social run', 'coffee', 'beginner'],
      memberCount: 128,
      rating: 4.8,
      reviewCount: 42,
      hostProfiles: const [
        OrganizerHostProfile(
          uid: _hostUid,
          displayName: 'Owner Host',
          role: OrganizerHostRole.owner,
        ),
        OrganizerHostProfile(uid: 'co-host', displayName: 'Co Host'),
      ],
    );

    await _pumpHostScreen(
      tester,
      const HostOrganizersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(owned: [ownedOrganizer]),
        watchHostPaymentAccountsProvider(
          _hostUid,
        ).overrideWithValue(const AsyncData<List<HostPaymentAccount>>([])),
      ],
    );

    expect(
      find.byKey(const ValueKey('host-club-insights-summary')),
      findsNothing,
    );
    expect(find.text('How guests see you'), findsNothing);
    expect(find.text('Public page'), findsNothing);
    expect(find.text('Preview'), findsWidgets);
    final editSections = tester
        .widgetList<CatchSection>(
          find.descendant(
            of: find.byType(HostOrganizerEditBody),
            matching: find.byType(CatchSection),
          ),
        )
        .toList();
    final titledSections = editSections
        .where((section) => section.title != null)
        .toList();
    expect(titledSections, hasLength(5));
    expect(titledSections.map((section) => section.title), [
      'Public visibility',
      'Media',
      'Identity',
      'Contact',
      'Organizer settings',
    ]);
    for (final title in [
      'Public visibility',
      'Media',
      'Identity',
      'Contact',
      'Organizer settings',
    ]) {
      expect(
        find.byWidgetPredicate(
          (widget) => widget is CatchSection && widget.title == title,
        ),
        findsOneWidget,
      );
    }
    expect(find.text('CLUB LOGO'), findsNothing);
    expect(find.text('PHOTOS'), findsNothing);
    expect(find.text('Event defaults'), findsOneWidget);
    expect(find.text('Live event guide'), findsOneWidget);
    expect(find.text('Payments'), findsOneWidget);
    expect(find.text('Host team'), findsOneWidget);
    expect(
      find.byKey(const ValueKey<String>('host-organizer-sign-out')),
      findsOneWidget,
    );
    expect(find.byTooltip('Host team'), findsNothing);
    expect(find.text('Trends · last 12 weeks'), findsNothing);
    expect(find.text('See insights'), findsNothing);
    expect(find.byType(HostAnalyticsTrendSection), findsNothing);
    expect(find.text('Manage'), findsNothing);
    expect(find.text('Team · 2'), findsNothing);
    expect(find.text('Connect payouts to get paid'), findsNothing);
    expect(find.textContaining('DELHI NCR'), findsNothing);
    expect(find.textContaining('IN-DL-DELHI-NCR'), findsNothing);
    expect(
      tester
          .widgetList<CatchBadge>(find.byType(CatchBadge))
          .where((badge) => badge.label.toLowerCase() == 'social run'),
      isEmpty,
    );

    final hostTeamRow = find.byKey(
      const ValueKey('host-club-settings-host-team'),
    );
    await tester.ensureVisible(hostTeamRow);
    await pumpFeatureUi(tester);
    await tester.tap(hostTeamRow);
    await pumpFeatureUi(tester);

    expect(find.byType(HostOrganizerTeamScreen), findsOneWidget);
    expect(
      find.byKey(const ValueKey<String>('host-organizer-sign-out')),
      findsNothing,
    );
  });
}
