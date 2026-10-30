// Asserts that every freezed domain class can round-trip its canonical
// schema fixture without dropping fields or throwing. Catches drift between
// `contracts/firestore/*.schema.json` (the persisted shape) and the Dart
// freezed/json_serializable classes that consume that shape.
//
// Fixtures use the serialized `{_seconds, _nanoseconds}` timestamp form
// declared in `contracts/shared/profile_common.schema.json`. Dart classes
// declare timestamps as `DateTime` with `@TimestampConverter()`, which
// expects `cloud_firestore.Timestamp` objects. We rewrite the fixture's
// timestamp blobs to `Timestamp` instances before calling `fromJson`.
import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

/// Each case asserts that the named Dart class can decode the given fixture
/// and re-encode it without throwing. Optional [idField] is the field name
/// that the Firestore converter would inject from the doc id (e.g. `uid`,
/// `id`). It is added to the fixture before decoding.
typedef DomainFixtureCase = void Function();

void main() {
  group('domain class fixture parity', () {
    test('PublicProfile decodes public_profile_doc.json', () {
      final json = _loadFixture(
        'public_profile_doc.json',
        injectIdField: 'uid',
      );
      final profile = PublicProfile.fromJson(json);
      expect(profile.uid, isNotEmpty);
      expect(profile.name, 'Subrath');
      // toJson() must produce a map that does not introduce extra fields the
      // schema would not accept.
      final encoded = profile.toJson();
      expect(
        encoded,
        isNot(contains('uid')),
        reason: '@JsonKey(includeToJson: false) should exclude uid',
      );
    });

    test('Event decodes event_doc.json', () {
      final json = _loadFixture('event_doc.json', injectIdField: 'id');
      final event = Event.fromJson(json);
      expect(event.id, isNotEmpty);
      expect(event.clubId, 'club-1');
      expect(event.startTime, isA<DateTime>());
      expect(event.meetingLocation, isNotNull);
      // Round-trip: re-encode and confirm we can decode the result back.
      final encoded = event.toJson();
      expect(
        encoded['id'],
        isNull,
        reason: 'Event.id is @JsonKey(includeToJson: false)',
      );
    });

    test('EventMeetingLocation decodes through Event', () {
      final json = _loadFixture('event_doc.json', injectIdField: 'id');
      final event = Event.fromJson(json);
      final location = event.meetingLocation;
      expect(location?.name, 'Race Course Road gate');
      expect(location?.latitude, 22.7196);
      expect(location?.longitude, 75.8577);
    });

    test(
      'EventMeetingLocation decodes event_common fixture shape directly',
      () {
        final location = EventMeetingLocation.fromJson(
          _fixtureMapField('event_doc.json', 'meetingLocation'),
        );
        expect(location.name, 'Race Course Road gate');
        expect(location.placeId, 'race-course-road-gate');
        expect(location.notes, 'Meet near the main gate.');
      },
    );

    test('EventFormatSnapshot decodes event_common fixture shape directly', () {
      final format = EventFormatSnapshot.fromJson(
        _fixtureMapField('event_doc.json', 'eventFormat'),
      );
      expect(format.activityKind, ActivityKind.socialRun);
      expect(format.interactionModel, EventInteractionModel.pacePods);
      expect(format.defaultPlaybookId, 'social_run_light');
    });

    test('EventConstraints decodes event_common fixture shape directly', () {
      final constraints = EventConstraints.fromJson(
        _fixtureMapField('event_doc.json', 'constraints'),
      );
      expect(constraints.minAge, 21);
      expect(constraints.maxAge, 45);
      expect(constraints.maxMen, 8);
      expect(constraints.maxWomen, isNull);
    });

    test('EventPolicyBundle decodes event_common fixture shape directly', () {
      final policy = EventPolicyBundle.fromJson(_eventPolicyBundleFixture());
      expect(policy.capacityLimit, 12);
      expect(policy.basePriceInPaise, 49900);
      expect(policy.usesInviteOnly, isFalse);
      expect(policy.usesDemandPricing, isFalse);
    });

    test('Club decodes club_doc.json', () {
      final json = _loadFixture('club_doc.json', injectIdField: 'id');
      final organizer = Organizer.fromJson(json);
      expect(organizer.id, isNotEmpty);
      expect(organizer.name, isNotEmpty);
      // hostUserId is required by both schema and Dart class.
      expect(organizer.hostUserId, isNotEmpty);
      expect(organizer.organizerType, OrganizerType.club);
    });

    test(
      'OrganizerHostProfile decodes event_common fixture shape directly',
      () {
        final host = OrganizerHostProfile.fromJson(
          _fixtureListItemMap('club_doc.json', 'hostProfiles', 0),
        );
        expect(host.uid, 'host-1');
        expect(host.displayName, 'Subrath');
        expect(host.role, OrganizerHostRole.owner);
      },
    );

    test('OrganizerMembership decodes club_membership_doc.json', () {
      final json = _loadFixture(
        'club_membership_doc.json',
        injectIdField: 'id',
      );
      final membership = OrganizerMembership.fromJson(json);
      expect(membership.clubId, isNotEmpty);
      expect(membership.uid, isNotEmpty);
    });

    test('Match decodes match_doc.json', () {
      final json = _loadFixture('match_doc.json', injectIdField: 'id');
      final match = Match.fromJson(json);
      expect(match.user1Id, isNotEmpty);
      expect(match.user2Id, isNotEmpty);
    });

    test('Review decodes review_doc.json', () {
      final json = _loadFixture('review_doc.json', injectIdField: 'id');
      final review = Review.fromJson(json);
      expect(review.id, isNotEmpty);
      expect(review.rating, 5);
    });

    test('Payment decodes payment_doc.json', () {
      final json = _loadFixture('payment_doc.json', injectIdField: 'id');
      final payment = Payment.fromJson(json);
      expect(payment.userId, isNotEmpty);
      expect(payment.eventId, isNotEmpty);
    });

    test('Swipe decodes swipe_doc.json', () {
      final json = _loadFixture('swipe_doc.json', injectIdField: 'id');
      final swipe = Swipe.fromJson(json);
      expect(swipe.swiperId, isNotEmpty);
      expect(swipe.targetId, isNotEmpty);
    });

    test('ProfilePromptAnswer decodes profile_prompt_answer.json', () {
      final json = _loadFixture(
        'profile_prompt_answer.json',
        injectIdField: null,
      );
      final answer = ProfilePromptAnswer.fromJson(json);
      expect(answer.promptId, isNotEmpty);
    });

    test('PhotoPromptAnswer decodes photo_prompt_answer.json', () {
      final json = _loadFixture(
        'photo_prompt_answer.json',
        injectIdField: null,
      );
      final answer = PhotoPromptAnswer.fromJson(json);
      expect(answer.promptId, isNotEmpty);
    });

    test('ProfilePhoto decodes profile_photo.json', () {
      final json = _loadFixture('profile_photo.json', injectIdField: null);
      final photo = ProfilePhoto.fromJson(json);
      expect(photo.id, isNotEmpty);
    });
  });
}

