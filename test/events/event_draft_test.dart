import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('EventDraft', () {
    group('toJson / fromJson', () {
      test('roundtrip preserves all fields', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime(2026, 5, 1, 15, 45),
          distance: '5',
          capacity: '20',
          price: '100',
          description: 'Easy morning event',
          accessibility: 'Step-free entrance',
          included: 'Water and a guide',
          externalBookingMode: true,
          externalBookingProvider: 'eventbrite',
          externalEventUrl: 'https://eventbrite.com/e/123',
          externalEventId: '123',
          runtimeWalkInPolicy: 'hostApproval',
          rosterFileName: 'guest-list.csv',
          rosterFileFingerprint: 'sha256',
          rosterReadyCount: 20,
          activityKind: 'pickleball',
          customActivityLabel: 'Salsa night',
          interactionModel: 'pairedRotations',
          paceName: 'easy',
          routePlan: RouteEventPlan.hostedWalk.toJson(),
          itinerary: const [
            EventItineraryItem(
              id: 'gather',
              kind: EventItineraryKind.gather,
              offsetMinutes: 0,
              title: 'Gather at the gate',
            ),
          ],
          meetingPoint: 'Bandra Fort',
          locationDetails: 'Near the gate',
          startingPointLat: 19.0596,
          startingPointLng: 72.8295,
          selectedDateMillis: DateTime(2026, 5, 15).millisecondsSinceEpoch,
          selectedStartHour: 7,
          selectedStartMinute: 30,
          durationMinutes: 90,
          minAge: '18',
          maxAge: '45',
          maxMen: '10',
          maxWomen: '8',
        );

        final json = draft.toJson();
        final restored = EventDraft.fromJson(json);

        expect(restored.id, 'draft-1');
        expect(restored.clubId, 'club-1');
        expect(restored.savedAt, DateTime(2026, 5, 1, 15, 45));
        expect(restored.distance, '5');
        expect(restored.capacity, '20');
        expect(restored.price, '100');
        expect(restored.description, 'Easy morning event');
        expect(restored.externalBookingMode, isTrue);
        expect(restored.externalBookingProvider, 'eventbrite');
        expect(restored.externalEventUrl, 'https://eventbrite.com/e/123');
        expect(restored.externalEventId, '123');
        expect(restored.runtimeWalkInPolicy, 'hostApproval');
        expect(restored.rosterFileName, 'guest-list.csv');
        expect(restored.rosterFileFingerprint, 'sha256');
        expect(restored.rosterReadyCount, 20);
        expect(restored.activityKind, 'pickleball');
        expect(restored.customActivityLabel, 'Salsa night');
        expect(restored.interactionModel, 'pairedRotations');
        expect(restored.paceName, 'easy');
        expect(
          RouteEventPlan.tryFromJson(restored.routePlan),
          RouteEventPlan.hostedWalk,
        );
        expect(restored.itinerary.single.title, 'Gather at the gate');
        expect(restored.meetingPoint, 'Bandra Fort');
        expect(restored.locationDetails, 'Near the gate');
        expect(restored.startingPointLat, 19.0596);
        expect(restored.startingPointLng, 72.8295);
        expect(
          restored.selectedDateMillis,
          DateTime(2026, 5, 15).millisecondsSinceEpoch,
        );
        expect(restored.selectedStartHour, 7);
        expect(restored.selectedStartMinute, 30);
        expect(restored.durationMinutes, 90);
        expect(restored.minAge, '18');
        expect(restored.maxAge, '45');
        expect(restored.maxMen, '10');
        expect(restored.maxWomen, '8');
      });

      test('roundtrip with only required fields', () {
        final draft = EventDraft(
          id: 'draft-2',
          clubId: 'club-2',
          savedAt: DateTime(2026, 5),
        );

        final json = draft.toJson();
        final restored = EventDraft.fromJson(json);

        expect(restored.id, 'draft-2');
        expect(restored.clubId, 'club-2');
        expect(restored.distance, isNull);
        expect(restored.capacity, isNull);
        expect(restored.price, isNull);
        expect(restored.description, isNull);
        expect(restored.activityKind, isNull);
        expect(restored.paceName, isNull);
        expect(restored.meetingPoint, isNull);
        expect(restored.locationDetails, isNull);
        expect(restored.startingPointLat, isNull);
        expect(restored.startingPointLng, isNull);
        expect(restored.selectedDateMillis, isNull);
        expect(restored.selectedStartHour, isNull);
        expect(restored.selectedStartMinute, isNull);
        expect(restored.durationMinutes, 60);
        expect(restored.minAge, isNull);
        expect(restored.maxAge, isNull);
        expect(restored.maxMen, isNull);
        expect(restored.maxWomen, isNull);
      });

      test('fromJson handles missing fields gracefully', () {
        final restored = EventDraft.fromJson({
          'id': 'draft-3',
          'organizerId': 'club-3',
          'savedAt': '2026-05-01T15:45:00.000',
        });

        expect(restored.id, 'draft-3');
        expect(restored.clubId, 'club-3');
        expect(restored.durationMinutes, 60); // default
        expect(restored.distance, isNull);
      });
    });

    group('isEmpty', () {
      test('returns true when no content fields are set', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
        );
        expect(draft.isEmpty, isTrue);
      });

      test('returns false when at least one field is populated', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          distance: '5',
        );
        expect(draft.isEmpty, isFalse);
      });

      test('returns false when only external roster metadata is set', () {
        final draft = EventDraft(
          id: 'draft-roster',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          externalBookingMode: true,
          rosterFileFingerprint: 'sha256',
        );
        expect(draft.isEmpty, isFalse);
      });

      test('treats the default social run activity as empty', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          activityKind: 'socialRun',
        );
        expect(draft.isEmpty, isTrue);
      });

      test('treats the default social run route plan as empty', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          activityKind: 'socialRun',
          routePlan: RouteEventPlan.socialRun.toJson(),
        );
        expect(draft.isEmpty, isTrue);
      });

      test('returns false when a non-default activity is selected', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          activityKind: 'dinner',
        );
        expect(draft.isEmpty, isFalse);
      });

      test('returns false when a custom event format is set', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          activityKind: 'openActivity',
          customActivityLabel: 'Salsa night',
          interactionModel: 'pairedRotations',
        );
        expect(draft.isEmpty, isFalse);
      });

      test('returns false when route operations are configured', () {
        final draft = EventDraft(
          id: 'draft-route',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          routePlan: RouteEventPlan.socialWalk.toJson(),
        );
        expect(draft.isEmpty, isFalse);
      });

      test('returns false when meetingPoint is populated', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          meetingPoint: 'Park',
        );
        expect(draft.isEmpty, isFalse);
      });

      test('returns false when date is populated', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          selectedDateMillis: 1234567890000,
        );
        expect(draft.isEmpty, isFalse);
      });

      test(
        'returns false when only secondary location or time fields exist',
        () {
          expect(
            EventDraft(
              id: 'draft-1',
              clubId: 'club-1',
              savedAt: DateTime.now(),
              startingPointLng: 72.8,
            ).isEmpty,
            isFalse,
          );
          expect(
            EventDraft(
              id: 'draft-2',
              clubId: 'club-1',
              savedAt: DateTime.now(),
              selectedStartHour: 7,
            ).isEmpty,
            isFalse,
          );
          expect(
            EventDraft(
              id: 'draft-3',
              clubId: 'club-1',
              savedAt: DateTime.now(),
              selectedStartMinute: 30,
            ).isEmpty,
            isFalse,
          );
          expect(
            EventDraft(
              id: 'draft-4',
              clubId: 'club-1',
              savedAt: DateTime.now(),
              durationMinutes: 90,
            ).isEmpty,
            isFalse,
          );
        },
      );
    });

    group('summary', () {
      test('returns "Empty draft" when no content fields are set', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
        );
        expect(draft.summary, 'Empty draft');
      });

      test('includes distance, pace, and meeting point', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          distance: '5',
          paceName: 'easy',
          meetingPoint: 'Bandra Fort',
        );
        expect(draft.summary, '5km easy · Bandra Fort');
      });

      test('includes distance and date', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          distance: '10',
          selectedDateMillis: DateTime(2026, 12, 15).millisecondsSinceEpoch,
        );
        expect(draft.summary, '10km · 15/12');
      });

      test('handles only meeting point', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          meetingPoint: 'Gateway of India',
        );
        expect(draft.summary, 'Gateway of India');
      });

      test('includes non-default activity type', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          activityKind: 'dinner',
        );
        expect(draft.summary, 'Dinner');
      });

      test('prefers custom event format labels', () {
        final draft = EventDraft(
          id: 'draft-1',
          clubId: 'club-1',
          savedAt: DateTime.now(),
          activityKind: 'openActivity',
          customActivityLabel: 'Salsa night',
        );
        expect(draft.summary, 'Salsa night');
      });
    });

    group('list serialization', () {
      test('listToJson / listFromJson roundtrip', () {
        final drafts = [
          EventDraft(
            id: 'draft-1',
            clubId: 'club-1',
            savedAt: DateTime(2026, 5),
            distance: '5',
          ),
          EventDraft(
            id: 'draft-2',
            clubId: 'club-1',
            savedAt: DateTime(2026, 5, 2),
            meetingPoint: 'Park',
          ),
        ];

        final json = EventDraft.listToJson(drafts);
        final restored = EventDraft.listFromJson(json);

        expect(restored.length, 2);
        expect(restored[0].id, 'draft-1');
        expect(restored[0].distance, '5');
        expect(restored[1].id, 'draft-2');
        expect(restored[1].meetingPoint, 'Park');
      });

      test('listFromJson handles malformed JSON gracefully', () {
        expect(
          () => EventDraft.listFromJson('not valid json'),
          throwsA(isA<FormatException>()),
        );
      });
    });
  });
}
