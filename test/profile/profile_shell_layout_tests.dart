// Riverpod reports the shared test-root ProviderScope overrides from the
// library entrypoint against a part file chosen by offset, so the adjacent
// entrypoint ignores cannot attach to the remapped diagnostics. Every part of
// this library carries the ignore so moving imports cannot strand it.
// ignore_for_file: riverpod_lint/scoped_providers_should_specify_dependencies

part of 'profile_widgets_test.dart';

void _registerProfileShellLayoutTests() {
  for (final status in SelfProfileRouteStatus.values) {
    testWidgets('Forms tab is reachable with profile ${status.name}', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 844);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final user = _profilePreviewScrollFixture();
      final ready = SelfProfileScreenState.fromAsync(
        profileState: CatchAsyncState.data(user),
        today: DateTime(2026, 9, 23),
        uploadState: const PhotoUploadState(),
        uploadMutationPending: false,
        saveMutationPending: false,
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            selfProfileScreenStateProvider.overrideWithValue(
              status == SelfProfileRouteStatus.ready
                  ? ready
                  : SelfProfileScreenState(
                      status: status,
                      error: status == SelfProfileRouteStatus.error
                          ? StateError('profile unavailable')
                          : null,
                      uploadState: const PhotoUploadState(),
                      mutationMode: SelfProfileMutationMode.idle,
                    ),
            ),
            formProfilesControllerProvider.overrideWith(
              _AccountFormProfilesController.new,
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const ProfileScreen(),
          ),
        ),
      );
      await tester.pump();
      final pager = tester.widget<TabBarView>(find.byType(TabBarView));
      expect(pager.children, hasLength(SelfProfileTab.values.length));
      pager.controller!.animateTo(SelfProfileTab.forms.index);
      // The loading profile's skeleton keeps animating while the independent
      // form directory settles; wait for the directory rather than all tickers.
      await pumpUntilFound(tester, find.text('RSVP Demo'));
      await tester.pump(pager.controller!.animationDuration);
      await tester.pump();
      expect(find.byType(FormProfilesAsyncBoundary), findsOneWidget);
      expect(find.text('RSVP Demo'), findsOneWidget);
      expect(find.byType(CatchErrorState), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets(
    'Profile terminal empty and error branches use shell-aware placement',
    (tester) async {
      Future<void> pumpState(SelfProfileScreenState state) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              selfProfileScreenStateProvider.overrideWithValue(state),
            ],
            child: MaterialApp(
              theme: AppTheme.light,
              home: const CatchTabViewportScope(
                index: appShellProfileTabIndex,
                bottomBarPlacement: CatchTabViewportScopePlacement.floating,
                bottomOverlayInset: _profileBottomOverlayInset,
                child: ProfileScreen(),
              ),
            ),
          ),
        );
        await tester.pump();
      }

      await pumpState(
        const SelfProfileScreenState(
          status: SelfProfileRouteStatus.unavailable,
          uploadState: PhotoUploadState(),
          mutationMode: SelfProfileMutationMode.idle,
        ),
      );
      expect(find.byType(CatchStateViewport), findsOneWidget);
      expect(find.byType(CatchEmptyState), findsOneWidget);

      await pumpState(
        SelfProfileScreenState(
          status: SelfProfileRouteStatus.error,
          error: StateError('profile failed'),
          uploadState: const PhotoUploadState(),
          mutationMode: SelfProfileMutationMode.idle,
        ),
      );
      expect(find.byType(CatchStateViewport), findsOneWidget);
      expect(find.byType(CatchErrorState), findsOneWidget);
    },
  );

  testWidgets('ProfileScreen renders tab-shaped skeletons while loading', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final controller = StreamController<UserProfile?>();
    addTearDown(controller.close);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchUserProfileProvider.overrideWith((ref) => controller.stream),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ProfileScreen()),
      ),
    );
    await tester.pump();

    expect(find.byType(CatchRootScreenScaffold), findsOneWidget);
    expect(find.byType(CatchRootScreenPageScrollView), findsWidgets);
    expect(find.byType(TabBarView), findsOneWidget);
    expect(find.byType(ProfileTabSkeletonSliverBody), findsOneWidget);
    expect(find.byType(CatchLoadingIndicator), findsNothing);

    await tester.tap(find.text('Preview'));
    await tester.pump();
    await tester.pump(CatchMotion.base);

    expect(find.byType(ProfileSurfaceSkeleton), findsOneWidget);
  });

  testWidgets(
    'Profile sliver header uses Your profile title with profile tab options',
    (tester) async {
      const topSafeArea = 47.0;
      tester.view.devicePixelRatio = 1.0;
      tester.view.physicalSize = const Size(390, 844);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: const MediaQuery(
              data: MediaQueryData(padding: EdgeInsets.only(top: topSafeArea)),
              child: _ProfileHeaderHarness(),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Your profile'), findsOneWidget);
      expect(find.text('Your profile').hitTestable(), findsOneWidget);
      expect(find.text('Edit'), findsOneWidget);
      expect(find.text('Preview'), findsOneWidget);
      expect(find.text('Insights'), findsOneWidget);
      expect(find.text('Edit profile'), findsNothing);
      expect(find.text('Preview profile'), findsNothing);
      expect(find.text('You'), findsNothing);
      expect(find.byTooltip('More profile actions'), findsNothing);
      expect(
        tester.getTopRight(find.byTooltip('Settings')).dx,
        lessThanOrEqualTo(370),
      );
      final profileTitleBottom = tester
          .getBottomLeft(find.text('Your profile'))
          .dy;
      final tabsTop = tester.getTopLeft(_profileOptionGroup()).dy;
      expect(tabsTop, greaterThan(profileTitleBottom));
      expect(tabsTop - profileTitleBottom, lessThanOrEqualTo(24));

      await tester.drag(find.byType(CustomScrollView), const Offset(0, -260));
      await pumpFeatureUi(tester);

      expect(find.text('Your profile').hitTestable(), findsNothing);
      expect(find.text('Edit'), findsOneWidget);
      expect(find.text('Preview'), findsOneWidget);
      expect(find.text('Insights'), findsOneWidget);
      expect(
        tester.getTopLeft(_profileOptionGroup()).dy,
        greaterThanOrEqualTo(topSafeArea),
      );
    },
  );

  testWidgets('Profile settings button routes to account settings', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final router = GoRouter(
      initialLocation: Routes.profileScreen.path,
      routes: [
        GoRoute(
          path: Routes.profileScreen.path,
          name: Routes.profileScreen.name,
          builder: (context, state) => const _ProfileHeaderHarness(),
        ),
        GoRoute(
          path: Routes.settingsScreen.path,
          name: Routes.settingsScreen.name,
          builder: (context, state) =>
              const Scaffold(body: Text('Settings route reached')),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await tester.pump();

    await tester.tap(find.byTooltip('Settings'));
    await pumpFeatureUi(tester);

    expect(find.text('Settings route reached'), findsOneWidget);
  });

  testWidgets('ProfileScreen uses native horizontal tab paging', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(_profilePreviewScrollFixture()),
          ),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ProfileScreen()),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.byType(TabBarView), findsOneWidget);
    expect(find.byType(ProfileTabSliverBody), findsOneWidget);
    expect(find.byType(ProfilePreviewBody), findsNothing);
    expect(find.byType(ProfileInsightsTabSliverBody), findsNothing);

    await tester.drag(find.byType(TabBarView), const Offset(-320, 0));
    await pumpFeatureUi(tester);

    expect(find.byType(ProfilePreviewBody), findsOneWidget);
    expect(find.byType(ProfileTabSliverBody), findsNothing);
    expect(find.byType(ProfileInsightsTabSliverBody), findsNothing);

    await tester.drag(find.byType(TabBarView), const Offset(-320, 0));
    await pumpFeatureUi(tester);

    expect(find.byType(ProfileInsightsTabSliverBody), findsOneWidget);
    expect(find.byType(ProfileTabSliverBody), findsNothing);
    expect(find.byType(ProfilePreviewBody), findsNothing);

    await tester.drag(find.byType(TabBarView), const Offset(320, 0));
    await pumpFeatureUi(tester);

    expect(find.byType(ProfilePreviewBody), findsOneWidget);
    expect(find.byType(ProfileTabSliverBody), findsNothing);
    expect(find.byType(ProfileInsightsTabSliverBody), findsNothing);

    await tester.drag(find.byType(TabBarView), const Offset(320, 0));
    await pumpFeatureUi(tester);

    expect(find.byType(ProfileTabSliverBody), findsOneWidget);
    expect(find.byType(ProfilePreviewBody), findsNothing);
    expect(find.byType(ProfileInsightsTabSliverBody), findsNothing);
  });

  testWidgets('ProfileScreen accepts a typed initial tab', (tester) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(_profilePreviewScrollFixture()),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const ProfileScreen(initialTab: SelfProfileTab.insights),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.byType(ProfileInsightsTabSliverBody), findsOneWidget);
    expect(find.byType(ProfileTabSliverBody), findsNothing);
    expect(find.byType(ProfilePreviewBody), findsNothing);
  });

  testWidgets('ProfileScreen preserves NestedScrollView overlap contract', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(_profilePreviewScrollFixture()),
          ),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ProfileScreen()),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.byType(SliverOverlapAbsorber), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget.runtimeType.toString().contains('OverlapInjector'),
        skipOffstage: false,
      ),
      findsOneWidget,
    );

    final tabBarBottom = tester.getBottomLeft(_profileOptionGroup()).dy;
    final bodyTop = tester.getTopLeft(find.byType(PhotoGrid)).dy;
    expect(bodyTop, greaterThanOrEqualTo(tabBarBottom));

    await tester.drag(
      find.byKey(const PageStorageKey('profile-edit-tab-scroll')),
      const Offset(0, -260),
    );
    await pumpFeatureUi(tester);

    expect(find.text('Your profile').hitTestable(), findsNothing);
    expect(find.text('Edit').hitTestable(), findsOneWidget);
    expect(
      tester.getTopLeft(_profileOptionGroup()).dy,
      greaterThanOrEqualTo(0),
    );
  });

  testWidgets('ProfileScreen assigns terminal clearance by page role', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(_profilePreviewScrollFixture()),
          ),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ProfileScreen()),
      ),
    );
    await pumpFeatureUi(tester);

    Finder activeTabWrapper(PageStorageKey<String> key) => find.ancestor(
      of: find.byKey(key),
      matching: find.byType(CatchRootScreenPageScrollView),
    );

    final editWrapper = activeTabWrapper(
      const PageStorageKey<String>('profile-edit-tab-scroll'),
    );
    expect(editWrapper, findsOneWidget);
    expect(
      tester
          .widget<CatchRootScreenPageScrollView>(editWrapper)
          .includeTerminalPadding,
      isTrue,
    );
    expect(
      tester
          .widget<CustomScrollView>(
            find.byKey(const PageStorageKey<String>('profile-edit-tab-scroll')),
          )
          .slivers
          .whereType<CatchScrollTerminalGap>(),
      hasLength(1),
    );

    await tester.tap(find.text('Preview'));
    await pumpFeatureUi(tester);
    final previewWrapper = activeTabWrapper(
      const PageStorageKey<String>('profile-preview-tab-scroll'),
    );
    expect(previewWrapper, findsOneWidget);
    expect(
      tester
          .widget<CatchRootScreenPageScrollView>(previewWrapper)
          .includeTerminalPadding,
      isFalse,
    );
    expect(
      tester
          .widget<CustomScrollView>(
            find.byKey(
              const PageStorageKey<String>('profile-preview-tab-scroll'),
            ),
          )
          .slivers
          .whereType<CatchScrollTerminalGap>(),
      isEmpty,
    );

    await tester.tap(find.text('Insights'));
    await pumpFeatureUi(tester);
    final insightsWrapper = activeTabWrapper(
      const PageStorageKey<String>('profile-insights-tab-scroll'),
    );
    expect(insightsWrapper, findsOneWidget);
    expect(
      tester
          .widget<CatchRootScreenPageScrollView>(insightsWrapper)
          .includeTerminalPadding,
      isTrue,
    );
    expect(
      tester
          .widget<CustomScrollView>(
            find.byKey(
              const PageStorageKey<String>('profile-insights-tab-scroll'),
            ),
          )
          .slivers
          .whereType<CatchScrollTerminalGap>(),
      hasLength(1),
    );
  });

  testWidgets(
    'ProfileScreen reveals expanded Diet actions above floating navigation',
    (tester) async {
      await _pumpObstructedProfileScreen(tester);

      final dietTile = _profileInfoTile('Diet');
      final position = await _positionProfileFieldNearOverlay(tester, dietTile);
      final beforeOpenPixels = position.pixels;
      final beforeOpenTop = tester.getTopLeft(dietTile).dy;

      await tester.tap(dietTile);
      await tester.pump();
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 16));
      await pumpFeatureUiFor(
        tester,
        Duration(
          milliseconds: CatchFieldTokens.reveal.inMilliseconds ~/ 2 - 16,
        ),
      );
      expect(
        position.pixels > beforeOpenPixels ||
            tester.getTopLeft(dietTile).dy < beforeOpenTop,
        isTrue,
      );
      await pumpFeatureUi(tester);

      final doneRect = tester.getRect(
        find.byKey(const ValueKey('catch-field-done')),
      );
      expect(
        doneRect.bottom,
        lessThanOrEqualTo(
          _obstructedProfileScreenSize.height -
              _profileBottomOverlayInset +
              0.1,
        ),
      );
    },
  );

  testWidgets(
    'ProfileScreen terminal clearance reveals final Children actions',
    (tester) async {
      await _pumpObstructedProfileScreen(tester);

      final childrenTile = _profileInfoTile('Children');
      final position = await _positionProfileFieldNearOverlay(
        tester,
        childrenTile,
      );

      await tester.tap(childrenTile);
      await tester.pump();
      final framesBeforeEnd =
          (CatchFieldTokens.reveal.inMilliseconds + 15) ~/ 16 - 1;
      for (var frame = 0; frame < framesBeforeEnd; frame++) {
        await pumpFeatureUiFor(tester, const Duration(milliseconds: 16));
      }
      final offsetBeforeExpansionEnd = position.pixels;
      for (var frame = 0; frame < 2; frame++) {
        await pumpFeatureUiFor(tester, const Duration(milliseconds: 16));
      }
      await tester.pump();
      expect(
        (position.pixels - offsetBeforeExpansionEnd).abs(),
        lessThan(12),
        reason: 'The final extent correction must not create a visible snap.',
      );

      final doneRect = tester.getRect(
        find.byKey(const ValueKey('catch-field-done')),
      );
      expect(
        doneRect.bottom,
        lessThanOrEqualTo(
          _obstructedProfileScreenSize.height -
              _profileBottomOverlayInset +
              0.1,
        ),
      );
    },
  );

  testWidgets('ProfileScreen surfaces profile photo upload failures', (
    tester,
  ) async {
    final user = buildUser();
    final repository = FakeProfileEditUserProfileRepository()
      ..latestProfile = user;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
          watchUserProfileProvider.overrideWith(
            (ref) => Stream<UserProfile?>.value(user),
          ),
          userProfileRepositoryProvider.overrideWithValue(repository),
          imageUploadRepositoryProvider.overrideWithValue(
            _FailingProfileImageUploadRepository(),
          ),
          errorLoggerProvider.overrideWithValue(_SilentErrorLogger()),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          home: const _ProfileUploadFailureSeeder(),
        ),
      ),
    );

    await pumpFeatureUi(tester);
    await pumpFeatureUi(tester);

    expect(
      find.text(
        'We are having trouble connecting. Please check your internet and try again.',
      ),
      findsOneWidget,
    );
    expect(find.byType(CatchLoadingIndicator), findsNothing);
  });

  testWidgets('Profile preview card can scroll back to the top', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(_profilePreviewScrollFixture()),
          ),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ProfileScreen()),
      ),
    );
    await pumpFeatureUi(tester);

    await tester.tap(find.text('Preview'));
    await pumpFeatureUi(tester);

    expect(
      tester
          .widget<ProfilePreviewBody>(find.byType(ProfilePreviewBody))
          .bottomPadding,
      0,
    );

    final previewScrollView = find.byKey(ProfileBody.scrollViewKey);
    final previewScroll = tester.widget<CustomScrollView>(previewScrollView);
    final previewController = previewScroll.controller!;
    final tabBarBottom = tester.getBottomLeft(_profileOptionGroup()).dy;

    expect(previewController.offset, 0);

    await tester.drag(previewScrollView, const Offset(0, -900));
    await pumpFeatureUi(tester);

    expect(previewController.offset, greaterThan(0));

    await tester.drag(previewScrollView, const Offset(0, 900));
    await pumpFeatureUi(tester);

    expect(previewController.offset, 0);
    expect(
      tester.getTopLeft(previewScrollView).dy,
      greaterThanOrEqualTo(tabBarBottom + 8),
    );
    expect(tester.getTopLeft(previewScrollView).dx, 0);
  });

  testWidgets('Profile preview upward drag pins the profile tabs', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(buildUser(name: 'Suvrat Garg')),
          ),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ProfileScreen()),
      ),
    );
    await pumpFeatureUi(tester);

    await tester.tap(find.text('Preview'));
    await pumpFeatureUi(tester);

    final previewScrollView = find.byKey(ProfileBody.scrollViewKey);
    final previewScroll = tester.widget<CustomScrollView>(previewScrollView);

    expect(find.text('Your profile').hitTestable(), findsOneWidget);
    expect(previewScroll.controller!.offset, 0);

    await tester.drag(previewScrollView, const Offset(0, -260));
    await pumpFeatureUi(tester);

    expect(find.text('Your profile').hitTestable(), findsNothing);
    expect(find.text('Preview').hitTestable(), findsOneWidget);
    expect(tester.getTopLeft(_profileOptionGroup()).dy, lessThanOrEqualTo(8));
    expect(previewScroll.controller!.offset, lessThan(260));
  });

  testWidgets('Profile preview overscroll expands the profile header', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchUserProfileProvider.overrideWith(
            (ref) => Stream.value(buildUser(name: 'Suvrat Garg')),
          ),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const ProfileScreen()),
      ),
    );
    await pumpFeatureUi(tester);

    await tester.tap(find.text('Preview'));
    await pumpFeatureUi(tester);

    await tester.drag(_profileOptionGroup(), const Offset(0, -220));
    await pumpFeatureUi(tester);

    expect(find.text('Your profile').hitTestable(), findsNothing);

    final previewScrollView = find.byKey(ProfileBody.scrollViewKey);
    final previewScroll = tester.widget<CustomScrollView>(previewScrollView);
    expect(previewScroll.controller!.offset, 0);

    await tester.drag(previewScrollView, const Offset(0, 220));
    await pumpFeatureUi(tester);

    expect(find.text('Your profile').hitTestable(), findsOneWidget);
  });

  testWidgets('profile info field wraps long values without overflowing', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 180,
              child: CatchField.nav(
                copy: catchFieldCopy(AppLocalizationsEn()),
                icon: CatchIcons.email,
                title: 'Email',
                body: 'averylongemailaddress@examplecatchdatingapp.com',
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(
      find.text('averylongemailaddress@examplecatchdatingapp.com'),
      findsOneWidget,
    );
  });

  testWidgets('ProfileTab derives consistent empty editable-row copy', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(1080, 2200);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final user = buildUser(email: '').copyWith(phoneNumber: '+919876543210');

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: ProfileTabBody(
              user: user,
              uploadState: const PhotoUploadState(),
              builder: (context, children) => ListView(
                key: const ValueKey('profile-tab-scroll-view'),
                padding: CatchInsets.pageBody.copyWith(left: 0, right: 0),
                children: children,
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    await _dragProfileTabUntilVisible(tester, find.text('+919876543210'));
    expect(find.text('+919876543210'), findsOneWidget);

    for (final (label, emptyValue) in [
      ('Email', 'Add email'),
      ('Instagram', 'Add instagram'),
      ('Job title', 'Add job title'),
      ('Company', 'Add company'),
    ]) {
      final tile = _profileInfoTile(label);
      await _dragProfileTabUntilVisible(tester, tile);
      expect(
        find.descendant(
          of: tile,
          matching: find.textContaining(emptyValue, findRichText: true),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(of: tile, matching: find.text(label)),
        findsNothing,
      );
      expect(find.text('+ $label'), findsNothing);
    }

    final workoutTile = _profileInfoTile('Workout');
    await _dragProfileTabUntilVisible(tester, workoutTile);
    expect(
      find.descendant(
        of: workoutTile,
        matching: find.textContaining('Add workout', findRichText: true),
      ),
      findsOneWidget,
    );
    expect(find.text('+ Workout'), findsNothing);
  });
}
