import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const city = EventSetupCity(cityId: 'in-mh-mumbai', marketId: 'in-mh-mumbai');

  test('first save encodes only the required private basics', () {
    const basics = PrivateEventBasics(
      name: '  Saturday mixer  ',
      city: EventSetupValue.set(city),
      localDate: '2026-09-26',
      localStartTime: '19:00',
      timezone: EventSetupValue.set('Asia/Kolkata'),
    );

    expect(basics.isValid, isTrue);
    expect(basics.toJson(), {
      'name': 'Saturday mixer',
      'city': {
        'mode': 'set',
        'value': {'cityId': 'in-mh-mumbai', 'marketId': 'in-mh-mumbai'},
      },
      'localDate': '2026-09-26',
      'localStartTime': '19:00',
      'timezone': {'mode': 'set', 'value': 'Asia/Kolkata'},
    });
    expect(basics.toJson().keys, isNot(contains('capacity')));
    expect(basics.toJson().keys, isNot(contains('price')));
    expect(basics.toJson().keys, isNot(contains('endTime')));
  });

  test('inherit requires a reviewed defaults hash and clear is invalid', () {
    PrivateEventBasics basics({
      required EventSetupValue<EventSetupCity> cityValue,
      String? hash,
    }) => PrivateEventBasics(
      name: 'Run',
      city: cityValue,
      localDate: '2026-09-26',
      localStartTime: '08:00',
      timezone: const EventSetupValue.set('Asia/Kolkata'),
      reviewedDefaultsHash: hash,
    );

    expect(basics(cityValue: const EventSetupValue.inherit()).isValid, isFalse);
    expect(
      basics(
        cityValue: const EventSetupValue.inherit(),
        hash: 'revision-hash',
      ).isValid,
      isTrue,
    );
    expect(basics(cityValue: const EventSetupValue.clear()).isValid, isFalse);
  });

  test('invalid local calendar date and time never submit', () {
    PrivateEventBasics basics(String date, String time) => PrivateEventBasics(
      name: 'Run',
      city: const EventSetupValue.set(city),
      localDate: date,
      localStartTime: time,
      timezone: const EventSetupValue.set('Asia/Kolkata'),
    );
    expect(basics('2026-02-30', '08:00').isValid, isFalse);
    expect(basics('2026-09-26', '24:00').isValid, isFalse);
    expect(basics('2026-09-26', '08:00').isValid, isTrue);
    expect(basics('1999-12-31', '08:00').isValid, isFalse);
    expect(basics('2101-01-01', '08:00').isValid, isFalse);
  });

  test('first-save name and both structured city ids are required', () {
    PrivateEventBasics basics(String name, String cityId, String marketId) =>
        PrivateEventBasics(
          name: name,
          city: EventSetupValue.set(
            EventSetupCity(cityId: cityId, marketId: marketId),
          ),
          localDate: '2026-09-26',
          localStartTime: '08:00',
          timezone: const EventSetupValue.set('Asia/Kolkata'),
        );
    expect(basics('Run', '', 'in-mh-mumbai').isValid, isFalse);
    expect(basics('Run', 'in-mh-mumbai', '').isValid, isFalse);
    expect(basics('', 'in-mh-mumbai', 'in-mh-mumbai').isValid, isFalse);
    expect(
      basics(
        List.filled(121, 'A').join(),
        'in-mh-mumbai',
        'in-mh-mumbai',
      ).isValid,
      isFalse,
    );
  });

  test('create receipt requires canonical identity and setup revision', () {
    expect(
      () => PrivateEventCreateReceipt.fromResponse({
        'eventId': 'event-1',
        'setupRevision': 0,
      }),
      throwsFormatException,
    );
    final receipt = PrivateEventCreateReceipt.fromResponse({
      'eventId': 'event-1',
      'setupRevision': 1,
      'replayed': true,
    });
    expect(receipt.eventId, 'event-1');
    expect(receipt.replayed, isTrue);
    expect(
      () => PrivateEventCreateReceipt.fromResponse({
        'eventId': 'event-1',
        'setupRevision': 1,
        'replayed': 'false',
      }),
      throwsFormatException,
    );
  });

  test('basics update carries stable event identity and revision', () {
    const basics = PrivateEventBasics(
      name: 'Saturday mixer',
      city: EventSetupValue.set(city),
      localDate: '2026-09-26',
      localStartTime: '19:00',
      timezone: EventSetupValue.set('Asia/Kolkata'),
    );
    const request = PrivateEventBasicsUpdateRequest(
      organizerId: 'club-1',
      eventId: 'event-1',
      requestId: 'update-1',
      expectedSetupRevision: 3,
      basics: basics,
    );
    expect(request.isValid, isTrue);
    expect(request.toJson(), {
      'organizerId': 'club-1',
      'eventId': 'event-1',
      'requestId': 'update-1',
      'expectedSetupRevision': 3,
      'basics': basics.toJson(),
    });
    expect(
      PrivateEventBasicsUpdateRequest.fromJson(request.toJson()).toJson(),
      request.toJson(),
    );
    expect(
      const PrivateEventBasicsUpdateRequest(
        organizerId: 'club-1',
        eventId: 'event-1',
        requestId: 'update-1',
        expectedSetupRevision: 0,
        basics: basics,
      ).isValid,
      isFalse,
    );
  });

  test('manager read decodes only a canonical private basic summary', () {
    final response = <String, Object?>{
      'eventId': 'event-1',
      'organizerId': 'club-1',
      'setupRevision': 3,
      'publicationState': 'private',
      'status': 'active',
      'name': 'Saturday mixer',
      'city': {'cityId': 'in-mh-mumbai', 'marketId': 'in-mh-mumbai'},
      'localDate': '2026-09-26',
      'localStartTime': '19:00',
      'timezone': 'Asia/Kolkata',
      'startTimeMillis': 1790449200000,
      'setupDefaults': <String, Object?>{},
      'detailsConfigured': false,
      'canEditBasics': true,
      'canChangeCity': true,
      'eventDetails': <String, Object?>{
        'endTimeMillis': null,
        'venueName': null,
        'sourceVenueId': null,
        'eventFormat': null,
      },
      'eventPreferences': null,
    };
    final summary = PrivateEventBasicSummary.fromResponse(response);
    expect(summary.eventId, 'event-1');
    expect(summary.setupRevision, 3);
    expect(summary.city.cityId, 'in-mh-mumbai');
    expect(summary.canEditBasics, isTrue);
    expect(summary.canChangeCity, isTrue);
    expect(summary.eventPreferences, isNull);
    expect(summary.eventDetails.endTimeMillis, isNull);
    expect(summary.eventDetails.venueName, isNull);
    expect(
      PrivateEventBasicSummary.fromResponse({
        ...response,
        'publicationState': 'published',
        'canEditBasics': false,
        'canChangeCity': false,
      }).publicationState,
      'published',
    );
    expect(
      () => PrivateEventBasicSummary.fromResponse({
        ...response,
        'eventDetails': {'endTimeMillis': 1},
      }),
      throwsFormatException,
    );
    expect(
      () => PrivateEventBasicSummary.fromResponse({
        ...response,
        'publicationState': 'published',
      }),
      throwsFormatException,
    );
    expect(
      () => PrivateEventBasicSummary.fromResponse({
        ...response,
        'city': {'cityId': 'in-mh-mumbai', 'marketId': ''},
      }),
      throwsFormatException,
    );
    expect(
      PrivateEventBasicSummary.fromResponse({
        ...response,
        'status': 'cancelled',
        'canEditBasics': false,
        'canChangeCity': false,
      }).canEditBasics,
      isFalse,
    );
    for (final flag in ['canEditBasics', 'canChangeCity']) {
      final withoutFlag = {...response}..remove(flag);
      expect(
        () => PrivateEventBasicSummary.fromResponse(withoutFlag),
        throwsFormatException,
      );
    }
    expect(
      () => PrivateEventBasicSummary.fromResponse({
        ...response,
        'canEditBasics': false,
        'canChangeCity': true,
      }),
      throwsFormatException,
    );
  });

  test('organizer defaults hash matches server JSON with legacy nulls', () {
    expect(
      organizerEventDefaultsHash(
        cityId: 'in-mh-mumbai',
        marketId: 'in-mh-mumbai',
        timezone: null,
        revision: null,
      ),
      'c1e0ddad1aa2aeeac7cb177a11b86c0d0364ae8e0ad61687dc3020bd1a3b184d',
    );
    expect(
      organizerEventDefaultsHash(
        cityId: 'in-mh-mumbai',
        marketId: 'in-mh-mumbai',
        timezone: 'Asia/Kolkata',
        revision: 7,
      ),
      '6c9322e3d243ee843d3b9e800d097c0558ac2f4cda9a3ce5bc1c0ae0c627abbb',
    );
  });
}
