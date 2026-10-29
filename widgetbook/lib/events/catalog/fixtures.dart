import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

const widgetbookEventsViewerUid = 'widgetbook-event-viewer';

const widgetbookEventsClubId = 'widgetbook-event-club';

final widgetbookEventsNow = DateTime(2026, 6, 22, 9);

final widgetbookEventsClub = Club(
  id: widgetbookEventsClubId,
  name: 'Sunday Sea Face Crew',
  description:
      'A city running crew for easy starts, steady conversation, and a cafe finish.',
  location: 'mumbai',
  area: 'Bandra',
  hostUserId: 'host-mira',
  hostName: 'Mira Shah',
  hostAvatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&q=80',
  ownerUserId: 'host-mira',
  hostProfiles: const [
    ClubHostProfile(
      uid: 'host-mira',
      displayName: 'Mira Shah',
      role: ClubHostRole.owner,
    ),
  ],
  createdAt: DateTime(2025, 10, 4),
  memberCount: 412,
  rating: 4.9,
  reviewCount: 73,
);

final widgetbookEvent = widgetbookEventDetailFixture();

final widgetbookEventsPastEvent = widgetbookEventDetailFixture(
  id: 'widgetbook-event-detail-past',
  startTime: widgetbookEventsNow.subtract(const Duration(hours: 18)),
);

final widgetbookEventsViewer = UserProfile(
  uid: widgetbookEventsViewerUid,
  name: 'Neha Kapoor',
  firstName: 'Neha',
  lastName: 'Kapoor',
  displayName: 'Neha',
  dateOfBirth: DateTime(1996, 4, 12),
  gender: Gender.woman,
  phoneNumber: '+919876543210',
  profileComplete: true,
  city: 'Mumbai',
  interestedInGenders: const [Gender.man],
);

final widgetbookEventsSignedUp = EventParticipation(
  id: '${widgetbookEvent.id}_$widgetbookEventsViewerUid',
  eventId: widgetbookEvent.id,
  clubId: widgetbookEventsClubId,
  uid: widgetbookEventsViewerUid,
  status: EventParticipationStatus.signedUp,
  createdAt: widgetbookEventsNow.subtract(const Duration(days: 3)),
  updatedAt: widgetbookEventsNow.subtract(const Duration(days: 3)),
  signedUpAt: widgetbookEventsNow.subtract(const Duration(days: 3)),
  genderAtSignup: Gender.woman,
);

final widgetbookEventsReviews = [
  Review(
    id: 'widgetbook-event-review-1',
    organizerId: widgetbookEventsClubId,
    eventId: widgetbookEventsPastEvent.id,
    reviewerUserId: widgetbookEventsViewerUid,
    reviewerName: 'Neha',
    rating: 5,
    comment: 'Easy pace, clear host cues, and a genuinely good post-run table.',
    createdAt: widgetbookEventsNow.subtract(const Duration(hours: 10)),
  ),
  Review(
    id: 'widgetbook-event-review-2',
    organizerId: widgetbookEventsClubId,
    eventId: widgetbookEventsPastEvent.id,
    reviewerUserId: 'runner-dev',
    reviewerName: 'Dev',
    rating: 5,
    comment: 'The group stayed together without feeling over-managed.',
    createdAt: widgetbookEventsNow.subtract(const Duration(hours: 8)),
    ownerResponse: ReviewOwnerResponse(
      hostUserId: 'host-mira',
      hostName: 'Mira Shah',
      hostAvatarUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&q=80',
      message:
          'Glad that felt balanced. We are keeping the regroup points next week.',
      createdAt: widgetbookEventsNow.subtract(const Duration(hours: 7)),
      updatedAt: widgetbookEventsNow.subtract(const Duration(hours: 7)),
    ),
  ),
  Review(
    id: 'widgetbook-event-review-3',
    organizerId: widgetbookEventsClubId,
    eventId: widgetbookEventsPastEvent.id,
    reviewerUserId: 'runner-ana',
    reviewerName: 'Ana',
    rating: 4,
    comment: 'Great route and thoughtful regroup points.',
    createdAt: widgetbookEventsNow.subtract(const Duration(hours: 7)),
  ),
  Review(
    id: 'widgetbook-event-review-4',
    organizerId: widgetbookEventsClubId,
    eventId: widgetbookEventsPastEvent.id,
    reviewerUserId: 'runner-lee',
    reviewerName: 'Lee',
    rating: 5,
    comment: 'The host made first-timers feel expected.',
    createdAt: widgetbookEventsNow.subtract(const Duration(hours: 6)),
  ),
];

