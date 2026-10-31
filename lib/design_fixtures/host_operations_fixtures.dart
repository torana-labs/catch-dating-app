// copy:allow-file(Widgetbook and capture-only deterministic fixture data)
import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/design_fixtures/utility_surface_fixtures.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';

/// Shared deterministic fixtures for host operations design review.
///
/// Keep these values free of Widgetbook widgets so the same host shell data can
/// back route captures once the capture pass reaches host operations.
final class HostOperationsFixtures {
  const HostOperationsFixtures._();

  static const hostUid = 'design-host-owner';
  static const coHostUid = 'design-host-cohost';
  static const guestUid = 'design-host-guest';
  static const secondGuestUid = 'design-host-guest-2';
  static const waitlistUid = 'design-host-waitlist';
  static final now = DateTime(2026, 6, 22, 10);

  static final hostProfile = HostProfile(
    uid: hostUid,
    displayName: 'Mira Shah',
    roleTitle: 'Founder, Sea Face Social',
    bio: 'Builds small-format social events with useful cues and clear hosts.',
    status: HostProfileStatus.active,
    verified: true,
    linkedOrganizerIds: [primaryOrganizer.id, dinnerOrganizer.id],
    createdAt: now.subtract(const Duration(days: 400)),
    updatedAt: now.subtract(const Duration(days: 2)),
  );

  static final hostProfileMissingDisplayName = HostProfile(
    uid: hostUid,
    displayName: '',
    roleTitle: 'Founder, Sea Face Social',
    bio: 'Builds small-format social events with useful cues and clear hosts.',
    status: HostProfileStatus.active,
    verified: true,
    linkedOrganizerIds: [primaryOrganizer.id, dinnerOrganizer.id],
    createdAt: now.subtract(const Duration(days: 400)),
    updatedAt: now.subtract(const Duration(days: 2)),
  );

  static const pendingPaymentAccount = HostPaymentAccount(
    userId: hostUid,
    provider: HostPaymentProvider.razorpay,
    country: 'IN',
    defaultCurrency: 'INR',
    providerAccountId: 'acc_design_pending',
    razorpayAccountId: 'acc_design_pending',
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: true,
    onboardingStatus: HostPaymentOnboardingStatus.pending,
    requirementsPendingVerification: ['individual.verification.document'],
  );

  static const readyPaymentAccount = HostPaymentAccount(
    userId: hostUid,
    provider: HostPaymentProvider.razorpay,
    country: 'IN',
    defaultCurrency: 'INR',
    providerAccountId: 'acc_design_ready',
    razorpayAccountId: 'acc_design_ready',
    chargesEnabled: true,
    payoutsEnabled: true,
    detailsSubmitted: true,
    onboardingStatus: HostPaymentOnboardingStatus.complete,
  );

  static const restrictedPaymentAccount = HostPaymentAccount(
    userId: hostUid,
    provider: HostPaymentProvider.razorpay,
    country: 'IN',
    defaultCurrency: 'INR',
    providerAccountId: 'acc_design_restricted',
    razorpayAccountId: 'acc_design_restricted',
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: true,
    onboardingStatus: HostPaymentOnboardingStatus.restricted,
    disabledReason:
        'Razorpay needs director verification before payouts resume.',
    requirementsCurrentlyDue: ['company.directors_provided'],
  );

  static final owner = UtilitySurfaceFixtures.viewer.copyWith(
    uid: hostUid,
    name: 'Mira Shah',
    firstName: 'Mira',
    lastName: 'Shah',
    displayName: 'Mira',
    city: 'Mumbai',
    gender: Gender.woman,
  );

