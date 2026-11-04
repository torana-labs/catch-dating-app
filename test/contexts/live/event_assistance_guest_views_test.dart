import 'package:catch_dating_app/contexts/live/data/event_assistance_guest_views.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  EventAssistanceGroupScope group(String groupId) => EventAssistanceGroupScope(
    organizerId: 'org-1',
    eventId: 'event-1',
    groupId: groupId,
  );

  // functions/src/hostReadModels/guestViewTriggers.test.ts pins the same
  // vectors from membershipIdentity, settingId and runtimeConfigId.
  test('view ids are the server record ids', () {
    final guest = EventAssistanceGuestScope(
      organizerId: 'org-1',
      eventId: 'event-1',
      attendeeId: 'attendee-1',
    );
    expect(accountabilityViewId(guest), 'event-1_attendee-1');
    expect(
      membershipViewId(guest),
      'membership:'
      'c977039896305665999f971d428725fc1c1ff4eaf9368f56d7816f765ff8bdb8',
    );
    expect(
      lateJoinSettingViewId(group('event:whole')),
      'setting:'
      'beb96281cb3d04664c22a8f22ad658a114f9956768225dbb566a46284db92e09',
    );
    expect(
      lateJoinSettingViewId(group('easy')),
      'setting:'
      '94721d947f042210df263a3748a6d71138910ea8983da4c2d1078a83a44ef4f0',
    );
    expect(
      runtimeViewId(
        EventAssistanceRuntimeScope(organizerId: 'org-1', eventId: 'event-1'),
      ),
      'runtime:lateJoin:'
      '468f3e8fcfbaed5ffd78013b0b0770ca4f2a178c6dee1c8a5110fc0c107b3927',
    );
  });

  test('listeners are read again when readiness, a transfer, a receiver, '
      'the review window or the automation window lapses', () {
    DateTime at(int millis) => DateTime.fromMillisecondsSinceEpoch(millis);
    final membership = {
      'eventEndAtMillis': 9000000,
      'view': {
        'transfer': {'expiresAt': 2000000},
      },
      'receivers': [
        {
          'operatorId': 'pacer-1',
          'groups': [
            {'groupId': 'tempo', 'validUntil': 1500000},
          ],
        },
      ],
    };
    expect(membershipNextRebuild(membership, 1000000), at(1500000));
    expect(membershipNextRebuild(membership, 1600000), at(2000000));
    expect(
      membershipNextRebuild(membership, 2100000),
      at(2100000 + membershipHandoverReviewWindow),
    );
    expect(
      membershipNextRebuild({...membership, 'receivers': <Object?>[]}, 8500000),
      at(9000000),
      reason: 'with no receivers only the event end is ahead',
    );
    expect(membershipNextRebuild(null, 1), isNull);
    final runtime = {
      'eventEndAtMillis': 10000,
      'view': {
        'runtime': {
          'configuration': {'expiresAt': 9000},
        },
      },
    };
    expect(runtimeNextRebuild(runtime, 1000), at(9000));
    expect(runtimeNextRebuild(runtime, 9000), at(10000));
    expect(runtimeNextRebuild(runtime, 10000), isNull);
  });
}
