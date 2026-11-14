// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.

import 'dart:async';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_kernel/city_data.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:catch_platform/device/device_location.dart';
import 'capture_fixtures.dart';

const memberDiscoveryCities = [
  CityData(
    name: 'mumbai',
    label: 'Bandra',
    latitude: 19.076,
    longitude: 72.8777,
  ),
  CityData(
    name: 'delhi',
    label: 'Delhi',
    latitude: 28.7041,
    longitude: 77.1025,
  ),
];
final memberDiscoveryOrganizers = [
  captureFixtures.captureOrganizer(
    id: 'club-discovery-quizzicals',
    name: 'The Quizzicals',
    description: 'Pub quiz nights with teams drawn at the door.',
    area: 'Khar',
    hostName: 'Aarav',
    tags: const ['pub quiz', 'teams', 'tonight'],
    memberCount: 74,
    reviewCount: 19,
    nextEventAt: DateTime(2026, 6, 11, 19, 30),
    nextEventLabel: 'Thu 7:30 PM',
  ),
  captureFixtures.captureOrganizer(
    id: 'club-discovery-table',
    name: 'Table for Strangers',
    description: 'Hosted dinners for people who want better first hellos.',
    area: 'Pali Hill',
    hostName: 'Kabir',
    tags: const ['dinner', 'conversation', 'new'],
    memberCount: 86,
    rating: 4.7,
    reviewCount: 31,
    nextEventAt: DateTime(2026, 6, 12, 20),
    nextEventLabel: 'Fri 8:00 PM',
  ),
  captureFixtures.captureOrganizer(
    id: 'club-discovery-pickle',
    name: 'Pickleball Social',
    description: 'Friendly doubles, rotating partners, and no pressure.',
    area: 'Juhu',
    hostName: 'Tara',
    tags: const ['pickleball', 'mixed doubles', 'weekend'],
    memberCount: 64,
    rating: 4.6,
    reviewCount: 18,
    nextEventAt: DateTime(2026, 6, 13, 18),
    nextEventLabel: 'Sat 6:00 PM',
  ),
];
final memberDiscoveryEvents = [
  captureFixtures.captureEvent(
    id: 'event-discovery-trivia',
    organizer: memberDiscoveryOrganizers[0],
    startTime: DateTime(2026, 6, 11, 19, 30),
    meetingPoint: 'Khar Social',
    startingPointLat: 19.0698,
    startingPointLng: 72.8381,
    activityKind: ActivityKind.pubQuiz,
    distanceKm: 0,
    bookedCount: 24,
    capacityLimit: 30,
    description: 'Teams drawn at the door for a no-phones trivia night.',
  ),
  captureFixtures.captureEvent(
    id: 'event-discovery-long-table',
    organizer: memberDiscoveryOrganizers[1],
    startTime: DateTime(2026, 6, 12, 20),
    meetingPoint: 'Pali Village Cafe',
    startingPointLat: 19.0634,
    startingPointLng: 72.8296,
    activityKind: ActivityKind.dinner,
    distanceKm: 0,
    bookedCount: 10,
    capacityLimit: 14,
    priceInPaise: 120000,
    description: 'A long-table dinner built around hosted prompts.',
  ),
  captureFixtures.captureEvent(
    id: 'event-discovery-pickle-open',
    organizer: memberDiscoveryOrganizers[2],
    startTime: DateTime(2026, 6, 13, 18),
    meetingPoint: 'Juhu court 2',
    startingPointLat: 19.1075,
    startingPointLng: 72.8263,
    activityKind: ActivityKind.pickleball,
    distanceKm: 0,
    bookedCount: 11,
    capacityLimit: 16,
    priceInPaise: 60000,
    description: 'Rotating mixed doubles with a host who balances teams.',
  ),
  captureFixtures.captureEvent(
    id: 'event-discovery-cocktail-round',
    organizer: memberDiscoveryOrganizers[0],
    startTime: DateTime(2026, 6, 15, 20),
    meetingPoint: 'Khar Social',
    startingPointLat: 19.0698,
    startingPointLng: 72.8381,
    activityKind: ActivityKind.barCrawl,
    distanceKm: 0,
    bookedCount: 18,
    capacityLimit: 24,
    priceInPaise: 90000,
    description:
        'Small groups rotate through low-pressure conversation rounds.',
  ),
  captureFixtures.captureEvent(
    id: 'event-discovery-open-format',
    organizer: memberDiscoveryOrganizers[1],
    startTime: DateTime(2026, 6, 17, 19),
    meetingPoint: 'Pali Village Cafe',
    startingPointLat: 19.0634,
    startingPointLng: 72.8296,
    activityKind: ActivityKind.singlesMixer,
    distanceKm: 0,
    bookedCount: 16,
    capacityLimit: 22,
    priceInPaise: 80000,
    description: 'A hosted mixer with prompts, table moves, and easy exits.',
  ),
];
final memberDiscoveryItems = [
  for (final event in memberDiscoveryEvents)
    ExploreEventItem(
      event: event,
      organizer: memberDiscoveryOrganizers.firstWhere(
        (organizer) => organizer.id == event.organizerId,
      ),
      distanceFromUserKm: switch (event.id) {
        'event-discovery-long-table' => 2.4,
        'event-discovery-pickle-open' => 4.8,
        'event-discovery-weekend-walk' => 1.3,
        _ => 0.8,
      },
    ),
];

class CaptureDeviceLocation extends DeviceLocation {
  @override
  Future<LocationCoordinate?> build() async => null;
}
