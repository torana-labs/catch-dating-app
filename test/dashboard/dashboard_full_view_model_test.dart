import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/health_activity_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_arrival_action.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_recommendations_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_membership.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_full_view_model.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../support/dashboard_test_helpers.dart';

final _l10n = AppLocalizationsEn();

void main() {
  group('dashboardHomeScreenStateProvider', () {
    test(
      'returns the signed-out empty state without notification chrome',
      () async {
        final container = ProviderContainer(
          overrides: [
            watchUserProfileProvider.overrideWithValue(
              const AsyncData<UserProfile?>(null),
            ),
          ],
        );
        addTearDown(container.dispose);

        final state = container.read(dashboardHomeScreenStateProvider);
        expect(state.status, DashboardHomeScreenStatus.empty);
        expect(state.notificationUid, isNull);
        expect(state.header.title(_l10n), "Let's find your first event");
      },
    );

    test('surfaces membership failures with a typed retry target', () async {
      final user = buildUser();
      final container = ProviderContainer(
        overrides: [
          watchUserProfileProvider.overrideWithValue(AsyncData(user)),
          uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
          watchActiveClubMembershipsForUserProvider(user.uid).overrideWithValue(
            const AsyncError<List<ClubMembership>>('clubs', StackTrace.empty),
          ),
          watchSignedUpEventsProvider(
            user.uid,
          ).overrideWithValue(const AsyncData<List<Event>>([])),
        ],
      );
      addTearDown(container.dispose);

      final state = container.read(dashboardHomeScreenStateProvider);
      expect(state.status, DashboardHomeScreenStatus.error);
      expect(state.error?.retryTarget, DashboardHomeRetryTarget.memberships);
      expect(state.error?.uid, user.uid);
      expect(state.error?.error, 'clubs');
    });

    test('normalizes provider loading waves into one loading state', () {
      final user = buildUser();
      final profileLoading = ProviderContainer(
        overrides: [
          watchUserProfileProvider.overrideWithValue(
            const AsyncLoading<UserProfile?>(),
          ),
        ],
      );
      final membershipsLoading = ProviderContainer(
        overrides: [
          watchUserProfileProvider.overrideWithValue(AsyncData(user)),
          uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
          watchActiveClubMembershipsForUserProvider(
            user.uid,
          ).overrideWithValue(const AsyncLoading<List<ClubMembership>>()),
          watchSignedUpEventsProvider(
            user.uid,
          ).overrideWithValue(const AsyncData<List<Event>>([])),
        ],
      );
      addTearDown(profileLoading.dispose);
      addTearDown(membershipsLoading.dispose);

      expect(
        profileLoading.read(dashboardHomeScreenStateProvider).status,
        DashboardHomeScreenStatus.loading,
      );
      expect(
        membershipsLoading.read(dashboardHomeScreenStateProvider).status,
        DashboardHomeScreenStatus.loading,
      );
    });

    test('returns signed-in idle as a full live-layer state', () {
      final user = buildUser();
      var healthReads = 0;
      var recommendationReads = 0;
      final container = ProviderContainer(
        overrides: [
          dashboardNowProvider.overrideWithValue(DateTime(2026, 5, 13, 8)),
          watchUserProfileProvider.overrideWithValue(AsyncData(user)),
          uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
          watchActiveClubMembershipsForUserProvider(
            user.uid,
          ).overrideWithValue(const AsyncData<List<ClubMembership>>([])),
          watchSignedUpEventsProvider(
            user.uid,
          ).overrideWithValue(const AsyncData<List<Event>>([])),
          watchAttendedEventsProvider(
            user.uid,
          ).overrideWithValue(const AsyncData<List<Event>>([])),
          weeklyActivityProvider.overrideWith((ref) {
            healthReads++;
            throw StateError('Home must not subscribe to Health activity');
          }),
          watchReviewsByUserProvider(
            user.uid,
          ).overrideWithValue(const AsyncData<List<Review>>([])),
          exploreRecommendedEventsProvider(
            recommendationsQueryFor(user.uid, const []),
          ).overrideWith((ref) {
            recommendationReads++;
            throw StateError(
              'Home must not subscribe to Explore recommendations',
            );
          }),
        ],
      );
      addTearDown(container.dispose);

      final state = container.read(dashboardHomeScreenStateProvider);
      expect(state.status, DashboardHomeScreenStatus.full);
      expect(healthReads, 0);
      expect(recommendationReads, 0);
      expect(state.notificationUid, user.uid);
      expect(
        dashboardHomeLiveStateFor(state, now: DateTime(2026, 5, 13, 8)),
        DashboardHomeLiveState.idle,
      );
    });

    test('returns full state with pinned header copy and followed clubs', () {
      final user = buildUser();
      var healthReads = 0;
      var recommendationReads = 0;
      final event = buildEvent(startTime: DateTime(2026, 5, 14, 8));
      final container = ProviderContainer(
        overrides: [
          dashboardNowProvider.overrideWithValue(DateTime(2026, 5, 13, 8)),
          watchUserProfileProvider.overrideWithValue(AsyncData(user)),
          uidProvider.overrideWithValue(AsyncData<String?>(user.uid)),
          watchActiveClubMembershipsForUserProvider(user.uid).overrideWithValue(
            AsyncData<List<ClubMembership>>([
              membership(clubId: 'club-a', uid: user.uid),
            ]),
          ),
          watchSignedUpEventsProvider(
            user.uid,
          ).overrideWithValue(AsyncData<List<Event>>([event])),
          watchAttendedEventsProvider(
            user.uid,
          ).overrideWithValue(const AsyncData<List<Event>>([])),
          weeklyActivityProvider.overrideWith((ref) {
            healthReads++;
            throw StateError('Home must not subscribe to Health activity');
          }),
          watchReviewsByUserProvider(
            user.uid,
          ).overrideWithValue(const AsyncData<List<Review>>([])),
          exploreRecommendedEventsProvider(
            recommendationsQueryFor(user.uid, const ['club-a']),
          ).overrideWith((ref) {
            recommendationReads++;
            throw StateError(
              'Home must not subscribe to Explore recommendations',
            );
          }),
        ],
      );
      addTearDown(container.dispose);

      final state = container.read(dashboardHomeScreenStateProvider);
      expect(state.status, DashboardHomeScreenStatus.full);
      expect(healthReads, 0);
      expect(recommendationReads, 0);
      expect(state.header.title(_l10n), 'Morning, Runner');
      expect(state.followedClubIds, ['club-a']);
      expect(state.viewModel?.nextEvent?.id, event.id);
    });
  });

  group('buildDashboardFullViewModel', () {
    test('selects the nearest upcoming event as nextEvent', () {
      final now = DateTime(2026, 4, 23, 9);
      final earlier = buildEvent(startTime: now.add(const Duration(hours: 2)));
      final later = buildEvent(
        id: 'later',
        startTime: now.add(const Duration(hours: 5)),
      );

      final viewModel = buildDashboardFullViewModel(
        signedUpEvents: [later, earlier],
        attendedEventsAsync: const AsyncData<List<Event>>([]),
        now: now,
      );

      expect(viewModel.nextEvent?.id, earlier.id);
      expect(viewModel.upcomingEvents.map((event) => event.id), [
        earlier.id,
        later.id,
      ]);
    });

    test('filters past booked events out of upcomingEvents', () {
      final now = DateTime(2026, 4, 23, 9);
      final past = buildEvent(
        id: 'past',
        startTime: now.subtract(const Duration(hours: 2)),
      );
      final upcoming = buildEvent(
        id: 'upcoming',
        startTime: now.add(const Duration(hours: 2)),
      );

      final viewModel = buildDashboardFullViewModel(
        signedUpEvents: [past, upcoming],
        attendedEventsAsync: const AsyncData<List<Event>>([]),
        now: now,
      );

      expect(viewModel.nextEvent?.id, 'upcoming');
      expect(viewModel.upcomingEvents.map((event) => event.id), ['upcoming']);
    });

    test('surfaces attended section errors and clears open windows', () {
      final viewModel = buildDashboardFullViewModel(
        signedUpEvents: const [],
        attendedEventsAsync: AsyncError<List<Event>>(
          Exception('boom'),
          StackTrace.empty,
        ),
      );

      expect(viewModel.attendedEventsSection.hasError, isTrue);
      expect(
        viewModel.attendedEventsSection.message,
        'Unable to load your recent events.',
      );
      expect(viewModel.windowedEvents, isEmpty);
    });

    test('carries all open windows, ordered by soonest expiry', () {
      final now = DateTime(2026, 4, 23, 20);
      final older = buildEvent(
        id: 'older',
        checkedInCount: 1,
        startTime: now.subtract(const Duration(hours: 8)),
        endTime: now.subtract(const Duration(hours: 6)),
      );
      final latest = buildEvent(
        id: 'latest',
        checkedInCount: 1,
        startTime: now.subtract(const Duration(hours: 4)),
        endTime: now.subtract(const Duration(hours: 2)),
      );

      final viewModel = buildDashboardFullViewModel(
        signedUpEvents: const [],
        attendedEventsAsync: AsyncData<List<Event>>([older, latest]),
        now: now,
      );

      expect(viewModel.windowedEvents.map((window) => window.event.id), [
        older.id,
        latest.id,
      ]);
      expect(
        viewModel.windowedEvents.first.windowClosesAt,
        older.endTime.add(const Duration(hours: 24)),
      );
    });

    test('selects the latest attended event that has not been reviewed', () {
      final now = DateTime(2026, 4, 23, 20);
      final reviewedEvent = buildEvent(
        id: 'reviewed-event',
        startTime: now.subtract(const Duration(hours: 8)),
        endTime: now.subtract(const Duration(hours: 7)),
      );
      final pendingRun = buildEvent(
        id: 'pending-event',
        startTime: now.subtract(const Duration(hours: 4)),
        endTime: now.subtract(const Duration(hours: 3)),
      );

      final viewModel = buildDashboardFullViewModel(
        signedUpEvents: const [],
        attendedEventsAsync: AsyncData<List<Event>>([
          reviewedEvent,
          pendingRun,
        ]),
        reviewsByUserAsync: AsyncData<List<Review>>([
          buildReview(id: 'reviewed-event~runner-1', eventId: reviewedEvent.id),
        ]),
        now: now,
      );

      expect(viewModel.pendingReviewEvent?.id, 'pending-event');
    });

    test('surfaces unread club post notifications as a home module', () {
      final now = DateTime(2026, 5, 18, 10);
      final posts = clubPostNotificationsFromActivity([
        _activityNotification(
          id: 'old-post',
          type: ActivityNotificationType.clubUpdate,
          postId: 'post-old',
          createdAt: now.subtract(const Duration(hours: 3)),
        ),
        _activityNotification(
          id: 'new-post',
          type: ActivityNotificationType.organizerUpdate,
          postId: 'post-new',
          createdAt: now.subtract(const Duration(minutes: 20)),
        ),
        _activityNotification(
          id: 'read-post',
          type: ActivityNotificationType.clubUpdate,
          postId: 'post-read',
          readAt: now,
        ),
        _activityNotification(
          id: 'club-without-post',
          type: ActivityNotificationType.clubUpdate,
        ),
        _activityNotification(id: 'match'),
      ]);

      expect(posts.map((notification) => notification.id), [
        'new-post',
        'old-post',
      ]);

      final user = buildUser();
      final viewModel = buildDashboardFullViewModel(
        signedUpEvents: const [],
        uid: user.uid,
        attendedEventsAsync: const AsyncData<List<Event>>([]),
        clubPostNotifications: posts,
        now: now,
      );
      final state = DashboardHomeScreenState.full(
        header: DashboardHomeHeaderModel.full(user: user, now: now),
        user: user,
        viewModel: viewModel,
        followedClubIds: const [],
      );

      expect(dashboardHomeModuleImpressionsFor(state), [
        'idle_cta',
        'club_posts',
      ]);
    });

    test('selects self check-in during the event check-in window', () {
      final now = DateTime(2026, 4, 23, 8, 55);
      final event = buildEvent(
        id: 'check-in-event',
        bookedCount: 1,
        startTime: DateTime(2026, 4, 23, 9),
      );

      final viewModel = buildDashboardFullViewModel(
        signedUpEvents: [event],
        uid: 'runner-1',
        attendedEventsAsync: const AsyncData<List<Event>>([]),
        now: now,
      );

      expect(viewModel.arrivalAction?.kind, EventArrivalActionKind.selfCheckIn);
      expect(viewModel.arrivalAction?.event.id, 'check-in-event');
    });
  });
}

ActivityNotification _activityNotification({
  required String id,
  ActivityNotificationType type = ActivityNotificationType.match,
  String? postId,
  DateTime? createdAt,
  DateTime? readAt,
}) {
  return ActivityNotification(
    id: id,
    uid: 'runner-1',
    type: type,
    title: 'Club update',
    body: 'Meet ten minutes early.',
    clubId: type == ActivityNotificationType.clubUpdate ? 'club-1' : null,
    organizerId: type == ActivityNotificationType.organizerUpdate
        ? 'organizer-1'
        : null,
    postId: postId,
    createdAt: createdAt ?? DateTime(2026, 5, 18, 9),
    readAt: readAt,
  );
}
