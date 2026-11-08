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

  registerHostEventEntryTests();

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
      findsOneWidget,
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
