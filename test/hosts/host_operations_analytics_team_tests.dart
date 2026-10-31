part of 'host_operations_screen_test.dart';

void _registerHostOperationsAnalyticsTeamTests() {
  testWidgets(
    'Organizer audience retry preserves unknown versus measured zero',
    (tester) async {
      final organizer = buildOrganizer(
        id: 'audience-layout',
        ownerUserId: _hostUid,
      );
      var attempts = 0;
      await _pumpHostScreen(
        tester,
        Scaffold(
          body: SingleChildScrollView(
            child: HostOrganizerSectionList(organizer: organizer),
          ),
        ),
        overrides: [
          watchEventsForOrganizerProvider(
            organizer.id,
          ).overrideWithValue(const AsyncData<List<Event>>([])),
          hostCrmSummaryProvider(organizer.id).overrideWith((ref) async {
            attempts++;
            if (attempts == 1) throw StateError('Temporarily unavailable');
            return _emptyCrmSummary(organizer.id);
          }),
        ],
      );
      expect(
        find.text('Audience counts are temporarily unavailable.'),
        findsOneWidget,
      );
      expect(find.text('Total contacts'), findsNothing);
      expect(find.text('MESSAGING CHANNELS'), findsNothing);
      final retry = find.text('Try again');
      await tester.ensureVisible(retry);
      await tester.tap(retry);
      await pumpFeatureUi(tester);
      expect(attempts, 2);
      expect(find.text('Total contacts'), findsOneWidget);
      expect(find.text('Imported contacts'), findsOneWidget);
      expect(find.text('MESSAGING CHANNELS'), findsOneWidget);
      final audience = find.byWidgetPredicate(
        (widget) => widget is CatchSection && widget.title == 'Audience',
      );
      expect(
        find.ancestor(of: audience, matching: find.byType(CatchSurface)),
        findsNothing,
      );
      final metrics = tester.widget<CatchMetricSection>(
        find.descendant(
          of: audience,
          matching: find.byType(CatchMetricSection),
        ),
      );
      expect(metrics.items.map((item) => item.value), everyElement('0'));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('Host club workspace keeps shared chrome across every tab', (
    tester,
  ) async {
    final ownedOrganizer = buildOrganizer(
      id: 'owned-club',
      name: 'Saket Run Club',
      description: 'Morning runs, plenty of sunshine and energy.',
      area: 'Saket',
      location: 'in-mp-indore',
      ownerUserId: _hostUid,
    );
    final secondOrganizer = buildOrganizer(
      id: 'second-club',
      name: 'Second Club',
      ownerUserId: _hostUid,
    );
    final previewEvent = buildEvent(
      organizerId: ownedOrganizer.id,
      startTime: DateTime(2030, 7, 20, 7),
    );

    await _pumpHostScreen(
      tester,
      const HostOrganizersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(owned: [ownedOrganizer, secondOrganizer]),
        watchEventsForOrganizerProvider(
          ownedOrganizer.id,
        ).overrideWithValue(AsyncData<List<Event>>([previewEvent])),
        organizerDetailViewModelProvider(ownedOrganizer.id).overrideWithValue(
          AsyncData<OrganizerDetailViewModel?>(
            _previewViewModel(ownedOrganizer, events: [previewEvent]),
          ),
        ),
        watchHostPaymentAccountsProvider(
          _hostUid,
        ).overrideWithValue(const AsyncData<List<HostPaymentAccount>>([])),
        hostAnalyticsRepositoryProvider.overrideWithValue(
          const _EmptyHostAnalyticsRepository(),
        ),
      ],
    );

    final tabRail = find.byKey(const ValueKey('host-club-tab-rail'));

    Finder tab(String label) =>
        find.descendant(of: tabRail, matching: find.text(label));

    void expectSharedChrome({
      bool? constrainToContentWidth,
      bool persistentPreview = true,
    }) {
      expect(find.byType(CatchRootScreenScaffold), findsOneWidget);
      expect(find.byType(NestedScrollView), findsNothing);
      expect(
        find.byType(CatchWorkspacePaneScaffold),
        findsNWidgets(persistentPreview ? 2 : 1),
      );
      expect(find.byType(SliverOverlapAbsorber), findsNothing);
      expect(find.byType(TabBarView), findsOneWidget);
      expect(tabRail, findsOneWidget);
      expect(tab('Organizer'), findsNothing);
      expect(tab('Edit'), findsOneWidget);
      expect(tab('Audience'), findsNothing);
      expect(tab('Insights'), findsOneWidget);
      expect(tab('Preview'), findsOneWidget);
      expect(find.byTooltip('Switch organizer'), findsNothing);
      final workspaceSemantics = tester.widget<Semantics>(
        find.byWidgetPredicate(
          (widget) =>
              widget is Semantics &&
              widget.properties.label == 'Organizer workspace tabs',
        ),
      );
      expect(
        workspaceSemantics.properties.hint,
        'Drag left or right to switch between Edit, Insights, and Preview.',
      );
      final currentPage = tester.widget<CatchRootScreenPageScrollView>(
        find.byType(CatchRootScreenPageScrollView),
      );
      expect(currentPage.includeTerminalPadding, isTrue);
      expect(
        currentPage.constrainToContentWidth,
        constrainToContentWidth ?? false,
      );
    }

    expectSharedChrome();
    expect(
      CatchFieldInteractionPlaneScope.outsetsOf(
        tester.element(find.byType(HostOrganizerEditBody)),
      ),
      EdgeInsets.zero,
    );
    final loadedHeader = tester.widget<CatchTopBar>(
      find.byWidgetPredicate(
        (widget) => widget is CatchTopBar && widget.title == 'Saket Run Club',
      ),
    );
    expect(loadedHeader.subtitle, isNull);
    expect(loadedHeader.leading, isNull);
    final publicationSection = find.byWidgetPredicate(
      (widget) => widget is CatchSection && widget.title == 'Public visibility',
    );
    expect(
      tester.getRect(publicationSection).top - tester.getRect(tabRail).bottom,
      closeTo(CatchInsets.pageBody.top, 0.5),
    );
    expect(
      find.byKey(const ValueKey('host-analytics-primary-grid')),
      findsNothing,
    );

    final editWorkspaceScrollable = find
        .descendant(
          of: find.byKey(
            const PageStorageKey<String>('host-club-owned-club-edit-scroll'),
          ),
          matching: find.byType(Scrollable),
        )
        .first;
    await Scrollable.ensureVisible(
      tester.element(
        find.byKey(const ValueKey('host-club-settings-host-team')),
      ),
      alignment: 0.5,
    );
    await pumpFeatureUi(tester);

    expectSharedChrome();
    expect(find.text('IDENTITY'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(CatchRootScreenScaffold),
        matching: find.text('SAKET · INDORE'),
      ),
      findsNothing,
    );
    final editScroll = tester
        .state<ScrollableState>(editWorkspaceScrollable)
        .position;
    expect(editScroll.pixels, greaterThan(0));

    await tester.tap(tab('Insights'));
    await pumpUntilFound(tester, find.byType(HostAnalyticsPeriodInput));
    await pumpFeatureUi(tester);
    expect(find.byType(HostAnalyticsPeriodInput), findsOneWidget);

    expectSharedChrome();
    expect(find.byType(HostOrganizerInsightsSection), findsOneWidget);
    final insightsBodyPadding = tester
        .widgetList<SliverPadding>(
          find.ancestor(
            of: find.byType(HostOrganizerInsightsSection),
            matching: find.byType(SliverPadding),
          ),
        )
        .where(
          (padding) =>
              padding.padding == CatchInsets.pageBody.copyWith(bottom: 0),
        );
    expect(insightsBodyPadding, isEmpty);
    expect(find.byType(HostAnalyticsTrendSection), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(CatchRootScreenScaffold),
        matching: find.text('SAKET · INDORE'),
      ),
      findsNothing,
    );
    expect(find.byTooltip('Back to Organizer'), findsNothing);
    final rangeOptions = find.byType(
      CatchChoiceInput<HostOrganizerInsightsRangePreset>,
    );
    expect(
      tester
          .widget<CatchChoiceInput<HostOrganizerInsightsRangePreset>>(
            rangeOptions,
          )
          .selected,
      {HostOrganizerInsightsRangePreset.thirtyDays},
    );
    await Scrollable.ensureVisible(
      tester.element(find.text('90 days')),
      alignment: 0.5,
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.text('90 days'));
    await pumpFeatureUi(tester);
    expect(
      tester
          .widget<CatchChoiceInput<HostOrganizerInsightsRangePreset>>(
            rangeOptions,
          )
          .selected,
      {HostOrganizerInsightsRangePreset.ninetyDays},
    );

    await tester.tap(tab('Preview'));
    await pumpFeatureUi(tester);

    expectSharedChrome(
      constrainToContentWidth: false,
      persistentPreview: false,
    );
    expect(
      find.byKey(const ValueKey('club-detail-hero-module')),
      findsOneWidget,
    );
    expect(find.text('ABOUT'), findsOneWidget);
    expect(find.text('Open public preview'), findsNothing);
    expect(find.byTooltip('Back'), findsNothing);
    expect(find.byTooltip('Share club'), findsNothing);
    expect(find.text('HOSTED'), findsNothing);
    expect(find.byType(SliverIgnorePointer), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('SCHEDULE'),
      320,
      scrollable: find
          .descendant(
            of: find.byKey(
              const PageStorageKey<String>(
                'host-club-owned-club-preview-scroll',
              ),
            ),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await pumpFeatureUi(tester);
    expect(find.text('SCHEDULE'), findsOneWidget);
    final eventCard = tester.widget<EventDateRailCard>(
      find.byType(EventDateRailCard),
    );
    expect(eventCard.statusLabel, isNull);
    expect(eventCard.onTap, isNull);

    await tester.tap(tab('Insights'));
    await pumpFeatureUi(tester);
    expect(
      tester
          .widget<CatchChoiceInput<HostOrganizerInsightsRangePreset>>(
            rangeOptions,
          )
          .selected,
      {HostOrganizerInsightsRangePreset.ninetyDays},
    );

    await tester.tap(tab('Edit'));
    await pumpFeatureUi(tester);

    expectSharedChrome();
    expect(
      find.byKey(const ValueKey('host-club-insights-summary')),
      findsNothing,
    );
  });

  registerHostWorkspacePagingTest();

  testWidgets(
    'Host edit content fills its editor column and reveals stable keys',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(900, 1000);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final ownedOrganizer = buildOrganizer(
        id: 'wide-club',
        name: 'Wide Club',
        ownerUserId: _hostUid,
      );

      await _pumpHostScreen(
        tester,
        const HostOrganizersScreen(
          initialExpandedEditField: HostOrganizerEditFieldKeys.description,
        ),
        overrides: [
          ..._hostOrganizerOverrides(owned: [ownedOrganizer]),
          watchHostPaymentAccountsProvider(
            _hostUid,
          ).overrideWithValue(const AsyncData<List<HostPaymentAccount>>([])),
        ],
      );

      final editTab = find.byType(HostOrganizerEditBody);
      expect(editTab, findsOneWidget);
      expect(
        tester.getSize(editTab).width,
        closeTo(CatchLayout.workspaceEditorWidth, 0.1),
      );
      expect(
        tester.getCenter(editTab).dx,
        closeTo(CatchLayout.workspaceEditorWidth / 2, 0.1),
      );
      expect(
        tester.getSize(find.byType(HostOrganizerMediaRail)).width,
        closeTo(
          CatchLayout.workspaceEditorWidth - CatchInsets.pageBody.horizontal,
          0.1,
        ),
      );
      expect(find.text('0 photos'), findsOneWidget);

      final descriptionEditor = find.byKey(
        const ValueKey('catch-form-text-description'),
      );
      expect(descriptionEditor, findsOneWidget);
      final descriptionField = tester.widget<CatchField>(
        find.descendant(
          of: descriptionEditor,
          matching: find.byType(CatchField),
        ),
      );
      expect(descriptionField.open, isTrue);
    },
  );

  testWidgets('Host club photo picks stay staged until Save media', (
    tester,
  ) async {
    final photoBytes = _testPngBytes();
    final actions = _RecordingHostOrganizerEditActions(
      pickedPhotos: [
        HostPickedOrganizerPhoto(
          id: 'picked-photo',
          image: XFile.fromData(photoBytes, name: 'picked.jpg'),
          bytes: photoBytes,
        ),
      ],
    );
    final organizer = buildOrganizer(id: 'media-pick', ownerUserId: _hostUid);

    await _pumpHostOrganizerEditTab(
      tester,
      organizer: organizer,
      actions: actions,
    );
    final add = find.byKey(OrderedPhotoPickerKeys.addAction('Add photos'));
    await Scrollable.ensureVisible(tester.element(add));
    await tester.tap(add);
    await pumpFeatureUi(tester);
    expect(find.byKey(OrderedPhotoPickerKeys.managerScreen), findsOneWidget);
    await tester.tap(
      find.byKey(OrderedPhotoPickerKeys.addAction('Add photos')),
    );
    await pumpFeatureUi(tester);

    expect(actions.mediaWrites, isEmpty);
    expect(find.text('Ready to upload'), findsWidgets);

    final save = find.byKey(const ValueKey('host-media-save'));
    await Scrollable.ensureVisible(tester.element(save));
    await tester.tap(save);
    await pumpFeatureUi(tester);

    expect(actions.mediaWrites, hasLength(1));
    expect(actions.mediaWrites.single, hasLength(1));
    expect(
      actions.mediaWrites.single.single,
      isA<HostNewOrganizerPhotoInput>(),
    );
  });

  testWidgets(
    'Host organizer media summary keeps logo, cover, and gallery in one role-sized row',
    (tester) async {
      final actions = _RecordingHostOrganizerEditActions();
      final organizer = buildOrganizer(
        id: 'media-summary',
        ownerUserId: _hostUid,
        profileImageUrl: 'https://example.test/logo.png',
        organizerPhotos: [
          _uploadedOrganizerPhoto('one', position: 0),
          _uploadedOrganizerPhoto('two', position: 1),
        ],
      );

      await _pumpHostOrganizerEditTab(
        tester,
        organizer: organizer,
        actions: actions,
      );

      expect(find.byKey(HostOrganizerMediaKeys.summaryStrip), findsOneWidget);
      expect(find.byType(CreateOrganizerProfileImagePicker), findsNothing);
      expect(find.byType(CreateOrganizerPhotosPicker), findsNothing);
      expect(find.text('LOGO'), findsOneWidget);
      expect(find.text('COVER'), findsOneWidget);
      expect(find.text('Manage images'), findsOneWidget);
      expect(find.text('3 photos'), findsOneWidget);
      expect(find.text('Save media'), findsNothing);

      final logoSize = tester.getSize(
        find.byKey(HostOrganizerMediaKeys.logoTile),
      );
      final coverSize = tester.getSize(
        find.byKey(const ValueKey('host-media-summary-photo-existing-one')),
      );
      final gallerySize = tester.getSize(
        find.byKey(const ValueKey('host-media-summary-photo-existing-two')),
      );

      expect(logoSize.width / logoSize.height, CatchAspectRatio.organizerLogo);
      expect(
        coverSize.width / coverSize.height,
        closeTo(CatchAspectRatio.organizerCover, 0.001),
      );
      expect(
        gallerySize.width / gallerySize.height,
        closeTo(CatchAspectRatio.organizerGallery, 0.001),
      );

      await tester.tap(find.byKey(HostOrganizerMediaKeys.logoTile));
      await pumpFeatureUi(tester);
      expect(find.byKey(OrderedPhotoPickerKeys.managerScreen), findsOneWidget);
      expect(find.byType(CreateOrganizerProfileImagePicker), findsOneWidget);
      expect(find.text('Save media'), findsOneWidget);
      expect(find.text('Discard'), findsOneWidget);
    },
  );

  testWidgets('Host image manager discards its staged draft in place', (
    tester,
  ) async {
    final photoBytes = _testPngBytes();
    final actions = _RecordingHostOrganizerEditActions(
      pickedPhotos: [
        HostPickedOrganizerPhoto(
          id: 'discarded-photo',
          image: XFile.fromData(photoBytes, name: 'discarded.jpg'),
          bytes: photoBytes,
        ),
      ],
    );
    final organizer = buildOrganizer(
      id: 'media-discard',
      ownerUserId: _hostUid,
    );

    await _pumpHostOrganizerEditTab(
      tester,
      organizer: organizer,
      actions: actions,
    );
    final add = find.byKey(OrderedPhotoPickerKeys.addAction('Add photos'));
    await Scrollable.ensureVisible(tester.element(add));
    await tester.tap(add);
    await pumpFeatureUi(tester);
    await tester.tap(
      find.byKey(OrderedPhotoPickerKeys.addAction('Add photos')),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Ready to upload'), findsWidgets);

    await tester.tap(find.byKey(const ValueKey('host-media-discard')));
    await pumpFeatureUi(tester);

    expect(find.byKey(OrderedPhotoPickerKeys.managerScreen), findsNothing);
    expect(find.text('Ready to upload'), findsNothing);
    expect(find.text('Save media'), findsNothing);
    expect(actions.mediaWrites, isEmpty);
  });

  testWidgets('Host organizer empty media summary stays compact', (
    tester,
  ) async {
    final actions = _RecordingHostOrganizerEditActions();
    final organizer = buildOrganizer(id: 'media-empty', ownerUserId: _hostUid);

    await _pumpHostOrganizerEditTab(
      tester,
      organizer: organizer,
      actions: actions,
    );

    final summary = find.byKey(HostOrganizerMediaKeys.summaryStrip);
    final add = find.byKey(OrderedPhotoPickerKeys.addAction('Add photos'));
    expect(
      tester.getSize(summary).height,
      CatchLayout.hostMediaThumbnailExtent,
    );
    expect(tester.getSize(add).height, CatchLayout.hostMediaThumbnailExtent);
    expect(find.text('0 photos'), findsOneWidget);

    await tester.tap(find.byKey(OrderedPhotoPickerKeys.manageAction));
    await pumpFeatureUi(tester);
    expect(find.byKey(OrderedPhotoPickerKeys.managerScreen), findsOneWidget);
    expect(find.byType(CreateOrganizerProfileImagePicker), findsOneWidget);
  });

  testWidgets(
    'Host organizer logo removal remains available in image manager',
    (tester) async {
      final actions = _RecordingHostOrganizerEditActions();
      final organizer = buildOrganizer(
        id: 'media-logo-remove',
        ownerUserId: _hostUid,
        profileImageUrl: 'https://example.test/logo.png',
      );

      await _pumpHostOrganizerEditTab(
        tester,
        organizer: organizer,
        actions: actions,
      );
      await tester.tap(find.byKey(OrderedPhotoPickerKeys.manageAction));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Remove'));
      await pumpFeatureUi(tester);
      expect(actions.mediaWrites, isEmpty);
      final save = find.byKey(const ValueKey('host-media-save'));
      await tester.tap(save);
      await pumpFeatureUi(tester);

      expect(actions.removeLogoWrites, [isTrue]);
    },
  );

  testWidgets('Host club photo upload failures stay visible and retry', (
    tester,
  ) async {
    final photoBytes = _testPngBytes();
    final actions = _RecordingHostOrganizerEditActions(
      pickedPhotos: [
        HostPickedOrganizerPhoto(
          id: 'retry-photo',
          image: XFile.fromData(photoBytes, name: 'retry.jpg'),
          bytes: photoBytes,
        ),
      ],
      mediaFailuresRemaining: 1,
    );
    final organizer = buildOrganizer(id: 'media-retry', ownerUserId: _hostUid);

    await _pumpHostOrganizerEditTab(
      tester,
      organizer: organizer,
      actions: actions,
    );
    final add = find.byKey(OrderedPhotoPickerKeys.addAction('Add photos'));
    await Scrollable.ensureVisible(tester.element(add));
    await tester.tap(add);
    await pumpFeatureUi(tester);
    await tester.tap(
      find.byKey(OrderedPhotoPickerKeys.addAction('Add photos')),
    );
    await pumpFeatureUi(tester);

    final save = find.byKey(const ValueKey('host-media-save'));
    await Scrollable.ensureVisible(tester.element(save));
    await tester.tap(save);
    await pumpFeatureUi(tester);

    expect(actions.mediaUpdateCalls, 1);
    expect(
      find.byKey(OrderedPhotoPickerKeys.managerRetryAction(0)),
      findsOneWidget,
    );

    final retry = find.byKey(OrderedPhotoPickerKeys.managerRetryAction(0));
    await Scrollable.ensureVisible(tester.element(retry));
    await tester.tap(retry);
    await pumpFeatureUi(tester);

    expect(actions.mediaUpdateCalls, 2);
    expect(actions.mediaWrites, hasLength(1));
    expect(
      actions.mediaWrites.single.single,
      isA<HostNewOrganizerPhotoInput>(),
    );
  });

  testWidgets('Organizer owners can edit the organizer type', (tester) async {
    final actions = _RecordingHostOrganizerEditActions();
    final organizer = buildOrganizer(
      id: 'typed-organizer',
      ownerUserId: _hostUid,
    );

    await _pumpHostOrganizerEditTab(
      tester,
      organizer: organizer,
      actions: actions,
    );
    final organizerTypeEditor = find.byKey(
      const ValueKey('catch-form-single-choice-organizerType'),
    );
    await Scrollable.ensureVisible(tester.element(organizerTypeEditor));
    await tester.tap(organizerTypeEditor);
    await pumpFeatureUi(tester);

    final communityChoice = find.widgetWithText(CatchChip, 'Community');
    expect(communityChoice, findsOneWidget);
    await tester.tap(communityChoice);
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(const ValueKey('catch-field-done')));
    await pumpFeatureUi(tester);

    expect(actions.profileWrites, hasLength(1));
    expect(
      actions.profileWrites.single.toFieldsJson()['organizerType'],
      OrganizerType.community.name,
    );
  });

  testWidgets('Club settings rows push every spoke with the selected club id', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'spoke-club', ownerUserId: _hostUid);
    final destinations = <(Routes, String)>[];
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: SingleChildScrollView(
          child: HostOrganizerEditBody(
            organizer: organizer,
            currentUid: _hostUid,
            isOwner: true,
            onOpenSettingsRoute: (route, organizerId) =>
                destinations.add((route, organizerId)),
          ),
        ),
      ),
      overrides: _hostOrganizerOverrides(owned: [organizer]),
    );

    for (final entry in {
      'host-club-settings-event-defaults':
          Routes.hostOrganizerEventDefaultsScreen,
      'host-club-settings-live-guide': Routes.hostOrganizerLiveGuideScreen,
      'host-club-settings-payments': Routes.hostOrganizerPaymentsScreen,
      'host-club-settings-host-team': Routes.hostOrganizerTeamScreen,
    }.entries) {
      final field = find.byKey(ValueKey(entry.key));
      await Scrollable.ensureVisible(tester.element(field));
      tester.widget<CatchField>(field).onTap!();
    }

    expect(destinations, [
      (Routes.hostOrganizerEventDefaultsScreen, organizer.id),
      (Routes.hostOrganizerLiveGuideScreen, organizer.id),
      (Routes.hostOrganizerPaymentsScreen, organizer.id),
      (Routes.hostOrganizerTeamScreen, organizer.id),
    ]);
  });

  testWidgets('Club settings spokes are read-only for co-hosts', (
    tester,
  ) async {
    final organizer = buildOrganizer(
      id: 'cohost-spoke-club',
      hostUserId: 'owner-2',
      hostUserIds: const [_hostUid],
    );
    final overrides = _hostOrganizerOverrides(hosted: [organizer]);

    await _pumpHostScreen(
      tester,
      HostOrganizerEventDefaultsScreen(organizerId: organizer.id),
      overrides: overrides,
    );
    final topBar = tester.widget<CatchTopBar>(find.byType(CatchTopBar));
    expect(topBar.title, 'Event defaults');
    expect(topBar.subtitle, organizer.name);
    expect(topBar.navigation.mode, CatchTopBarNavigationMode.back);
    expect(topBar.emphasis, CatchTopBarEmphasis.plain);
    expect(find.byType(CatchRouteScaffold), findsOneWidget);
    expect(
      find.ancestor(
        of: find.byType(CatchPageBody),
        matching: find.byType(CatchSectionList),
      ),
      findsOneWidget,
    );
    expect(find.byType(CatchPageBody), findsOneWidget);
    expect(find.byType(SingleChildScrollView), findsOneWidget);
    expect(find.byType(CatchToggleInput), findsNothing);
    expect(find.byType(CatchFieldActionRow), findsNothing);
    expect(find.text('Default activity'), findsOneWidget);

    await _pumpHostScreen(
      tester,
      HostOrganizerLiveGuideScreen(organizerId: organizer.id),
      overrides: overrides,
    );
    expect(find.byType(CatchToggleInput), findsNothing);
    expect(find.byType(CatchFieldActionRow), findsNothing);

    await _pumpHostScreen(
      tester,
      HostOrganizerTeamScreen(organizerId: organizer.id),
      overrides: overrides,
    );
    expect(find.text('Add host'), findsNothing);

    await _pumpHostScreen(
      tester,
      HostOrganizerPaymentsScreen(organizerId: organizer.id),
      overrides: overrides,
    );
    expect(find.text('Owner'), findsOneWidget);
    expect(find.byType(HostPaymentAccountControllerCard), findsNothing);
  });

  testWidgets('Host club photo removal stays staged until Save media', (
    tester,
  ) async {
    final actions = _RecordingHostOrganizerEditActions();
    final organizer = buildOrganizer(
      id: 'media-remove',
      ownerUserId: _hostUid,
      organizerPhotos: [_uploadedOrganizerPhoto('one', position: 0)],
    );

    await _pumpHostOrganizerEditTab(
      tester,
      organizer: organizer,
      actions: actions,
    );
    final manage = find.byKey(OrderedPhotoPickerKeys.manageAction);
    await Scrollable.ensureVisible(tester.element(manage));
    await tester.tap(manage);
    await pumpFeatureUi(tester);

    await tester.tap(find.byKey(OrderedPhotoPickerKeys.setCoverAction(0)));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Remove photo'));
    await pumpFeatureUi(tester);

    expect(actions.mediaWrites, isEmpty);
    final save = find.byKey(const ValueKey('host-media-save'));
    await tester.tap(save);
    await pumpFeatureUi(tester);

    expect(actions.mediaWrites, hasLength(1));
    expect(actions.mediaWrites.single, isEmpty);
  });

  testWidgets('Host club photo reorder stays staged until Save media', (
    tester,
  ) async {
    final actions = _RecordingHostOrganizerEditActions();
    final organizer = buildOrganizer(
      id: 'media-reorder',
      ownerUserId: _hostUid,
      organizerPhotos: [
        _uploadedOrganizerPhoto('one', position: 0),
        _uploadedOrganizerPhoto('two', position: 1),
      ],
    );

    await _pumpHostOrganizerEditTab(
      tester,
      organizer: organizer,
      actions: actions,
    );
    final manage = find.byKey(OrderedPhotoPickerKeys.manageAction);
    await Scrollable.ensureVisible(tester.element(manage));
    await tester.tap(manage);
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(OrderedPhotoPickerKeys.setCoverAction(1)));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Set as cover'));
    await pumpFeatureUi(tester);
    expect(actions.mediaWrites, isEmpty);
    final save = find.byKey(const ValueKey('host-media-save'));
    await tester.tap(save);
    await pumpFeatureUi(tester);

    expect(actions.mediaWrites, hasLength(1));
    final reordered = actions.mediaWrites.single
        .whereType<HostExistingOrganizerPhotoInput>()
        .map((input) => input.photo.id)
        .toList();
    expect(reordered, ['two', 'one']);
  });

  testWidgets('Host club tabs preserve independent vertical scroll offsets', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final ownedOrganizer = buildOrganizer(
      id: 'offset-club',
      name: 'Offset Club',
      ownerUserId: _hostUid,
      hostProfiles: const [
        OrganizerHostProfile(
          uid: _hostUid,
          displayName: 'Owner Host',
          role: OrganizerHostRole.owner,
        ),
        OrganizerHostProfile(uid: 'cohost-1', displayName: 'Co Host One'),
        OrganizerHostProfile(uid: 'cohost-2', displayName: 'Co Host Two'),
        OrganizerHostProfile(uid: 'cohost-3', displayName: 'Co Host Three'),
      ],
    );

    await _pumpHostScreen(
      tester,
      const HostOrganizersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(owned: [ownedOrganizer]),
        watchEventsForOrganizerProvider(
          ownedOrganizer.id,
        ).overrideWithValue(const AsyncData<List<Event>>([])),
        watchHostPaymentAccountsProvider(
          _hostUid,
        ).overrideWithValue(const AsyncData<List<HostPaymentAccount>>([])),
        hostAnalyticsRepositoryProvider.overrideWithValue(
          _EmptyHostAnalyticsRepository(
            topEvents: List.generate(
              12,
              (index) => _hostAnalyticsEventRow(eventId: 'offset-$index'),
            ),
          ),
        ),
      ],
    );

    final rail = find.byKey(const ValueKey('host-club-tab-rail'));
    final editKey = const PageStorageKey<String>(
      'host-club-offset-club-edit-scroll',
    );
    final insightsKey = const PageStorageKey<String>(
      'host-club-offset-club-insights-scroll',
    );

    ScrollPosition positionFor(PageStorageKey<String> key) => tester
        .state<ScrollableState>(
          find
              .descendant(
                of: find.byKey(key),
                matching: find.byType(Scrollable),
              )
              .first,
        )
        .position;

    await tester.drag(find.byKey(editKey), const Offset(0, -1200));
    await pumpFeatureUi(tester);
    final editOffset = positionFor(editKey).pixels;
    expect(editOffset, greaterThan(0));

    await tester.tap(
      find.descendant(of: rail, matching: find.text('Insights')),
    );
    await pumpFeatureUi(tester);
    expect(positionFor(insightsKey).pixels, 0);
    expect(find.byType(HostOrganizerInsightsSection), findsOneWidget);

    final insightsPosition = positionFor(insightsKey);
    expect(insightsPosition.maxScrollExtent, greaterThan(0));
    insightsPosition.jumpTo(insightsPosition.maxScrollExtent / 2);
    await pumpFeatureUi(tester);
    final insightsOffset = insightsPosition.pixels;
    expect(insightsOffset, greaterThan(0));

    await tester.tap(find.descendant(of: rail, matching: find.text('Edit')));
    await pumpFeatureUi(tester);
    expect(positionFor(editKey).pixels, closeTo(editOffset, 1));

    await tester.tap(
      find.descendant(of: rail, matching: find.text('Insights')),
    );
    await pumpFeatureUi(tester);
    expect(positionFor(insightsKey).pixels, closeTo(insightsOffset, 1));
  });

  testWidgets('Host analytics trend renders every backend bucket', (
    tester,
  ) async {
    final points = List.generate(
      30,
      (index) => HostAnalyticsTrendPoint(
        periodStart: DateTime(2026, 6, index + 1),
        periodEnd: DateTime(2026, 6, index + 2),
        metrics: {'demand': index + 2, 'bookings': index + 1},
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: HostAnalyticsTrendSection(
            points: points,
            granularity: HostAnalyticsGranularity.week,
          ),
        ),
      ),
    );

    expect(find.byType(HostAnalyticsBarTile), findsNWidgets(30));
    expect(find.byType(CatchSection), findsOneWidget);
  });

  testWidgets('Host analytics loading does not invent report sections', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SingleChildScrollView(
            child: CatchSection.content(
              child: const HostAnalyticsReportLoadingIndicator(),
            ),
          ),
        ),
      ),
    );

    expect(find.byType(CatchSection), findsOneWidget);
    expect(find.byType(CatchSkeleton), findsNothing);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}

