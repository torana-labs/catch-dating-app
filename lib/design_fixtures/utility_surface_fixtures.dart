// copy:allow-file(Widgetbook and capture-only deterministic fixture data)
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/contexts/safety/domain/blocked_user.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';

/// Shared deterministic fixtures for utility/account design review surfaces.
///
/// Keep these values provider-free so Widgetbook and UI capture tests can render
/// the same app states without depending on live repositories.
final class UtilitySurfaceFixtures {
  const UtilitySurfaceFixtures._();

  static const viewerUid = 'design-utility-viewer';
  static const otherUid = 'design-blocked-profile';
  static final now = DateTime(2026, 6, 22, 9);

  static final viewer = UserProfile(
    uid: viewerUid,
    name: 'Neha Kapoor',
    firstName: 'Neha',
    lastName: 'Kapoor',
    displayName: 'Neha',
    dateOfBirth: DateTime(1996, 4, 12),
    gender: Gender.woman,
    phoneNumber: '+919876543210',
    email: 'neha@catch.test',
    profileComplete: true,
    city: 'Mumbai',
    interestedInGenders: const [Gender.man],
    prefsOrganizerUpdates: false,
    prefsWeeklyDigest: true,
  );

  static final event = eventFixture(
    id: 'design-utility-event',
    meetingPoint: 'Carter Road Jetty',
    notes: 'Bandra West, by the sea-facing steps',
    latitude: 19.0676,
    longitude: 72.8227,
  );

  static final payments = <Payment>[
    payment(
      id: 'payment-completed',
      eventId: event.id,
      status: PaymentStatus.completed,
      amount: 140000,
    ),
    payment(
      id: 'payment-pending',
      eventId: 'design-payment-pending-event',
      status: PaymentStatus.pending,
      amount: 80000,
    ),
    payment(
      id: 'payment-refunded',
      eventId: 'design-payment-refunded-event',
      status: PaymentStatus.refunded,
      amount: 65000,
    ),
    payment(
      id: 'payment-refund-failed',
      eventId: 'design-payment-refund-failed-event',
      status: PaymentStatus.refundFailed,
      amount: 120000,
      signUpFailed: true,
    ),
  ];

  static final reviews = <Review>[
    Review(
      id: 'review-event-backed',
      organizerId: 'design-club',
      eventId: event.id,
      reviewerUserId: viewerUid,
      reviewerName: 'Neha',
      rating: 5,
      comment:
          'Easy pace, clear host cues, and a genuinely good post-run table.',
      createdAt: now.subtract(const Duration(days: 2)),
    ),
    Review(
      id: 'review-legacy-club',
      organizerId: 'design-club',
      reviewerUserId: viewerUid,
      reviewerName: 'Neha',
      rating: 4,
      comment: 'Great crowd and useful route notes for first-timers.',
      createdAt: now.subtract(const Duration(days: 10)),
    ),
  ];

  static final notifications = <ActivityNotification>[
    ActivityNotification(
      id: 'notification-reminder',
      uid: viewerUid,
      type: ActivityNotificationType.eventReminder,
      title: 'Event starts tomorrow',
      body: 'Sundowner 5K meets at Carter Road Jetty.',
      eventId: event.id,
      createdAt: now.subtract(const Duration(hours: 2)),
    ),
    ActivityNotification(
      id: 'notification-signup',
      uid: viewerUid,
      type: ActivityNotificationType.eventSignup,
      title: 'You are booked',
      body: 'Your spot is confirmed for Wednesday evening.',
      eventId: event.id,
      createdAt: now.subtract(const Duration(hours: 5)),
      readAt: now.subtract(const Duration(hours: 4)),
    ),
    ActivityNotification(
      id: 'notification-club',
      uid: viewerUid,
      type: ActivityNotificationType.organizerUpdate,
      title: 'Sea Face Social added a new route',
      body:
          'The host posted a slower loop for members returning after a break.',
      organizerId: 'design-club',
      createdAt: now.subtract(const Duration(days: 1, hours: 2)),
    ),
    ActivityNotification(
      id: 'notification-cancelled',
      uid: viewerUid,
      type: ActivityNotificationType.eventCancelled,
      title: 'Morning run was cancelled',
      body: 'Heavy rain moved the session to next week.',
      eventId: 'cancelled-event',
      createdAt: now.subtract(const Duration(days: 4)),
      readAt: now.subtract(const Duration(days: 4)),
    ),
  ];

  static final blockedUsers = <BlockedUser>[
    BlockedUser(
      uid: otherUid,
      createdAt: now.subtract(const Duration(days: 18)),
      source: 'profile',
    ),
    BlockedUser(
      uid: 'design-blocked-missing-profile',
      createdAt: now.subtract(const Duration(days: 3)),
      source: 'chat',
    ),
  ];

  static final blockedPublicProfiles = <String, PublicProfile>{
    otherUid: const PublicProfile(
      uid: otherUid,
      name: 'Aarav Mehta',
      age: 31,
      gender: Gender.man,
      city: 'Mumbai',
    ),
  };

  static Event eventFixture({
    required String id,
    required String meetingPoint,
    required String? notes,
    required double latitude,
    required double longitude,
  }) {
    final start = DateTime(2026, 6, 24, 18, 30);
    return Event(
      id: id,
      organizerId: 'design-club',
      startTime: start,
      endTime: start.add(const Duration(hours: 1, minutes: 30)),
      meetingPoint: meetingPoint,
      meetingLocation: EventMeetingLocation(
        name: meetingPoint,
        latitude: latitude,
        longitude: longitude,
        notes: notes,
      ),
      startingPointLat: latitude,
      startingPointLng: longitude,
      eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.socialRun),
      distanceKm: 5,
      pace: PaceLevel.easy,
      capacityLimit: 12,
      description: 'A relaxed social loop with coffee after.',
      priceInPaise: 0,
      bookedCount: 9,
      waitlistedCount: 2,
      eventPolicy: EventPolicyBundle.openEvent(
        capacityLimit: 12,
        basePriceInPaise: 0,
      ),
    );
  }

  static Payment payment({
    required String id,
    required String eventId,
    required PaymentStatus status,
    required int amount,
    bool signUpFailed = false,
  }) {
    return Payment(
      id: id,
      userId: viewerUid,
      orderId: 'order-$id',
      paymentId: 'pay-$id',
      eventId: eventId,
      amount: amount,
      status: status,
      signUpFailed: signUpFailed,
      createdAt: now.subtract(const Duration(days: 3)),
    );
  }

  static String eventTitleForPayment(Payment payment) {
    return switch (payment.status) {
      PaymentStatus.completed => 'Sundowner 5K receipt',
      PaymentStatus.pending => 'Pending booking receipt',
      PaymentStatus.failed => 'Failed booking receipt',
      PaymentStatus.refunded => 'Refunded booking receipt',
      PaymentStatus.refundFailed => 'Refund needs attention',
    };
  }

  static Stream<T> loadingStream<T>() => Stream<T>.empty();

  static Stream<T> errorStream<T>(String message) =>
      Stream<T>.error(StateError(message), StackTrace.empty);
}
