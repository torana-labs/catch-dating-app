import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_keys.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_body.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test/events/events_test_helpers.dart' as event_helpers;
import '../test/organizers/organizers_test_helpers.dart' as organizer_helpers;
import '../test/support/profile_readiness_fixtures.dart';
import 'support/app_shell_test_binding.dart';
import 'support/app_shell_test_harness.dart';

void main() {
  ensureAppShellTestBinding();

  testWidgets('home event focus opens the swipe deck for an attended event', (
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

    await tester.tap(find.text('Start catching'));
    await pumpAppShellFrames(tester);

    expect(find.text('No more attendees'), findsOneWidget);
    expect(find.text('Join more events to meet new people'), findsOneWidget);
  });

  testWidgets('catches deck records like and pass decisions', (tester) async {
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
    final firstCandidate = event_helpers.buildPublicProfile(
      uid: 'runner-2',
      name: 'Taylor',
      gender: Gender.woman,
    );
    final secondCandidate = event_helpers.buildPublicProfile(
      uid: 'runner-3',
      name: 'Riya',
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
        swipeCandidates: [firstCandidate, secondCandidate],
        swipeRepository: swipeRepository,
      ),
    );

    await tester.tap(find.text('Start catching'));
    await pumpAppShellFrames(tester);

    expect(find.text('Taylor, 30'), findsOneWidget);

    final promptLikeButton = find.byTooltip(
      'Like A perfect event with me looks like...',
    );
    await tester.ensureVisible(promptLikeButton);
    await tester.pump();
    await tester.drag(
      find.byKey(ProfileBody.scrollViewKey),
      const Offset(0, -180),
    );
    await tester.pump();
    await tester.tap(promptLikeButton);
    await flushAppShellCallbacks(tester);
    await pumpMutationUi(tester);

    expect(swipeRepository.recordedSwipes, hasLength(1));
    expect(swipeRepository.recordedSwipes.single.swiperId, user.uid);
    expect(swipeRepository.recordedSwipes.single.targetId, firstCandidate.uid);
    expect(swipeRepository.recordedSwipes.single.eventId, attendedRun.id);
    expect(
      swipeRepository.recordedSwipes.single.direction,
      SwipeDirection.like,
    );
    expect(find.text('Riya, 30'), findsOneWidget);

    await tester.tap(find.byKey(SwipeKeys.passButton));
    await flushAppShellCallbacks(tester);
    await pumpAppShellFrames(tester);

    expect(swipeRepository.recordedSwipes, hasLength(2));
    expect(swipeRepository.recordedSwipes.last.targetId, secondCandidate.uid);
    expect(swipeRepository.recordedSwipes.last.direction, SwipeDirection.pass);
    expect(find.text('No more attendees'), findsOneWidget);
  });
}
