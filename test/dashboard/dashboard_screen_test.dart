import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_check_in_location_service.dart';
import 'package:catch_dating_app/contexts/bookings/data/health_activity_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/weekly_activity_summary.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_recommendations_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_calendar_links.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/dashboard/presentation/activity_screen.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_full_view_model.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_screen.dart';
import 'package:catch_dating_app/dashboard/presentation/notifications_list_state.dart';
import 'package:catch_dating_app/dashboard/presentation/notifications_list_view_model.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/activity_section.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/club_posts_home_section.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/dashboard_empty_sliver_body.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/dashboard_full.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/event_focus_list.dart';
import 'package:catch_dating_app/events/shared/event_check_in_qr_scanner.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../clubs/clubs_test_helpers.dart' as club_test;
import '../events/events_test_helpers.dart';
import '../support/analytics_test_helpers.dart';
import '../support/dashboard_test_helpers.dart';
import '../test_pump_helpers.dart';

part 'dashboard_full_home_shell_tests.dart';

final _l10n = AppLocalizationsEn();

void main() {
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  group('NotificationsListState', () {
    test('groups visible rows with an injected clock', () {
      final now = DateTime(2026, 5, 16, 12);
      final state = buildNotificationsListState(
        l10n: _l10n,
        uid: const AsyncData<String?>('runner-1'),
        notifications: AsyncData<List<ActivityNotification>>([
          _activityNotification(
            id: 'today',
            uid: 'runner-1',
            title: 'Today catch',
            createdAt: DateTime(2026, 5, 16, 10),
          ),
          _activityNotification(
            id: 'yesterday',
            uid: 'runner-1',
            title: 'Yesterday catch',
            createdAt: DateTime(2026, 5, 15, 18),
            readAt: DateTime(2026, 5, 16, 8),
          ),
          _activityNotification(
            id: 'week',
            uid: 'runner-1',
            title: 'This week catch',
            createdAt: DateTime(2026, 5, 12, 9),
          ),
          _activityNotification(
            id: 'earlier',
            uid: 'runner-1',
            title: 'Earlier catch',
            createdAt: DateTime(2026, 5, 1, 9),
          ),
          _activityNotification(
            id: 'hidden-message',
            uid: 'runner-1',
            type: ActivityNotificationType.message,
            title: 'Hidden message',
            createdAt: DateTime(2026, 5, 16, 11),
          ),
        ]),
        now: now,
        markAllReadPending: true,
      );

      final content = state as NotificationsContent;
      expect(content.groups.map((group) => group.label), [
        'Today',
        'Yesterday',
        'This week',
        'Earlier',
      ]);
      expect(content.groups.first.rows.single.title, 'Today catch');
      expect(content.groups.first.rows.single.timeLabel, '2h');
      expect(content.groups.first.rows.single.route, '/chats/match-1');
      expect(content.visibleNotifications, hasLength(4));
      expect(content.unreadNotifications, hasLength(3));
      expect(content.showMarkAllReadAction, isTrue);
      expect(content.canMarkAllRead, isFalse);
      expect(content.markAllReadLabel(_l10n), 'Marking...');
    });
  });

  group('DashboardScreen', () {
    testWidgets(
      'notification action uses the counted icon app-bar contract directly',
      (tester) async {
        final user = buildUser();
        final notifications = [
          _activityNotification(id: 'unread-1', uid: user.uid),
          _activityNotification(id: 'unread-2', uid: user.uid),
        ];

        await tester.pumpWidget(
          ProviderScope(
            overrides: [activityNotificationsOverride(user, notifications)],
            child: MaterialApp(
              theme: AppTheme.light,
              home: Scaffold(body: NotificationsAction(uid: user.uid)),
            ),
          ),
        );
        await tester.pump();

        final button = tester.widget<CatchIconAction>(
          find.byType(CatchIconAction),
        );
        expect(button.size, CatchIconAction.navSize);
        expect(find.byIcon(CatchIcons.notifications), findsOneWidget);
        expect(find.text('2'), findsOneWidget);
        expect(find.byTooltip('Notifications'), findsOneWidget);
      },
    );

    testWidgets('shows a loading state while booked events are loading', (
      tester,
    ) async {
      final signedUpEventsController =
          StreamController<List<Event>>.broadcast();
      addTearDown(signedUpEventsController.close);

      final user = buildUser();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
            membershipsOverride(user, const []),
            uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
            activityNotificationsOverride(user),
            watchSignedUpEventsProvider(
              user.uid,
            ).overrideWith((ref) => signedUpEventsController.stream),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const DashboardScreen(),
          ),
        ),
      );

      await tester.pump();

      expect(find.byType(CatchSkeleton), findsWidgets);
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(find.text("Let's find your first event"), findsNothing);
    });

    testWidgets('shows an error when booked events fail to load', (
      tester,
    ) async {
      final user = buildUser();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
            membershipsOverride(user, const []),
            uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
            activityNotificationsOverride(user),
            watchSignedUpEventsProvider(user.uid).overrideWithValue(
              AsyncError<List<Event>>(Exception('boom'), StackTrace.empty),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const DashboardScreen(),
          ),
        ),
      );

      await pumpUntilFound(
        tester,
        find.text('Something went wrong. Please try again.'),
      );

      expect(
        find.text('Something went wrong. Please try again.'),
        findsOneWidget,
      );
      expect(find.text('Try again'), findsOneWidget);
      expect(find.text("Let's find your first event"), findsNothing);
    });

    testWidgets('uses shared offline copy for typed dashboard load failures', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchUserProfileProvider.overrideWithValue(
              const AsyncError<UserProfile?>(
                NetworkException(
                  'offline',
                  'No internet connection. Connect to the internet and try again.',
                ),
                StackTrace.empty,
              ),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const DashboardScreen(),
          ),
        ),
      );

      await pumpUntilFound(tester, find.text('Connection issue'));

      expect(find.text('Connection issue'), findsOneWidget);
      expect(
        find.text(
          'We are having trouble connecting. Please check your internet and try again.',
        ),
        findsOneWidget,
      );
      expect(find.text('Dashboard unavailable'), findsNothing);
      expect(find.text('Try again'), findsOneWidget);
    });

    testWidgets('shows the in-body idle CTA when there are no live modules', (
      tester,
    ) async {
      final user = buildUser();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
            membershipsOverride(user, const []),
            activityNotificationsOverride(user),
            watchSignedUpEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Event>>([])),
            watchAttendedEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Event>>([])),
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

      await _pumpDashboardUi(tester);

      final rootScaffold = tester.widget<CatchRootScreenScaffold>(
        find.byType(CatchRootScreenScaffold),
      );
      expect(rootScaffold.bodyLayout, CatchPageBodyMode.standard);
      expect(
        find.text('Your catches unlock\nafter your first event.'),
        findsOneWidget,
      );
      expect(find.byType(HowCatchWorksSection), findsOneWidget);
      expect(find.byType(DashboardFullSliverBody), findsOneWidget);
    });

    testWidgets('logs idle home open, module impression, and CTA tap', (
      tester,
    ) async {
      final user = buildUser();
      final reporter = RecordingAnalyticsReporter();
      final router = GoRouter(
        initialLocation: Routes.dashboardScreen.path,
        routes: [
          GoRoute(
            path: Routes.dashboardScreen.path,
            builder: (_, _) => const DashboardScreen(),
          ),
          GoRoute(
            path: Routes.exploreScreen.path,
            builder: (_, _) => const Scaffold(body: Text('Explore screen')),
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
            ).overrideWithValue(const AsyncData<List<Event>>([])),
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

      await _pumpDashboardUi(tester);

      expect(
        reporter.events,
        contains(
          const AnalyticsEventCall(AnalyticsEvents.homeOpened, {
            AnalyticsParameters.homeState: 'idle',
          }),
        ),
      );
      expect(
        reporter.events,
        contains(
          const AnalyticsEventCall(AnalyticsEvents.homeModuleImpression, {
            AnalyticsParameters.homeModule: 'idle_cta',
          }),
        ),
      );

      await tester.tap(find.text('Find an event near me'));
      await _pumpDashboardUi(tester);

      expect(find.text('Explore screen'), findsOneWidget);
      expect(
        reporter.events,
        contains(
          const AnalyticsEventCall(AnalyticsEvents.homeActionTap, {
            AnalyticsParameters.homeModule: 'idle_cta',
            AnalyticsParameters.homeAction: 'find_event',
          }),
        ),
      );
    });

    testWidgets('keeps host tools out of the consumer empty state', (
      tester,
    ) async {
      final now = DateTime.now();
      final user = buildUser(uid: 'host-1');
      final hostedRun = buildEvent(
        id: 'hosted-event',
        clubId: 'club-host',
        startTime: now.subtract(const Duration(minutes: 5)),
        endTime: now.add(const Duration(minutes: 55)),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
            membershipsOverride(user, const []),
            activityNotificationsOverride(user),
            watchSignedUpEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Event>>([])),
            watchAttendedEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Event>>([])),
            watchReviewsByUserProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Review>>([])),
            exploreRecommendedEventsProvider(
              recommendationsQueryFor(user.uid, const []),
            ).overrideWithValue(noRecommendationCandidates),
            eventRepositoryProvider.overrideWithValue(FakeEventRepository()),
            uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
            eventCheckInLocationServiceProvider.overrideWithValue(
              const _FakeEventCheckInLocationService(),
            ),
            ..._dashboardHostOverrides(user, hostedEvents: [hostedRun]),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const DashboardScreen(),
          ),
        ),
      );

      await _pumpDashboardUi(tester);

      expect(
        find.text('Your catches unlock\nafter your first event.'),
        findsOneWidget,
      );
      expect(find.byType(DashboardFullSliverBody), findsOneWidget);
      expect(find.text('Host event'), findsNothing);
      expect(find.text('Attendance open'), findsNothing);
      expect(find.text('Take attendance'), findsNothing);
    });

    testWidgets('shows the full dashboard when booked events exist', (
      tester,
    ) async {
      final joinedClubIds = ['club-1'];
      final user = buildUser(name: 'Manan Sethi', displayName: 'Subrath');
      final joinedClub = buildClub(name: 'Home Run Club');
      final nextEvent = buildEvent(
        bookedCount: 1,
        startTime: DateTime.now().add(const Duration(hours: 3)),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
            watchSignedUpEventsProvider(
              user.uid,
            ).overrideWithValue(AsyncData<List<Event>>([nextEvent])),
            watchAttendedEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Event>>([])),
            exploreRecommendedEventsProvider(
              recommendationsQueryFor(user.uid, joinedClubIds),
            ).overrideWithValue(noRecommendationCandidates),
            watchClubsByIdsProvider(
              ClubsByIdQuery(joinedClubIds),
            ).overrideWith((ref) => Stream.value([joinedClub])),
            membershipsOverride(user, joinedClubIds),
            activityNotificationsOverride(user),
            eventRepositoryProvider.overrideWithValue(FakeEventRepository()),
            uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
            eventCheckInLocationServiceProvider.overrideWithValue(
              const _FakeEventCheckInLocationService(),
            ),
            ..._dashboardHostOverrides(user),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const DashboardScreen(),
          ),
        ),
      );

      await _pumpDashboardUi(tester);

      expect(find.byType(DashboardFullSliverBody), findsOneWidget);
      expect(find.textContaining('Next event'), findsOneWidget);
      expect(find.text('Stride Social'), findsOneWidget);
      expect(
        find.text('${dashboardGreeting(_l10n, DateTime.now())}, Subrath'),
        findsOneWidget,
      );
      expect(
        find.text('${dashboardGreeting(_l10n, DateTime.now())}, Manan'),
        findsNothing,
      );
      expect(find.byType(TabBar), findsNothing);
      expect(find.byTooltip('Notifications'), findsOneWidget);
    });

    testWidgets('dashboard body omits the legacy followed clubs rail', (
      tester,
    ) async {
      final joinedClub = buildClub(name: 'Home Run Club');
      final user = buildUser();
      final viewModel = buildDashboardFullViewModel(
        signedUpEvents: const [],
        uid: user.uid,
        attendedEventsAsync: const AsyncData<List<Event>>([]),
        now: DateTime(2026, 5, 13),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchClubsByIdsProvider(
              ClubsByIdQuery([joinedClub.id]),
            ).overrideWith((ref) => Stream.value([joinedClub])),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: CustomScrollView(
                slivers: [
                  DashboardFullSliverBody(viewModel: viewModel, user: user),
                ],
              ),
            ),
          ),
        ),
      );
      await _pumpDashboardUi(tester);

      expect(find.text('Your clubs'), findsNothing);
      expect(find.text('Home Run Club'), findsNothing);
      expect(
        find.text('Your catches unlock\nafter your first event.'),
        findsOneWidget,
      );
    });

    testWidgets('club posts home section renders unread post cards', (
      tester,
    ) async {
      final joinedClub = club_test.buildClub(name: 'Race Course Road Runners');
      final user = buildUser();
      final notifications = [
        _activityNotification(
          id: 'club-post-1',
          uid: user.uid,
          type: ActivityNotificationType.clubUpdate,
          title: 'New update from Race Course Road Runners',
          body: 'Meet ten minutes early at the main gate.',
          clubId: joinedClub.id,
          postId: 'post-1',
          eventId: 'event-1',
        ),
        _activityNotification(
          id: 'organizer-post-1',
          uid: user.uid,
          type: ActivityNotificationType.organizerUpdate,
          title: 'New organizer update',
          body: 'The organizer-only update is visible at home.',
          organizerId: joinedClub.id,
          postId: 'post-2',
        ),
      ];
      var opened = false;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchClubsByIdsProvider(
              ClubsByIdQuery([joinedClub.id]),
            ).overrideWith((ref) => Stream.value([joinedClub])),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: ClubPostsHomeSection(
                notifications: notifications,
                onOpenPost: (_) => opened = true,
              ),
            ),
          ),
        ),
      );
      await _pumpDashboardUi(tester);

      expect(
        find.text('ORGANIZER UPDATES', findRichText: true),
        findsOneWidget,
      );
      expect(find.text('RACE COURSE ROAD RUNNERS'), findsNWidgets(2));
      expect(
        find.text('Meet ten minutes early at the main gate.'),
        findsOneWidget,
      );
      expect(
        find.text('The organizer-only update is visible at home.'),
        findsOneWidget,
      );
      expect(find.text('Linked event'), findsOneWidget);

      await tester.tap(find.text('Meet ten minutes early at the main gate.'));
      await _pumpDashboardUi(tester);

      expect(opened, isTrue);
    });

    testWidgets('keeps signed-in idle free of old tab chrome', (tester) async {
      final user = buildUser();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
            membershipsOverride(user, const []),
            uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
            activityNotificationsOverride(user, [
              _activityNotification(id: 'unread-1', uid: user.uid),
              _activityNotification(id: 'unread-2', uid: user.uid),
              _activityNotification(
                id: 'read',
                uid: user.uid,
                readAt: DateTime(2026, 5, 16),
              ),
            ]),
            watchSignedUpEventsProvider(
              user.uid,
            ).overrideWithValue(const AsyncData<List<Event>>([])),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const DashboardScreen(),
          ),
        ),
      );

      await _pumpDashboardUi(tester);

      expect(find.byType(TabBar), findsNothing);
      expect(find.text('Dashboard'), findsNothing);
      expect(find.text('Activity'), findsNothing);
      expect(find.byTooltip('Notifications'), findsOneWidget);
      expect(find.text('2'), findsOneWidget);
      expect(
        find.text('Your catches unlock\nafter your first event.'),
        findsOneWidget,
      );
    });

    testWidgets('notifications screen opens with a manual read action', (
      tester,
    ) async {
      final notifications = [
        _activityNotification(id: 'unread', uid: 'runner-1'),
        _activityNotification(
          id: 'read',
          uid: 'runner-1',
          readAt: DateTime(2026, 5, 16),
        ),
      ];
      final repository = _FakeActivityNotificationRepository(notifications);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWithValue(const AsyncData<String?>('runner-1')),
            activityNotificationRepositoryProvider.overrideWithValue(
              repository,
            ),
            watchSignedUpEventsProvider(
              'runner-1',
            ).overrideWithValue(const AsyncData<List<Event>>([])),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            builder: catchNoticeOverlayBuilder,
            home: const ActivityScreen(),
          ),
        ),
      );
      await _pumpDashboardUi(tester);
      await _pumpDashboardUi(tester);

      expect(find.byType(CatchRouteScaffold), findsOneWidget);
      expect(find.text('Activity'), findsOneWidget);
      expect(find.text("It's a catch"), findsNWidgets(2));
      expect(find.text('Mark all read'), findsOneWidget);
      expect(repository.markReadCalls, isEmpty);

      await tester.tap(find.text('Mark all read'));
      await _pumpDashboardUi(tester);

      expect(repository.markReadCalls, hasLength(1));
      expect(repository.markReadCalls.single.map((item) => item.id), [
        'unread',
      ]);
    });

    testWidgets('notifications identity failure is not shown as signed out', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWithValue(
              AsyncError<String?>(
                StateError('identity failed'),
                StackTrace.empty,
              ),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            builder: catchNoticeOverlayBuilder,
            home: const ActivityScreen(),
          ),
        ),
      );
      await _pumpDashboardUi(tester);

      expect(find.text('Sign in problem'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
      expect(find.text('No activity yet'), findsNothing);
    });

    testWidgets('notification row navigation failures show branded feedback', (
      tester,
    ) async {
      final notifications = [
        _activityNotification(
          id: 'deep-link',
          uid: 'runner-1',
          title: 'Deep link catch',
        ),
      ];

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWithValue(const AsyncData<String?>('runner-1')),
            activityNotificationRepositoryProvider.overrideWithValue(
              _FakeActivityNotificationRepository(notifications),
            ),
            watchSignedUpEventsProvider(
              'runner-1',
            ).overrideWithValue(const AsyncData<List<Event>>([])),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            builder: catchNoticeOverlayBuilder,
            home: const ActivityScreen(),
          ),
        ),
      );
      await _pumpDashboardUi(tester);
      await _pumpDashboardUi(tester);

      await tester.tap(find.text('Deep link catch'));
      await _pumpDashboardUi(tester);

      expect(
        find.text('Something went wrong. Please try again.'),
        findsOneWidget,
      );
    });

    testWidgets('notification rows compose the CatchField primitive', (
      tester,
    ) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: NotificationRow(
              title: 'Event starts tomorrow',
              time: '2h',
              body: 'Sundowner 5K meets at Carter Road Jetty.',
              unread: true,
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      final field = tester.widget<CatchField>(find.byType(CatchField));
      expect(field.title, 'Event starts tomorrow');
      expect(field.body, 'Sundowner 5K meets at Carter Road Jetty.');
      expect(field.emphasis, CatchFieldEmphasis.title);
      expect(field.onTap, isNotNull);
      expect(find.byIcon(CatchIcons.disclosure), findsNothing);

      expect(find.text('2H'), findsOneWidget);
      final titleRect = tester.getRect(find.text('Event starts tomorrow'));
      final bodyRect = tester.getRect(
        find.text('Sundowner 5K meets at Carter Road Jetty.'),
      );
      final timeRect = tester.getRect(find.text('2H'));
      expect(
        timeRect.center.dy,
        closeTo((titleRect.top + bodyRect.bottom) / 2, 0.5),
      );

      await tester.tap(find.text('2H'));
      await tester.pump();

      expect(tapped, isTrue);
    });

    testWidgets('notifications screen renders grouped notification rows', (
      tester,
    ) async {
      final current = DateTime.now();
      final now = DateTime(current.year, current.month, current.day, 12);
      final today = _activityNotification(
        id: 'today',
        uid: 'runner-1',
        title: 'Booked: Doubles ladder + drinks',
        body: 'Sun 22 Jun · 9:00 AM · Versova Padel, Court 2.',
        createdAt: now,
      );
      final yesterday = _activityNotification(
        id: 'yesterday',
        uid: 'runner-1',
        type: ActivityNotificationType.waitlistPromotion,
        title: 'A spot opened up',
        body: "You're off the waitlist for Saturday's Sundowner 5K.",
        createdAt: now.subtract(const Duration(days: 1)),
        readAt: now,
      );
      final thisWeek = _activityNotification(
        id: 'this-week',
        uid: 'runner-1',
        type: ActivityNotificationType.eventUpdated,
        title: 'Start time moved to 6:45 AM',
        body: 'Sundowner 5K now starts 15 min later. Same spot.',
        createdAt: now.subtract(const Duration(days: 3)),
        readAt: now,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWithValue(const AsyncData<String?>('runner-1')),
            watchActivityNotificationsProvider('runner-1').overrideWithValue(
              AsyncData<List<ActivityNotification>>([
                thisWeek,
                today,
                yesterday,
              ]),
            ),
            watchSignedUpEventsProvider(
              'runner-1',
            ).overrideWithValue(const AsyncData<List<Event>>([])),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const ActivityScreen(),
          ),
        ),
      );

      await _pumpDashboardUi(tester);

      expect(find.text('Activity'), findsOneWidget);
      expect(find.text('TODAY', findRichText: true), findsOneWidget);
      expect(find.text(today.title), findsOneWidget);
      expect(find.text(today.body), findsOneWidget);

      await tester.scrollUntilVisible(
        find.text('YESTERDAY', findRichText: true),
        120,
      );
      expect(find.text('YESTERDAY', findRichText: true), findsOneWidget);
      expect(find.text(yesterday.title), findsOneWidget);

      await tester.scrollUntilVisible(
        find.text('THIS WEEK', findRichText: true),
        120,
      );
      expect(find.text('THIS WEEK', findRichText: true), findsOneWidget);
      expect(find.text(thisWeek.title), findsOneWidget);
      expect(find.byType(NotificationRow), findsWidgets);
      expect(find.text('Upcoming events'), findsNothing);
      expect(find.text('Recent updates'), findsNothing);
      expect(find.text('Catch'), findsNothing);

      final todayField = find
          .ancestor(
            of: find.text(today.title),
            matching: find.byType(CatchField),
          )
          .first;
      final fieldRect = tester.getRect(todayField);
      final leadingIcon = find
          .descendant(of: todayField, matching: find.byType(Icon))
          .first;
      final viewWidth =
          tester.view.physicalSize.width / tester.view.devicePixelRatio;
      final availableWidth = viewWidth - CatchSpacing.screenPx * 2;
      final laneWidth = availableWidth < CatchLayout.maxContentWidth
          ? availableWidth
          : CatchLayout.maxContentWidth;
      final laneInset =
          CatchSpacing.screenPx + (availableWidth - laneWidth) / 2;
      expect(fieldRect.left, laneInset);
      expect(fieldRect.right, viewWidth - laneInset);
      expect(tester.getRect(leadingIcon).left, fieldRect.left);
    });
  });

  _dashboardFullHomeShellTests();
}

