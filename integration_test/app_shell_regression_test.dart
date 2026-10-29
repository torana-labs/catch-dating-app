import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/presentation/app_shell_keys.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_keys.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test/clubs/clubs_test_helpers.dart' as club_helpers;
import '../test/events/events_test_helpers.dart' as event_helpers;
import '../test/support/profile_readiness_fixtures.dart';
import 'support/app_shell_test_binding.dart';
import 'support/app_shell_test_harness.dart';

void main() {
  ensureAppShellTestBinding();

  testWidgets('club and event detail routes preserve analytics names', (
    tester,
  ) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final club = club_helpers.buildClub();
    final event = event_helpers.buildEvent(
      clubId: club.id,
      startTime: DateTime.now().add(const Duration(hours: 3)),
    );
    final reporter = RecordingAnalyticsReporter();

    await pumpCatchAppShell(
      tester,
      initialRoute: Routes.exploreScreen.path,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        clubs: [club],
        joinedClubIds: {club.id},
        clubEvents: {
          club.id: [event],
        },
        analytics: AppAnalytics(reporter: reporter, shouldCollect: true),
      ),
    );

    await openClubDetail(tester, club);
    await flushAppShellCallbacks(tester);
    await pumpAppShellFrames(tester);

    await openEventDetail(tester, club: club, event: event);
    await flushAppShellCallbacks(tester);
    await pumpAppShellFrames(tester);

    expect(reporter.screenViews, contains(Routes.clubDetailScreen.name));
    expect(reporter.screenViews, contains(Routes.eventDetailScreen.name));
  });

  testWidgets('catches deck route opens above app shell navigation chrome', (
    tester,
  ) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final club = club_helpers.buildClub();
    final attendedRun = event_helpers.buildEvent(
      id: 'attended-run-1',
      clubId: club.id,
      startTime: DateTime.now().subtract(const Duration(hours: 11)),
      endTime: DateTime.now().subtract(const Duration(hours: 10)),
      checkedInCount: 2,
    );
    final candidate = event_helpers.buildPublicProfile(
      uid: 'runner-2',
      name: 'Taylor',
      gender: Gender.woman,
    );

    await pumpCatchAppShell(
      tester,
      initialRoute: Routes.swipeHubScreen.path,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        clubs: [club],
        joinedClubIds: {club.id},
        attendedEvents: [attendedRun],
        swipeCandidates: [candidate],
      ),
    );

    expect(find.byKey(AppShellKeys.navigationBar), findsOneWidget);

    await openSwipeDeck(tester, attendedRun);
    await flushAppShellCallbacks(tester);
    await pumpAppShellFrames(tester);

    expect(find.byKey(SwipeKeys.passButton), findsOneWidget);
    expect(find.byKey(AppShellKeys.navigationBar), findsNothing);
  });
}
