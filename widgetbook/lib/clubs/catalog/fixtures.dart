import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';

const widgetbookClubViewerUid = 'widgetbook-club-viewer';

const widgetbookClubClubId = 'widgetbook-sea-face-social';

final _now = DateTime(2026, 6, 22, 9);

final widgetbookClubClub = Club(
  id: widgetbookClubClubId,
  name: 'Sea Face Social',
  description:
      'A member-led running club for low-pressure miles, good coffee, and people who remember your name.',
  location: 'mumbai',
  area: 'Bandra',
  hostUserId: 'host-mira',
  hostName: 'Mira',
  hostAvatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&q=80',
  ownerUserId: 'host-mira',
  hostUserIds: const ['host-mira', 'host-rishi'],
  hostProfiles: const [
    ClubHostProfile(
      uid: 'host-mira',
      displayName: 'Mira Shah',
      avatarUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&q=80',
      role: ClubHostRole.owner,
    ),
    ClubHostProfile(
      uid: 'host-rishi',
      displayName: 'Rishi Mehta',
      avatarUrl:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=80',
    ),
  ],
  createdAt: DateTime(2025, 9, 12),
  imageUrl:
      'https://images.unsplash.com/photo-1502904550040-7534597429ae?w=1200&q=80',
  clubPhotos: [
    widgetbookClubPhoto('club-photo-cafe', 0),
    widgetbookClubPhoto('club-photo-bandstand', 1),
    widgetbookClubPhoto('club-photo-post-run', 2),
  ],
  tags: const ['running', 'coffee', 'new members', 'sunrise'],
  memberCount: 214,
  rating: 4.9,
  reviewCount: 58,
  nextEventAt: DateTime(2026, 6, 24, 6, 45),
  nextEventLabel: 'Wed 6:45 AM',
  instagramHandle: '@seafacesocial',
  phoneNumber: '+91 98765 43210',
  email: 'hello@seafacesocial.example',
  hostDefaults: const ClubHostDefaults(
    primaryActivityKind: ActivityKind.socialRun,
    supportedActivityKinds: [ActivityKind.walking, ActivityKind.dinner],
  ),
);

final widgetbookClubMinimalClub = widgetbookClubClub.copyWith(
  id: 'widgetbook-quiet-club',
  name: 'Quiet Table Club',
  description:
      'A small supper club for regulars who want familiar faces and low-key evenings.',
  imageUrl: null,
  clubPhotos: const [],
  hostProfiles: const [
    ClubHostProfile(
      uid: 'host-ana',
      displayName: 'Ana Rao',
      role: ClubHostRole.owner,
    ),
  ],
  tags: const ['dinner', 'conversation'],
  memberCount: 28,
  rating: 0,
  reviewCount: 0,
  instagramHandle: null,
  phoneNumber: null,
  email: null,
  hostDefaults: const ClubHostDefaults(
    primaryActivityKind: ActivityKind.dinner,
  ),
);

final widgetbookClubEvents = [
  widgetbookClubEvent(
    id: 'widgetbook-sunrise-6k',
    startTime: DateTime(2026, 6, 24, 6, 45),
    meetingPoint: 'Bandstand promenade',
    distanceKm: 6,
    bookedCount: 16,
    capacityLimit: 22,
    description: 'Morning miles with regroup points and a cafe finish.',
  ),
  widgetbookClubEvent(
    id: 'widgetbook-weekend-walk',
    startTime: DateTime(2026, 6, 28, 8),
    meetingPoint: 'Bandra Fort gate',
    activityKind: ActivityKind.walking,
    distanceKm: 3,
    bookedCount: 19,
    capacityLimit: 28,
    description: 'A social weekend walk for new members.',
  ),
];

final widgetbookClubReviews = [
  Review(
    id: 'widgetbook-club-review-1',
    organizerId: widgetbookClubClub.id,
    reviewerUserId: 'runner-neha',
    reviewerName: 'Neha',
    rating: 5,
    comment: 'Friendly hosts, clear routes, and zero awkward hovering.',
    createdAt: DateTime(2026, 5, 24),
  ),
  Review(
    id: 'widgetbook-club-review-2',
    organizerId: widgetbookClubClub.id,
    reviewerUserId: 'runner-dev',
    reviewerName: 'Dev',
    rating: 5,
    comment: 'The pace groups make it easy to show up without knowing anyone.',
    createdAt: DateTime(2026, 5, 31),
    ownerResponse: ReviewOwnerResponse(
      hostUserId: 'host-mira',
      hostName: 'Mira Shah',
      hostAvatarUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&q=80',
      message: 'Thanks for joining the new 6K group. We will keep that pace.',
      createdAt: DateTime(2026, 6, 1),
      updatedAt: DateTime(2026, 6, 1),
    ),
  ),
];

Event widgetbookClubEvent({
  required String id,
  required DateTime startTime,
  required String meetingPoint,
  required double distanceKm,
  required int bookedCount,
  required int capacityLimit,
  required String description,
  ActivityKind activityKind = ActivityKind.socialRun,
}) {
  return Event(
    id: id,
    clubId: widgetbookClubClub.id,
    startTime: startTime,
    endTime: startTime.add(const Duration(hours: 1, minutes: 30)),
    meetingPoint: meetingPoint,
    meetingLocation: EventMeetingLocation(
      name: meetingPoint,
      latitude: 19.0702,
      longitude: 72.8228,
    ),
    startingPointLat: 19.0702,
    startingPointLng: 72.8228,
    eventFormat: EventFormatSnapshot.fromActivityKind(activityKind),
    distanceKm: distanceKm,
    pace: PaceLevel.easy,
    capacityLimit: capacityLimit,
    description: description,
    priceInPaise: 0,
    bookedCount: bookedCount,
  );
}

UploadedPhoto widgetbookClubPhoto(String id, int position) {
  return UploadedPhoto.fromUpload(
    url:
        'https://images.unsplash.com/photo-${['1519681393784-d120267933ba', '1529156069898-49953e39b3ac', '1526676037777-05a232554f77'][position]}?w=600&q=80',
    storagePath: 'widgetbook/clubs/$id.jpg',
    position: position,
    now: _now.add(Duration(minutes: position)),
  );
}
