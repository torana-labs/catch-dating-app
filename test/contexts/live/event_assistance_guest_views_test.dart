import 'package:catch_dating_app/contexts/live/data/event_assistance_guest_views.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  EventAssistanceGroupScope group(String groupId) => EventAssistanceGroupScope(
    organizerId: 'org-1',
    eventId: 'event-1',
    groupId: groupId,
  );

  // functions/src/hostReadModels/guestViewTriggers.test.ts pins the same
  // vectors from membershipIdentity, settingId, runtimeConfigId and
  // checkpointIdentity.
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
    expect(
      checkpointAccountabilityViewId(
        group('event:whole'),
        AssistanceAccountabilityCheckpoint(
          checkpointId: 'stop-2',
          progressRevision: 3,
        ),
      ),
      'checkpoint:'
      'b0cd2cb234df1869e45add17f36e3d810453a98739a899ac6e12ad09d7301ed1',
    );
  });

  test('the read time is the app clock, never before the evaluation', () {
    final view = {'evaluatedAt': Timestamp.fromMillisecondsSinceEpoch(5000)};
    expect(guestViewNow(DateTime.fromMillisecondsSinceEpoch(9000), view), 9000);
    expect(guestViewNow(DateTime.fromMillisecondsSinceEpoch(1000), view), 5000);
    expect(guestViewNow(DateTime.fromMillisecondsSinceEpoch(1000), null), 1000);
  });
}