  static final primaryOrganizer = Organizer(
    id: 'design-host-sea-face',
    name: 'Sea Face Social',
    description:
        'Coastal social runs, coffee tables, and low-pressure ways to meet people after work.',
    location: 'Mumbai',
    area: 'Bandra West',
    hostUserId: hostUid,
    hostName: 'Mira Shah',
    ownerUserId: hostUid,
    hostUserIds: const [hostUid, coHostUid],
    hostProfiles: const [
      OrganizerHostProfile(
        uid: hostUid,
        displayName: 'Mira Shah',
        role: OrganizerHostRole.owner,
      ),
      OrganizerHostProfile(uid: coHostUid, displayName: 'Rishi Mehta'),
    ],
    createdAt: DateTime(2025, 9, 12),
    imageUrl:
        'https://images.unsplash.com/photo-1502904550040-7534597429ae?w=1200&q=80',
    tags: const ['social run', 'coffee after', 'new members'],
    memberCount: 428,
    rating: 4.9,
    reviewCount: 73,
    nextEventAt: DateTime(2030, 6, 24, 18, 30),
    nextEventLabel: 'Wed 6:30 PM',
    instagramHandle: '@seafacesocial',
    phoneNumber: '+91 98765 43210',
    email: 'hello@seafacesocial.example',
    hostDefaults: const OrganizerHostDefaults(
      supportedActivityKinds: [
        ActivityKind.socialRun,
        ActivityKind.walking,
        ActivityKind.dinner,
      ],
    ),
  );

  static final dinnerOrganizer = Organizer(
    id: 'design-host-table-club',
    name: 'Long Table Club',
    description:
        'Dinner tables for people who want a slower social room and strong hosting.',
    location: 'Mumbai',
    area: 'Kala Ghoda',
    hostUserId: hostUid,
    hostName: 'Mira Shah',
    ownerUserId: hostUid,
    hostUserIds: const [hostUid],
    hostProfiles: const [
      OrganizerHostProfile(
        uid: hostUid,
        displayName: 'Mira Shah',
        role: OrganizerHostRole.owner,
      ),
    ],
    createdAt: DateTime(2025, 11, 3),
    tags: const ['dinner', 'conversation', 'members only'],
    memberCount: 96,
    rating: 4.7,
    reviewCount: 21,
    nextEventAt: DateTime(2030, 6, 29, 20),
    nextEventLabel: 'Mon 8:00 PM',
    hostDefaults: const OrganizerHostDefaults(
      primaryActivityKind: ActivityKind.dinner,
      supportedActivityKinds: [ActivityKind.dinner],
    ),
  );

  static final coHostedOrganizer = primaryOrganizer.copyWith(
    id: 'design-host-cohost-club',
    name: 'Tempo Social Club',
    ownerUserId: 'design-host-other-owner',
    hostUserId: 'design-host-other-owner',
    hostName: 'Aarav',
    hostUserIds: const ['design-host-other-owner', hostUid],
    hostProfiles: const [
      OrganizerHostProfile(
        uid: 'design-host-other-owner',
        displayName: 'Aarav Sinha',
        role: OrganizerHostRole.owner,
      ),
      OrganizerHostProfile(uid: hostUid, displayName: 'Mira Shah'),
    ],
    memberCount: 188,
    rating: 4.6,
    reviewCount: 19,
  );

  static final organizers = [
    primaryOrganizer,
    dinnerOrganizer,
    coHostedOrganizer,
  ];

  static final upcomingEvent = event(
    id: 'design-host-event-upcoming',
    organizer: primaryOrganizer,
    start: DateTime(2030, 6, 24, 18, 30),
    bookedCount: 10,
    waitlistedCount: 2,
  );

  static final privateEvent = event(
    id: 'design-host-event-private',
    organizer: primaryOrganizer,
    start: DateTime(2030, 6, 27, 19),
    bookedCount: 11,
    waitlistedCount: 5,
    eventPolicy: EventPolicyBundle.inviteOnlyEvent(
      capacityLimit: 12,
      basePriceInPaise: 0,
      inviteCodeHint: 'SEAFACE',
    ),
  );

  static final unusedEvent = event(
    id: 'design-host-event-unused',
    organizer: primaryOrganizer,
    start: DateTime(2030, 7, 5, 18, 30),
    bookedCount: 0,
    description: 'An unused host draft that can still be removed safely.',
  );