class _DashboardFullTestShell extends ConsumerWidget {
  const _DashboardFullTestShell({
    required this.user,
    required this.signedUpEvents,
    required this.followedClubIds,
  });

  final UserProfile user;
  final List<Event> signedUpEvents;
  final List<String> followedClubIds;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = ref.watch(dashboardNowProvider);
    final viewModel = ref.watch(
      dashboardFullViewModelProvider(
        signedUpEvents: signedUpEvents,
        user: user,
        uid: user.uid,
        followedClubIds: followedClubIds,
      ),
    );

    return DashboardHomeScreen(
      header: DashboardHomeHeaderModel.full(user: user, now: now),
      dashboardSliver: DashboardFullSliverBody(
        viewModel: viewModel,
        user: user,
      ),
    );
  }
}

class _FakeEventCheckInLocationService implements EventCheckInLocationService {
  const _FakeEventCheckInLocationService();

  @override
  Future<EventCheckInLocation> getCurrentLocation() async {
    return const EventCheckInLocation(latitude: 19.07, longitude: 72.87);
  }
}

class _FakeEventSuccessRepository extends Fake
    implements EventSuccessRepository {
  @override
  Future<EventSuccessPlan?> fetchPlan(String eventId) async => null;
}

class _FakeActivityNotificationRepository extends Fake
    implements ActivityNotificationRepository {
  _FakeActivityNotificationRepository(this.notifications);

  final List<ActivityNotification> notifications;
  final List<List<ActivityNotification>> markReadCalls = [];

  @override
  Stream<List<ActivityNotification>> watchActivity({
    required String uid,
    int limit = 50,
  }) => Stream.value(notifications);

  @override
  Future<void> markAllRead({
    required String uid,
    required Iterable<ActivityNotification> notifications,
  }) async {
    markReadCalls.add(notifications.toList(growable: false));
  }
}

