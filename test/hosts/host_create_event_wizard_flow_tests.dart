part of 'host_create_event_screen_test.dart';

void _registerCreateEventWizardFlowTests() {
  testWidgets('custom format can be created with its optional label skipped', (
    tester,
  ) async {
    final now = DateTime(2026, 9, 4, 12);
    final repository = FakeEventRepository();
    await _pumpCreateEventFlow(
      tester,
      now: () => now,
      initialStep: 2,
      initialDraft: EventDraft(
        id: 'custom-optional',
        organizerId: 'club-1',
        savedAt: now,
        name: 'Meet the neighborhood',
        accessibility: 'Step-free entrance',
        included: 'Tea and snacks',
        activityKind: 'openActivity',
        capacity: '24',
        price: '0',
        meetingPoint: 'Garden room',
        startingPointLat: 19.1,
        startingPointLng: 72.9,
        selectedDateMillis: now
            .add(const Duration(days: 1))
            .millisecondsSinceEpoch,
        selectedStartHour: 19,
        selectedStartMinute: 0,
      ),
      overrides: [eventRepositoryProvider.overrideWith((ref) => repository)],
    );
    await _openCreateEventFlow(tester);
    await _tapPrimaryButton(tester, 'Review event');
    await _tapPrimaryButton(tester, 'Create event');
    expect(repository.createdEvent, isNotNull);
    expect(repository.createdEvent!.eventFormat.customActivityLabel, isNull);
    expect(
      repository.createdEvent!.eventFormat.activityKind,
      ActivityKind.openActivity,
    );
    expect(repository.createdEvent!.description, isEmpty);
    expect(
      repository.createdEvent!.eventFormat.accessibilityNotes,
      'Step-free entrance',
    );
    expect(
      repository.createdEvent!.eventFormat.includedNotes,
      'Tea and snacks',
    );
  });

  testWidgets(
    'runtime-only creation needs no roster or presentation and ignores hidden booking rules',
    (tester) async {
      final now = DateTime(2026, 9, 4, 12);
      final repository = FakeEventRepository();
      await _pumpCreateEventFlow(
        tester,
        now: () => now,
        initialStep: 2,
        initialDraft: EventDraft(
          id: 'runtime-draft',
          organizerId: 'club-1',
          savedAt: now,
          name: 'Friday supper',
          activityKind: 'dinner',
          capacity: '24',
          externalBookingMode: true,
          externalBookingProvider: 'luma',
          runtimeWalkInPolicy: 'hostApproval',
          meetingPoint: 'Garden room',
          startingPointLat: 19.1,
          startingPointLng: 72.9,
          selectedDateMillis: now
              .add(const Duration(days: 1))
              .millisecondsSinceEpoch,
          selectedStartHour: 19,
          selectedStartMinute: 0,
          admissionPreset: 'inviteOnly',
          inviteCode: 'x',
          price: 'invalid',
          dynamicPricingEnabled: true,
          dynamicPricingStep: 'invalid',
          maxMen: 'invalid',
          crossPathsPairInventoryEnabled: true,
          crossPathsPairCapacity: 'invalid',
          eventSuccessDefaults: const EventSuccessDefaults(
            attendeePrompt: 'Welcome together',
          ),
        ),
        overrides: [eventRepositoryProvider.overrideWith((ref) => repository)],
      );
      await _openCreateEventFlow(tester);
      expect(find.text('Guests & live guide'), findsWidgets);
      expect(find.byKey(CreateEventFormKeys.price), findsNothing);
      expect(find.byKey(CreateEventFormKeys.inviteCode), findsNothing);
      expect(
        find.byKey(CreateEventFormKeys.crossPathsPairInventoryToggle),
        findsNothing,
      );
      expect(find.text('Customize guide'), findsOneWidget);
      await _tapPrimaryButton(tester, 'Review event');
      expect(find.text('Import now or later'), findsOneWidget);
      await _tapPrimaryButton(tester, 'Create event');
      expect(repository.createdEvent, isNotNull);
      expect(repository.createdEvent!.description, isEmpty);
      expect(repository.createdEvent!.eventFormat.accessibilityNotes, isNull);
      expect(repository.createdEvent!.eventFormat.includedNotes, isNull);
      expect(repository.createdEvent!.eventPhotos, isEmpty);
      expect(repository.createdEvent!.priceInPaise, 0);
      expect(
        repository.createdEvent!.eventPolicy!.admissionPolicy.format,
        EventAdmissionFormat.open,
      );
      expect(repository.createdEvent!.constraints.maxMen, isNull);
      expect(repository.createdEventInviteCode, isNull);
      expect(
        repository.createdExternalOrigin!.provider,
        ExternalBookingProvider.luma,
      );
      expect(
        repository.createdRuntimeWalkInPolicy,
        EventRuntimeWalkInPolicy.hostApproval,
      );
      expect(repository.createdEventSuccessDefaults!.enabled, isTrue);
      expect(
        repository.createdEventSuccessDefaults!.attendeePrompt,
        'Welcome together',
      );
    },
  );

  testWidgets('allows sections to be completed out of order', (tester) async {
    await _pumpCreateEventFlow(tester);
    await _openCreateEventFlow(tester);
    await _tapPrimaryButton(tester, 'Next');
    await _pumpTestAnimation(tester);
    expect(find.text('When & where'), findsWidgets);
    expect(find.text('Required'), findsNothing);
    expect(find.text('Select a pace'), findsNothing);
    expect(find.text('Previous'), findsOneWidget);
  });

  testWidgets('uses dockless actions and a flat divided media section', (
    tester,
  ) async {
    await _pumpCreateEventFlow(tester);
    await _openCreateEventFlow(tester);

    expect(find.byType(CatchBottomActionOverlay), findsOneWidget);
    expect(
      find.byKey(const ValueKey('catch_bottom_action_overlay.actions')),
      findsOneWidget,
    );

    await _openCatchField(tester, 'Description & photos · Optional');
    final organizerFinder = find.byKey(
      const ValueKey('create_event.inherited_organizer_logo'),
    );
    final mediaSection = find.ancestor(
      of: organizerFinder,
      matching: find.byType(CatchSection),
    );
    expect(mediaSection, findsOneWidget);
    expect(
      find.descendant(of: mediaSection, matching: find.byType(CatchDivider)),
      findsNothing,
    );
    final titleRect = tester.getRect(find.text('EVENT COVER & GALLERY'));
    final organizerRect = tester.getRect(organizerFinder);
    expect(
      organizerRect.top - titleRect.bottom,
      greaterThanOrEqualTo(CatchSpacing.s3),
    );
  });

  testWidgets('puts viable event fields before optional media on phone', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 3000);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    await _pumpCreateEventFlow(tester);
    await _openCreateEventFlow(tester);

    expect(
      find.byKey(const ValueKey('create_event.add_event_photos')),
      findsNothing,
    );
    await _openCatchField(tester, 'Description & photos · Optional');
    final nameRect = tester.getRect(find.byKey(CreateEventFormKeys.name));
    final mediaRect = tester.getRect(
      find.byKey(const ValueKey('create_event.add_event_photos')),
    );
    expect(nameRect.top, lessThan(mediaRect.top));
    expect(
      find.byKey(const ValueKey('host-create-event-step-rail')),
      findsNothing,
    );
  });

  testWidgets(
    'wide create flow uses the shared editor and preview across widths',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(1440, 1000);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      await _pumpCreateEventFlow(tester);
      await _openCreateEventFlow(tester);

      final rail = find.byKey(const ValueKey('host-create-event-step-rail'));
      final lane = find.byKey(const ValueKey('host-create-event-form-lane'));
      final consequence = find.byKey(
        const ValueKey('host-create-event-consequence-pane'),
      );
      expect(rail, findsOneWidget);
      expect(lane, findsOneWidget);
      expect(consequence, findsOneWidget);
      expect(tester.getSize(lane).width, CatchLayout.workspaceEditorWidth);
      expect(
        tester.getRect(lane).right,
        lessThanOrEqualTo(tester.getRect(rail).left),
      );
      expect(
        tester.getRect(lane).right,
        lessThan(tester.getRect(consequence).left),
      );

      await tester.tap(
        find.byKey(const ValueKey('catch-form-step-overview-1')),
      );
      await _pumpTestAnimation(tester);
      expect(find.text('When & where'), findsWidgets);

      tester.view.physicalSize = const Size(1024, 1000);
      await tester.pump();
      expect(rail, findsOneWidget);
      expect(lane, findsOneWidget);
      expect(consequence, findsOneWidget);
      expect(find.text('When & where'), findsWidgets);

      tester.view.physicalSize = const Size(430, 1000);
      await tester.pump();
      expect(rail, findsNothing);
      expect(consequence, findsNothing);
      expect(find.text('When & where'), findsWidgets);
    },
  );

  testWidgets(
    'demand pricing allows at least four lines for consequence copy',
    (tester) async {
      await _pumpCreateEventFlow(tester);
      await _openCreateEventFlow(tester);

      for (var step = 0; step < 2; step += 1) {
        await _tapPrimaryButton(tester, 'Next');
        await _pumpTestAnimation(tester);
      }

      expect(find.text('Booking & live guide'), findsOneWidget);
      await _openCatchField(tester, 'Admission format');
      await tester.tap(
        find.byKey(const ValueKey('catch-field-option-card-Balanced singles')),
      );
      await _pumpTestAnimation(tester);
      expect(
        tester
            .widget<CatchField>(
              find.byKey(CreateEventFormKeys.dynamicPricingToggle),
            )
            .bodyMaxLines,
        greaterThanOrEqualTo(4),
      );
    },
  );

  testWidgets(
    'external guest-list creation preserves the mapped source and removes Catch payment policy',
    (tester) async {
      const rosterPlan = HostRosterImportPlan(
        fileName: 'luma-guests.csv',
        fileFingerprint: 'sha256:guest-list',
        format: EventAttendeeImportFormat.csv,
        rows: [
          EventAttendeeImportRow(
            rowId: '2',
            displayName: 'Asha Shah',
            email: 'asha@example.com',
            status: EventAttendeeStatus.registered,
          ),
          EventAttendeeImportRow(
            rowId: '3',
            displayName: 'Ravi Rao',
            email: 'ravi@example.com',
            status: EventAttendeeStatus.registered,
          ),
        ],
        readyCount: 2,
        needsReviewCount: 1,
        excludedCount: 1,
        adapterId: HostRosterAdapterId.lumaV1,
      );
      await _pumpCreateEventFlow(tester, initialRosterImportPlan: rosterPlan);
      await _openCreateEventFlow(tester);

      for (var step = 0; step < 2; step += 1) {
        await _tapPrimaryButton(tester, 'Next');
        await _pumpTestAnimation(tester);
      }

      expect(find.text('Guest list'), findsOneWidget);
      expect(
        find.text('luma-guests.csv · 2 ready · 1 need review · 1 excluded'),
        findsOneWidget,
      );
      expect(find.text('Luma'), findsWidgets);

      expect(find.text('Guests & live guide'), findsOneWidget);
      expect(find.text('Event price'), findsNothing);
      expect(find.text('Cancellation policy'), findsNothing);
      final capacity = tester.widget<EditableText>(
        find.descendant(
          of: find.byKey(CreateEventFormKeys.capacity),
          matching: find.byType(EditableText),
        ),
      );
      expect(capacity.controller.text, '2');
    },
  );

  testWidgets('stays open when save draft and exit fails', (tester) async {
    await _pumpCreateEventFlow(
      tester,
      overrides: [
        eventDraftRepositoryProvider.overrideWithValue(
          _FailingEventDraftRepository(),
        ),
      ],
    );
    await _openCreateEventFlow(tester);
    await _fillBasicsStep(tester);

    await tester.tap(find.byTooltip('Close'));
    await _pumpTestAnimation(tester);
    expect(find.text('Keep editing'), findsOneWidget);
    expect(find.text('Discard & exit'), findsOneWidget);
    expect(find.text('Save draft & exit'), findsOneWidget);

    await tester.tap(_dialogAction('Save draft & exit'));
    await _pumpTestAnimation(tester);

    expect(find.byTooltip('Close'), findsOneWidget);
    expect(find.text('Open'), findsNothing);
    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
  });
}

class _FailingEventDraftRepository extends EventDraftRepository {
  _FailingEventDraftRepository() : super(ErrorLogger());

  @override
  Future<void> saveDraft({
    required String userId,
    required EventDraft draft,
  }) async {
    throw StateError('save draft failed');
  }
}

class _FakePlacesRepository implements PlacesRepository {
  const _FakePlacesRepository({
    required this.suggestions,
    required this.placeDetails,
  });

  final List<PlaceAutocompleteSuggestion> suggestions;
  final PlaceDetails placeDetails;

  @override
  Future<List<PlaceAutocompleteSuggestion>> autocomplete({
    required String input,
    required String sessionToken,
    LocationCoordinate? bias,
    String? countryIsoCode,
  }) async {
    return suggestions;
  }

  @override
  Future<PlaceDetails> details({
    required String placeId,
    required String sessionToken,
  }) async {
    return placeDetails;
  }
}
