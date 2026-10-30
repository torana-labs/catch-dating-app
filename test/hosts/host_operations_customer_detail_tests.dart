part of 'host_operations_screen_test.dart';

void _registerHostOperationsCustomerDetailTests() {
  testWidgets('customer operational history loads only when its tab opens', (
    tester,
  ) async {
    var requests = 0;
    final pending = Completer<HostAudienceContactDetail>();
    await _pumpHostScreen(
      tester,
      const HostCustomerDetailScreen(
        organizerId: 'organizer-1',
        contactId: 'contact-1',
      ),
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(_hostUid)),
        hostAudienceContactDetailProvider(
          'organizer-1',
          'contact-1',
        ).overrideWithValue(AsyncData(_customerDetail(historyLoaded: false))),
        hostCommunicationPlanProvider(
          'organizer-1',
          'contact-1',
        ).overrideWithValue(AsyncData(_individualCommunicationPlan())),
        hostAudienceContactHistoryProvider(
          'organizer-1',
          'contact-1',
        ).overrideWith((ref) {
          requests++;
          return pending.future;
        }),
      ],
    );
    expect(requests, 0);
    expect(find.byType(HostCustomerOverviewSectionList), findsOneWidget);
    await tester.tap(find.text('History'));
    await tester.pump();
    expect(requests, 1);
    expect(find.byType(HostCustomerTimelineSection), findsNothing);
    pending.complete(_customerDetail());
    await pumpFeatureUi(tester);
    expect(find.byType(HostCustomerTimelineSection), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('customer detail failure names the customer, not organizer', (
    tester,
  ) async {
    await _pumpHostScreen(
      tester,
      const MediaQuery(
        data: MediaQueryData(disableAnimations: true),
        child: HostCustomerDetailScreen(
          organizerId: 'organizer-1',
          contactId: 'contact-1',
          initialDisplayName: 'Ananya Rao',
        ),
      ),
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(_hostUid)),
        hostAudienceContactDetailProvider(
          'organizer-1',
          'contact-1',
        ).overrideWithValue(
          AsyncError<HostAudienceContactDetail>(
            StateError('detail failed'),
            StackTrace.current,
          ),
        ),
      ],
    );

    expect(find.text('Customer details unavailable'), findsOneWidget);
    expect(find.text('Reload customer'), findsOneWidget);
    expect(find.text('Organizer unavailable'), findsNothing);
    expect(
      tester.widget<CatchTopBar>(find.byType(CatchTopBar)).identityName,
      'Ananya Rao',
    );
  });

  testWidgets('customer overview groups status and directory controls', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'header-club', ownerUserId: _hostUid);
    final requests = <HostCustomersDirectoryRequest>[];
    await _pumpHostScreen(
      tester,
      const HostCustomersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(owned: [organizer]),
        hostCustomersDirectoryControllerProvider.overrideWith2(
          (_) => _FixedHostCustomersDirectoryController(
            requests,
            _emptyCustomerDirectoryState(),
          ),
        ),
      ],
    );

    final summary = find.byType(HostCustomersSummarySection);
    expect(
      find.descendant(
        of: summary,
        matching: find.byType(CatchChoiceButton<HostCustomerFilter>),
      ),
      findsNWidgets(3),
    );
    expect(find.text('All  0'), findsOneWidget);
    expect(find.text('Returning  0'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('host-customers-messaging-action')),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey('host-customers-sender-setup-action')),
      findsNothing,
    );

    final controls = find.byType(HostCustomerControlSection);
    expect(
      find.descendant(of: controls, matching: find.text('Filters')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: controls, matching: find.text('Sort: Last seen')),
      findsOneWidget,
    );
    expect(find.byTooltip('More audience actions'), findsOneWidget);
    expect(find.byTooltip('Export this audience'), findsNothing);

    await tester.tap(_customerSummaryChoice(HostCustomerFilter.repeat));
    await pumpFeatureUi(tester);
    expect(requests.last.filters, {HostCustomerFilter.repeat});
    expect(find.textContaining('Repeat attendees'), findsWidgets);
    final attendedSemantics = tester.getSemantics(
      _customerSummaryChoice(HostCustomerFilter.repeat),
    );
    expect(attendedSemantics.label, 'Returning  0');
    expect(attendedSemantics.flagsCollection.isButton, isTrue);
    expect(attendedSemantics.flagsCollection.isSelected, ui.Tristate.isTrue);
    expect(
      attendedSemantics.getSemanticsData().hasAction(ui.SemanticsAction.tap),
      isTrue,
    );

    await tester.tap(_customerSummaryChoice(HostCustomerFilter.repeat));
    await pumpFeatureUi(tester);
    expect(requests.last.filters, isEmpty);
    expect(find.text('All  0'), findsOneWidget);

    await tester.tap(find.text('Filters'));
    await pumpFeatureUi(tester);
    expect(find.byType(HostCustomerFilterSheet), findsOneWidget);
    Navigator.of(tester.element(find.byType(HostCustomerFilterSheet))).pop();
    await pumpFeatureUi(tester);

    await tester.tap(find.text('Sort: Last seen'));
    await pumpFeatureUi(tester);
    expect(find.byType(CatchSelectionSheet<HostCustomerSort>), findsOneWidget);
    await tester.tap(find.text('Name'));
    await pumpFeatureUi(tester);
    expect(find.text('Sort: Name'), findsOneWidget);
    expect(requests.last.sort, HostCustomerSort.name);

    await tester.tap(find.byTooltip('More audience actions'));
    await pumpFeatureUi(tester);
    expect(find.text('Export this audience'), findsOneWidget);
    expect(find.text('Review applications'), findsNothing);
    expect(find.text('Review possible duplicates'), findsOneWidget);
    expect(find.text('Last seen'), findsNothing);
    expect(find.text('Most attended'), findsNothing);
    expect(find.text('WhatsApp ready'), findsNothing);
  });

  testWidgets('customer sort opens a bottom sheet on phones', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final organizer = buildOrganizer(id: 'phone-sort-club', ownerUserId: _hostUid);
    final requests = <HostCustomersDirectoryRequest>[];
    await _pumpHostScreen(
      tester,
      const HostCustomersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(owned: [organizer]),
        hostCustomersDirectoryControllerProvider.overrideWith2(
          (_) => _FixedHostCustomersDirectoryController(
            requests,
            _emptyCustomerDirectoryState(),
          ),
        ),
      ],
    );

    final filtersRect = tester.getRect(
      find.byKey(const ValueKey('host-customers-filters')),
    );
    final sortRect = tester.getRect(
      find.byKey(const ValueKey('host-customers-sort')),
    );
    expect(filtersRect.overlaps(sortRect), isFalse);
    expect(filtersRect.right, lessThanOrEqualTo(390));
    expect(sortRect.right, lessThanOrEqualTo(390));
    expect(find.text('Sort: Last seen'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('host-customers-sort')));
    await pumpFeatureUi(tester);
    expect(find.byType(CatchSelectionSheet<HostCustomerSort>), findsOneWidget);

    await tester.tap(find.text('Most attended'));
    await pumpFeatureUi(tester);
    expect(find.text('Sort: Most attended'), findsOneWidget);
    expect(requests.last.sort, HostCustomerSort.mostAttended);
  });

  testWidgets('compact customer overview keeps metrics and tools in one flow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final organizer = buildOrganizer(id: 'compact-overview-club', ownerUserId: _hostUid);

    await _pumpHostScreen(
      tester,
      const HostCustomersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(owned: [organizer]),
        hostCustomersDirectoryControllerProvider.overrideWith2(
          (_) => _FixedHostCustomersDirectoryController(
            [],
            _customerDirectoryState(),
          ),
        ),
      ],
    );

    final summary = find.byType(HostCustomersSummarySection);
    final tabRailRect = tester.getRect(find.byType(HostAudienceTabRail));
    final summaryRect = tester.getRect(summary);
    expect(
      summaryRect.top - tabRailRect.bottom,
      closeTo(CatchInsets.pageBody.top, 0.5),
      reason: 'The tab body owns the standard top rhythm.',
    );
    final metricSurfaces = tester
        .widgetList<CatchSurface>(
          find.descendant(of: summary, matching: find.byType(CatchSurface)),
        )
        .toList();
    expect(metricSurfaces, hasLength(3));
    expect(
      metricSurfaces.every((surface) => surface.borderSpec == null),
      isTrue,
    );

    final filtersRect = tester.getRect(
      find.byKey(const ValueKey('host-customers-filters')),
    );
    final sortRect = tester.getRect(
      find.byKey(const ValueKey('host-customers-sort')),
    );
    expect(sortRect.top, greaterThanOrEqualTo(summaryRect.bottom));
    expect(filtersRect.overlaps(sortRect), isFalse);
    expect(
      find.ancestor(
        of: find.byKey(const ValueKey('host-customers-filters')),
        matching: find.byType(HostCustomerControlSection),
      ),
      findsOneWidget,
    );

    final customerRow = find.byWidgetPredicate(
      (widget) =>
          widget is CatchField &&
          widget.key == const ValueKey('host-customer-contact-1'),
    );
    expect(
      tester.getTopLeft(customerRow).dy,
      greaterThanOrEqualTo(filtersRect.bottom),
    );
    expect(
      tester.getSize(customerRow).height,
      greaterThanOrEqualTo(
        CatchRecordTokens.avatarExtent + CatchRecordTokens.verticalPadding * 2,
      ),
    );
  });

  testWidgets('sender recovery opens dedicated WhatsApp Business setup', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'messaging-club', ownerUserId: _hostUid);
    await _pumpHostScreen(
      tester,
      const HostCustomersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(
          owned: [organizer],
          messagingSetupByOrganizer: {
            organizer.id: _hostMessagingSetup(
              organizerId: organizer.id,
              connectionStatus: 'pending',
            ),
          },
        ),
        hostCustomersDirectoryControllerProvider.overrideWith2(
          (_) => _FixedHostCustomersDirectoryController(
            [],
            _customerDirectoryState(),
          ),
        ),
      ],
    );

    expect(_customerSummaryChoice(HostCustomerFilter.all), findsOneWidget);
    expect(find.text('Open messaging'), findsNothing);

    await tester.tap(find.byKey(const ValueKey('host-customers-filters')));
    await pumpFeatureUi(tester);
    final atRiskFilter = find.byKey(
      const ValueKey('host-customer-filter-atRisk'),
    );
    await tester.ensureVisible(atRiskFilter);
    await pumpFeatureUi(tester);
    await tester.tap(atRiskFilter);
    await pumpFeatureUi(tester);

    await tester.ensureVisible(find.text('Close'));
    await tester.tap(find.text('Close'));
    await pumpFeatureUi(tester);

    expect(find.text('Sender verification is incomplete'), findsOneWidget);
    expect(find.text('Set up WhatsApp Business'), findsOneWidget);
    await tester.tap(find.text('Set up WhatsApp Business'));
    await pumpFeatureUi(tester);

    expect(find.text('Messaging setup messaging-club'), findsOneWidget);
  });

  testWidgets(
    'sender recovery stays hidden where a sender cannot be connected',
    (tester) async {
      final organizer = buildOrganizer(id: 'messaging-club', ownerUserId: _hostUid);
      await _pumpHostScreen(
        tester,
        const HostCustomersScreen(),
        overrides: [
          ..._hostOrganizerOverrides(
            owned: [organizer],
            messagingSetupByOrganizer: {
              organizer.id: _hostMessagingSetup(
                organizerId: organizer.id,
                connected: false,
              ),
            },
          ),
          hostCustomersDirectoryControllerProvider.overrideWith2(
            (_) => _FixedHostCustomersDirectoryController(
              [],
              _customerDirectoryState(),
            ),
          ),
        ],
      );

      await tester.tap(find.byKey(const ValueKey('host-customers-filters')));
      await pumpFeatureUi(tester);
      final atRiskFilter = find.byKey(
        const ValueKey('host-customer-filter-atRisk'),
      );
      await tester.ensureVisible(atRiskFilter);
      await pumpFeatureUi(tester);
      await tester.tap(atRiskFilter);
      await pumpFeatureUi(tester);

      await tester.ensureVisible(find.text('Close'));
      await tester.tap(find.text('Close'));
      await pumpFeatureUi(tester);

      // Tests run without Meta Embedded Signup, like the native Host apps.
      expect(find.text('Sender verification is incomplete'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('host-customers-sender-setup-action')),
        findsNothing,
      );
    },
  );

  testWidgets('customer search shows clear only while input is non-empty', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'search-club', ownerUserId: _hostUid);
    await _pumpHostScreen(
      tester,
      const HostCustomersScreen(),
      overrides: [
        ..._hostOrganizerOverrides(owned: [organizer]),
        hostCustomersDirectoryControllerProvider.overrideWith2(
          (_) => _FixedHostCustomersDirectoryController(
            [],
            _emptyCustomerDirectoryState(),
          ),
        ),
      ],
    );

    final search = find.byKey(const ValueKey('host-customers-search'));
    Finder trailingIcon(IconData icon) =>
        find.descendant(of: search, matching: find.byIcon(icon));

    expect(trailingIcon(CatchIcons.close), findsNothing);
    expect(trailingIcon(CatchIcons.clear), findsNothing);

    await tester.tap(search);
    await pumpFeatureUi(tester);
    await tester.enterText(
      find.descendant(of: search, matching: find.byType(TextField)),
      'Ananya',
    );
    await tester.pump();

    expect(trailingIcon(CatchIcons.clear), findsOneWidget);
    await tester.tap(trailingIcon(CatchIcons.clear));
    await tester.pump();

    expect(trailingIcon(CatchIcons.clear), findsNothing);
    expect(
      tester
          .widget<TextField>(
            find.descendant(of: search, matching: find.byType(TextField)),
          )
          .controller!
          .text,
      isEmpty,
    );
  });

  testWidgets('compact customer header preserves its title at large text', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(393, 852);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    final organizer = buildOrganizer(id: 'compact-header-club', ownerUserId: _hostUid);
    await _pumpHostScreen(
      tester,
      const MediaQuery(
        data: MediaQueryData(
          size: Size(393, 852),
          textScaler: TextScaler.linear(1.6),
        ),
        child: HostCustomersScreen(),
      ),
      overrides: [
        ..._hostOrganizerOverrides(owned: [organizer]),
        hostCustomersDirectoryControllerProvider.overrideWith2(
          (_) => _FixedHostCustomersDirectoryController(
            [],
            _emptyCustomerDirectoryState(),
          ),
        ),
      ],
    );

    final header = find.byType(CatchTopBar);
    final titleFinder = find.descendant(
      of: header,
      matching: find.text('Audience'),
    );
    final title = tester.widget<Text>(titleFinder);
    final intrinsicTitle = TextPainter(
      text: TextSpan(text: title.data, style: title.style),
      textDirection: TextDirection.ltr,
      textScaler: const TextScaler.linear(1.6),
    )..layout();

    expect(
      tester.getSize(titleFinder).width,
      greaterThanOrEqualTo(intrinsicTitle.width - 0.5),
    );
    expect(
      find.descendant(
        of: find.byType(CatchTopBar),
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is CatchIconAction && widget.tooltip == 'Add person',
        ),
      ),
      findsOneWidget,
    );
    expect(find.byTooltip('Add person'), findsOneWidget);
  });

  testWidgets('customer timeline opens the host event detail route', (
    tester,
  ) async {
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: Builder(
          builder: (context) => HostCustomerTimelineSection(
            customer: _customerDetail(),
            onOpenFormResponse: (_) {},
            onOpenEvent: (eventId) => context.pushNamed(
              Routes.hostAppEventDetailScreen.name,
              pathParameters: {'clubId': 'organizer-1', 'eventId': eventId},
            ),
            onOpenCatchThread: (_) {},
            onOpenWhatsappThread: (_) {},
          ),
        ),
      ),
    );

    expect(
      find.descendant(
        of: find.byType(HostCustomerTimelineSection),
        matching: find.byIcon(CatchIcons.disclosure),
      ),
      findsNWidgets(3),
    );

    await tester.tap(find.text('Sunday Run Club'));
    await pumpFeatureUi(tester);
    expect(find.text('Event organizer-1 event-1'), findsOneWidget);
  });

  testWidgets('customer memory keeps manual tags separate and notes editable', (
    tester,
  ) async {
    var tagEdits = 0;
    var noteAdds = 0;
    HostCustomerNote? editedNote;
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: SingleChildScrollView(
          child: HostCustomerMemorySection(
            customer: _customerDetail(),
            currentUid: _hostUid,
            onEditTags: () => tagEdits += 1,
            onAddNote: () => noteAdds += 1,
            onEditNote: (note) => editedNote = note,
          ),
        ),
      ),
    );

    expect(find.text('NOTES'), findsOneWidget);
    expect(find.text('Brings friends'), findsOneWidget);
    final manualTagsField = tester.widget<CatchField>(
      find.byKey(const ValueKey('host-customer-edit-tags')),
    );
    expect(manualTagsField.title, AppLocalizationsEn().hostCustomersEditTags);
    expect(manualTagsField.body, 'Brings friends');
    expect(manualTagsField.onTap, isNotNull);
    expect(find.text('Introduced three friends.'), findsOneWidget);
    expect(find.textContaining('You ·'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('host-customer-edit-tags')));
    await tester.tap(find.byKey(const ValueKey('host-customer-add-note')));
    await tester.tap(find.byKey(const ValueKey('host-customer-note-note-1')));
    expect(tagEdits, 1);
    expect(noteAdds, 1);
    expect(editedNote?.noteId, 'note-1');
  });

  testWidgets('customer detail skeleton reuses the loaded composition', (
    tester,
  ) async {
    await _pumpHostScreen(
      tester,
      const MediaQuery(
        data: MediaQueryData(disableAnimations: true),
        child: HostCustomerDetailScreen(
          organizerId: 'organizer-1',
          contactId: 'contact-1',
          initialDisplayName: 'Ananya Rao',
        ),
      ),
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(_hostUid)),
        hostAudienceContactDetailProvider(
          'organizer-1',
          'contact-1',
        ).overrideWithValue(const AsyncLoading()),
      ],
    );

    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchSkeleton &&
            widget.variant == CatchSkeletonVariant.content,
      ),
      findsOneWidget,
    );
    expect(find.byType(HostCustomerIdentityCard), findsNothing);
    expect(find.byType(HostCustomerMemoryPreview), findsOneWidget);
    expect(find.byType(HostCustomerOverviewSectionList), findsOneWidget);
    expect(find.byType(HostCustomerReachSection), findsNothing);
    expect(find.byType(HostCustomerRecentEventsList), findsOneWidget);
    expect(find.byType(HostCustomerTimelineSection), findsNothing);
    expect(find.byKey(const ValueKey('host-customer-controls')), findsNothing);
  });

  testWidgets('customer record actions log an asserted outreach attempt', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 3600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final functions = _ManualHandoffTestFunctions(<String>[])
      ..responses['recordOrganizerContactOutreach'] = <String, Object?>{
        'organizerId': 'organizer-1',
        'contactId': 'contact-1',
        'outreachId': 'outreach-1',
        'channel': 'phoneCall',
        'outcome': 'noAnswer',
        'note': 'Try again after 6pm',
        'authorUid': _hostUid,
        'occurredAtMillis': 1700000000000,
        'createdAtMillis': 1700000000000,
        'updatedAtMillis': 1700000000000,
        'revision': 1,
      };
    await _pumpHostScreen(
      tester,
      const HostCustomerDetailScreen(
        organizerId: 'organizer-1',
        contactId: 'contact-1',
      ),
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(_hostUid)),
        hostAudienceContactDetailProvider(
          'organizer-1',
          'contact-1',
        ).overrideWithValue(AsyncData(_customerDetail())),
        hostCommunicationPlanProvider(
          'organizer-1',
          'contact-1',
        ).overrideWithValue(AsyncData(_individualCommunicationPlan())),
        firebaseFunctionsProvider.overrideWithValue(functions),
        hostContactsRepositoryProvider.overrideWithValue(
          HostContactsRepository(functions),
        ),
      ],
    );

    final copy = AppLocalizationsEn();
    await tester.tap(
      find.byKey(const ValueKey('host-customer-record-actions')),
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.text(copy.hostCustomersLogOutreach));
    await pumpFeatureUi(tester);
    expect(find.byType(HostCustomerOutreachSheet), findsOneWidget);

    await tester.tap(
      find.byKey(const ValueKey('host-customer-outreach-outcome')),
    );
    await pumpFeatureUi(tester);
    await tester.tap(
      find.text(copy.hostCustomersOutreachOutcome(outcome: 'noAnswer')),
    );
    await pumpFeatureUi(tester);

    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('host-customer-outreach-note')),
        matching: find.byType(TextField),
      ),
      'Try again after 6pm',
    );
    await tester.tap(find.byKey(const ValueKey('host-customer-save-outreach')));
    await pumpFeatureUi(tester);

    final call = functions.calls['recordOrganizerContactOutreach']!.single;
    expect(call['organizerId'], 'organizer-1');
    expect(call['contactId'], 'contact-1');
    expect(call['channel'], 'phoneCall');
    expect(call['outcome'], 'noAnswer');
    expect(call['note'], 'Try again after 6pm');
    expect(tester.takeException(), isNull);
  });
}

