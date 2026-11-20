// Marketing capture `guest_reminder`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/guest_event_cards_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/health_activity_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/weekly_activity_summary.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_recommendations_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/guest_event_card.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_follow_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_screen.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart' show AsyncData;
import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/marketing_guest_story.dart';
import '../shared/marketing_host_organizer.dart';
import '../shared/marketing_host_report_event.dart';

// The guest's home the evening before Saturday Trivia Social: tomorrow's
// plan first, with where to meet and directions.
final guestReminderCapture = ScreenCaptureEntry(
  id: 'guest_reminder',
  routeIds: const <String>['dashboardScreen'],
  device: CaptureDevice.genericPhone,
  marketingFixtureKeys: const <String>['hostMarketingIndia.guest.reminder'],
  disableAnimations: true,
  providerOverrides: _guestReminderOverrides(),
  builder: (context) => const DashboardScreen(),
);

// A day before the trivia night starts.
final _now = marketingHostReportEvent.startTime.subtract(
  const Duration(days: 1),
);
final _event = marketingGuestEventAt(_now);
final _bookedAt = hostMarketingIndiaScenario.guestsAt('today').first.bookedAt;

List<Object> _guestReminderOverrides() {
  final uid = marketingGuestViewer.uid;
  return <Object>[
    appClockProvider.overrideWithValue(AppClock.custom(() => _now)),
    uidProvider.overrideWith((ref) => Stream.value(uid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream<UserProfile?>.value(marketingGuestViewer),
    ),
    currentUserFollowedOrganizerIdsProvider.overrideWithValue(
      const AsyncData(<String>{}),
    ),
    watchSignedUpEventCardsProvider(
      uid,
    ).overrideWith((ref) => Stream.value(guestEventCardsOf([_event]))),
    watchAttendedEventCardsProvider(
      uid,
    ).overrideWith((ref) => Stream.value(const <GuestEventCard>[])),
    watchReviewsByUserProvider(
      uid,
    ).overrideWith((ref) => Stream.value(const <Review>[])),
    // The booking confirmation, with the product's notification copy.
    watchActivityNotificationsProvider(uid).overrideWith(
      (ref) => Stream.value([
        ActivityNotification(
          id: 'marketing-guest-booked',
          uid: uid,
          type: ActivityNotificationType.eventSignup,
          title: "You're booked",
          body:
              'Your ${_event.name} from ${marketingHostOrganizer.name} is '
              'confirmed.',
          createdAt: _bookedAt,
          eventId: _event.id,
          organizerId: marketingHostOrganizer.id,
        ),
      ]),
    ),
    weeklyActivityProvider.overrideWith(
      (ref) async => WeeklyActivitySnapshot.permissionRequired(
        referenceDate: _now,
        platformLabel: 'Apple Health',
      ),
    ),
    exploreRecommendedEventsProvider(
      ExploreRecommendationsQuery(userId: uid, followedOrganizerIds: const []),
    ).overrideWith((ref) async => const []),
  ];
}