// Opt-in local render evidence; ordinary test runs do not write artifacts.
Future<void> _captureHostPresencePreview(
  WidgetTester tester,
  String state, {
  bool scrollToPresence = false,
  String? scrollTarget,
}) async {
  const output = String.fromEnvironment('HOST_PRESENCE_PREVIEW_DIR');
  if (output.isEmpty) return;
  addTearDown(() => tester.binding.setSurfaceSize(null));
  for (final viewport in <String, Size>{
    'mobile': const Size(390, 844),
    'desktop': const Size(1200, 900),
  }.entries) {
    await tester.binding.setSurfaceSize(viewport.value);
    await tester.pump();
    if (scrollToPresence || scrollTarget != null) {
      await tester.ensureVisible(
        find.byKey(ValueKey(scrollTarget ?? 'host-analytics-presence')),
      );
      await tester.pump();
    }
    final boundary = tester.renderObject<RenderRepaintBoundary>(
      find.byKey(const ValueKey('presence-preview-boundary')),
    );
    await tester.runAsync(() async {
      final image = await boundary.toImage();
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      image.dispose();
      await Directory(output).create(recursive: true);
      await File(
        '$output/$state-${viewport.key}.png',
      ).writeAsBytes(bytes!.buffer.asUint8List());
    });
  }
}
