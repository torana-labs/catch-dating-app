part of 'host_operations_screen_test.dart';

void _registerHostOperationsStateEventsTests() {
  test(
    'HostTeamWorkspaceState uses club fallback while profile is loading',
    () {
      final ownedOrganizer = buildOrganizer(
        id: 'owned-club',
        name: 'Saket Run Club',
        ownerUserId: _hostUid,
        hostProfiles: const [
          OrganizerHostProfile(
            uid: _hostUid,
            displayName: 'Suvrat',
            role: OrganizerHostRole.owner,
          ),
        ],
      );

      final state = buildHostTeamWorkspaceState(
        uid: _hostUid,
        profile: const CatchAsyncState<HostProfile?>.loading(),
        organizers: CatchAsyncState<List<Organizer>>.data([ownedOrganizer]),
      );

      final profileState = state.profile;
      expect(profileState, isA<HostTeamProfileContent>());
      final content = profileState as HostTeamProfileContent;
      expect(content.isFallback, isTrue);
      expect(content.profile.displayName, 'Suvrat');
      expect(content.profile.roleTitle, 'Owner');
      expect(state.organizers, isA<HostTeamHostedOrganizersContent>());
    },
  );

  test(
    'HostTeamWorkspaceActionState maps profile and club navigation policy',
    () {
      final profile = HostProfile(
        uid: _hostUid,
        displayName: 'Asha Host',
        status: HostProfileStatus.active,
        createdAt: DateTime(2026),
        updatedAt: DateTime(2026),
      );
      final ownedOrganizer = buildOrganizer(
        id: 'owned-club',
        name: 'Owner Club',
        ownerUserId: _hostUid,
      );
      final cohostOrganizer = buildOrganizer(
        id: 'cohost-club',
        name: 'Co-host Club',
        hostUserId: 'owner-2',
        hostUserIds: const [_hostUid],
      );

      final editState = buildHostTeamWorkspaceState(
        uid: _hostUid,
        profile: CatchAsyncState<HostProfile?>.data(profile),
        organizers: CatchAsyncState<List<Organizer>>.data([
          ownedOrganizer,
          cohostOrganizer,
        ]),
      );
      expect(editState.actions.canCreateProfile, isFalse);
      expect(editState.actions.canEditProfile, isTrue);
      expect(
        editState.actions.organizerNavigationFor(ownedOrganizer).destination,
        HostTeamOrganizerDestination.edit,
      );
      expect(
        editState.actions.organizerNavigationFor(cohostOrganizer).destination,
        HostTeamOrganizerDestination.preview,
      );
      expect(
        editState.actions.organizerNavigationFor(cohostOrganizer).roleLabel,
        'Host team',
      );

      final previewState = buildHostTeamWorkspaceState(
        uid: _hostUid,
        profile: const CatchAsyncState<HostProfile?>.data(null),
        organizers: const CatchAsyncState<List<Organizer>>.data([]),
        editMode: false,
      );
      expect(previewState.actions.canCreateProfile, isTrue);
      expect(previewState.actions.canEditProfile, isFalse);
      expect(
        previewState.actions.organizerNavigationFor(ownedOrganizer).destination,
        HostTeamOrganizerDestination.preview,
      );
    },
  );

  test(
    'HostOrganizersScreenState resolves selected club, tab, and owner role',
    () {
      final ownedOrganizer = buildOrganizer(
        id: 'owned-club',
        name: 'Owner Club',
        ownerUserId: _hostUid,
      );
      final cohostOrganizer = buildOrganizer(
        id: 'cohost-club',
        name: 'Co-host Club',
        hostUserId: 'owner-2',
        hostUserIds: const [_hostUid],
      );

      final state = HostOrganizersScreenState.resolve(
        organizers: [ownedOrganizer, cohostOrganizer],
        currentUid: _hostUid,
        selectedOrganizerId: cohostOrganizer.id,
        selectedTab: HostOrganizerTab.insights,
      );

      expect(state.selectedOrganizer, cohostOrganizer);
      expect(state.title(AppLocalizationsEn()), 'Co-host Club');
      expect(state.selectedOrganizerIsOwner, isFalse);
      expect(state.showOrganizerPicker, isTrue);
      expect(state.selectedTab, HostOrganizerTab.insights);

      final ownerState = state
          .selectOrganizerIndex(0)
          .selectTab(HostOrganizerTab.preview);
      expect(ownerState.selectedOrganizer, ownedOrganizer);
      expect(ownerState.selectedOrganizerIsOwner, isTrue);
      expect(ownerState.selectedTab, HostOrganizerTab.preview);

      final clampedState = HostOrganizersScreenState.resolve(
        organizers: [ownedOrganizer],
        currentUid: _hostUid,
        selectedOrganizerIndex: 99,
      );
      expect(clampedState.selectedOrganizer, ownedOrganizer);
      expect(clampedState.selectedTab, HostOrganizerTab.edit);
    },
  );

  test('HostOrganizerInsightsState owns only club and narrative range', () {
    final state = HostOrganizerInsightsState.initial(clubId: 'club-1');

    expect(state.rangePreset, HostOrganizerInsightsRangePreset.thirtyDays);
    expect(state.query.clubId, 'club-1');

    final ranged = state.selectRange(
      HostOrganizerInsightsRangePreset.twelveMonths,
    );
    expect(ranged.rangePreset, HostOrganizerInsightsRangePreset.twelveMonths);

    final switchedOrganizer = ranged.selectOrganizer('club-2');
    expect(switchedOrganizer.query.clubId, 'club-2');
    expect(
      switchedOrganizer.rangePreset,
      HostOrganizerInsightsRangePreset.twelveMonths,
    );
  });

  test('HostEventsRouteState maps auth and organizer async branches', () {
    final organizer = buildOrganizer(id: 'owned-club', ownerUserId: _hostUid);
    final stackTrace = StackTrace.current;
    final authError = StateError('auth failed');
    final organizersError = StateError('clubs failed');

    expect(
      buildHostEventsRouteState(
        uid: const CatchAsyncState<String?>.data(null),
      ).status,
      HostEventsRouteStatus.authRequired,
    );
    expect(
      buildHostEventsRouteState(
        uid: const CatchAsyncState<String?>.loading(),
      ).status,
      HostEventsRouteStatus.loading,
    );

    final authErrorState = buildHostEventsRouteState(
      uid: CatchAsyncState<String?>.error(authError, stackTrace),
    );
    expect(authErrorState.status, HostEventsRouteStatus.error);
    expect(authErrorState.error, authError);
    expect(authErrorState.errorContext, AppErrorContext.auth);

    expect(
      buildHostEventsRouteState(
        uid: const CatchAsyncState<String?>.data(_hostUid),
        organizers: const CatchAsyncState<List<Organizer>>.loading(),
      ).status,
      HostEventsRouteStatus.loading,
    );

    final organizersErrorState = buildHostEventsRouteState(
      uid: const CatchAsyncState<String?>.data(_hostUid),
      organizers: CatchAsyncState<List<Organizer>>.error(
        organizersError,
        stackTrace,
      ),
    );
    expect(organizersErrorState.status, HostEventsRouteStatus.error);
    expect(organizersErrorState.uid, _hostUid);
    expect(organizersErrorState.error, organizersError);
    expect(organizersErrorState.errorContext, AppErrorContext.organizer);

    final emptyState = buildHostEventsRouteState(
      uid: const CatchAsyncState<String?>.data(_hostUid),
      organizers: const CatchAsyncState<List<Organizer>>.data([]),
    );
    expect(emptyState.status, HostEventsRouteStatus.empty);
    expect(emptyState.uid, _hostUid);

    final loadedState = buildHostEventsRouteState(
      uid: const CatchAsyncState<String?>.data(_hostUid),
      organizers: CatchAsyncState<List<Organizer>>.data([organizer]),
    );
    expect(loadedState.status, HostEventsRouteStatus.loaded);
    expect(loadedState.organizers, [organizer]);
  });

  testWidgets('Host clubs keeps root primary-rail chrome while uid resolves', (
    tester,
  ) async {
    await _pumpHostScreen(
      tester,
      const HostOrganizersScreen(
        initialTab: HostOrganizerTab.insights,
        initialExpandedEditField: HostOrganizerEditFieldKeys.description,
      ),
      overrides: [uidProvider.overrideWithValue(const AsyncLoading<String?>())],
      settle: false,
    );

    expect(find.byType(HostLoadingScreen), findsNothing);
    expect(find.byType(CatchRootScreenScaffold), findsOneWidget);
    expect(find.byType(CatchRootScreenPageScrollView), findsOneWidget);
    expect(find.byType(CatchStateViewport), findsOneWidget);
    expect(find.text('Organizer'), findsOneWidget);
    expect(find.text('Edit'), findsOneWidget);
    expect(find.text('Insights'), findsOneWidget);
    expect(find.text('Preview'), findsOneWidget);
    expect(
      tester
          .widget<CatchChoiceInput<HostOrganizerTab>>(
            find.byKey(const ValueKey('host-club-tab-rail')),
          )
          .selected,
      {HostOrganizerTab.edit},
    );
    expect(find.text('Sign in required'), findsNothing);
    final tabsBottom = tester
        .getRect(find.byKey(const ValueKey('host-club-tab-rail')))
        .bottom;
    final progress = tester.getCenter(find.byType(CircularProgressIndicator));
    expect(progress.dy, greaterThan(tabsBottom));
    expect(find.byType(CatchSkeleton), findsNothing);
    expect(
      tester
          .widget<CatchRootScreenPageScrollView>(
            find.byType(CatchRootScreenPageScrollView),
          )
          .bodyLayout,
      CatchPageBodyMode.standard,
    );
  });

  testWidgets('Host team shows loading while uid resolves', (tester) async {
    await _pumpHostScreen(
      tester,
      const HostOrganizerTeamScreen(clubId: 'owned-club'),
      overrides: [uidProvider.overrideWithValue(const AsyncLoading<String?>())],
      settle: false,
    );

    expect(find.byType(HostLoadingScreen), findsOneWidget);
    expect(find.text('Host team'), findsOneWidget);
    expect(find.text('Sign in required'), findsNothing);
  });

  testWidgets('CatchSection.fieldRows rows align to the section text lane', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CatchSection.fieldRows(
            title: 'Profile',
            first: true,
            children: [
              CatchField.nav(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Display name',
                valueText: 'Suvrat',
                icon: Icons.person_outline,
              ),
            ],
          ),
        ),
      ),
    );

    final sectionLeft = tester.getTopLeft(find.text('PROFILE')).dx;
    final rowTextLeft = tester.getTopLeft(find.text('Display name')).dx;

    expect(
      rowTextLeft - sectionLeft,
      moreOrLessEquals(CatchFieldRow.textLaneInset, epsilon: 0.5),
    );
  });

  testWidgets('Host payment card shows loading while uid resolves', (
    tester,
  ) async {
    await _pumpHostScreen(
      tester,
      HostPaymentAccountControllerCard(
        organizer: buildOrganizer(id: 'owned-club', ownerUserId: _hostUid),
      ),
      overrides: [uidProvider.overrideWithValue(const AsyncLoading<String?>())],
      settle: false,
    );

    expect(find.byType(HostPaymentAccountLoadingCard), findsOneWidget);
    expect(find.text('Connect payouts to get paid'), findsNothing);
  });

  testWidgets('Host payout states each own one canonical field-row section', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'owned-club', ownerUserId: _hostUid);
    HostPaymentAccount account({
      required HostPaymentOnboardingStatus status,
      bool chargesEnabled = false,
      bool payoutsEnabled = false,
      String? disabledReason,
    }) => HostPaymentAccount(
      userId: _hostUid,
      provider: HostPaymentProvider.razorpay,
      country: 'IN',
      defaultCurrency: 'INR',
      providerAccountId: 'acc_test',
      razorpayAccountId: 'acc_test',
      chargesEnabled: chargesEnabled,
      payoutsEnabled: payoutsEnabled,
      detailsSubmitted: status != HostPaymentOnboardingStatus.notStarted,
      onboardingStatus: status,
      disabledReason: disabledReason,
    );

    await _pumpHostScreen(
      tester,
      Scaffold(
        body: SingleChildScrollView(
          child: Column(
            children: [
              HostPaymentAccountCard(organizer: organizer, loading: true),
              HostPaymentAccountCard(
                organizer: organizer,
                error: StateError('payout query failed'),
              ),
              HostPaymentAccountCard(organizer: organizer),
              HostPaymentAccountCard(
                organizer: organizer,
                account: account(status: HostPaymentOnboardingStatus.pending),
              ),
              HostPaymentAccountCard(
                organizer: organizer,
                account: account(
                  status: HostPaymentOnboardingStatus.restricted,
                  disabledReason: 'Identity document required',
                ),
              ),
              HostPaymentAccountCard(
                organizer: organizer,
                account: account(
                  status: HostPaymentOnboardingStatus.complete,
                  chargesEnabled: true,
                  payoutsEnabled: true,
                ),
              ),
            ],
          ),
        ),
      ),
      settle: false,
    );
    await tester.pump();

    final sections = tester.widgetList<CatchSection>(find.byType(CatchSection));
    expect(sections, hasLength(6));
    expect(sections.every((section) => section.title == 'Payouts'), isTrue);
    expect(
      tester
          .widgetList<CatchDivider>(
            find.descendant(
              of: find.byType(CatchSection),
              matching: find.byType(CatchDivider),
            ),
          )
          .where((divider) => divider.variant == CatchDividerVariant.section),
      hasLength(6),
    );
    final headers = tester.widgetList<CatchSectionHeader>(
      find.byType(CatchSectionHeader),
    );
    expect(headers, hasLength(6));
    expect(
      headers.every(
        (header) => header.variant == CatchSectionHeaderVariant.kicker,
      ),
      isTrue,
    );
    expect(find.byType(CatchField), findsWidgets);
    expect(find.text('Set up international payouts'), findsOneWidget);
    expect(find.text('Razorpay'), findsWidgets);
    expect(find.text('Stripe'), findsWidgets);
    expect(find.textContaining('Recommended'), findsWidgets);
    expect(find.text('Identity document required'), findsOneWidget);
    expect(find.text('Razorpay payout account is ready'), findsOneWidget);
  });

  testWidgets('India payout setup recommends Razorpay and exposes Route form', (
    tester,
  ) async {
    final organizer = buildOrganizer(
      id: 'owned-club',
      ownerUserId: _hostUid,
      location: 'mumbai',
    );

    await _pumpHostScreen(
      tester,
      HostPaymentAccountCard(organizer: organizer),
      settle: false,
    );
    await tester.pump();

    final razorpay = find.text('Razorpay').first;
    final stripe = find.text('Stripe').first;
    expect(
      tester.getTopLeft(razorpay).dy,
      lessThan(tester.getTopLeft(stripe).dy),
    );
    expect(find.textContaining('Recommended'), findsOneWidget);

    await tester.tap(razorpay);
    await pumpFeatureUi(tester);
    expect(find.text('Powered by Razorpay Route'), findsOneWidget);
    await tester.tap(find.text('Set up Razorpay'));
    await pumpFeatureUi(tester);

    expect(find.text('Legal business name'), findsOneWidget);
    expect(find.text('Business type'), findsOneWidget);
    expect(find.text('Submit to Razorpay'), findsOneWidget);
  });
}
