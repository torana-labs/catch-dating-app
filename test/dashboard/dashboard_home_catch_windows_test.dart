import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_full_view_model.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_screen.dart';
import 'package:catch_dating_app/events/data/booked_events_repository.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/reviews/domain/review.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/user_profile/data/user_profile_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../events/events_test_helpers.dart';
import '../support/analytics_test_helpers.dart';
import '../support/dashboard_test_helpers.dart';
import '../test_pump_helpers.dart';

void main() {
  group('DashboardScreen Catch windows', () {
    testWidgets('logs each Home window and opens its existing catch route', (
      tester,
    ) async {
      final now = DateTime.now();
      final user = buildUser();
      final reporter = RecordingAnalyticsReporter();
      final attended = buildEvent(
        id: 'home-window',
        name: 'Home window',
        checkedInCount: 3,
        startTime: now.subtract(const Duration(hours: 4)),
        endTime: now.subtract(const Duration(hours: 2)),
      );
      final router = GoRouter(
        initialLocation: Routes.dashboardScreen.path,
        routes: [
          GoRoute(
            path: Routes.dashboardScreen.path,
            builder: (_, _) => const DashboardScreen(),
          ),
          GoRoute(
            path: Routes.swipeEventScreen.path,
            name: Routes.swipeEventScreen.name,
            builder: (_, state) => Scaffold(
              body: Text('Catch ${state.pathParameters['eventId']}'),
            ),
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            appAnalyticsProvider.overrideWithValue(
              AppAnalytics(reporter: reporter, shouldCollect: true),
            ),
            watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
            membershipsOverride(user, const []),
            activityNotificationsOverride(user),
            watchSignedUpEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Event>>([])),
            watchAttendedEventsProvider(
              user.uid,
            ).overrideWithValue(AsyncData<List<Event>>([attended])),
            watchReviewsByUserProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Review>>([])),
            uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
          ],
          child: MaterialApp.router(
            theme: AppTheme.light,
            routerConfig: router,
          ),
        ),
      );
      await pumpFeatureUi(tester);

      expect(
        reporter.events,
        contains(
          const AnalyticsEventCall(AnalyticsEvents.homeOpened, {
            AnalyticsParameters.homeState: 'window_open',
          }),
        ),
      );
      expect(
        reporter.events,
        contains(
          AnalyticsEventCall(AnalyticsEvents.catchWindowImpression, {
            AnalyticsParameters.surface: 'home',
            AnalyticsParameters.eventId: attended.id,
          }),
        ),
      );

      await tester.tap(find.text('Start catching'));
      await pumpFeatureUi(tester);
      expect(find.text('Catch home-window'), findsOneWidget);
      expect(
        reporter.events,
        contains(
          AnalyticsEventCall(AnalyticsEvents.catchWindowOpen, {
            AnalyticsParameters.surface: 'home',
            AnalyticsParameters.eventId: attended.id,
          }),
        ),
      );
    });

    testWidgets('moves an expired Catch window into the review phase', (
      tester,
    ) async {
      var now = DateTime(2026, 4, 23, 20);
      final user = buildUser();
      final attended = buildEvent(
        id: 'closing-window',
        checkedInCount: 2,
        startTime: now.subtract(const Duration(hours: 24)),
        endTime: now.subtract(const Duration(hours: 23)),
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            dashboardNowProvider.overrideWith((ref) => now),
            watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
            membershipsOverride(user, const []),
            activityNotificationsOverride(user),
            watchSignedUpEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Event>>([])),
            watchAttendedEventsProvider(
              user.uid,
            ).overrideWithValue(AsyncData<List<Event>>([attended])),
            watchReviewsByUserProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Review>>([])),
            uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const DashboardScreen(),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Start catching'), findsOneWidget);

      now = now.add(const Duration(hours: 2));
      await pumpFeatureUiFor(tester, dashboardHomeClockTick);
      await tester.pump();
      expect(find.text('Start catching'), findsNothing);
      expect(find.text('Write review'), findsOneWidget);
    });
  });
}
