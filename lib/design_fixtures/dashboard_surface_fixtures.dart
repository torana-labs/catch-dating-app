// copy:allow-file(Widgetbook and capture-only deterministic fixture data)
import 'package:catch_dating_app/contexts/bookings/domain/runner_activity.dart';
import 'package:catch_dating_app/contexts/bookings/domain/weekly_activity_summary.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/design_fixtures/utility_surface_fixtures.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';

/// Shared deterministic fixtures for Dashboard Home design review surfaces.
///
/// The values are intentionally repository-free so Widgetbook and future UI
/// capture entries can render the same Dashboard states without live services.
final class DashboardSurfaceFixtures {
  const DashboardSurfaceFixtures._();

  static const viewerUid = 'design-dashboard-viewer';
  static final now = DateTime(2026, 6, 22, 9);

  static final viewer = UtilitySurfaceFixtures.viewer.copyWith(
    uid: viewerUid,
    name: 'Manan Sethi',
    firstName: 'Manan',
    lastName: 'Sethi',
    displayName: 'Subrath',
    city: 'Mumbai',
    activityPreferences: const ActivityPreferences(
      running: RunningPreferences(
        paceMinSecsPerKm: 330,
        preferredDistances: [PreferredDistance.fiveK, PreferredDistance.tenK],
      ),
    ),
  );

  static final organizer = Organizer(
    id: 'design-dashboard-club',
    name: 'Sea Face Social',
    description: 'Coastal social runs and low-pressure post-event hangs.',
    location: 'Mumbai',
    area: 'Bandra West',
    hostUserId: 'design-host',
    hostName: 'Asha',
    createdAt: now.subtract(const Duration(days: 180)),
    tags: const ['Social', 'Beginner friendly', 'Coffee after'],
    memberCount: 214,
    rating: 4.8,
    reviewCount: 36,
  );

  static final memberships = <OrganizerMembership>[
    OrganizerMembership(
      id: 'design-dashboard-club-$viewerUid',
      organizerId: organizer.id,
      uid: viewerUid,
      role: OrganizerMembershipRole.member,
      status: OrganizerMembershipStatus.active,
      joinedAt: now.subtract(const Duration(days: 45)),
    ),
  ];

  static final nextEvent =
      UtilitySurfaceFixtures.eventFixture(
        id: 'design-dashboard-next-event',
        meetingPoint: 'Carter Road Jetty',
        notes: 'Meet by the sea-facing steps.',
        latitude: 19.0676,
        longitude: 72.8227,
      ).copyWith(
        organizerId: organizer.id,
        startTime: DateTime(2030, 6, 24, 18, 30),
        endTime: DateTime(2030, 6, 24, 20),
        bookedCount: 7,
        capacityLimit: 12,
      );

  static final recommendationEvent =
      UtilitySurfaceFixtures.eventFixture(
        id: 'design-dashboard-recommended-event',
        meetingPoint: 'Race Course Road main gate',
        notes: 'Moderate social pace with a chai stop.',
        latitude: 18.993,
        longitude: 72.824,
      ).copyWith(
        organizerId: organizer.id,
        startTime: DateTime(2030, 6, 26, 7),
        endTime: DateTime(2030, 6, 26, 8, 20),
        distanceKm: 10,
        pace: PaceLevel.moderate,
        bookedCount: 4,
        capacityLimit: 12,
        priceInPaise: 15000,
      );

  static final attendedEvent =
      UtilitySurfaceFixtures.eventFixture(
        id: 'design-dashboard-attended-event',
        meetingPoint: 'Joggers Park gate',
        notes: 'Completed social run with a small crew.',
        latitude: 19.059,
        longitude: 72.822,
      ).copyWith(
        organizerId: organizer.id,
        startTime: now.subtract(const Duration(days: 2, hours: 2)),
        endTime: now.subtract(const Duration(days: 2, hours: 1)),
        checkedInCount: 6,
      );

  static final reviews = <Review>[
    Review(
      id: 'design-dashboard-review',
      organizerId: organizer.id,
      eventId: attendedEvent.id,
      reviewerUserId: viewerUid,
      reviewerName: 'Subrath',
      rating: 5,
      comment: 'Easy host cues and a relaxed group pace.',
      createdAt: now.subtract(const Duration(days: 1)),
    ),
  ];

  static final notifications = <ActivityNotification>[
    ActivityNotification(
      id: 'design-dashboard-reminder',
      uid: viewerUid,
      type: ActivityNotificationType.eventReminder,
      title: 'Event starts tomorrow',
      body: 'Sea Face Social meets at Carter Road Jetty.',
      eventId: nextEvent.id,
      createdAt: now.subtract(const Duration(hours: 2)),
    ),
    ActivityNotification(
      id: 'design-dashboard-match',
      uid: viewerUid,
      type: ActivityNotificationType.match,
      title: "It's a catch",
      body: 'You and Riya matched after Sunday socials.',
      createdAt: now.subtract(const Duration(hours: 6)),
      readAt: now.subtract(const Duration(hours: 5)),
      matchId: 'design-dashboard-match',
    ),
  ];

  static final connectedWeeklyActivity = WeeklyActivitySnapshot.connected(
    referenceDate: now,
    platformLabel: 'Apple Health',
    activities: [
      PhysicalActivity(
        stableId: 'design-dashboard-health-run',
        provider: PhysicalActivityProvider.appleHealth,
        type: ActivityKind.running,
        startTime: now.subtract(const Duration(days: 1, hours: 1)),
        endTime: now.subtract(const Duration(days: 1)),
        distanceMeters: 6400,
        sourceName: 'Apple Watch',
      ),
      PhysicalActivity(
        stableId: 'design-dashboard-health-walk',
        provider: PhysicalActivityProvider.appleHealth,
        type: ActivityKind.walking,
        startTime: now.subtract(const Duration(days: 3, minutes: 45)),
        endTime: now.subtract(const Duration(days: 3)),
        distanceMeters: 2800,
        sourceName: 'Apple Watch',
      ),
    ],
  );

  static final permissionWeeklyActivity =
      WeeklyActivitySnapshot.permissionRequired(
        referenceDate: now,
        platformLabel: 'Apple Health',
      );

  static Stream<T> loadingStream<T>() => Stream<T>.empty();

  static Stream<T> errorStream<T>(String message) =>
      Stream<T>.error(StateError(message), StackTrace.empty);
}