  static final fullEvent = event(
    id: 'design-host-event-full',
    organizer: dinnerOrganizer,
    start: DateTime(2030, 6, 29, 20),
    bookedCount: 18,
    checkedInCount: 8,
    waitlistedCount: 6,
    capacityLimit: 18,
    activityKind: ActivityKind.dinner,
    meetingPoint: 'Kala Ghoda table 4',
    description: 'A guided dinner table with host-led introductions.',
  );

  static final cancelledEvent = upcomingEvent.copyWith(
    id: 'design-host-event-cancelled',
    status: EventLifecycleStatus.cancelled,
    cancelledAt: now.subtract(const Duration(hours: 3)),
    cancellationReason: 'Monsoon weather alert.',
  );

  static final eventsByOrganizer = <String, List<Event>>{
    primaryOrganizer.id: [upcomingEvent, privateEvent],
    dinnerOrganizer.id: [fullEvent],
    coHostedOrganizer.id: [],
  };

  static final privateAccess = EventPrivateAccess(
    id: 'design-host-private-access',
    eventId: privateEvent.id,
    organizerId: primaryOrganizer.id,
    inviteCode: 'SEAFACE',
    createdAt: now.subtract(const Duration(days: 2)),
  );

  static final inviteLinks = <EventInviteLink>[
    EventInviteLink(
      id: 'design-host-link-instagram',
      eventId: privateEvent.id,
      organizerId: primaryOrganizer.id,
      hostUid: hostUid,
      label: 'Instagram bio',
      source: 'instagram',
      openCount: 142,
      requestCount: 28,
      confirmedCount: 11,
      catcherCount: 3,
      matchCount: 2,
      chatStartedCount: 2,
      createdAt: now.subtract(const Duration(days: 2)),
      updatedAt: now.subtract(const Duration(hours: 4)),
    ),
    EventInviteLink(
      id: 'design-host-link-alumni',
      eventId: privateEvent.id,
      organizerId: primaryOrganizer.id,
      hostUid: hostUid,
      label: 'Alumni WhatsApp',
      source: 'whatsapp',
      openCount: 64,
      requestCount: 18,
      confirmedCount: 7,
      catcherCount: 1,
      matchCount: 1,
      chatStartedCount: 1,
      disabledAt: now.subtract(const Duration(hours: 1)),
      createdAt: now.subtract(const Duration(days: 1)),
      updatedAt: now.subtract(const Duration(hours: 1)),
    ),
  ];

  static final participations = <EventParticipation>[
    participation(
      uid: guestUid,
      event: privateEvent,
      status: EventParticipationStatus.attended,
      gender: Gender.man,
      createdOffset: const Duration(days: 3),
    ),
    participation(
      uid: secondGuestUid,
      event: privateEvent,
      status: EventParticipationStatus.signedUp,
      gender: Gender.woman,
      createdOffset: const Duration(days: 2),
    ),
    participation(
      uid: waitlistUid,
      event: privateEvent,
      status: EventParticipationStatus.waitlisted,
      gender: Gender.man,
      createdOffset: const Duration(days: 1),
    ),
  ];

  static final roster = EventParticipationRoster.fromParticipations(
    participations,
  );

  static final attendanceViewModel = (
    event: privateEvent,
    attendeeIds: roster.bookedIds,
    attendedIds: Set<String>.unmodifiable(roster.checkedInIds),
    waitlistedIds: roster.waitlistedIds,
    profileIds: <String>[...roster.bookedIds, ...roster.waitlistedIds],
    participationsByUid: Map<String, EventParticipation>.unmodifiable({
      for (final participation in participations)
        participation.uid: participation,
    }),
  );

