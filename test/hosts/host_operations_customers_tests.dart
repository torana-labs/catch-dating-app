part of 'host_operations_screen_test.dart';

void _registerHostOperationsCustomersTests() {
  testWidgets('Host Customers keeps Audience composition across route states', (
    tester,
  ) async {
    for (final view in [HostAudienceView.people, HostAudienceView.audiences]) {
      final screen = HostCustomersScreen(initialView: view);

      await _pumpHostScreen(
        tester,
        screen,
        overrides: [
          uidProvider.overrideWithValue(const AsyncLoading<String?>()),
          hostOperableClubsProvider(
            _hostUid,
          ).overrideWithValue(const AsyncLoading<List<Club>>()),
        ],
        settle: false,
        resetProviderScope: true,
      );
      _expectAudienceStateOwner(tester, selected: view);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byType(CatchStateViewport), findsOneWidget);

      await _pumpHostScreen(
        tester,
        screen,
        overrides: [
          uidProvider.overrideWithValue(
            AsyncError<String?>(StateError('uid failed'), StackTrace.current),
          ),
          hostOperableClubsProvider(
            _hostUid,
          ).overrideWithValue(const AsyncLoading<List<Club>>()),
        ],
        settle: false,
        resetProviderScope: true,
      );
      _expectAudienceStateOwner(tester, selected: view);
      expect(find.bySubtype<CatchSliverErrorState>(), findsOneWidget);

      await _pumpHostScreen(
        tester,
        screen,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData<String?>(null)),
          hostOperableClubsProvider(
            _hostUid,
          ).overrideWithValue(const AsyncLoading<List<Club>>()),
        ],
        settle: false,
        resetProviderScope: true,
      );
      _expectAudienceStateOwner(tester, selected: view);
      expect(find.bySubtype<CatchSliverErrorState>(), findsOneWidget);
      expect(find.text('Sign in required'), findsOneWidget);

      await _pumpHostScreen(
        tester,
        screen,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData<String?>(_hostUid)),
          hostOperableClubsProvider(
            _hostUid,
          ).overrideWithValue(const AsyncLoading<List<Club>>()),
        ],
        settle: false,
        resetProviderScope: true,
      );
      _expectAudienceStateOwner(tester, selected: view);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byType(CatchStateViewport), findsOneWidget);

      await _pumpHostScreen(
        tester,
        screen,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData<String?>(_hostUid)),
          hostOperableClubsProvider(_hostUid).overrideWithValue(
            AsyncError<List<Club>>(
              StateError('clubs failed'),
              StackTrace.current,
            ),
          ),
        ],
        settle: false,
        resetProviderScope: true,
      );
      _expectAudienceStateOwner(tester, selected: view);
      expect(find.bySubtype<CatchSliverErrorState>(), findsOneWidget);

      await _pumpHostScreen(
        tester,
        screen,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData<String?>(_hostUid)),
          hostOperableClubsProvider(
            _hostUid,
          ).overrideWithValue(const AsyncData<List<Club>>([])),
        ],
        settle: false,
        resetProviderScope: true,
      );
      _expectAudienceStateOwner(tester, selected: view);
      expect(find.byType(HostAudienceNoOrganizerEmptyState), findsOneWidget);
      expect(find.byType(CatchSliverEmptyState), findsOneWidget);
      final createButton = tester.widget<CatchButton>(
        find.descendant(
          of: find.byType(CatchSliverEmptyState),
          matching: find.byType(CatchButton),
        ),
      );
      expect(createButton.size, CatchButtonSize.lg);
    }
  });

  testWidgets('customer rows preserve hierarchy, tag, and disclosure', (
    tester,
  ) async {
    var tapped = false;
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: _customerFieldFixture(
          contact: _customerDirectoryContact(),
          onTap: () => tapped = true,
        ),
      ),
    );

    final row = find.byType(CatchField);
    expect(
      find.descendant(of: row, matching: find.text('Ananya Rao')),
      findsOne,
    );
    expect(
      find.descendant(of: row, matching: find.textContaining('8 events')),
      findsOne,
    );
    expect(find.descendant(of: row, matching: find.text('Regular')), findsOne);
    expect(
      find.byKey(const ValueKey<String>('catch-row-press-overlay')),
      findsNothing,
    );
    expect(
      find.descendant(
        of: row,
        matching: find.byIcon(CatchIcons.chevronRightRounded),
      ),
      findsOne,
    );

    final name = tester.widget<Text>(find.text('Ananya Rao'));
    final metadata = tester.widget<Text>(find.textContaining('8 events'));
    final avatar = tester.widget<CatchAvatar>(
      find.descendant(of: row, matching: find.byType(CatchAvatar)),
    );
    expect(avatar.size, CatchSpacing.s10);
    expect(tester.getSize(row).height, greaterThanOrEqualTo(72));
    expect(name.style!.fontSize!, greaterThan(metadata.style!.fontSize!));

    await tester.tap(row);
    expect(tapped, isTrue);
  });

  testWidgets('saved audiences render populated, empty, and error states', (
    tester,
  ) async {
    const organizerId = 'organizer-1';
    final audience = HostSavedAudience(
      organizerId: organizerId,
      audienceId: 'repeat-runners',
      name: 'Repeat runners',
      status: 'active',
      definition: const HostSavedAudienceDefinition(
        join: HostSavedAudienceJoin.all,
        predicates: [
          HostSavedAudienceComputedSegment(HostAudienceSegment.repeatAttendee),
        ],
      ),
      definitionHash: 'repeat-runners-hash',
      definitionVersion: 1,
      revision: 2,
      lastPreviewMatchCount: 24,
      lastPreviewReachSummary: const HostAudienceReachSummary(
        inCatch: 14,
        automatic: 0,
        byHand: 8,
        unavailable: 2,
      ),
      lastPreviewAt: DateTime(2026, 8, 29),
      createdAt: DateTime(2026, 8, 28),
      updatedAt: DateTime(2026, 8, 29),
    );

    await _pumpHostScreen(
      tester,
      CatchRootScreenScaffold.withPrimaryRail(
        header: const CatchRootScreenHeader.title(title: 'Customers'),
        actions: const _CustomersTestPrimaryRail(),
        body: CatchRootScreenBody.single(
          page: CatchRootScreenPageSpec.scroll(
            page: HostSavedAudiencesWorkspace(
              organizerId: organizerId,
              query: null,

              onOpen: (_) {},
            ),
          ),
        ),
      ),
      resetProviderScope: true,
      overrides: [
        hostGroupDirectoryControllerProvider.overrideWith2(
          (_) => _FixedHostGroupDirectoryController(
            AsyncData(
              HostSavedAudiencePage(audiences: [audience], nextCursor: null),
            ),
          ),
        ),
      ],
    );
    expect(find.text('Repeat runners'), findsOneWidget);
    expect(find.textContaining('24 people · Checked'), findsOneWidget);
    expect(find.text('New group'), findsNothing);
    expect(find.text('Archive'), findsNothing);

    await _pumpHostScreen(
      tester,
      CatchRootScreenScaffold.withPrimaryRail(
        header: const CatchRootScreenHeader.title(title: 'Customers'),
        actions: const _CustomersTestPrimaryRail(),
        body: CatchRootScreenBody.single(
          page: CatchRootScreenPageSpec.scroll(
            page: HostSavedAudiencesWorkspace(
              organizerId: organizerId,
              query: null,

              onOpen: (_) {},
            ),
          ),
        ),
      ),
      resetProviderScope: true,
      overrides: [
        hostGroupDirectoryControllerProvider.overrideWith2(
          (_) => _FixedHostGroupDirectoryController(
            const AsyncData(
              HostSavedAudiencePage(audiences: [], nextCursor: null),
            ),
          ),
        ),
      ],
    );
    expect(find.text('No groups yet'), findsOneWidget);

    await _pumpHostScreen(
      tester,
      CatchRootScreenScaffold.withPrimaryRail(
        header: const CatchRootScreenHeader.title(title: 'Customers'),
        actions: const _CustomersTestPrimaryRail(),
        body: CatchRootScreenBody.single(
          page: CatchRootScreenPageSpec.scroll(
            page: HostSavedAudiencesWorkspace(
              organizerId: organizerId,
              query: null,

              onOpen: (_) {},
            ),
          ),
        ),
      ),
      resetProviderScope: true,
      overrides: [
        hostGroupDirectoryControllerProvider.overrideWith2(
          (_) => _FixedHostGroupDirectoryController(
            AsyncError(StateError('unavailable'), StackTrace.empty),
          ),
        ),
      ],
    );
    expect(find.text('Customers unavailable'), findsOneWidget);
  });

  testWidgets('ambiguous customer keeps warning and disclosure affordances', (
    tester,
  ) async {
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: _customerFieldFixture(
          contact: _customerDirectoryContact(hasAmbiguousIdentity: true),
          onTap: () {},
        ),
      ),
    );

    final row = find.byType(CatchField);
    final warning = tester.widget<CatchBadge>(
      find.descendant(of: row, matching: find.byType(CatchBadge)),
    );
    expect(warning.label, 'Needs review');
    expect(warning.tone, CatchBadgeTone.warning);
    expect(
      find.descendant(
        of: row,
        matching: find.byIcon(CatchIcons.chevronRightRounded),
      ),
      findsOne,
    );
  });

  testWidgets('customer directory uses shared person-row feedback', (
    tester,
  ) async {
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: CustomScrollView(
          slivers: [
            HostCustomersList(
              state: HostCustomersDirectoryState(
                contacts: [
                  _customerDirectoryContact(),
                  _customerDirectoryContact(contactId: 'contact-2'),
                ],
                nextCursor: null,
                matchCount: 2,
                matchCountCoverage: HostCustomerMatchCountCoverage.exact,
                sourceCoverage: HostCustomerDirectoryCoverage.exact,
                projectionVersion: 1,
              ),
              hasActiveQuery: false,
              onCustomerSelected: (_) {},
              onLoadMore: null,
              onRefreshCoverage: () {},
            ),
          ],
        ),
      ),
    );

    final frame = find.byKey(const ValueKey('host-customers-directory-list'));
    expect(
      find.descendant(of: frame, matching: find.byType(CatchField)),
      findsNWidgets(2),
    );
    expect(
      find.descendant(
        of: frame,
        matching: find.byKey(const ValueKey<String>('catch-row-press-overlay')),
      ),
      findsNothing,
    );
    expect(
      find.descendant(of: frame, matching: find.byType(CatchDivider)),
      findsOneWidget,
    );
    final row = find.byType(CatchField).first;
    final bounds = tester.getRect(row);
    expect(bounds.left, 0);
    expect(
      bounds.width,
      tester.view.physicalSize.width / tester.view.devicePixelRatio,
    );
    final overlay = find.descendant(
      of: row,
      matching: find.byKey(CatchField.pressOverlayKey),
    );
    final gesture = await tester.startGesture(Offset(1, bounds.center.dy));
    await tester.pump();
    expect(
      (tester.widget<AnimatedContainer>(overlay).decoration! as BoxDecoration)
          .color,
      isNot(Colors.transparent),
    );
    expect(tester.getRect(overlay), bounds);
    await gesture.up();
    await pumpFeatureUi(tester);
  });

  testWidgets('incomplete customer history is honest and can be rechecked', (
    tester,
  ) async {
    var refreshes = 0;
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: CustomScrollView(
          slivers: [
            HostCustomersList(
              state: HostCustomersDirectoryState(
                contacts: [_customerDirectoryContact()],
                nextCursor: null,
                matchCount: 1,
                matchCountCoverage: HostCustomerMatchCountCoverage.atLeast,
                sourceCoverage: HostCustomerDirectoryCoverage.partial,
                projectionVersion: 1,
              ),
              hasActiveQuery: false,
              onCustomerSelected: (_) {},
              onLoadMore: null,
              onRefreshCoverage: () => refreshes += 1,
            ),
          ],
        ),
      ),
    );

    expect(find.text('Some customer history is unavailable'), findsOneWidget);
    expect(find.textContaining('still syncing'), findsNothing);
    expect(find.textContaining('Counts marked + are minimums'), findsOneWidget);

    await tester.tap(
      find.byKey(const ValueKey('host-customers-refresh-coverage')),
    );
    expect(refreshes, 1);
  });

  testWidgets('customer search debounces and unavailable SMS stays hidden', (
    tester,
  ) async {
    final club = buildClub(id: 'customers-club', ownerUserId: _hostUid);
    final requests = <HostCustomersDirectoryRequest>[];
    await _pumpHostScreen(
      tester,
      const HostCustomersScreen(),
      overrides: [
        ..._hostClubOverrides(owned: [club]),
        hostCustomersDirectoryControllerProvider.overrideWith2(
          (_) => _FixedHostCustomersDirectoryController(
            requests,
            _customerDirectoryState(),
          ),
        ),
      ],
    );

    final searchFinder = find.byKey(const ValueKey('host-customers-search'));
    final search = tester.widget<CatchSearchField>(searchFinder);
    expect(search.mode, CatchSearchFieldMode.expanding);
    expect(search.placeholder, 'Search by name');
    expect(find.text('SMS reachable'), findsNothing);
    expect(requests.last.search, isNull);
    final directoryRow = find.byWidgetPredicate(
      (widget) =>
          widget is CatchField &&
          widget.key == const ValueKey('host-customer-contact-1'),
    );
    expect(tester.getRect(directoryRow).left, 0);
    expect(
      tester.getRect(directoryRow).right,
      CatchLayout.workspaceDirectoryWidth,
    );

    await tester.tap(searchFinder);
    await pumpFeatureUi(tester);
    await tester.enterText(
      find.descendant(of: searchFinder, matching: find.byType(TextField)),
      '  ananya  ',
    );
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 299));
    expect(requests.last.search, isNull);

    await pumpFeatureUiFor(tester, const Duration(milliseconds: 1));
    await pumpFeatureUi(tester);
    expect(requests.last.search, 'ananya');
  });

  testWidgets(
    'expanded customer workspace keeps directory and detail together',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(1200, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final club = buildClub(id: 'organizer-1', ownerUserId: _hostUid);

      await _pumpHostScreen(
        tester,
        const HostCustomersScreen(
          initialOrganizerId: 'organizer-1',
          initialContactId: 'contact-1',
          initialContactDisplayName: 'Ananya Rao',
        ),
        overrides: [
          ..._hostClubOverrides(owned: [club]),
          hostCustomersDirectoryControllerProvider.overrideWith2(
            (_) => _FixedHostCustomersDirectoryController(
              [],
              _customerDirectoryState(),
            ),
          ),
          hostAudienceContactDetailProvider(
            'organizer-1',
            'contact-1',
          ).overrideWithValue(AsyncData(_customerDetail())),
          hostCommunicationPlanProvider(
            'organizer-1',
            'contact-1',
          ).overrideWithValue(AsyncData(_individualCommunicationPlan())),
        ],
      );

      expect(find.byType(CatchNavigationViewport), findsOneWidget);
      expect(find.byType(HostCustomersList), findsOneWidget);
      final detail = tester.widget<HostCustomerDetailScreen>(
        find.byType(HostCustomerDetailScreen),
      );
      expect(detail.embedded, isTrue);
      final back = find.descendant(
        of: find.byType(HostCustomerDetailScreen),
        matching: find.byTooltip('Back'),
      );
      expect(back, findsNothing);
      tester.view.physicalSize = const Size(390, 900);
      await pumpFeatureUi(tester);
      expect(back, findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'People chips combine categories, persist and reset immediately',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(402, 874);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final requests = <HostCustomersDirectoryRequest>[];
      final club = buildClub(id: 'organizer-1', ownerUserId: _hostUid);
      await _pumpHostScreen(
        tester,
        const HostCustomersScreen(),
        overrides: [
          ..._hostClubOverrides(owned: [club]),
          hostCustomersDirectoryControllerProvider.overrideWith2(
            (_) => _FixedHostCustomersDirectoryController(
              requests,
              _customerDirectoryState(),
            ),
          ),
        ],
      );
      await tester.tap(find.byKey(const ValueKey('host-customers-filters')));
      await pumpFeatureUi(tester);
      for (final filter in [
        HostCustomerFilter.repeat,
        HostCustomerFilter.firstTime,
        HostCustomerFilter.reliable,
      ]) {
        final chip = find.byKey(
          ValueKey('host-customer-filter-${filter.name}'),
        );
        await tester.ensureVisible(chip);
        await tester.tap(chip);
        await pumpFeatureUi(tester);
      }
      expect(requests.last.filters, {
        HostCustomerFilter.repeat,
        HostCustomerFilter.firstTime,
        HostCustomerFilter.reliable,
      });
      expect(find.byType(HostCustomerFilterSheet), findsOneWidget);
      await tester.ensureVisible(find.text('Close'));
      await tester.tap(find.text('Close'));
      await pumpFeatureUi(tester);
      expect(find.byType(HostCustomerFilterSheet), findsNothing);
      await tester.tap(find.byKey(const ValueKey('host-customers-filters')));
      await pumpFeatureUi(tester);
      expect(
        tester
            .widget<CatchChip>(
              find.byKey(const ValueKey('host-customer-filter-repeat')),
            )
            .selected,
        isTrue,
      );
      await tester.tap(find.text('Reset all'));
      await pumpFeatureUi(tester);
      expect(requests.last.filters, isEmpty);
      expect(requests.last.manualTagIds, isEmpty);
    },
  );

  testWidgets('customer filter sheet scrolls without loading every count', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await _pumpHostScreen(
      tester,
      const Scaffold(
        body: Align(
          alignment: Alignment.bottomCenter,
          child: HostCustomerFilterSheet(
            selectedFilter: HostCustomerFilter.newToOrganizer,
            manualTagVocabulary: [],
            selectedCount: HostCustomerSegmentCount(
              count: 12,
              coverage: HostCustomerMatchCountCoverage.exact,
            ),
            smsReadiness: HostCrmChannelReadiness.currentEventOnly,
          ),
        ),
      ),
    );

    expect(find.text('New to your audience'), findsOneWidget);
    expect(find.text('12 people'), findsNothing);
    expect(find.textContaining('Loading count'), findsNothing);
    expect(find.text('ADVOCACY').hitTestable(), findsNothing);

    final scrollable = find.descendant(
      of: find.byType(CatchSheet),
      matching: find.byType(Scrollable),
    );
    final position = tester.state<ScrollableState>(scrollable).position;
    expect(position.maxScrollExtent, greaterThan(0));
    await tester.scrollUntilVisible(
      find.text('ADVOCACY'),
      200,
      scrollable: scrollable,
    );
    await pumpFeatureUi(tester);

    expect(position.pixels, greaterThan(0));
    expect(find.text('ADVOCACY').hitTestable(), findsOneWidget);
    expect(find.text('Advocates'), findsOneWidget);
    expect(find.text('REACHABLE'), findsOneWidget);
  });

  testWidgets('manual customer form captures useful identity and memory', (
    tester,
  ) async {
    await _pumpHostScreen(
      tester,
      const HostAddCustomerScreen(organizerId: 'organizer-1'),
    );

    expect(find.byType(CatchRouteScaffold), findsOneWidget);
    expect(find.byType(CatchSheet), findsNothing);
    expect(
      find.byKey(const ValueKey('host-add-customer-details')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('host-add-customer-memory')),
      findsOneWidget,
    );
    expect(
      tester
          .widget<CatchField>(
            find.byKey(const ValueKey('host-add-customer-name')),
          )
          .title,
      'Name shown to your team',
    );
    expect(
      tester
          .widget<CatchField>(
            find.byKey(const ValueKey('host-add-customer-phone')),
          )
          .title,
      'Mobile number',
    );
    expect(
      tester
          .widget<CatchField>(
            find.byKey(const ValueKey('host-add-customer-email')),
          )
          .title,
      'Email',
    );
    await tester.ensureVisible(
      find.byKey(const ValueKey('host-add-customer-memory')),
    );
    await tester.tap(find.byKey(const ValueKey('host-add-customer-memory')));
    await pumpFeatureUi(tester);
    expect(
      tester
          .widget<CatchField>(
            find.byKey(const ValueKey('host-add-customer-note')),
          )
          .title,
      'Private note',
    );
    expect(
      find.textContaining('does not grant permission to send messages'),
      findsOneWidget,
    );

    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('host-add-customer-name')),
        matching: find.byType(TextField),
      ),
      'Name only',
    );
    await tester.tap(find.byKey(const ValueKey('host-add-customer-submit')));
    await pumpFeatureUi(tester);

    expect(
      find.text('Add or keep at least one mobile number or email address.'),
      findsOneWidget,
    );
  });

  for (final endpoint in ['phone', 'email']) {
    testWidgets(
      'Add person accepts only $endpoint and retains values on failure',
      (tester) async {
        final controller = _CreatePersonProbe();
        await _pumpHostScreen(
          tester,
          const HostAddCustomerScreen(organizerId: 'organizer-1'),
          overrides: [
            hostCustomersControllerProvider.overrideWithValue(controller),
          ],
        );
        await tester.enterText(
          find.descendant(
            of: find.byKey(const ValueKey('host-add-customer-name')),
            matching: find.byType(TextField),
          ),
          'Maya Kapoor',
        );
        final field = find.descendant(
          of: find.byKey(ValueKey('host-add-customer-$endpoint')),
          matching: find.byType(TextField),
        );
        await tester.enterText(
          field,
          endpoint == 'phone' ? '+919876543210' : 'MAYA@Example.COM',
        );
        await tester.tap(
          find.byKey(const ValueKey('host-add-customer-submit')),
        );
        await pumpFeatureUi(tester);
        expect(
          controller.requests,
          hasLength(1),
          reason: tester.allStates
              .whereType<FormFieldState>()
              .map((s) => '${s.value}: ${s.errorText}')
              .join(' | '),
        );
        final request = controller.requests.single;
        expect(request['name'], 'Maya Kapoor');
        expect(request['phone'], endpoint == 'phone' ? '+919876543210' : null);
        expect(
          request['email'],
          endpoint == 'email' ? 'maya@example.com' : null,
        );
        expect(request['note'], isNull);
        expect(find.text('Maya Kapoor'), findsOneWidget);
        expect(
          find.text('Add or keep at least one mobile number or email address.'),
          findsNothing,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('saved audience directory leaves creation to the app bar', (
    tester,
  ) async {
    const organizerId = 'organizer-1';
    final audience = HostSavedAudience(
      organizerId: organizerId,
      audienceId: 'audience-1',
      name: 'Regular customers',
      status: 'active',
      definition: const HostSavedAudienceDefinition(
        join: HostSavedAudienceJoin.all,
        predicates: [
          HostSavedAudienceComputedSegment(HostAudienceSegment.regular),
        ],
      ),
      definitionHash:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      definitionVersion: 1,
      revision: 3,
      lastPreviewMatchCount: 9,
      lastPreviewAt: DateTime(2026, 8, 30),
      createdAt: DateTime(2026, 8, 29),
      updatedAt: DateTime(2026, 8, 30),
    );

    await _pumpHostScreen(
      tester,
      CatchRootScreenScaffold.withPrimaryRail(
        header: const CatchRootScreenHeader.title(title: 'Customers'),
        actions: const _CustomersTestPrimaryRail(),
        body: CatchRootScreenBody.single(
          page: CatchRootScreenPageSpec.scroll(
            page: HostSavedAudiencesWorkspace(
              organizerId: organizerId,
              query: null,

              onOpen: (_) {},
            ),
          ),
        ),
      ),
      overrides: [
        hostGroupDirectoryControllerProvider.overrideWith2(
          (_) => _FixedHostGroupDirectoryController(
            AsyncData(
              HostSavedAudiencePage(audiences: [audience], nextCursor: null),
            ),
          ),
        ),
      ],
    );

    expect(find.text('New group'), findsNothing);
    expect(find.text('Regular customers'), findsOneWidget);
    expect(find.textContaining('9 people'), findsOneWidget);
    expect(find.text('Archive'), findsNothing);
    expect(find.text('Refresh'), findsNothing);
    await tester.tap(find.text('Filters'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Selected people').last);
    await pumpFeatureUi(tester);
    expect(find.text('Regular customers'), findsNothing);
    expect(find.text('No groups yet'), findsNothing);
    await tester.tap(find.text('Filters'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('All groups').last);
    await pumpFeatureUi(tester);
    expect(find.text('Regular customers'), findsOneWidget);
  });

  testWidgets('saved audience create and edit use full-page routes', (
    tester,
  ) async {
    const organizerId = 'organizer-1';
    final audience = HostSavedAudience(
      organizerId: organizerId,
      audienceId: 'audience-1',
      name: 'Repeat runners',
      status: 'active',
      definition: const HostSavedAudienceDefinition(
        join: HostSavedAudienceJoin.all,
        predicates: [
          HostSavedAudienceComputedSegment(HostAudienceSegment.repeatAttendee),
        ],
      ),
      definitionHash:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      definitionVersion: 1,
      revision: 3,
      lastPreviewMatchCount: 9,
      lastPreviewReachSummary: const HostAudienceReachSummary(
        inCatch: 5,
        automatic: 0,
        byHand: 3,
        unavailable: 1,
      ),
      lastPreviewAt: DateTime(2026, 8, 30),
      createdAt: DateTime(2026, 8, 29),
      updatedAt: DateTime(2026, 8, 30),
    );

    await _pumpHostScreen(
      tester,
      const HostSavedAudienceEditorScreen(organizerId: organizerId),
      overrides: [
        hostSavedAudienceFilterOptionsProvider(organizerId).overrideWith(
          (_) async => const HostSavedAudienceFilterOptions.empty(),
        ),
        hostCustomersDirectoryControllerProvider.overrideWith2(
          (_) => _FixedHostCustomersDirectoryController(
            [],
            _customerDirectoryState(),
          ),
        ),
      ],
    );

    expect(find.text('New group'), findsOneWidget);
    expect(find.text('GROUP DETAILS'), findsOneWidget);
    expect(find.text('CONDITION 1'), findsOneWidget);
    expect(find.text('Create group'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('host-saved-audience-create')),
      findsNothing,
    );

    await _pumpHostScreen(
      tester,
      HostSavedAudienceEditorScreen(
        organizerId: organizerId,
        initialAudience: audience,
      ),
      overrides: [
        hostSavedAudienceFilterOptionsProvider(organizerId).overrideWith(
          (_) async => const HostSavedAudienceFilterOptions.empty(),
        ),
        hostCustomersDirectoryControllerProvider.overrideWith2(
          (_) => _FixedHostCustomersDirectoryController(
            [],
            _customerDirectoryState(),
          ),
        ),
      ],
    );

    expect(find.text('Repeat runners'), findsWidgets);
    expect(
      find.byKey(const ValueKey('host-saved-audience-edit')),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('host-saved-audience-edit')));
    await pumpFeatureUi(tester);
    expect(find.text('Save and check membership'), findsOneWidget);
    expect(find.text('SAVED PREVIEW'), findsOneWidget);
    expect(find.text('Refresh'), findsOneWidget);
    expect(find.text('Archive'), findsOneWidget);
  });
}

class _CustomersTestPrimaryRail extends StatelessWidget
    implements CatchPrimaryRail, CatchScaledPreferredSize {
  const _CustomersTestPrimaryRail();

  @override
  Size get preferredSize => Size.fromHeight(CatchPageTabBar.minimumHeight);

  @override
  Size preferredSizeFor(BuildContext context, {double? width}) =>
      Size.fromHeight(CatchPageTabBar.heightFor(context));

  @override
  Widget build(BuildContext context) =>
      SizedBox(height: preferredSizeFor(context).height);
}

class _CreatePersonProbe extends Fake implements HostCustomersController {
  final requests = <Map<String, String?>>[];
  @override
  Future<HostCreatedCustomer> createCustomer({
    required String organizerId,
    required String displayName,
    String? phoneE164,
    String? email,
    String? initialNote,
  }) async {
    requests.add({
      'name': displayName,
      'phone': phoneE164,
      'email': email,
      'note': initialNote,
    });
    throw StateError('Simulated retryable save failure');
  }
}

Widget _customerFieldFixture({
  required HostCustomerDirectoryContact contact,
  required VoidCallback onTap,
}) => Builder(
  builder: (context) => CatchSection.rows(
    children: [
      CatchField.navigate(
        content: hostCustomerPersonLayout(context, contact),
        onActivate: onTap,
      ),
    ],
  ),
);