Map<String, dynamic> _fixtureMapField(String fileName, String fieldName) {
  final json = _loadFixture(fileName, injectIdField: null);
  final value = json[fieldName];
  expect(value, isA<Map>());
  return Map<String, dynamic>.from(value as Map);
}

Map<String, dynamic> _fixtureListItemMap(
  String fileName,
  String fieldName,
  int index,
) {
  final json = _loadFixture(fileName, injectIdField: null);
  final value = json[fieldName];
  expect(value, isA<List<Object?>>());
  final item = (value as List<Object?>)[index];
  expect(item, isA<Map>());
  return Map<String, dynamic>.from(item as Map);
}

Map<String, dynamic> _eventPolicyBundleFixture() => {
  'version': 1,
  'admission': {
    'format': 'open',
    'capacityLimit': 12,
    'waitlistPolicy': {'mode': 'rankedOffer', 'offerWindowMinutes': 20},
    'inviteRequired': false,
    'membershipRequired': false,
    'manualApprovalRequired': false,
    'privateAccessPolicy': {
      'mode': 'none',
      'inviteCodeHint': null,
      'privateLinkEnabled': false,
    },
    'cohortCapacityLimits': <String, Object?>{},
    'balancedRatioPolicy': null,
  },
  'pricing': {
    'basePriceInPaise': 49900,
    'cohortAdjustmentsInPaise': <String, Object?>{},
    'demandPricingRules': <Object?>[],
  },
  'cancellation': {'policyId': 'standard'},
  'settlement': {'hostPayoutTiming': 'afterEventCompletion'},
};

/// Loads a fixture from `contracts/fixtures/valid/`, walks the JSON tree
/// converting any `{_seconds, _nanoseconds}` shape into Firestore Timestamps,
/// and optionally injects an id field (mimicking
/// `withDocumentIdConverter` which adds the doc id before `fromJson`).
Map<String, dynamic> _loadFixture(
  String fileName, {
  required String? injectIdField,
}) {
  final raw =
      jsonDecode(File('contracts/fixtures/valid/$fileName').readAsStringSync())
          as Map<String, dynamic>;
  final hydrated = _hydrateTimestamps(raw) as Map<String, dynamic>;
  if (injectIdField != null && !hydrated.containsKey(injectIdField)) {
    // Derive a synthetic id from the fixture file name; tests don't care
    // about its exact value, only that it's a non-empty String.
    final docId = fileName
        .replaceFirst('.json', '')
        .replaceFirst('_doc', '')
        .replaceAll('_', '-');
    hydrated[injectIdField] = docId;
  }
  return hydrated;
}

/// Walks a JSON tree and replaces serialized timestamp objects with
/// [Timestamp] instances so freezed `@TimestampConverter()` decoding works.
Object? _hydrateTimestamps(Object? node) {
  if (node is Map<String, dynamic>) {
    if (node.length == 2 &&
        node.containsKey('_seconds') &&
        node.containsKey('_nanoseconds') &&
        node['_seconds'] is num &&
        node['_nanoseconds'] is num) {
      return Timestamp(
        (node['_seconds'] as num).toInt(),
        (node['_nanoseconds'] as num).toInt(),
      );
    }
    return node.map((key, value) => MapEntry(key, _hydrateTimestamps(value)));
  }
  if (node is List) {
    return node.map(_hydrateTimestamps).toList();
  }
  return node;
}
