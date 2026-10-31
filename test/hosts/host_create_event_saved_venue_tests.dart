part of 'host_create_event_screen_test.dart';

void _registerCreateEventSavedVenueTests() {
  testWidgets('picks a map location and handles back navigation', (
    tester,
  ) async {
    final now = DateTime(2099, 1, 2, 9, 30);
    await _pumpCreateEventFlow(tester, now: () => now);
    await _openCreateEventFlow(tester);

    await _fillBasicsStep(tester);
    await _tapPrimaryButton(tester, 'Next');
    await _pumpTestAnimation(tester);

    await tester.tap(find.byKey(CreateEventFormKeys.mapPicker));
    await _pumpTestAnimation(tester);

    final googleMap = tester.widget<gmaps.GoogleMap>(
      find.byType(gmaps.GoogleMap),
    );
    const selectedPoint = LocationCoordinate(19.12345, 72.98765);
    googleMap.onTap?.call(
      gmaps.LatLng(selectedPoint.latitude, selectedPoint.longitude),
    );
    await tester.pump();
    await tester.tap(find.widgetWithText(CatchButton, 'Confirm location'));
    await _pumpTestAnimation(tester);

    expect(find.text('Pinned location'), findsOneWidget);

    await tester.tap(find.text('Previous'));
    await _pumpTestAnimation(tester);
    expect(find.text('Event basics'), findsOneWidget);

    // The global close action offers a save-on-exit decision from any step.
    await tester.tap(find.byTooltip('Close'));
    await _pumpTestAnimation(tester);
    expect(find.text('Keep editing'), findsOneWidget);
    await tester.tap(_dialogAction('Save draft & exit'));
    await _pumpTestAnimation(tester);
    expect(find.text('Open'), findsOneWidget);

    final draftRepository = EventDraftRepository(ErrorLogger());
    final drafts = await draftRepository.loadDrafts(
      organizerId: 'club-1',
      userId: 'runner-1',
    );
    expect(drafts.single.id, now.millisecondsSinceEpoch.toString());
    expect(drafts.single.savedAt, now);
  });

  testWidgets('fills the location name from a Google place selection', (
    tester,
  ) async {
    await _pumpCreateEventFlow(
      tester,
      overrides: [
        placesRepositoryProvider.overrideWithValue(
          const _FakePlacesRepository(
            suggestions: [
              PlaceAutocompleteSuggestion(
                placeId: 'cubbon-park',
                description: 'Cubbon Park, Bengaluru, Karnataka',
                mainText: 'Cubbon Park',
                secondaryText: 'Bengaluru, Karnataka',
              ),
            ],
            placeDetails: PlaceDetails(
              placeId: 'cubbon-park',
              displayName: 'Cubbon Park',
              formattedAddress: 'Cubbon Park, Bengaluru, Karnataka',
              location: LocationCoordinate(12.9763, 77.5929),
            ),
          ),
        ),
      ],
    );
    await _openCreateEventFlow(tester);

    await _fillBasicsStep(tester);
    await _tapPrimaryButton(tester, 'Next');
    await _pumpTestAnimation(tester);

    await tester.tap(find.byKey(CreateEventFormKeys.mapPicker));
    await _pumpTestAnimation(tester);
    await tester.enterText(
      find.widgetWithText(TextField, 'Search for a meeting point'),
      'Cubbon',
    );
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 350));
    await tester.pump();
    await tester.tap(find.text('Cubbon Park'));
    await tester.pump();
    await tester.tap(find.widgetWithText(CatchButton, 'Confirm location'));
    await _pumpTestAnimation(tester);

    expect(find.text('Cubbon Park'), findsWidgets);
    final nameField = tester.widget<TextField>(
      find.descendant(
        of: find.byKey(CreateEventFormKeys.meetingPoint),
        matching: find.byType(TextField),
      ),
    );
    expect(nameField.controller?.text, 'Cubbon Park');
  });

  testWidgets('saved place fills the editable Where fields in one tap', (
    tester,
  ) async {
    const venue = OrganizerEventVenue(
      organizerId: 'club-1',
      venueId: 'venue-1',
      label: 'Bandstand steps',
      meetingLocation: EventMeetingLocation(
        name: 'Sea-facing gate',
        address: 'Bandra West, Mumbai',
        placeId: 'place-1',
        latitude: 19.046,
        longitude: 72.819,
        notes: 'Meet outside the blue gate.',
      ),
      defaultEventCapacity: 24,
      status: OrganizerEventVenueStatus.active,
    );
    await _pumpCreateEventFlow(
      tester,
      savedVenues: const [venue],
      initialStep: 1,
    );
    await _openCreateEventFlow(tester);

    final venueField = find.byWidgetPredicate(
      (widget) => widget is CatchField && widget.title == 'Bandstand steps',
      skipOffstage: false,
    );
    expect(venueField, findsOneWidget);
    await tester.tap(venueField);
    await _pumpTestAnimation(tester);

    final meetingPoint = tester.widget<EditableText>(
      find.descendant(
        of: find.byKey(CreateEventFormKeys.meetingPoint),
        matching: find.byType(EditableText),
      ),
    );
    final directions = tester.widget<EditableText>(
      find.descendant(
        of: find.byKey(CreateEventFormKeys.locationDetails),
        matching: find.byType(EditableText),
      ),
    );
    expect(meetingPoint.controller.text, 'Sea-facing gate');
    expect(directions.controller.text, 'Meet outside the blue gate.');
    expect(find.text('Selected'), findsOneWidget);
  });
}
