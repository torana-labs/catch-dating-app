import 'dart:convert';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_test_support/repo_file.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../events/events_test_helpers.dart' as event_test;

void main() {
  const summary = EventOrganizerSummary(
    name: 'Sandbar Run Club',
    location: 'in-mh-mumbai',
    area: 'Bandra',
    hostName: 'Asha',
    tags: ['running', 'social'],
    rating: 4.6,
    appVisibility: EventOrganizerVisibility.discoverable,
    status: EventOrganizerLifecycle.active,
    archived: false,
  );

  group('Event organizer summary', () {
    test('round-trips through the event document', () {
      final event = event_test.buildEvent().copyWith(organizerSummary: summary);

      final json = event.toJson();
      expect(json['organizerSummary'], {
        'name': 'Sandbar Run Club',
        'location': 'in-mh-mumbai',
        'area': 'Bandra',
        'hostName': 'Asha',
        'tags': ['running', 'social'],
        'rating': 4.6,
        'synthetic': false,
        'appVisibility': 'discoverable',
        'status': 'active',
        'archived': false,
      });
      final decoded = Event.fromJson({...json, 'id': event.id});
      expect(decoded.organizerSummary, summary);
    });

    test('the contract and the model name the same fields', () {
      final schema =
          jsonDecode(
                repoFile(
                  'contracts/embedded/event_organizer_summary.schema.json',
                ).readAsStringSync(),
              )
              as Map<String, dynamic>;
      final fields = (schema['properties'] as Map<String, dynamic>).keys;

      final json = event_test
          .buildEvent()
          .copyWith(organizerSummary: summary)
          .toJson();
      final encoded = json['organizerSummary'] as Map<String, dynamic>;

      expect(encoded.keys.toSet(), fields.toSet());
    });

    test('an event with no summary carries none', () {
      final event = event_test.buildEvent();

      expect(event.organizerSummary, isNull);
      expect(event.toJson().containsKey('organizerSummary'), isFalse);
    });
  });
}
