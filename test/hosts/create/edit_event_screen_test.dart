import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/events/domain/event_public_details.dart';
import 'package:catch_dating_app/hosts/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/create/edit_event_screen.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final start = DateTime(2026, 5, 22, 7);
  DateTime now() => DateTime(2026, 5, 21, 9);

  Event event({int? bookedCount}) => buildEvent(
    id: 'hosted-event',
    name: 'Seafront social run',
    startTime: start,
    endTime: start.add(const Duration(hours: 1)),
    meetingPoint: 'Old gate',
    startingPointLat: 19.076,
    startingPointLng: 72.8777,
    description: 'Old description',
    bookedCount: bookedCount,
  );

  Future<FakeEventRepository> pump(
    WidgetTester tester,
    Event event, {
    String? inviteCode,
  }) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(430, 2400);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = FakeEventRepository();
    await pumpEventsTestApp(
      tester,
      EditEventScreen(
        organizer: buildOrganizer(id: event.organizerId),
        event: event,
        now: now,
        enableNetworkTiles: false,
      ),
      signedInUid: 'host-1',
      overrides: [
        eventRepositoryProvider.overrideWith((ref) => repository),
        watchEventPrivateAccessProvider(event.id).overrideWith(
          (ref) => Stream.value(
            inviteCode == null
                ? null
                : EventPrivateAccess(
                    id: 'access-1',
                    eventId: event.id,
                    organizerId: event.organizerId,
                    inviteCode: inviteCode,
                    createdAt: start,
                  ),
          ),
        ),
      ],
    );
    await tester.pump();
    return repository;
  }

  Future<void> enter(WidgetTester tester, Key key, String value) async {
    final field = find.descendant(
      of: find.byKey(key, skipOffstage: false),
      matching: find.byType(TextField, skipOffstage: false),
    );
    await tester.ensureVisible(field);
    await tester.enterText(field, value);
    await tester.pump();
  }

  Future<void> save(WidgetTester tester) async {
    await tester.tap(find.text('Save changes'));
    await pumpFeatureUi(tester);
  }

  testWidgets('saves host-editable details through updateEvent', (
    tester,
  ) async {
    final repository = await pump(tester, event());

    expect(find.text('Edit event'), findsOneWidget);
    expect(find.text('Published event', skipOffstage: false), findsOneWidget);
    expect(
      find.byKey(const ValueKey('create-starts'), skipOffstage: false),
      findsOneWidget,
    );
    expect(
      find.byKey(CreateEventFormKeys.cohortCapsToggle, skipOffstage: false),
      findsOneWidget,
    );

    await enter(tester, const ValueKey('create-name'), 'Monsoon miles');
    await enter(tester, CreateEventFormKeys.meetingPoint, 'New gate');
    await enter(tester, const ValueKey('create-distance'), '7.5');
    await enter(
      tester,
      const ValueKey('create-description'),
      'Updated route notes',
    );
    await enter(
      tester,
      CreateEventFormKeys.accessibility,
      'Step-free entrance',
    );
    await enter(tester, CreateEventFormKeys.included, 'Water and a guide');
    final fast = find.text('Fast', skipOffstage: false);
    await tester.ensureVisible(fast);
    await tester.tap(fast);
    await tester.pump();

    await save(tester);

    final updated = repository.updatedEvent!;
    expect(updated.id, 'hosted-event');
    expect(updated.name, 'Monsoon miles');
    expect(updated.meetingPoint, 'New gate');
    expect(updated.distanceKm, 7.5);
    expect(updated.pace, PaceLevel.fast);
    expect(updated.description, 'Updated route notes');
    expect(updated.eventFormat.accessibilityNotes, 'Step-free entrance');
    expect(updated.eventFormat.includedNotes, 'Water and a guide');
    expect(updated.startTime, start);
    expect(updated.endTime, start.add(const Duration(hours: 1)));
    expect(updated.startingPointLat, 19.076);
    expect(repository.updatedEventIncludePolicy, isTrue);
  });

  testWidgets('an invite-only event keeps its code and needs one to save', (
    tester,
  ) async {
    final inviteOnly = event().copyWith(
      eventPolicy: EventPolicyBundle.inviteOnlyEvent(
        capacityLimit: 20,
        basePriceInPaise: 0,
      ),
    );
    final repository = await pump(tester, inviteOnly, inviteCode: 'SOCIAL2026');

    expect(find.text('SOCIAL2026', skipOffstage: false), findsOneWidget);
    await enter(tester, const ValueKey('edit-invite-code-1'), 'ab');
    await save(tester);
    expect(repository.updatedEvent, isNull);

    await enter(tester, const ValueKey('edit-invite-code-1'), 'SEAFACE');
    await save(tester);

    expect(repository.updatedEventInviteCode, 'SEAFACE');
    expect(
      repository.updatedEvent!.effectiveEventPolicy.usesInviteOnly,
      isTrue,
    );
  });

  testWidgets('bookings lock the schedule and the policy', (tester) async {
    final repository = await pump(tester, event(bookedCount: 1));

    expect(find.text('Schedule locked', skipOffstage: false), findsOneWidget);
    expect(
      find.byKey(const ValueKey('create-starts'), skipOffstage: false),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey('create-locked-schedule'), skipOffstage: false),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('edit-policy-locked'), skipOffstage: false),
      findsOneWidget,
    );
    expect(
      find.byKey(CreateEventFormKeys.price, skipOffstage: false),
      findsNothing,
    );

    await enter(tester, CreateEventFormKeys.meetingPoint, 'New gate');
    await save(tester);

    expect(repository.updatedEvent!.meetingPoint, 'New gate');
    expect(repository.updatedEventIncludePolicy, isFalse);
  });

  testWidgets('a cancelled event cannot be changed or saved', (tester) async {
    await pump(
      tester,
      event().copyWith(
        status: EventLifecycleStatus.cancelled,
        cancelledAt: start.subtract(const Duration(days: 1)),
      ),
    );

    expect(find.text('Cancelled event', skipOffstage: false), findsOneWidget);
    final name = tester.widget<CatchField>(
      find.byKey(const ValueKey('create-name'), skipOffstage: false),
    );
    expect(name.enabled, isFalse);
    final dock = tester.widget<CatchDock>(find.byType(CatchDock));
    expect(dock.primary.onPressed, isNull);
  });

  testWidgets('required fields stop the save and say why', (tester) async {
    final repository = await pump(tester, event());

    await enter(tester, CreateEventFormKeys.meetingPoint, '');
    await enter(tester, const ValueKey('create-distance'), '');
    await save(tester);

    expect(find.text('Required', skipOffstage: false), findsNWidgets(2));
    expect(repository.updatedEvent, isNull);
  });
}
