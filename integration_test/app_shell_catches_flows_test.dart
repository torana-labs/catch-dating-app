import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_keys.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test/events/events_test_helpers.dart' as event_helpers;
import '../test/organizers/organizers_test_helpers.dart' as organizer_helpers;
import '../test/support/profile_readiness_fixtures.dart';
import 'support/app_shell_test_binding.dart';
import 'support/app_shell_test_harness.dart';

void main() {
  ensureAppShellTestBinding();

  testWidgets('home opens the after-event screen for an attended event', (
    tester,
  ) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final organizer = organizer_helpers.buildOrganizer();
    final attendedRun = event_helpers.buildEvent(
      id: 'attended-run-1',
      organizerId: organizer.id,
      startTime: DateTime.now().subtract(const Duration(hours: 11)),
      endTime: DateTime.now().subtract(const Duration(hours: 10)),
      meetingPoint: 'Bandstand Steps',
      checkedInCount: 2,
    );

    await pumpCatchAppShell(
      tester,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        organizers: [organizer],
        joinedOrganizerIds: {organizer.id},
        attendedEvents: [attendedRun],
      ),
    );

    await tester.tap(find.text('See who you met'));
    await pumpAppShellFrames(tester);

    expect(find.text('How was it?'), findsOneWidget);
    expect(find.text('Stay in touch'), findsOneWidget);
    expect(find.text('Nobody else to pick'), findsOneWidget);
  });

  testWidgets('a pick on the after-event screen records a like', (
    tester,
  ) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final organizer = organizer_helpers.buildOrganizer();
    final attendedRun = event_helpers.buildEvent(
      id: 'attended-run-1',
      organizerId: organizer.id,
      startTime: DateTime.now().subtract(const Duration(hours: 11)),
      endTime: DateTime.now().subtract(const Duration(hours: 10)),
      meetingPoint: 'Bandstand Steps',
      checkedInCount: 3,
    );
    final candidate = event_helpers.buildPublicProfile(
      uid: 'runner-2',
      name: 'Taylor',
      gender: Gender.woman,
    );
    final swipeRepository = FakeShellSwipeRepository();

    await pumpCatchAppShell(
      tester,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        organizers: [organizer],
        joinedOrganizerIds: {organizer.id},
        attendedEvents: [attendedRun],
        swipeCandidates: [candidate],
        publicProfiles: [candidate],
        swipeRepository: swipeRepository,
      ),
    );

    await tester.tap(find.text('See who you met'));
    await pumpAppShellFrames(tester);

    final row = find.byKey(SwipeKeys.afterEventPerson(candidate.uid));
    await tester.ensureVisible(row);
    await tester.tap(find.descendant(of: row, matching: find.text('Pick')));
    await flushAppShellCallbacks(tester);
    await pumpMutationUi(tester);

    expect(swipeRepository.recordedSwipes, hasLength(1));
    expect(swipeRepository.recordedSwipes.single.swiperId, user.uid);
    expect(swipeRepository.recordedSwipes.single.targetId, candidate.uid);
    expect(swipeRepository.recordedSwipes.single.eventId, attendedRun.id);
    expect(
      swipeRepository.recordedSwipes.single.direction,
      SwipeDirection.like,
    );
    expect(
      find.descendant(of: row, matching: find.text('Picked')),
      findsOneWidget,
    );
  });
}
