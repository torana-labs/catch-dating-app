import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_exclusion_ledger.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('alert boundary is inclusive at the configured threshold', () {
    final start = DateTime(2026, 8, 13, 18);
    final before = buildEventSuccessExclusionLedger(
      attendeeUids: const ['guest-1'],
      assignments: const [],
      trackingStartedAt: start,
      now: start.add(const Duration(minutes: 39, seconds: 59)),
    );
    final atThreshold = buildEventSuccessExclusionLedger(
      attendeeUids: const ['guest-1'],
      assignments: const [],
      trackingStartedAt: start,
      now: start.add(const Duration(minutes: 40)),
    );

    expect(before.alertEntries, isEmpty);
    expect(atThreshold.alertEntries.single.uid, 'guest-1');
    expect(
      atThreshold.alertEntries.single.cumulativeExclusion,
      defaultEventSuccessExclusionAlertThreshold,
    );
  });

  test('next alert delay includes time until event tracking starts', () {
    final start = DateTime(2026, 8, 13, 18);
    final ledger = buildEventSuccessExclusionLedger(
      attendeeUids: const ['guest-1'],
      assignments: const [],
      trackingStartedAt: start,
      now: start.subtract(const Duration(minutes: 10)),
    );

    expect(ledger.nextAlertDelay, const Duration(minutes: 50));
  });

  test('next alert delay pauses while a timed assignment is active', () {
    final start = DateTime(2026, 8, 13, 18);
    final assignment = _timedAssignment(
      uid: 'guest-1',
      createdAt: start,
      slots: [
        (
          start.add(const Duration(minutes: 10)),
          start.add(const Duration(minutes: 30)),
        ),
      ],
    );
    final ledger = buildEventSuccessExclusionLedger(
      attendeeUids: const ['guest-1'],
      assignments: [assignment],
      trackingStartedAt: start,
      now: start.add(const Duration(minutes: 20)),
    );

    expect(
      ledger.entries.single.cumulativeExclusion,
      const Duration(minutes: 10),
    );
    expect(ledger.entries.single.isAccumulating, isFalse);
    expect(ledger.nextAlertDelay, const Duration(minutes: 40));
  });

  test('ledger starts at check-in and unions overlapping engagement', () {
    final eventStart = DateTime(2026, 8, 13, 18);
    final checkedInAt = eventStart.add(const Duration(minutes: 20));
    final now = eventStart.add(const Duration(hours: 1));
    final assignment = _timedAssignment(
      uid: 'guest-1',
      createdAt: eventStart,
      slots: [
        (checkedInAt, checkedInAt.add(const Duration(minutes: 20))),
        (
          checkedInAt.add(const Duration(minutes: 10)),
          checkedInAt.add(const Duration(minutes: 30)),
        ),
      ],
    );

    final ledger = buildEventSuccessExclusionLedger(
      attendeeUids: const ['guest-1'],
      assignments: [assignment],
      trackingStartedAt: eventStart,
      trackingStartedAtByUid: {'guest-1': checkedInAt},
      now: now,
    );

    expect(
      ledger.entries.single.cumulativeExclusion,
      const Duration(minutes: 10),
    );
    expect(ledger.entries.single.isAccumulating, isTrue);
  });

  test('static peer assignment does not accrue exclusion', () {
    final start = DateTime(2026, 8, 13, 18);
    final assignment = EventSuccessAssignment(
      id: 'assignment-1',
      eventId: 'event-1',
      organizerId: 'club-1',
      uid: 'guest-1',
      moduleId: 'micro_pods',
      label: 'Pod A',
      displayTitle: 'Pod A',
      peerUids: const ['guest-2'],
      source: 'server_v1',
      createdAt: start,
      updatedAt: start,
    );

    final ledger = buildEventSuccessExclusionLedger(
      attendeeUids: const ['guest-1', 'guest-2'],
      assignments: [assignment],
      trackingStartedAt: start,
      now: start.add(const Duration(hours: 1)),
    );

    expect(
      ledger.entries.map((entry) => entry.cumulativeExclusion),
      everyElement(Duration.zero),
    );
    expect(
      ledger.entries.map((entry) => entry.isAccumulating),
      everyElement(isFalse),
    );
  });

  test('static assignment preserves exclusion accrued before generation', () {
    final start = DateTime(2026, 8, 13, 18);
    final assignedAt = start.add(const Duration(minutes: 20));
    final assignment = EventSuccessAssignment(
      id: 'assignment-1',
      eventId: 'event-1',
      organizerId: 'club-1',
      uid: 'guest-1',
      moduleId: 'micro_pods',
      label: 'Pod A',
      displayTitle: 'Pod A',
      peerUids: const ['guest-2'],
      source: 'server_v1',
      createdAt: assignedAt,
      updatedAt: assignedAt,
    );

    final ledger = buildEventSuccessExclusionLedger(
      attendeeUids: const ['guest-1', 'guest-2'],
      assignments: [assignment],
      trackingStartedAt: start,
      now: start.add(const Duration(hours: 1)),
    );

    expect(
      ledger.entries.map((entry) => entry.cumulativeExclusion),
      everyElement(const Duration(minutes: 20)),
    );
    expect(
      ledger.entries.map((entry) => entry.isAccumulating),
      everyElement(isFalse),
    );
  });
}

EventSuccessAssignment _timedAssignment({
  required String uid,
  required DateTime createdAt,
  required List<(DateTime, DateTime)> slots,
}) {
  return EventSuccessAssignment(
    id: 'assignment-$uid',
    eventId: 'event-1',
    organizerId: 'club-1',
    uid: uid,
    moduleId: 'guided_rotations',
    label: 'Guided rotations',
    displayTitle: 'Guided rotations',
    peerUids: const ['guest-2'],
    rotationSlots: [
      for (final (index, slot) in slots.indexed)
        EventSuccessRotationSlot(
          roundIndex: index,
          label: 'Round ${index + 1}',
          startsAt: slot.$1,
          endsAt: slot.$2,
          peerUid: 'guest-2',
          compatibility: 'social',
        ),
    ],
    source: 'server_v1',
    createdAt: createdAt,
    updatedAt: createdAt,
  );
}