List<Event> widgetbookEventsAgendaEvents() {
  return [
    widgetbookEvent,
    widgetbookEventDetailFixture(
      id: 'widgetbook-event-agenda-pickleball',
      activityKind: ActivityKind.pickleball,
      startTime: widgetbookEvent.startTime.add(
        const Duration(days: 1, hours: 12),
      ),
      bookedCount: 6,
    ),
    widgetbookEventDetailFixture(
      id: 'widgetbook-event-agenda-dinner',
      activityKind: ActivityKind.dinner,
      startTime: widgetbookEvent.startTime.add(
        const Duration(days: 3, hours: 13),
      ),
      capacityLimit: 10,
      bookedCount: 8,
      priceInPaise: 180000,
    ),
    widgetbookEventsPastEvent,
  ];
}

Event widgetbookEventDetailFixture({
  String id = 'widgetbook-event-detail',
  ActivityKind activityKind = ActivityKind.socialRun,
  EventPolicyBundle? eventPolicy,
  int capacityLimit = 12,
  int bookedCount = 9,
  int waitlistedCount = 3,
  int priceInPaise = 0,
  DateTime? startTime,
}) {
  final start = startTime ?? DateTime(2026, 6, 24, 6, 30);
  return Event(
    id: id,
    clubId: widgetbookEventsClubId,
    startTime: start,
    endTime: start.add(const Duration(hours: 1, minutes: 45)),
    meetingPoint: 'Carter Road Jetty',
    meetingLocation: const EventMeetingLocation(
      name: 'Carter Road Jetty',
      latitude: 19.0676,
      longitude: 72.8227,
      notes: 'Bandra West',
    ),
    startingPointLat: 19.0676,
    startingPointLng: 72.8227,
    eventPhotos: [
      _photo('seaface', 0),
      _photo('coffee', 1),
      _photo('finish', 2),
    ],
    eventFormat: EventFormatSnapshot.fromActivityKind(activityKind),
    distanceKm: activityKind == ActivityKind.socialRun ? 5 : 0,
    pace: PaceLevel.easy,
    capacityLimit: capacityLimit,
    description:
        'An easy social pace along the seafront as the light goes gold, with coffee after for anyone who lingers.',
    priceInPaise: priceInPaise,
    bookedCount: bookedCount,
    waitlistedCount: waitlistedCount,
    eventPolicy:
        eventPolicy ??
        EventPolicyBundle.openEvent(
          capacityLimit: capacityLimit,
          basePriceInPaise: priceInPaise,
        ),
  );
}

EventParticipationRoster widgetbookEventsRoster({Event? event, int count = 7}) {
  final id = event?.id ?? widgetbookEvent.id;
  return EventParticipationRoster(
    bookedIds: List.generate(count, (index) => '$id-booked-$index'),
    checkedInIds: const [],
    waitlistedIds: const [],
  );
}

UploadedPhoto _photo(String id, int position) {
  return UploadedPhoto.fromUpload(
    url: 'https://example.invalid/widgetbook-event-$id.jpg',
    storagePath: 'widgetbook/events/$id.jpg',
    position: position,
    now: widgetbookEventsNow.add(Duration(minutes: position)),
  );
}

const widgetbookEventsAvatarItems = [
  CatchPersonAvatarItem(name: 'Rahul Anand'),
  CatchPersonAvatarItem(name: 'Arjun Iyer'),
  CatchPersonAvatarItem(name: 'Kabir Mehta'),
  CatchPersonAvatarItem(name: 'Dev Shah'),
  CatchPersonAvatarItem(name: 'Aarav Rao'),
  CatchPersonAvatarItem(name: 'Nikhil Menon'),
  CatchPersonAvatarItem(name: 'Ishaan Kapoor'),
];

void widgetbookEventsNoopContext(BuildContext context) {}

void widgetbookEventsNoopMessageHost(String clubId, String hostUid) {}