  static final eventDraft = EventDraft(
    id: 'design-host-event-draft',
    organizerId: primaryOrganizer.id,
    savedAt: now.subtract(const Duration(hours: 2)),
    distance: '5',
    capacity: '12',
    price: '0',
    description: 'A relaxed after-work loop with clear host cues.',
    meetingPoint: 'Carter Road Jetty',
    locationDetails: 'Meet by the sea-facing steps.',
    meetingLocationAddress: 'Carter Road, Bandra West',
    startingPointLat: 19.0676,
    startingPointLng: 72.8227,
    selectedDateMillis: DateTime(2030, 6, 24).millisecondsSinceEpoch,
    selectedStartHour: 18,
    selectedStartMinute: 30,
  );

  static final organizerDraft = OrganizerDraft(
    savedAt: now.subtract(const Duration(hours: 3)),
    name: 'Sea Face Evenings',
    area: 'Bandra West',
    description:
        'Low-pressure hosted formats for runners, walkers, and coffee-first social plans.',
    location: 'Mumbai',
    instagramHandle: '@seafaceevenings',
    phoneNumber: '+91 98765 43210',
    email: 'hello@seaface.example',
    hostDefaults: const OrganizerHostDefaults(
      supportedActivityKinds: [
        ActivityKind.socialRun,
        ActivityKind.walking,
        ActivityKind.dinner,
      ],
    ),
  );

