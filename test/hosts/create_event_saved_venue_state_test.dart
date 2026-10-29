import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/contexts/events/domain/organizer_event_venue.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_restore_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_location_state.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const venue = OrganizerEventVenue(
    organizerId: 'organizer-1',
    venueId: 'venue-1',
    label: 'Bandstand steps',
    meetingLocation: EventMeetingLocation(
      name: 'Sea-facing gate',
      address: 'Bandra West, Mumbai',
      placeId: 'place-1',
      latitude: 19.046,
      longitude: 72.819,
      notes: 'Meet outside the blue gate.',
    ),
    defaultEventCapacity: 24,
    status: OrganizerEventVenueStatus.active,
  );

  test('saved venue fills exact location and suggests capacity when empty', () {
    final selection = const CreateEventLocationState().selectVenue(
      venue,
      currentCapacityText: '',
    );

    expect(selection.state.sourceVenueId, 'venue-1');
    expect(
      selection.state.startingPoint,
      const LocationCoordinate(19.046, 72.819),
    );
    expect(selection.state.meetingLocationAddress, 'Bandra West, Mumbai');
    expect(selection.state.meetingLocationPlaceId, 'place-1');
    expect(selection.meetingPointText, 'Sea-facing gate');
    expect(selection.locationDetailsText, 'Meet outside the blue gate.');
    expect(selection.suggestedCapacityText, '24');
  });

  test('saved venue never overwrites an existing draft capacity', () {
    final selection = const CreateEventLocationState().selectVenue(
      venue,
      currentCapacityText: '18',
    );

    expect(selection.suggestedCapacityText, isNull);
  });

  test('moving the map pin clears saved venue provenance', () {
    final selected = const CreateEventLocationState().selectVenue(
      venue,
      currentCapacityText: '',
    );
    final moved = selected.state.selectLocation(
      coordinate: const LocationCoordinate(19.05, 72.82),
      displayName: 'New pin',
      address: 'New address',
      placeId: 'place-2',
    );

    expect(moved.state.sourceVenueId, isNull);
    expect(moved.state.meetingLocationPlaceId, 'place-2');
  });

  test('event-specific name and directions remain editable snapshots', () {
    final selected = const CreateEventLocationState().selectVenue(
      venue,
      currentCapacityText: '',
    );
    final location = selected.state.meetingLocation(
      meetingPoint: 'North entrance',
      notes: 'Ask for the Catch host.',
    );

    expect(location?.name, 'North entrance');
    expect(location?.notes, 'Ask for the Catch host.');
    expect(location?.placeId, 'place-1');
    expect(selected.state.sourceVenueId, 'venue-1');
  });

  test('draft restore preserves saved venue provenance and exact location', () {
    final restored = CreateEventDraftRestoreState.fromDraft(
      EventDraft(
        id: 'draft-1',
        clubId: 'organizer-1',
        savedAt: DateTime(2026, 8, 29),
        meetingPoint: 'Sea-facing gate',
        meetingLocationAddress: 'Bandra West, Mumbai',
        meetingLocationPlaceId: 'place-1',
        sourceVenueId: 'venue-1',
        startingPointLat: 19.046,
        startingPointLng: 72.819,
      ),
      now: DateTime(2026, 8, 29),
    );

    expect(restored.locationState.sourceVenueId, 'venue-1');
    expect(restored.locationState.meetingLocationPlaceId, 'place-1');
    expect(
      restored.locationState.startingPoint,
      const LocationCoordinate(19.046, 72.819),
    );
  });
}
