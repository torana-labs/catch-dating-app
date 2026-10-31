part of 'host_operations_screen_test.dart';

void _registerHostOperationsTeamFailuresTests() {
  testWidgets('Host clubs owns profile management without event CTAs', (
    tester,
  ) async {
    final ownedOrganizer = buildOrganizer(
      id: 'owned-club',
      name: 'Sunday sea-face crew',
      description: 'Dawn runs along the Bandra seafront, every Sunday.',
      location: 'in-dl-delhi-ncr',
      ownerUserId: _hostUid,
      instagramHandle: '@sundayseafacecrew',
      phoneNumber: '98765 43210',
      email: 'hello@seafacecrew.com',
      hostProfiles: const [
        OrganizerHostProfile(
          uid: _hostUid,
          displayName: 'Owner Host',
          role: OrganizerHostRole.owner,
        ),
        OrganizerHostProfile(uid: 'co-host', displayName: 'Co Host'),
      ],
    );
    final cohostOrganizer = buildOrganizer(
      id: 'cohost-club',
      name: 'Co-hosted Club',
      hostUserId: 'owner-2',
      hostUserIds: const [_hostUid],
    );

    await _pumpHostScreen(
      tester,
      const HostOrganizersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(
          owned: [ownedOrganizer],
          hosted: [cohostOrganizer],
        ),
        organizerDetailViewModelProvider(ownedOrganizer.id).overrideWithValue(
          AsyncData<OrganizerDetailViewModel?>(
            _previewViewModel(ownedOrganizer),
          ),
        ),
        organizerDetailViewModelProvider(cohostOrganizer.id).overrideWithValue(
          AsyncData<OrganizerDetailViewModel?>(
            _previewViewModel(cohostOrganizer),
          ),
        ),
        watchHostPaymentAccountsProvider(
          _hostUid,
        ).overrideWithValue(const AsyncData<List<HostPaymentAccount>>([])),
      ],
    );

    expect(find.text('Sunday sea-face crew'), findsWidgets);
    expect(find.text('Edit'), findsOneWidget);
    expect(find.text('Preview'), findsWidgets);
    expect(find.byTooltip('Switch organizer'), findsNothing);
    expect(find.byTooltip('Create organizer'), findsNothing);
    expect(find.text('IDENTITY'), findsOneWidget);
    expect(find.text('Organizer name'), findsOneWidget);
    expect(find.text('City'), findsOneWidget);
    expect(find.text('Delhi NCR'), findsOneWidget);
    expect(find.textContaining('IN-DL-DELHI-NCR'), findsNothing);
    expect(find.text('Area / neighbourhood'), findsOneWidget);
    expect(find.text('Description'), findsOneWidget);
    expect(find.text('CONTACT'), findsOneWidget);
    expect(find.text('Instagram'), findsOneWidget);
    expect(find.text('@sundayseafacecrew'), findsOneWidget);
    expect(find.text('ORGANIZER SETTINGS'), findsOneWidget);
    expect(find.text('Event defaults'), findsOneWidget);
    expect(find.text('Payments'), findsOneWidget);
    expect(find.text('Host team'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchSection && widget.title == 'Media',
      ),
      findsOneWidget,
    );
    expect(find.text('Save media'), findsNothing);
    expect(find.byKey(const ValueKey('host-media-action-bar')), findsNothing);
    expect(find.text('Live event guide'), findsOneWidget);
    expect(find.text('Save defaults'), findsNothing);
    expect(
      find.byKey(const ValueKey('host-defaults-action-bar')),
      findsNothing,
    );
    expect(find.text('PUBLIC PROFILE'), findsNothing);
    expect(find.text('Preview club page'), findsNothing);
    expect(
      find.byKey(const ValueKey('host-club-settings-payments')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('host-club-settings-host-team')),
      findsOneWidget,
    );
    expect(find.text('Add host'), findsNothing);
    expect(find.text('Add event'), findsNothing);
    expect(find.text('View club'), findsNothing);
    expect(find.text('Owned club'), findsNothing);

    final container = ProviderScope.containerOf(
      tester.element(find.byType(HostOrganizersScaffold)),
    );
    container
        .read(hostOrganizerSelectionProvider(_hostUid).notifier)
        .select(cohostOrganizer.id);
    await pumpFeatureUi(tester);

    expect(find.text('Co-hosted Club'), findsWidgets);
    expect(find.text('ORGANIZER SETTINGS'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchSection && widget.title == 'Organizer settings',
      ),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('host-club-settings-payments')),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey('host-club-settings-host-team')),
      findsOneWidget,
    );
    expect(find.text('Add host'), findsNothing);
    expect(
      find.byKey(const ValueKey('host-team-actions-owner-2')),
      findsNothing,
    );
    expect(find.text('IDENTITY'), findsOneWidget);
    expect(find.text('Organizer name'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget is CatchSection && widget.title == 'Media',
      ),
      findsOneWidget,
    );
    final cohostMediaSection = find.byWidgetPredicate(
      (widget) => widget is CatchSection && widget.title == 'Media',
    );
    final organizerTabRail = find.byKey(const ValueKey('host-club-tab-rail'));
    expect(
      tester.getRect(cohostMediaSection).top -
          tester.getRect(organizerTabRail).bottom,
      closeTo(CatchInsets.pageBody.top, 0.5),
    );
    expect(find.text('Save media'), findsNothing);
    expect(find.text('Advanced event defaults'), findsNothing);
    expect(find.text('Save defaults'), findsNothing);

    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey('host-club-tab-rail')),
        matching: find.text('Preview'),
      ),
    );
    await pumpFeatureUi(tester);

    expect(
      find.byKey(const ValueKey('club-detail-hero-module')),
      findsOneWidget,
    );
    expect(find.text('Co-hosted Club'), findsWidgets);
    expect(find.text('Sunday sea-face crew'), findsNothing);
    expect(find.text('Open public preview'), findsNothing);
    expect(find.text('Club cohost-club'), findsNothing);
  });

  testWidgets('Default switches auto-save without a Done action', (
    tester,
  ) async {
    final ownedOrganizer = buildOrganizer(
      id: 'owned-club',
      name: 'Sunday sea-face crew',
      location: 'Mumbai',
      ownerUserId: _hostUid,
    );
    final repository = FakeOrganizersRepository();

    await _pumpHostScreen(
      tester,
      HostOrganizerLiveGuideScreen(organizerId: ownedOrganizer.id),
      overrides: [
        ..._hostOrganizerOverrides(owned: [ownedOrganizer]),
        organizersRepositoryProvider.overrideWith((ref) => repository),
        watchHostPaymentAccountsProvider(
          _hostUid,
        ).overrideWithValue(const AsyncData<List<HostPaymentAccount>>([])),
      ],
    );

    final guideField = find.byWidgetPredicate(
      (widget) => widget is CatchField && widget.title == 'Live event guide',
    );
    expect(guideField, findsOneWidget);
    expect(
      find.ancestor(of: guideField, matching: find.byType(CatchSection)),
      findsNothing,
      reason: 'The first guide toggle must not synthesize a section divider.',
    );
    tester
        .widget<CatchToggleInput>(
          find.descendant(
            of: guideField,
            matching: find.byType(CatchToggleInput),
          ),
        )
        .onChanged!(true);
    await pumpFeatureUi(tester);

    expect(find.text('Done'), findsNothing);
    expect(find.text('Cancel'), findsNothing);
    expect(repository.lastUpdatedOrganizerId, ownedOrganizer.id);
    final savedDefaults = repository.lastUpdatedFields?['hostDefaults'];
    expect(savedDefaults, isA<Map<String, dynamic>>());
    expect(
      ((savedDefaults as Map<String, dynamic>)['eventSuccess']
          as Map<String, dynamic>)['enabled'],
      isTrue,
    );
  });

  testWidgets('Host club fields edit inline without opening edit wizard', (
    tester,
  ) async {
    final ownedOrganizer = buildOrganizer(
      id: 'owned-club',
      name: 'Sunday sea-face crew',
      description: 'Dawn runs along the Bandra seafront, every Sunday.',
      location: 'Mumbai',
      ownerUserId: _hostUid,
    );
    final repository = FakeOrganizersRepository();

    await _pumpHostScreen(
      tester,
      const HostOrganizersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(owned: [ownedOrganizer]),
        organizersRepositoryProvider.overrideWith((ref) => repository),
        watchHostPaymentAccountsProvider(
          _hostUid,
        ).overrideWithValue(const AsyncData<List<HostPaymentAccount>>([])),
      ],
    );

    await Scrollable.ensureVisible(
      tester.element(find.text('Description')),
      alignment: 0.5,
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Description'));
    await pumpFeatureUi(tester);

    expect(find.text('Edit owned-club'), findsNothing);

    final descriptionEditor = find.byKey(
      const ValueKey('catch-form-text-description'),
    );
    expect(descriptionEditor, findsOneWidget);

    await tester.enterText(
      find.descendant(
        of: descriptionEditor,
        matching: find.byType(EditableText),
      ),
      'Updated dawn loops.',
    );
    final doneButton = find.text('Done');
    final editorScrollView = find.ancestor(
      of: descriptionEditor,
      matching: find.byType(Scrollable),
    );
    expect(editorScrollView, findsWidgets);
    await tester.drag(editorScrollView.first, const Offset(0, -96));
    await pumpFeatureUi(tester);
    await tester.tap(doneButton);
    await pumpFeatureUi(tester);

    expect(find.text('Edit owned-club'), findsNothing);
    expect(repository.lastUpdatedOrganizerId, ownedOrganizer.id);
    expect(
      repository.lastUpdatedFields,
      containsPair('description', 'Updated dawn loops.'),
    );
  });

  testWidgets(
    'Organizer Edit exposes demand-pricing defaults when configured',
    (tester) async {
      final ownedOrganizer = buildOrganizer(
        id: 'demand-pricing-club',
        ownerUserId: _hostUid,
        hostDefaults: const OrganizerHostDefaults(
          eventPolicy: EventPolicyDefaults(
            admissionPreset: EventAdmissionDefaultPreset.balancedSingles,
            dynamicPricingEnabled: true,
            dynamicPricingStepInPaise: 25000,
            dynamicPricingMaxInPaise: 150000,
          ),
        ),
      );

      await _pumpHostScreen(
        tester,
        HostOrganizerEventDefaultsScreen(organizerId: ownedOrganizer.id),
        overrides: [
          ..._hostOrganizerOverrides(owned: [ownedOrganizer]),
          watchHostPaymentAccountsProvider(
            _hostUid,
          ).overrideWithValue(const AsyncData<List<HostPaymentAccount>>([])),
          hostManagerEventSetupDefaultsDependenciesProvider.overrideWithValue(
            HostManagerEventSetupDefaultsDependencies(
              read: (_) => Completer<ManagerEventSetupDefaults>().future,
              write: (_) => throw UnimplementedError(),
            ),
          ),
        ],
      );

      expect(find.text('Demand pricing'), findsOneWidget);
      expect(find.text('Step'), findsOneWidget);
      expect(find.text('Max'), findsOneWidget);
    },
  );

  testWidgets('Host city editor displays labels and persists canonical ids', (
    tester,
  ) async {
    final ownedOrganizer = buildOrganizer(
      id: 'canonical-city-club',
      name: 'Saket Run Club',
      location: 'in-dl-delhi-ncr',
      ownerUserId: _hostUid,
    );
    final repository = FakeOrganizersRepository();

    await _pumpHostScreen(
      tester,
      const HostOrganizersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(owned: [ownedOrganizer]),
        organizersRepositoryProvider.overrideWith((ref) => repository),
        watchHostPaymentAccountsProvider(
          _hostUid,
        ).overrideWithValue(const AsyncData<List<HostPaymentAccount>>([])),
      ],
    );

    expect(find.text('Delhi NCR'), findsOneWidget);
    expect(find.textContaining('IN-DL-DELHI-NCR'), findsNothing);

    await ensureCentered(tester, find.text('City'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('City'));
    await pumpFeatureUi(tester);
    final key = PageStorageKey('host-club-${ownedOrganizer.id}-edit-scroll');
    final citySheetScroll = verticalScroll(key);
    await tester.scrollUntilVisible(
      find.text('Mumbai'),
      180,
      scrollable: citySheetScroll,
    );
    await tester.tap(find.text('Mumbai'));
    await tester.scrollUntilVisible(
      find.text('Done'),
      -180,
      scrollable: citySheetScroll,
    );
    await tester.tap(find.text('Done'));
    await pumpFeatureUi(tester);

    expect(repository.lastUpdatedOrganizerId, ownedOrganizer.id);
    expect(
      repository.lastUpdatedFields,
      containsPair('location', 'in-mh-mumbai'),
    );
  });

  testWidgets(
    'Host team workspace edit loads from club snapshot while profile waits',
    (tester) async {
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
      final repository = _FakeHostProfileRepository();

      await _pumpHostScreen(
        tester,
        const HostOrganizerTeamScreen(organizerId: 'owned-club'),
        overrides: [
          ..._hostOrganizerOverrides(owned: [ownedOrganizer]),
          watchHostProfileProvider(
            _hostUid,
          ).overrideWithValue(const AsyncLoading<HostProfile?>()),
          hostProfileRepositoryProvider.overrideWith((ref) => repository),
        ],
      );

      expect(find.byType(CatchLoadingIndicator), findsNothing);
      expect(find.text('Display name'), findsOneWidget);
      expect(find.text('Suvrat'), findsWidgets);
      expect(find.text('Create host profile'), findsNothing);

      await _editHostTeamProfileField(
        tester,
        title: 'Display name',
        value: 'Updated Host',
      );

      expect(repository.savedUid, _hostUid);
      expect(repository.savedDisplayName, 'Updated Host');
    },
  );

  testWidgets('Host team workspace creates a missing professional profile', (
    tester,
  ) async {
    final repository = _FakeHostProfileRepository();

    await _pumpHostScreen(
      tester,
      const HostOrganizerTeamScreen(organizerId: 'owned-club'),
      overrides: [
        ..._hostOrganizerOverrides(owned: [_hostTeamOrganizerWithoutProfile()]),
        watchHostProfileProvider(
          _hostUid,
        ).overrideWithValue(const AsyncData<HostProfile?>(null)),
        hostProfileRepositoryProvider.overrideWith((ref) => repository),
      ],
    );

    await tester.tap(find.text('Create host profile'));
    await pumpFeatureUi(tester);

    expect(repository.ensuredUid, _hostUid);
  });

  testWidgets('Host team workspace no-profile row shows create pending state', (
    tester,
  ) async {
    final displayNameController = TextEditingController();
    final roleTitleController = TextEditingController();
    final bioController = TextEditingController();
    addTearDown(displayNameController.dispose);
    addTearDown(roleTitleController.dispose);
    addTearDown(bioController.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: ListView(
            children: [
              HostTeamProfileSection(
                state: const HostTeamProfileMissing(),
                editMode: true,
                creatingProfile: true,
                onRetry: () {},
                onCreateProfile: () {},
                displayNameController: displayNameController,
                roleTitleController: roleTitleController,
                bioController: bioController,
                savingProfile: false,
                onSaveProfile: null,
              ),
            ],
          ),
        ),
      ),
    );
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 50));

    expect(find.text('Creating profile...'), findsOneWidget);
    expect(find.byType(CatchLoadingIndicator), findsOneWidget);
    expect(find.text('Create host profile'), findsNothing);
  });

  testWidgets(
    'Host team workspace surfaces missing profile creation failures',
    (tester) async {
      final repository = _FakeHostProfileRepository(throwOnEnsure: true);

      await _pumpHostScreen(
        tester,
        const HostOrganizerTeamScreen(organizerId: 'owned-club'),
        overrides: [
          ..._hostOrganizerOverrides(
            owned: [_hostTeamOrganizerWithoutProfile()],
          ),
          watchHostProfileProvider(
            _hostUid,
          ).overrideWithValue(const AsyncData<HostProfile?>(null)),
          hostProfileRepositoryProvider.overrideWith((ref) => repository),
        ],
      );

      await tester.tap(find.text('Create host profile'));
      await pumpFeatureUi(tester);

      expect(find.text('Create host profile'), findsOneWidget);
      expect(
        find.text('Something went wrong. Please try again.'),
        findsOneWidget,
      );
    },
  );

  testWidgets('Host team workspace edits active professional profile inline', (
    tester,
  ) async {
    final profile = HostProfile(
      uid: _hostUid,
      displayName: 'Asha Host',
      roleTitle: 'Founder',
      bio: 'Runs easy miles.',
      status: HostProfileStatus.active,
      createdAt: DateTime(2026),
      updatedAt: DateTime(2026),
    );
    final repository = _FakeHostProfileRepository(profile: profile);

    await _pumpHostScreen(
      tester,
      const HostOrganizerTeamScreen(organizerId: 'owned-club'),
      overrides: [
        ..._hostOrganizerOverrides(owned: [_hostTeamOrganizer()]),
        watchHostProfileProvider(
          _hostUid,
        ).overrideWithValue(AsyncData<HostProfile?>(profile)),
        hostProfileRepositoryProvider.overrideWith((ref) => repository),
      ],
    );

    expect(find.text('Active professional profile'), findsOneWidget);
    expect(find.byType(CatchSheet), findsNothing);
    expect(find.text('BIO'), findsNothing);

    expect(find.text('Save profile'), findsNothing);
    await _editHostTeamProfileField(
      tester,
      title: 'Display name',
      value: 'Updated Host',
    );

    expect(find.byType(CatchSheet), findsNothing);
    expect(repository.savedDisplayName, 'Updated Host');
    expect(repository.savedRoleTitle, 'Founder');
    expect(repository.savedBio, 'Runs easy miles.');
    expect(find.text('Host profile saved.'), findsOneWidget);
  });

  testWidgets(
    'Host team workspace keeps inline profile fields after save failure',
    (tester) async {
      final profile = HostProfile(
        uid: _hostUid,
        displayName: 'Asha Host',
        roleTitle: 'Founder',
        bio: 'Runs easy miles.',
        status: HostProfileStatus.active,
        createdAt: DateTime(2026),
        updatedAt: DateTime(2026),
      );
      final repository = _FakeHostProfileRepository(
        profile: profile,
        throwOnSave: true,
      );

      await _pumpHostScreen(
        tester,
        const HostOrganizerTeamScreen(organizerId: 'owned-club'),
        overrides: [
          ..._hostOrganizerOverrides(owned: [_hostTeamOrganizer()]),
          watchHostProfileProvider(
            _hostUid,
          ).overrideWithValue(AsyncData<HostProfile?>(profile)),
          hostProfileRepositoryProvider.overrideWith((ref) => repository),
        ],
      );

      await _editHostTeamProfileField(
        tester,
        title: 'Display name',
        value: 'Updated Host',
      );

      expect(find.byType(CatchSheet), findsNothing);
      expect(find.widgetWithText(CatchField, 'Display name'), findsOneWidget);
      expect(
        find.text('Something went wrong. Please try again.'),
        findsWidgets,
      );
      expect(repository.savedUid, isNull);
    },
  );

  testWidgets(
    'Host team workspace exposes a back action with a safe root fallback',
    (tester) async {
      await _pumpHostScreen(
        tester,
        const HostOrganizerTeamScreen(organizerId: 'owned-club'),
        overrides: _hostOrganizerOverrides(owned: [_hostTeamOrganizer()]),
      );

      await tester.tap(find.byIcon(CatchIcons.back));
      await pumpFeatureUi(tester);

      expect(find.text('Organizer route'), findsOneWidget);
    },
  );

  testWidgets('Host team workspace club rows use section-owned divider roles', (
    tester,
  ) async {
    final ownedOrganizer = buildOrganizer(
      id: 'owned-club',
      name: 'Owner Club',
      ownerUserId: _hostUid,
    );
    final hostedOrganizer = buildOrganizer(
      id: 'hosted-club',
      name: 'Hosted Club',
      hostUserId: 'owner-2',
      hostUserIds: const [_hostUid],
    );

    await _pumpHostScreen(
      tester,
      const HostOrganizerTeamScreen(organizerId: 'owned-club'),
      overrides: _hostOrganizerOverrides(
        owned: [ownedOrganizer],
        hosted: [hostedOrganizer],
      ),
    );

    final organizersSection = find.ancestor(
      of: find.text('ORGANIZERS YOU HOST'),
      matching: find.byType(CatchSection),
    );
    expect(
      tester
          .widgetList<CatchDivider>(
            find.descendant(
              of: organizersSection,
              matching: find.byType(CatchDivider),
            ),
          )
          .map((divider) => divider.variant),
      contains(CatchDividerVariant.fieldSection),
    );
  });

  testWidgets('Organizer top bar surfaces sign out failures', (tester) async {
    final authRepository = _FakeHostAuthRepository(throwOnSignOut: true);
    final organizer = _hostTeamOrganizer();

    await _pumpHostScreen(
      tester,
      const HostOrganizersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(owned: [organizer]),
        organizerDetailViewModelProvider(organizer.id).overrideWithValue(
          AsyncData<OrganizerDetailViewModel?>(_previewViewModel(organizer)),
        ),
        authRepositoryProvider.overrideWithValue(authRepository),
        watchHostPaymentAccountsProvider(
          _hostUid,
        ).overrideWithValue(const AsyncData<List<HostPaymentAccount>>([])),
      ],
    );

    final signOutAction = find.byKey(
      const ValueKey<String>('host-organizer-sign-out'),
    );
    await tester.tap(signOutAction);
    await pumpFeatureUi(tester);

    expect(authRepository.signOutCallCount, 1);
    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
    expect(find.byType(HostOrganizersScreen), findsOneWidget);
  });

  testWidgets(
    'Host team Preview renders the professional host profile projection',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 844);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final profile = HostProfile(
        uid: _hostUid,
        displayName: 'Asha Host',
        roleTitle: 'Run club founder',
        bio: 'Hosts welcoming community runs across Delhi.',
        status: HostProfileStatus.active,
        createdAt: DateTime(2026),
        updatedAt: DateTime(2026),
      );
      await _pumpHostScreen(
        tester,
        const HostOrganizerTeamScreen(organizerId: 'owned-club'),
        overrides: [
          ..._hostOrganizerOverrides(owned: [_hostTeamOrganizer()]),
          watchHostProfileProvider(
            _hostUid,
          ).overrideWithValue(AsyncData<HostProfile?>(profile)),
        ],
      );

      expect(find.text('Add host'), findsOneWidget);
      expect(find.text('ORGANIZERS YOU HOST'), findsOneWidget);
      expect(find.byType(TabBarView), findsOneWidget);
      expect(
        find.byKey(const ValueKey<String>('host-organizer-sign-out')),
        findsNothing,
      );

      await tester.drag(find.byType(TabBarView), const Offset(-320, 0));
      await pumpFeatureUi(tester);

      expect(find.text('Add host'), findsNothing);
      expect(find.text('ORGANIZERS YOU HOST'), findsOneWidget);
      expect(find.text('Asha Host'), findsOneWidget);
      expect(find.text('Run club founder'), findsOneWidget);
      expect(
        find.text('Hosts welcoming community runs across Delhi.'),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byKey(
            const ValueKey<String>('host-team-professional-profile-preview'),
          ),
          matching: find.text('Saket Run Club'),
        ),
        findsOneWidget,
      );
      expect(
        find.byKey(
          const ValueKey<String>('host-team-professional-profile-preview'),
        ),
        findsOneWidget,
      );
      expect(find.byType(ProfileSurface), findsNothing);
    },
  );

  testWidgets('Host team workspace validates required display name', (
    tester,
  ) async {
    final profile = HostProfile(
      uid: _hostUid,
      displayName: 'Asha Host',
      roleTitle: 'Founder',
      bio: 'Runs easy miles.',
      status: HostProfileStatus.active,
      createdAt: DateTime(2026),
      updatedAt: DateTime(2026),
    );
    final repository = _FakeHostProfileRepository(profile: profile);

    await _pumpHostScreen(
      tester,
      const HostOrganizerTeamScreen(organizerId: 'owned-club'),
      overrides: [
        ..._hostOrganizerOverrides(owned: [_hostTeamOrganizer()]),
        watchHostProfileProvider(
          _hostUid,
        ).overrideWithValue(AsyncData<HostProfile?>(profile)),
        hostProfileRepositoryProvider.overrideWith((ref) => repository),
      ],
    );

    await _editHostTeamProfileField(tester, title: 'Display name', value: '');

    expect(find.text('Enter a display name.'), findsOneWidget);
    expect(repository.savedUid, isNull);
  });
}
