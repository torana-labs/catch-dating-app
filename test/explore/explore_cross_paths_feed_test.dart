import 'package:catch_dating_app/contexts/bookings/domain/viewer_event_availability.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_suggestion.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/explore/presentation/explore_cross_paths_provider.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_mixed_feed_state.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' as events;
import '../organizers/organizers_test_helpers.dart' as organizers;

ExploreEventItem _item({
  required String id,
  required Organizer organizer,
  required DateTime startTime,
  ViewerEventAvailability? availability,
}) {
  final event = events.buildEvent(
    id: id,
    organizerId: organizer.id,
    startTime: startTime,
    crossPathsDiscoveryEnabled: true,
  );
  return ExploreEventItem(
    event: event.copyWith(
      meetingLocation: EventMeetingLocation(
        name: event.meetingPoint,
        latitude: 19.0608,
        longitude: 72.8365,
      ),
      startingPointLat: 19.0608,
      startingPointLng: 72.8365,
    ),
    organizer: organizer,
    availability: availability,
  );
}

CrossPathsSuggestion _suggestion({
  required String uid,
  required String eventId,
  required DateTime startTime,
}) => CrossPathsSuggestion.fromCallableData({
  'person': {
    'uid': uid,
    'name': 'Rhea Kapoor',
    'age': 29,
    'gender': 'woman',
    'city': 'in-mh-mumbai',
    'photoUrls': [
      'https://example.com/$uid-1.jpg',
      'https://example.com/$uid-2.jpg',
      'https://example.com/$uid-3.jpg',
    ],
    'promptAnswers': [
      {'prompt': 'A perfect event', 'answer': 'A sunset walk'},
      {'prompt': 'Typical Sunday', 'answer': 'Coffee and a long read'},
      {'prompt': 'Together we could', 'answer': 'Try every new place'},
    ],
    'relationshipGoal': 'relationship',
  },
  'event': {
    'eventId': eventId,
    'organizerId': 'organizer-1',
    'startTime': startTime.toUtc().toIso8601String(),
    'endTime': startTime
        .add(const Duration(hours: 1))
        .toUtc()
        .toIso8601String(),
    'meetingPoint': 'Carter Road',
    'activityKind': 'socialRun',
    'photoUrl': null,
    'viewerBookingStatus': 'canBookNow',
  },
  'reasonCodes': [
    'attending_event',
    'booking_available',
    'mutual_preferences',
    'showcase_ready',
  ],
  'suggestionToken': 'tttttttttttttttttttttttttttttttttttttttt.$uid',
  'tokenExpiresAt': startTime.toUtc().toIso8601String(),
});

void main() {
  test('second organizer stays outside the first eight mixed cards', () {
    final eventOrganizer = organizers.buildOrganizer(id: 'cadence-event-club');
    final candidateOrganizers = [
      organizers.buildOrganizer(
        id: 'cadence-spotlight',
        nextEventLabel: 'Friday',
      ),
      organizers.buildOrganizer(id: 'cadence-row', nextEventLabel: 'Saturday'),
    ];

    List<ExploreMixedCard> cardsFor(int eventCount) =>
        buildExploreMixedFeedCards(
          viewModel: ExploreFeedViewModel(
            items: [
              for (var index = 0; index < eventCount; index += 1)
                _item(
                  id: 'cadence-event-$index',
                  organizer: eventOrganizer,
                  startTime: DateTime(2026, 7, 2, 10 + index),
                ),
            ],
          ),
          candidateOrganizers: candidateOrganizers,
          joinedOrganizerIds: const {},
        );

    for (final eventCount in [1, 2, 3, 4, 7]) {
      expect(
        cardsFor(eventCount).whereType<ExploreMixedOrganizerRowCard>(),
        isEmpty,
      );
    }
    final eightEventCards = cardsFor(8);
    expect(
      eightEventCards.whereType<ExploreMixedOrganizerRowCard>(),
      hasLength(1),
    );
    expect(eightEventCards.last, isA<ExploreMixedOrganizerRowCard>());
    expect(
      eightEventCards.take(8).whereType<ExploreMixedOrganizerRowCard>(),
      isEmpty,
    );
  });

  test('callable context includes only booked or bookable events', () {
    final organizer = organizers.buildOrganizer(id: 'cross-paths-context-club');
    ExploreEventItem item(String id, ViewerEventAvailabilityStatus status) =>
        _item(
          id: id,
          organizer: organizer,
          startTime: DateTime(2026, 8, 8, 18),
          availability: ViewerEventAvailability(
            status: status,
            spotsRemaining: 4,
            isSaved: false,
            isHosted: false,
            isOrganizerMember: false,
          ),
        );

    expect(
      crossPathsExploreEventIds(
        ExploreFeedViewModel(
          items: [
            item('open', ViewerEventAvailabilityStatus.open),
            item('joined', ViewerEventAvailabilityStatus.joined),
            item('waitlist', ViewerEventAvailabilityStatus.waitlistAvailable),
            item('blocked', ViewerEventAvailabilityStatus.membershipRequired),
          ],
        ),
      ),
      ['open', 'joined'],
    );
    final unselected = item('unselected', ViewerEventAvailabilityStatus.open);
    expect(
      crossPathsExploreEventIds(
        ExploreFeedViewModel(
          items: [
            ExploreEventItem(
              event: unselected.event.copyWith(
                crossPathsDiscoveryEnabled: false,
              ),
              organizer: unselected.organizer,
              availability: unselected.availability,
            ),
          ],
        ),
      ),
      isEmpty,
    );
  });

  test('mixed feed stays event-majority and separates people', () {
    final eventOrganizer = organizers.buildOrganizer(
      id: 'cross-paths-event-club',
    );
    final candidateOrganizers = [
      organizers.buildOrganizer(
        id: 'cross-paths-organizer-1',
        nextEventLabel: 'Friday',
      ),
      organizers.buildOrganizer(
        id: 'cross-paths-organizer-2',
        nextEventLabel: 'Saturday',
      ),
    ];
    final starts = [
      for (var index = 0; index < 8; index += 1)
        DateTime(2026, 7, 2, 9 + index),
    ];
    final cards = buildExploreMixedFeedCards(
      viewModel: ExploreFeedViewModel(
        items: [
          for (var index = 0; index < starts.length; index += 1)
            _item(
              id: 'cross-paths-event-$index',
              organizer: eventOrganizer,
              startTime: starts[index],
            ),
        ],
      ),
      candidateOrganizers: candidateOrganizers,
      joinedOrganizerIds: const {},
      crossPathsSuggestions: [
        _suggestion(
          uid: 'person-1',
          eventId: 'cross-paths-event-0',
          startTime: starts[0],
        ),
        _suggestion(
          uid: 'person-2',
          eventId: 'cross-paths-event-3',
          startTime: starts[3],
        ),
      ],
    );

    final firstEight = cards.take(8).toList(growable: false);
    expect(firstEight.whereType<ExploreMixedEventRowCard>(), hasLength(5));
    expect(firstEight.whereType<ExploreMixedPersonCard>(), hasLength(2));
    expect(
      firstEight.whereType<ExploreMixedOrganizerSpotlightCard>(),
      hasLength(1),
    );
    for (var index = 0; index < cards.length - 1; index += 1) {
      final leftIsEvent =
          cards[index] is ExploreMixedEventRowCard ||
          cards[index] is ExploreMixedExternalEventRowCard;
      final rightIsEvent =
          cards[index + 1] is ExploreMixedEventRowCard ||
          cards[index + 1] is ExploreMixedExternalEventRowCard;
      expect(leftIsEvent || rightIsEvent, isTrue);
    }
  });
}
