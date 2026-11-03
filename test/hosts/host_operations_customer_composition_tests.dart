part of 'host_operations_screen_test.dart';

void _registerHostOperationsCustomerCompositionTests() {
  testWidgets(
    'customer Details fetches submissions without blocking Overview',
    (tester) async {
      tester.view.physicalSize = const Size(390, 2400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      var requests = 0;
      final pending = Completer<HostAudienceContactDetail>();
      final copy = AppLocalizationsEn();
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
          ).overrideWithValue(
            AsyncData(
              _customerDetailPresentationFixture(
                historyLoaded: false,
                timeline: const [],
              ),
            ),
          ),
          hostAudienceContactHistoryProvider(
            'organizer-1',
            'contact-1',
          ).overrideWith((ref) {
            requests++;
            return pending.future;
          }),
          hostCommunicationPlanProvider(
            'organizer-1',
            'contact-1',
          ).overrideWithValue(AsyncData(_individualCommunicationPlan())),
          firebaseFunctionsProvider.overrideWithValue(
            _customerDetailsFunctions(),
          ),
          hostSavedAudienceFilterOptionsProvider(
            'organizer-1',
          ).overrideWithValue(
            const AsyncData(HostSavedAudienceFilterOptions.empty()),
          ),
        ],
      );
      expect(requests, 0);
      expect(find.byType(HostCustomerOverviewSectionList), findsOneWidget);
      expect(find.byType(HostCustomerReachSection), findsNothing);
      expect(find.text('Ananya Rao'), findsOneWidget);
      expect(find.byType(HostCustomerIdentityCard), findsNothing);
      expect(
        tester.widget<CatchTopBar>(find.byType(CatchTopBar)).identityName,
        'Ananya Rao',
      );
      await tester.tap(find.text('Details'));
      await tester.pump();
      expect(requests, 1);
      expect(find.text(copy.hostCustomersNoSubmittedInformation), findsNothing);
      expect(
        find.byKey(const ValueKey('host-customer-submission-response-1')),
        findsNothing,
      );
      expect(find.byType(HostCustomerReachSection), findsOneWidget);
      pending.complete(_customerDetail());
      await pumpFeatureUi(tester);
      expect(
        find.byKey(const ValueKey('host-customer-submission-response-1')),
        findsOneWidget,
      );
      expect(find.text(copy.hostCustomersNoSubmittedInformation), findsNothing);
      expect(find.text('Ananya Rao'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('customer submissions distinguish unavailable from known empty', (
    tester,
  ) async {
    final copy = AppLocalizationsEn();
    for (final coverage in [
      HostCustomerTimelineCoverageValue.unavailable,
      HostCustomerTimelineCoverageValue.exact,
    ]) {
      await _pumpHostScreen(
        tester,
        HostCustomerDetailScreen(
          key: ValueKey(coverage),
          organizerId: 'organizer-1',
          contactId: 'contact-1',
        ),
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value(_hostUid)),
          hostAudienceContactDetailProvider(
            'organizer-1',
            'contact-1',
          ).overrideWithValue(
            AsyncData(
              _customerDetailPresentationFixture(
                formsCoverage: coverage,
                timeline: const [],
              ),
            ),
          ),
          hostCommunicationPlanProvider(
            'organizer-1',
            'contact-1',
          ).overrideWithValue(AsyncData(_individualCommunicationPlan())),
          firebaseFunctionsProvider.overrideWithValue(
            _customerDetailsFunctions(),
          ),
          hostSavedAudienceFilterOptionsProvider(
            'organizer-1',
          ).overrideWithValue(
            const AsyncData(HostSavedAudienceFilterOptions.empty()),
          ),
        ],
      );
      await tester.tap(find.text('Details'));
      await pumpFeatureUi(tester);
      final section = find.byKey(
        const ValueKey('host-customer-submitted-information'),
      );
      expect(section, findsOneWidget);
      expect(
        find.descendant(
          of: section,
          matching: find.text(
            coverage == HostCustomerTimelineCoverageValue.exact
                ? copy.hostCustomersNoSubmittedInformation
                : copy.hostCustomersSubmissionsUnavailable,
          ),
        ),
        findsOneWidget,
      );
      if (coverage != HostCustomerTimelineCoverageValue.exact) {
        expect(
          find.text(copy.hostCustomersNoSubmittedInformation),
          findsNothing,
        );
      }
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets(
    'customer contact fields use their full lane and retain actions',
    (tester) async {
      var calls = 0;
      var emails = 0;
      var edits = 0;
      const laneKey = ValueKey('customer-contact-lane');
      await _pumpHostScreen(
        tester,
        Scaffold(
          body: Center(
            child: SizedBox(
              key: laneKey,
              width: 350,
              child: HostCustomerDetailsSection(
                customer: _customerDetailPresentationFixture(),
                onCall: () => calls++,
                onEmail: () => emails++,
                onEdit: () => edits++,
              ),
            ),
          ),
        ),
      );
      final lane = tester.getRect(find.byKey(laneKey));
      for (final key in ['host-customer-call', 'host-customer-email']) {
        final field = find.byKey(ValueKey(key));
        final rect = tester.getRect(field);
        expect(rect.left, closeTo(lane.left, 0.5));
        expect(rect.right, closeTo(lane.right, 0.5));
        await tester.tap(field);
      }
      final surfaces = tester.widgetList<CatchLegacySurface>(
        find.descendant(
          of: find.byType(HostCustomerDetailsSection),
          matching: find.byType(CatchLegacySurface),
        ),
      );
      expect(
        surfaces.where((surface) => surface.borderSpec != null),
        isEmpty,
        reason: 'Ordinary contact rows must not regain a framed collection.',
      );
      await tester.tap(
        find.byKey(const ValueKey('host-customer-edit-details')),
      );
      expect(calls, 1);
      expect(emails, 1);
      expect(edits, 1);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('customer notes unavailable never becomes no notes', (
    tester,
  ) async {
    final copy = AppLocalizationsEn();
    final customer = _customerDetailPresentationFixture(
      notes: const [],
      notesCoverage: HostCustomerHistoryCoverage.unavailable,
    );
    var opened = 0;
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: HostCustomerMemoryPreview(
          customer: customer,
          onOpenMemory: () => opened++,
        ),
      ),
    );
    expect(find.text(copy.hostCustomersNoNotes), findsNothing);
    expect(find.text(copy.hostCustomersNotesUnavailableBody), findsOneWidget);
    await tester.tap(
      find.byKey(const ValueKey('host-customer-memory-preview')),
    );
    expect(opened, 1);
    await _pumpHostScreen(
      tester,
      Scaffold(
        body: SingleChildScrollView(
          child: HostCustomerMemorySection(
            customer: customer,
            currentUid: _hostUid,
            onEditTags: () {},
            onAddNote: () {},
            onEditNote: (_) {},
          ),
        ),
      ),
    );
    expect(find.text(copy.hostCustomersNoNotes), findsNothing);
    expect(find.text(copy.hostCustomersNotesUnavailableBody), findsOneWidget);
    expect(
      find.byKey(const ValueKey('host-customer-add-note')),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
}
