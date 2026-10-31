import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/shell/app_shell_keys.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_keys.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test/events/events_test_helpers.dart' as event_helpers;
import '../test/organizers/organizers_test_helpers.dart' as organizer_helpers;
import '../test/support/profile_readiness_fixtures.dart';
import 'support/app_shell_test_binding.dart';
import 'support/app_shell_test_harness.dart';

void main() {
  ensureAppShellTestBinding();

  testWidgets('club and event detail routes preserve analytics names', (
    tester,
  ) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final organizer = organizer_helpers.buildOrganizer();
    final event = event_helpers.buildEvent(
      organizerId: organizer.id,
      startTime: DateTime.now().add(const Duration(hours: 3)),
    );
    final reporter = RecordingAnalyticsReporter();

    await pumpCatchAppShell(
      tester,
      initialRoute: Routes.exploreScreen.path,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        organizers: [organizer],
        joinedOrganizerIds: {organizer.id},
        organizerEvents: {
          organizer.id: [event],
        },
        analytics: AppAnalytics(reporter: reporter, shouldCollect: true),
      ),
    );

    await openOrganizerDetail(tester, organizer);
    await flushAppShellCallbacks(tester);
    await pumpAppShellFrames(tester);

    await openEventDetail(tester, organizer: organizer, event: event);
    await flushAppShellCallbacks(tester);
    await pumpAppShellFrames(tester);

    expect(reporter.screenViews, contains(Routes.organizerDetailScreen.name));
    expect(reporter.screenViews, contains(Routes.eventDetailScreen.name));
  });

  testWidgets('catches deck route opens above app shell navigation chrome', (
    tester,
  ) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final organizer = organizer_helpers.buildOrganizer();
    final attendedRun = event_helpers.buildEvent(
      id: 'attended-run-1',
      organizerId: organizer.id,
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
        organizers: [organizer],
        joinedOrganizerIds: {organizer.id},
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