ActivityNotification _activityNotification({
  required String id,
  required String uid,
  ActivityNotificationType type = ActivityNotificationType.match,
  String title = "It's a catch",
  String body = 'You and Runner Two matched. Say hi!',
  String? clubId,
  String? organizerId,
  String? postId,
  String? eventId,
  DateTime? createdAt,
  DateTime? readAt,
}) {
  return ActivityNotification(
    id: id,
    uid: uid,
    type: type,
    title: title,
    body: body,
    createdAt: createdAt ?? DateTime(2026, 5, 16, 10),
    readAt: readAt,
    matchId: type == ActivityNotificationType.match ? 'match-1' : null,
    eventId: eventId,
    clubId: clubId,
    organizerId: organizerId,
    postId: postId,
  );
}

Future<void> _pumpDashboardUi(WidgetTester tester) async {
  await pumpFeatureUi(tester);
}

Finder _runFocusCardSurface(String title) {
  return find.ancestor(
    of: find.text(title),
    matching: find.byType(CatchSurface),
  );
}

List _dashboardHostOverrides(
  UserProfile user, {
  String hostedClubId = 'club-host',
  List<Event> hostedEvents = const [],
  bool includeWeeklyActivity = true,
  AsyncValue<WeeklyActivitySnapshot>? weeklyActivity,
}) {
  final hostedClubs = hostedEvents.isEmpty
      ? const <Club>[]
      : [buildClub(id: hostedClubId, hostUserId: user.uid)];

  return [
    clubsRepositoryProvider.overrideWith(
      (ref) => club_test.FakeClubsRepository()
        ..clubsById['club-1'] = buildClub()
        ..clubsById[hostedClubId] = buildClub(
          id: hostedClubId,
          hostUserId: user.uid,
        ),
    ),
    watchClubsHostedByProvider(
      user.uid,
    ).overrideWithValue(AsyncData(hostedClubs)),
    watchClubsOwnedByProvider(
      user.uid,
    ).overrideWithValue(const AsyncData<List<Club>>([])),
    if (includeWeeklyActivity)
      weeklyActivityProvider.overrideWithValue(
        weeklyActivity ?? emptyWeeklyActivitySnapshot(),
      ),
    if (hostedEvents.isNotEmpty)
      watchEventsForClubProvider(
        hostedClubId,
      ).overrideWithValue(AsyncData<List<Event>>(hostedEvents)),
  ];
}
