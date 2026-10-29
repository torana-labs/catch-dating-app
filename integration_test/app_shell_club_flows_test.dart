import 'package:catch_dating_app/clubs/shared/club_action_keys.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test/clubs/clubs_test_helpers.dart' as club_helpers;
import '../test/events/event_viewer_state_fixtures.dart';
import '../test/events/events_test_helpers.dart' as event_helpers;
import '../test/support/profile_readiness_fixtures.dart';
import 'support/app_shell_test_binding.dart';
import 'support/app_shell_test_harness.dart';

void main() {
  ensureAppShellTestBinding();

  testWidgets(
    'public Explore discovery opens club details through the real route',
    (tester) async {
      final club = club_helpers.buildClub();

      await pumpCatchAppShell(
        tester,
        initialRoute: Routes.exploreScreen.path,
        overrides: appShellTestOverrides(uid: null, user: null, clubs: [club]),
      );

      await openClubDetail(tester, club);
      await pumpAppShellFrames(tester);

      expect(find.text('Stride Social'), findsWidgets);
      expect(
        find.text('Morning runners who like easy city loops.'),
        findsOneWidget,
      );
      expect(find.text('Sign in to follow'), findsOneWidget);
    },
  );

  testWidgets('club detail joins through the membership action', (
    tester,
  ) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final club = club_helpers.buildClub();
    final clubsRepository = club_helpers.FakeClubsRepository();

    await pumpCatchAppShell(
      tester,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        clubs: [club],
        clubsRepository: clubsRepository,
      ),
    );

    await openAppTab(tester, 'Explore');
    await openClubDetail(tester, club);
    await pumpAppShellFrames(tester);
    await tester.tap(find.byKey(ClubActionKeys.joinButton));
    await flushAppShellCallbacks(tester);
    await pumpAppShellFrames(tester);

    expect(clubsRepository.joinedClubId, club.id);
  });

  testWidgets('club detail leaves through the membership action', (
    tester,
  ) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final club = club_helpers.buildClub();
    final clubsRepository = club_helpers.FakeClubsRepository();

    await pumpCatchAppShell(
      tester,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        clubs: [club],
        joinedClubIds: {club.id},
        clubsRepository: clubsRepository,
      ),
    );

    await openAppTab(tester, 'Explore');
    await openClubDetail(tester, club);
    await pumpAppShellFrames(tester);
    await tester.tap(find.byKey(ClubActionKeys.leaveButton));
    await flushAppShellCallbacks(tester);
    await pumpAppShellFrames(tester);

    expect(clubsRepository.leftClubId, club.id);
  });

  testWidgets('club schedule opens an event detail route with booking CTA', (
    tester,
  ) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final club = club_helpers.buildClub();
    final run = event_helpers.buildEvent(
      id: 'run-1',
      clubId: club.id,
      startTime: DateTime.now().add(const Duration(days: 1, hours: 2)),
      meetingPoint: 'Carter Road Amphitheatre',
      bookedCount: 2,
    );

    await pumpCatchAppShell(
      tester,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        clubs: [club],
        joinedClubIds: {club.id},
        clubEvents: {
          club.id: [run],
        },
        eventViewerStates: [
          viewerFixture(eventId: run.id, organizerId: run.organizerId),
        ],
      ),
    );

    await openAppTab(tester, 'Explore');
    await openClubDetail(tester, club);
    await pumpAppShellFrames(tester);
    await openEventDetail(tester, club: club, event: run);

    expect(find.text('Carter Road Amphitheatre'), findsWidgets);
    expect(find.text('Join event — 18 spots left'), findsOneWidget);
  });
}
