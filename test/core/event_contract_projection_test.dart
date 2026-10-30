import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_content_validation.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/platform/schema_contracts/field_value_validation.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('private request identity bounds follow the callable contract', () {
    PrivateEventDetailsUpdateRequest request(String id) =>
        PrivateEventDetailsUpdateRequest(
          organizerId: 'organizer',
          eventId: id,
          requestId: 'request-1',
          expectedSetupRevision: 1,
          reviewedDefaultsHash: 'a' * 64,
          details: const PrivateEventDetailsPatch(description: 'Details'),
        );
    final max = CatchContractConstraints
        .updatePrivateEventDetailsCallablePayloadEventId
        .maxLength!;
    expect(request('e' * max).isValid, isTrue);
    expect(request('e' * (max + 1)).isValid, isFalse);
    expect(request('').isValid, isFalse);
  });

  test(
    'generated itinerary preserves reserved wire names and nullable fields',
    () {
      const item = EventItineraryItem(
        id: 'break-1',
        kind: EventItineraryKind.breakTime,
        offsetMinutes: 30,
        title: 'Break',
      );
      final json = item.toJson();
      expect(json['kind'], 'break');
      expect(json['durationMinutes'], isNull);
      expect(EventItineraryItem.fromJson(json), item);
      expect(isValidEventItinerary([item]), isTrue);
      expect(
        item.startsAt(DateTime(2026)),
        DateTime(2026).add(const Duration(minutes: 30)),
      );
    },
  );

  test(
    'location normalization and explicit nulls survive schema generation',
    () {
      const location = EventMeetingLocation(
        name: ' Venue ',
        latitude: 12,
        longitude: 77,
      );
      expect(location.normalized().name, 'Venue');
      expect(location.toJson(), {
        'name': ' Venue ',
        'latitude': 12.0,
        'longitude': 77.0,
        'address': null,
        'placeId': null,
        'notes': null,
      });
      expect(isValidEventMeetingLocation(location), isTrue);
      expect(
        isValidEventMeetingLocation(location.copyWith(latitude: double.nan)),
        isFalse,
      );
      expect(
        isValidEventMeetingLocation(location.copyWith(notes: 'a' * 1001)),
        isFalse,
      );
    },
  );

  test(
    'shared itinerary checks reject duplicates, unsorted offsets and nested invalid venues',
    () {
      const item = EventItineraryItem(
        id: 'stop',
        kind: EventItineraryKind.stop,
        offsetMinutes: 30,
        title: 'Stop',
      );
      expect(isValidEventItinerary([item, item]), isFalse);
      expect(
        isValidEventItinerary([
          item,
          item.copyWith(id: 'other', offsetMinutes: 20),
        ]),
        isFalse,
      );
      expect(
        isValidEventItinerary([
          item.copyWith(
            location: const EventMeetingLocation(
              name: 'Venue',
              latitude: 91,
              longitude: 77,
            ),
          ),
        ]),
        isFalse,
      );
      expect(
        const PrivateEventDetailsPatch(itinerary: [], description: '').isValid,
        isTrue,
      );
    },
  );

  test(
    'editor validation uses generated boundaries and Unicode character counts',
    () {
      const description = CatchContractConstraints
          .updatePrivateEventDetailsCallablePayloadDetailsDescription;
      final max = description.maxLength!;
      expect(PrivateEventDetailsPatch(description: '🎉' * max).isValid, isTrue);
      expect(
        PrivateEventDetailsPatch(description: '🎉' * (max + 1)).isValid,
        isFalse,
      );
      const duration = CatchContractConstraints
          .updatePrivateEventDetailsCallablePayloadDetailsDurationMinutesValue;
      expect(acceptsContractValue(duration, duration.minimum!.toInt()), isTrue);
      expect(
        acceptsContractValue(duration, duration.minimum!.toInt() - 1),
        isFalse,
      );
      expect(acceptsContractValue(duration, null, omitted: true), isFalse);
      expect(acceptsContractValue(description, null, omitted: true), isTrue);
      expect(acceptsContractValue(description, null), isFalse);
    },
  );
}
