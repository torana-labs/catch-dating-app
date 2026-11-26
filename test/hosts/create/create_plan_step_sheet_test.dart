import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_plan_step_sheet.dart';
import 'package:catch_l10n/generated/app_localizations.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const step = EventItineraryItem(
    id: 'stop1',
    kind: EventItineraryKind.stop,
    offsetMinutes: 5,
    durationMinutes: 10,
    title: 'Water stop',
    routeDistanceMeters: 1000,
  );

  Future<void> pump(
    WidgetTester tester, {
    required ValueChanged<EventItineraryItem> onDone,
  }) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 1600);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    var current = step;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: SingleChildScrollView(
            // The screen picks the place and hands the step back, as the
            // edit screen does.
            child: StatefulBuilder(
              builder: (context, setState) => CreatePlanStepSheet(
                step: current,
                isNew: false,
                onDone: onDone,
                onRemove: () {},
                onPickPlace: (draft) => setState(
                  () => current = draft.copyWith(
                    location: const EventMeetingLocation(
                      name: 'Harbour steps',
                      latitude: 19.07,
                      longitude: 72.82,
                    ),
                  ),
                ),
                showRouteDistance: true,
              ),
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
  }

  Future<void> done(WidgetTester tester) async {
    final button = find.byKey(const ValueKey('create-plan-step-done'));
    await tester.ensureVisible(button);
    await tester.tap(button);
    await tester.pump();
  }

  testWidgets('editing keeps the route distance and can clear it', (
    tester,
  ) async {
    EventItineraryItem? result;
    await pump(tester, onDone: (item) => result = item);

    await done(tester);
    expect(result!.routeDistanceMeters, 1000);
    expect(result!.offsetMinutes, 5);
    expect(result!.kind, EventItineraryKind.stop);

    final field = find.descendant(
      of: find.byKey(const ValueKey('event-itinerary-route-distance')),
      matching: find.byType(EditableText),
    );
    await tester.ensureVisible(field);
    await tester.enterText(field, '');
    await done(tester);
    expect(result!.routeDistanceMeters, isNull);
  });

  testWidgets('a step can take its own place', (tester) async {
    EventItineraryItem? result;
    await pump(tester, onDone: (item) => result = item);

    final place = find.byKey(const ValueKey('create-plan-step-place'));
    await tester.ensureVisible(place);
    await tester.tap(place);
    await pumpFeatureUi(tester);
    await done(tester);

    expect(result!.location?.name, 'Harbour steps');
  });
}