void _expectAudienceStateOwner(
  WidgetTester tester, {
  required HostAudienceView selected,
}) {
  expect(find.byType(HostAudienceStateScaffold), findsOneWidget);
  expect(find.byType(CatchRootScreenScaffold), findsOneWidget);
  expect(find.byType(CatchRootScreenPageScrollView), findsOneWidget);
  expect(find.byType(HostAudienceTabRail), findsOneWidget);
  expect(find.byType(CatchErrorScaffold), findsNothing);
  expect(find.byType(HostLoadingScreen), findsNothing);
  expect(
    tester
        .widget<HostAudienceTabRail>(find.byType(HostAudienceTabRail))
        .selected,
    selected,
  );
  expect(
    tester
        .widget<CatchRootScreenPageScrollView>(
          find.byType(CatchRootScreenPageScrollView),
        )
        .bodyLayout,
    CatchPageBodyMode.standard,
  );
}

// A real overview intentionally omits operational history; the shared fixture
// otherwise includes it. Keep missing, unavailable and known-empty distinct.
HostAudienceContactDetail _customerDetailPresentationFixture({
  bool historyLoaded = true,
  List<HostCustomerTimelineEntry>? timeline,
  HostCustomerTimelineCoverageValue formsCoverage =
      HostCustomerTimelineCoverageValue.exact,
  List<HostCustomerNote>? notes,
  HostCustomerHistoryCoverage notesCoverage = HostCustomerHistoryCoverage.exact,
}) {
  final base = _customerDetail();
  return HostAudienceContactDetail(
    organizerId: base.organizerId,
    contactId: base.contactId,
    displayName: base.displayName,
    sourceDisplayName: base.sourceDisplayName,
    displayNameOverride: base.displayNameOverride,
    phoneE164: '+919876543210',
    email: 'ananya@example.com',
    linkedAccount: base.linkedAccount,
    identityState: base.identityState,
    identityConfidence: base.identityConfidence,
    contactDetailsEditable: base.contactDetailsEditable,
    ambiguousCandidateCount: base.ambiguousCandidateCount,
    whatsappAdminSuppressed: base.whatsappAdminSuppressed,
    whatsappPermission: base.whatsappPermission,
    origins: base.origins,
    originsTruncated: base.originsTruncated,
    traits: base.traits,
    revenue: base.revenue,
    events: base.events,
    eventsTruncated: base.eventsTruncated,
    manualTags: base.manualTags,
    manualTagVocabulary: base.manualTagVocabulary,
    notes: notes ?? base.notes,
    notesCoverage: notesCoverage,
    historyLoaded: historyLoaded,
    timeline: timeline ?? base.timeline,
    timelineTruncated: false,
    timelineCoverage: HostCustomerTimelineCoverage(
      forms: formsCoverage,
      events: base.timelineCoverage.events,
      sends: base.timelineCoverage.sends,
      replies: base.timelineCoverage.replies,
      outreach: base.timelineCoverage.outreach,
    ),
    revision: base.revision,
  );
}

FirebaseFunctions _customerDetailsFunctions() => _ManualHandoffTestFunctions([])
  ..responses['listOrganizerApplications'] = {
    'organizerId': 'organizer-1',
    'applications': <Object?>[],
    'nextCursor': null,
  };
