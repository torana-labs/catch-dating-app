import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/events/presentation/event_detail_information_state.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_fact_list.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_overview_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_restore_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_itinerary_editor.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'events_test_helpers.dart';

void main() {
  test('explicitly skipped route stays skipped after draft serialization', () {
    final draft = EventDraft(
      id: 'draft1',
      organizerId: 'club1',
      savedAt: DateTime(2026),
      activityKind: 'socialRun',
      routePlanEnabled: false,
    );
    final restored = EventDraft.fromJson(draft.toJson());
    expect(
      CreateEventDraftRestoreState.fromDraft(
        restored,
        now: DateTime(2026),
      ).routePlan,
      isNull,
    );
    expect(
      CreateEventDraftRestoreState.fromDraft(
        restored.copyWith(routePlanEnabled: null),
        now: DateTime(2026),
      ).routePlan,
      isNotNull,
    );
  });

  Future<void> pump(WidgetTester tester, Widget child) => tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(body: SingleChildScrollView(child: child)),
    ),
  );

  testWidgets(
    'blank content omits authored plan, itinerary and photo sections',
    (tester) async {
      final event = buildEvent().copyWith(
        description: '  ',
        itinerary: [],
        eventPhotos: [],
      );
      await pump(
        tester,
        EventDetailOverviewSection(
          event: event,
          informationState: eventDetailInformationStateFrom(
            event: event,
            l10n: AppLocalizationsEn(),
          ),
          enableMapNetworkTiles: false,
        ),
      );
      expect(find.byType(EventDescriptionSection), findsNothing);
      expect(find.byType(EventDetailItineraryList), findsNothing);
      expect(find.byType(EventDetailPhotoGrid), findsNothing);
    },
  );

  testWidgets('non-distance format never renders compatibility pace as skill', (
    tester,
  ) async {
    final event = buildEvent().copyWith(
      eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.dinner),
    );
    await pump(tester, EventDetailTicketStubRow(event: event));
    expect(find.text(event.pace.label), findsNothing);
    expect(find.byType(TicketStubTile), findsNWidgets(2));
    await pump(tester, EventDetailTicketStubRow(event: buildEvent()));
    expect(find.byType(TicketStubTile), findsNWidgets(3));
  });

  testWidgets(
    'all photos are visible and first ordered photo is canonical cover',
    (tester) async {
      final photos = List.generate(
        5,
        (i) => UploadedPhoto.fromUpload(
          url: 'https://example.test/$i.jpg',
          storagePath: 'events/event-1/media/$i/original.jpg',
          position: i,
        ),
      );
      final event = buildEvent().copyWith(
        eventPhotos: photos,
        photoUrl: 'https://example.test/old.jpg',
      );
      await pump(tester, EventDetailPhotoGrid(event: event));
      expect(find.byType(EventDetailPhotoTile), findsNWidgets(5));
      expect(event.primaryPhotoUrl, photos.first.url);
    },
  );

  testWidgets('itinerary renders only supplied metadata', (tester) async {
    final event = buildEvent().copyWith(
      itinerary: const [
        EventItineraryItem(
          id: 'stop1',
          kind: EventItineraryKind.stop,
          offsetMinutes: 5,
          durationMinutes: 10,
          title: 'Water stop',
          routeDistanceMeters: 1000,
        ),
      ],
    );
    await pump(tester, EventDetailItineraryList(event: event));
    expect(find.text('Water stop'), findsOneWidget);
    expect(find.textContaining('10m'), findsOneWidget);
    expect(find.textContaining('At 1km on the route'), findsOneWidget);
  });

  testWidgets('editing itinerary preserves route distance and can clear it', (
    tester,
  ) async {
    List<EventItineraryItem>? result;
    const item = EventItineraryItem(
      id: 'stop1',
      kind: EventItineraryKind.stop,
      offsetMinutes: 5,
      title: 'Water stop',
      routeDistanceMeters: 1000,
    );
    await pump(
      tester,
      EventItineraryEditor(
        items: const [item],
        hasRoutePath: true,
        onChanged: (items) => result = items,
      ),
    );
    await tester.tap(find.text('Water stop'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text(AppLocalizationsEn().hostsEventItinerarySave));
    await pumpFeatureUi(tester);
    expect(result!.single.routeDistanceMeters, 1000);
    await tester.tap(find.text('Water stop'));
    await pumpFeatureUi(tester);
    final field = find.descendant(
      of: find.byKey(const ValueKey('event-itinerary-route-distance')),
      matching: find.byType(EditableText),
    );
    await tester.enterText(field, '');
    await tester.tap(find.text(AppLocalizationsEn().hostsEventItinerarySave));
    await pumpFeatureUi(tester);
    expect(result!.single.routeDistanceMeters, isNull);
  });

  test('event-local time uses stored zone and preserves legacy fallback', () {
    final instant = DateTime.utc(2026, 10, 16, 20);
    final event = buildEvent().copyWith(
      startTime: instant,
      eventTimezone: 'Asia/Kolkata',
    );
    expect(event.localStartTime.day, 17);
    expect(event.localStartTime.hour, 1);
    expect(event.localStartTime.minute, 30);
    expect(event.copyWith(eventTimezone: null).localStartTime, instant);
  });

  test('cancellation reason is rendered only for a cancelled event', () {
    final event = buildEvent().copyWith(
      status: EventLifecycleStatus.cancelled,
      cancellationReason: 'Heavy rain',
    );
    final rows = eventDetailInformationStateFrom(
      event: event,
      l10n: AppLocalizationsEn(),
    ).goodToKnowRows;
    expect(rows.any((row) => row.body == 'Heavy rain'), isTrue);
    expect(
      eventDetailInformationStateFrom(
        event: event.copyWith(status: EventLifecycleStatus.active),
        l10n: AppLocalizationsEn(),
      ).goodToKnowRows.any((row) => row.body == 'Heavy rain'),
      isFalse,
    );
  });
}