  static final analyticsReport = HostAnalyticsReport(
    generatedAt: now,
    timezone: 'Asia/Kolkata',
    summaryCards: const [
      HostAnalyticsMetricCard(
        id: HostAnalyticsMetricIds.listingViews,
        label: 'Listing views',
        value: 842,
        previousValue: 710,
        unit: HostAnalyticsMetricUnit.count,
        status: HostAnalyticsMetricStatus.ready,
      ),
      HostAnalyticsMetricCard(
        id: HostAnalyticsMetricIds.eventViews,
        label: 'Event views',
        value: 466,
        previousValue: 402,
        unit: HostAnalyticsMetricUnit.count,
        status: HostAnalyticsMetricStatus.ready,
      ),
      HostAnalyticsMetricCard(
        id: HostAnalyticsMetricIds.bookings,
        label: 'Bookings',
        value: 126,
        previousValue: 107,
        unit: HostAnalyticsMetricUnit.count,
        status: HostAnalyticsMetricStatus.ready,
      ),
      HostAnalyticsMetricCard(
        id: HostAnalyticsMetricIds.attendanceRate,
        label: 'Attendance',
        value: 84,
        previousValue: 79,
        unit: HostAnalyticsMetricUnit.percent,
        status: HostAnalyticsMetricStatus.ready,
      ),
      HostAnalyticsMetricCard(
        id: HostAnalyticsMetricIds.revenue,
        label: 'Revenue',
        value: 148000,
        previousValue: 121000,
        unit: HostAnalyticsMetricUnit.moneyMinor,
        status: HostAnalyticsMetricStatus.ready,
      ),
      HostAnalyticsMetricCard(
        id: HostAnalyticsMetricIds.checkoutDropoff,
        label: 'Checkout drop-off',
        value: 12,
        previousValue: 16,
        unit: HostAnalyticsMetricUnit.count,
        status: HostAnalyticsMetricStatus.ready,
      ),
      HostAnalyticsMetricCard(
        id: HostAnalyticsMetricIds.checkoutConversionRate,
        label: 'Checkout conversion',
        value: 82,
        previousValue: 76,
        unit: HostAnalyticsMetricUnit.percent,
        status: HostAnalyticsMetricStatus.ready,
      ),
      HostAnalyticsMetricCard(
        id: HostAnalyticsMetricIds.newReviews,
        label: 'New reviews',
        value: 6,
        previousValue: 4,
        unit: HostAnalyticsMetricUnit.count,
        status: HostAnalyticsMetricStatus.ready,
      ),
      HostAnalyticsMetricCard(
        id: HostAnalyticsMetricIds.connections,
        label: 'Connections',
        value: 24,
        previousValue: 18,
        unit: HostAnalyticsMetricUnit.count,
        status: HostAnalyticsMetricStatus.ready,
      ),
      HostAnalyticsMetricCard(
        id: HostAnalyticsMetricIds.chats,
        label: 'Chats started',
        value: 17,
        previousValue: 12,
        unit: HostAnalyticsMetricUnit.count,
        status: HostAnalyticsMetricStatus.ready,
      ),
    ],
    trend: [
      HostAnalyticsTrendPoint(
        periodStart: now.subtract(const Duration(days: 21)),
        periodEnd: now.subtract(const Duration(days: 14)),
        metrics: const {
          HostAnalyticsTrendKeys.demand: 42,
          HostAnalyticsTrendKeys.bookings: 28,
        },
      ),
      HostAnalyticsTrendPoint(
        periodStart: now.subtract(const Duration(days: 14)),
        periodEnd: now.subtract(const Duration(days: 7)),
        metrics: const {
          HostAnalyticsTrendKeys.demand: 55,
          HostAnalyticsTrendKeys.bookings: 41,
        },
      ),
      HostAnalyticsTrendPoint(
        periodStart: now.subtract(const Duration(days: 7)),
        periodEnd: now,
        metrics: const {
          HostAnalyticsTrendKeys.demand: 71,
          HostAnalyticsTrendKeys.bookings: 57,
        },
      ),
    ],
    topEvents: [
      HostAnalyticsEventRow(
        eventId: privateEvent.id,
        organizerId: privateEvent.organizerId,
        title: 'Private Sundowner 5K',
        startTime: privateEvent.startTime,
        status: 'upcoming',
        bookedCount: 11,
        checkedInCount: 0,
        waitlistedCount: 5,
        fillRate: 92,
        checkInRate: 0,
        grossRevenueMinor: 0,
        currency: 'INR',
        checkoutStartedCount: 0,
        checkoutDropoffCount: 0,
        paymentCompletedCount: 0,
        paymentFailedCount: 0,
        paymentRefundedCount: 0,
        reviewCount: 0,
        averageRating: 0,
        demandCount: 31,
        inviteOpenCount: 206,
        mutualMatchCount: 3,
        chatStartedCount: 3,
        repeatAttendeeCount: 4,
      ),
      HostAnalyticsEventRow(
        eventId: fullEvent.id,
        organizerId: fullEvent.organizerId,
        title: 'Long Table Dinner',
        startTime: fullEvent.startTime,
        status: 'full',
        bookedCount: 18,
        checkedInCount: 8,
        waitlistedCount: 6,
        fillRate: 100,
        checkInRate: 44,
        grossRevenueMinor: 148000,
        currency: 'INR',
        checkoutStartedCount: 22,
        checkoutDropoffCount: 4,
        paymentCompletedCount: 18,
        paymentFailedCount: 1,
        paymentRefundedCount: 0,
        reviewCount: 6,
        averageRating: 4.8,
        demandCount: 34,
        inviteOpenCount: 88,
        mutualMatchCount: 5,
        chatStartedCount: 4,
        repeatAttendeeCount: 7,
      ),
    ],
    reviewSummary: const HostAnalyticsReviewSummary(
      newReviews: 6,
      publishedReviews: 28,
      verifiedReviews: 24,
      publicReviews: 22,
      ownerResponseCount: 5,
      averageRating: 4.8,
    ),
    discoverySummary: const HostAnalyticsDiscoverySummary(
      listingViews: 842,
      searchAppearances: 318,
      eventViews: 466,
      organizerSaves: 71,
      eventSaves: 53,
      contactClicks: 18,
      claimClicks: 0,
      outboundClicks: 42,
    ),
    dataQuality: const [
      HostAnalyticsDataQuality(
        id: 'reviews',
        state: HostAnalyticsDataQualityState.ok,
        detail: 'Reviews and discovery metrics are fresh.',
      ),
      HostAnalyticsDataQuality(
        id: 'payments',
        state: HostAnalyticsDataQualityState.ok,
        detail: 'Payment metrics are fresh.',
      ),
    ],
  );

