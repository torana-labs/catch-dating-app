import 'package:catch_dating_app/contexts/bookings/domain/viewer_event_availability.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/explore/presentation/explore_chrome_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';

const widgetbookExploreViewerUid = 'widgetbook-explore-viewer';

final widgetbookExploreNow = DateTime(2026, 6, 22, 9);

const widgetbookExploreMumbai = CityData(
  name: 'mumbai',
  label: 'Mumbai',
  latitude: 19.076,
  longitude: 72.8777,
);

const widgetbookExploreDelhi = CityData(
  name: 'delhi',
  label: 'Delhi',
  latitude: 28.7041,
  longitude: 77.1025,
);

ExploreCityPickerState widgetbookExploreCityPickerState({
  CityData? selectedCity,
  Iterable<CityData> cities = const [
    widgetbookExploreMumbai,
    widgetbookExploreDelhi,
  ],
  bool cityListLoading = false,
  Object? cityListError,
}) {
  return ExploreCityPickerState.from(
    selectedCity: selectedCity ?? widgetbookExploreMumbai,
    cities: cities,
    cityListLoading: cityListLoading,
    cityListError: cityListError,
  );
}

final widgetbookExploreViewer = UserProfile(
  uid: widgetbookExploreViewerUid,
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

final widgetbookExploreOrganizers = [
  _organizer(
    id: 'widgetbook-sea-face-social',
    name: 'Sea Face Social',
    area: 'Bandra',
    hostName: 'Mira Shah',
    memberCount: 412,
    rating: 4.9,
    reviewCount: 73,
    nextEventAt: DateTime(2026, 6, 24, 6, 30),
    nextEventLabel: 'Wed 6:30 AM',
    tags: const ['running', 'coffee', 'new members'],
    photoSeed: '1502904550040-7534597429ae',
  ),
  _organizer(
    id: 'widgetbook-long-table-club',
    name: 'Long Table Club',
    area: 'Fort',
    hostName: 'Ira Mehta',
    memberCount: 96,
    rating: 4.8,
    reviewCount: 31,
    nextEventAt: DateTime(2026, 6, 24, 20),
    nextEventLabel: 'Wed 8:00 PM',
    tags: const ['dinner', 'conversation', 'first-timers'],
    photoSeed: '1517245386807-bb43f82c33c4',
  ),
  _organizer(
    id: 'widgetbook-open-court',
    name: 'Open Court',
    area: 'Juhu',
    hostName: null,
    memberCount: 188,
    rating: 4.7,
    reviewCount: 24,
    nextEventAt: DateTime(2026, 6, 25, 18),
    nextEventLabel: 'Thu 6:00 PM',
    tags: const ['pickleball', 'padel', 'teams'],
    photoSeed: '1521412644187-c49fa049e84d',
  ),
];

final widgetbookExploreJoinedOrganizerIds = {
  widgetbookExploreOrganizers.first.id,
};

final widgetbookExploreFeedItems = [
  _item(
    event: _event(
      id: 'widgetbook-seaface-run',
      organizer: widgetbookExploreOrganizers[0],
      startTime: DateTime(2026, 6, 24, 6, 30),
      meetingPoint: 'Carter Road Jetty',
      activityKind: ActivityKind.socialRun,
      bookedCount: 9,
      capacityLimit: 12,
      distanceKm: 5,
      distanceFromUserKm: 1.2,
    ),
    organizer: widgetbookExploreOrganizers[0],
    distanceFromUserKm: 1.2,
    isJoinedOrganizerMember: true,
  ),
  _item(
    event: _event(
      id: 'widgetbook-long-table-dinner',
      organizer: widgetbookExploreOrganizers[1],
      startTime: DateTime(2026, 6, 24, 20),
      meetingPoint: 'Kala Ghoda table room',
      activityKind: ActivityKind.dinner,
      bookedCount: 10,
      capacityLimit: 12,
      priceInPaise: 140000,
      distanceKm: 0,
      distanceFromUserKm: 3.6,
    ),
    organizer: widgetbookExploreOrganizers[1],
    distanceFromUserKm: 3.6,
  ),
  _item(
    event: _event(
      id: 'widgetbook-open-court-pickleball',
      organizer: widgetbookExploreOrganizers[2],
      startTime: DateTime(2026, 6, 25, 18),
      meetingPoint: 'Juhu court 2',
      activityKind: ActivityKind.pickleball,
      bookedCount: 16,
      capacityLimit: 20,
      distanceKm: 0,
      distanceFromUserKm: 4.1,
    ),
    organizer: widgetbookExploreOrganizers[2],
    distanceFromUserKm: 4.1,
  ),
  _item(
    event: _event(
      id: 'widgetbook-seaface-walk',
      organizer: widgetbookExploreOrganizers[0],
      startTime: DateTime(2026, 6, 26, 7),
      meetingPoint: 'Bandra Fort gate',
      activityKind: ActivityKind.walking,
      bookedCount: 21,
      capacityLimit: 28,
      distanceKm: 3,
      distanceFromUserKm: 1.8,
    ),
    organizer: widgetbookExploreOrganizers[0],
    distanceFromUserKm: 1.8,
    isJoinedOrganizerMember: true,
  ),
  _item(
    event: _event(
      id: 'widgetbook-brunch',
      organizer: widgetbookExploreOrganizers[1],
      startTime: DateTime(2026, 6, 27, 11),
      meetingPoint: 'Colaba reading room',
      activityKind: ActivityKind.pubQuiz,
      bookedCount: 6,
      capacityLimit: 10,
      priceInPaise: 90000,
      distanceKm: 0,
      distanceFromUserKm: 4.8,
    ),
    organizer: widgetbookExploreOrganizers[1],
    distanceFromUserKm: 4.8,
  ),
];

Organizer _organizer({
  required String id,
  required String name,
  required String area,
  required String? hostName,
  required int memberCount,
  required double rating,
  required int reviewCount,
  required DateTime nextEventAt,
  required String nextEventLabel,
  required List<String> tags,
  required String photoSeed,
}) {
  return Organizer(
    id: id,
    name: name,
    description:
        'A low-pressure club for consistent plans, friendly hosts, and people who make room for first-timers.',
    location: widgetbookExploreMumbai.name,
    area: area,
    hostUserId: hostName == null ? null : 'host-$id',
    hostName: hostName,
    ownerUserId: hostName == null ? null : 'host-$id',
    createdAt: DateTime(2025, 9, 12),
    imageUrl: 'https://images.unsplash.com/photo-$photoSeed?w=1200&q=80',
    clubPhotos: [_photo('club-$id', 0, photoSeed)],
    tags: tags,
    memberCount: memberCount,
    rating: rating,
    reviewCount: reviewCount,
    nextEventAt: nextEventAt,
    nextEventLabel: nextEventLabel,
  );
}

Event _event({
  required String id,
  required Organizer organizer,
  required DateTime startTime,
  required String meetingPoint,
  required ActivityKind activityKind,
  required int bookedCount,
  required int capacityLimit,
  required double distanceKm,
  required double distanceFromUserKm,
  int priceInPaise = 0,
}) {
  return Event(
    id: id,
    clubId: organizer.id,
    startTime: startTime,
    endTime: startTime.add(const Duration(hours: 1, minutes: 45)),
    meetingPoint: meetingPoint,
    meetingLocation: eventMeetingLocationFromLegacy(
      name: meetingPoint,
      latitude: widgetbookExploreMumbai.latitude + distanceFromUserKm / 100,
      longitude: widgetbookExploreMumbai.longitude + distanceFromUserKm / 100,
      notes: organizer.area,
    ),
    photoUrl: organizer.imageUrl,
    eventPhotos: [
      _photo('event-$id-main', 0, '1500530855697-b586d89ba3ee'),
      _photo('event-$id-group', 1, '1529156069898-49953e39b3ac'),
    ],
    eventFormat: EventFormatSnapshot.fromActivityKind(activityKind),
    distanceKm: distanceKm,
    pace: PaceLevel.easy,
    capacityLimit: capacityLimit,
    description:
        'A hosted plan with clear arrival cues, a welcoming first ten minutes, and enough structure to keep the room moving.',
    priceInPaise: priceInPaise,
    bookedCount: bookedCount,
    waitlistedCount: 2,
    eventPolicy: EventPolicyBundle.openEvent(
      capacityLimit: capacityLimit,
      basePriceInPaise: priceInPaise,
    ),
  );
}

ExploreEventItem _item({
  required Event event,
  required Organizer organizer,
  required double distanceFromUserKm,
  bool isJoinedOrganizerMember = false,
}) {
  return ExploreEventItem(
    event: event,
    organizer: organizer,
    availability: resolveViewerEventAvailability(
      event: event,
      userProfile: widgetbookExploreViewer,
      now: widgetbookExploreNow,
    ),
    distanceFromUserKm: distanceFromUserKm,
    isJoinedOrganizerMember: isJoinedOrganizerMember,
  );
}

UploadedPhoto _photo(String id, int position, String seed) {
  return UploadedPhoto.fromUpload(
    url: 'https://images.unsplash.com/photo-$seed?w=800&q=80',
    storagePath: 'widgetbook/explore/$id.jpg',
    position: position,
    now: widgetbookExploreNow.add(Duration(minutes: position)),
  );
}

void widgetbookExploreNoopCity(CityData _) {}