  static Event event({
    required String id,
    required Organizer organizer,
    required DateTime start,
    required int bookedCount,
    int checkedInCount = 0,
    int waitlistedCount = 0,
    int capacityLimit = 12,
    ActivityKind activityKind = ActivityKind.socialRun,
    String meetingPoint = 'Carter Road Jetty',
    String description = 'A relaxed social event with host-led cues.',
    EventPolicyBundle? eventPolicy,
  }) {
    return Event(
      id: id,
      organizerId: organizer.id,
      startTime: start,
      endTime: start.add(const Duration(hours: 1, minutes: 30)),
      meetingPoint: meetingPoint,
      meetingLocation: EventMeetingLocation(
        name: meetingPoint,
        latitude: 19.0676,
        longitude: 72.8227,
        notes: organizer.area,
      ),
      startingPointLat: 19.0676,
      startingPointLng: 72.8227,
      eventFormat: EventFormatSnapshot.fromActivityKind(activityKind),
      distanceKm: activityKind == ActivityKind.dinner ? 0 : 5,
      pace: PaceLevel.easy,
      capacityLimit: capacityLimit,
      description: description,
      priceInPaise: activityKind == ActivityKind.dinner ? 95000 : 0,
      bookedCount: bookedCount,
      checkedInCount: checkedInCount,
      waitlistedCount: waitlistedCount,
      eventPolicy:
          eventPolicy ??
          EventPolicyBundle.openEvent(
            capacityLimit: capacityLimit,
            basePriceInPaise: activityKind == ActivityKind.dinner ? 95000 : 0,
          ),
    );
  }

  static EventParticipation participation({
    required String uid,
    required Event event,
    required EventParticipationStatus status,
    required Gender gender,
    required Duration createdOffset,
  }) {
    final createdAt = now.subtract(createdOffset);
    return EventParticipation(
      id: eventParticipationId(eventId: event.id, uid: uid),
      eventId: event.id,
      organizerId: event.organizerId,
      uid: uid,
      status: status,
      genderAtSignup: gender,
      createdAt: createdAt,
      updatedAt: createdAt,
      signedUpAt:
          status == EventParticipationStatus.signedUp ||
              status == EventParticipationStatus.attended
          ? createdAt
          : null,
      attendedAt: status == EventParticipationStatus.attended
          ? createdAt.add(const Duration(hours: 1))
          : null,
      waitlistedAt: status == EventParticipationStatus.waitlisted
          ? createdAt
          : null,
    );
  }

  static Stream<T> loadingStream<T>() => Stream<T>.empty();

  static Stream<T> errorStream<T>(String message) =>
      Stream<T>.error(StateError(message), StackTrace.empty);
}

final class HostFixtureAnalyticsRepository implements HostAnalyticsRepository {
  const HostFixtureAnalyticsRepository({this.report, this.error});

  final HostAnalyticsReport? report;
  final Object? error;

  @override
  Future<HostAnalyticsReport> getHostAnalytics(HostAnalyticsQuery query) async {
    final error = this.error;
    if (error != null) throw error;
    return report ?? HostOperationsFixtures.analyticsReport;
  }
}

final class HostFixtureEventDraftRepository implements EventDraftRepository {
  const HostFixtureEventDraftRepository({this.drafts = const []});

  final List<EventDraft> drafts;

  @override
  Future<List<EventDraft>> loadDrafts({
    required String organizerId,
    required String userId,
  }) async {
    return drafts.where((draft) => draft.organizerId == organizerId).toList();
  }

  @override
  Future<void> saveDraft({
    required String userId,
    required EventDraft draft,
  }) async {}

  @override
  Future<void> deleteDraft({
    required String organizerId,
    required String userId,
    required String draftId,
  }) async {}

  @override
  Future<void> deleteAllDrafts({
    required String organizerId,
    required String userId,
  }) async {}
}
