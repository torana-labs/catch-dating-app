import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_viewer_state_fixtures.dart';
import 'events_test_helpers.dart';

part 'event_repository_fixtures.dart';

void main() {
  group('EventRepository', () {
    late FakeFirebaseFirestore firestore;
    late TestFirebaseFunctions functions;
    late EventRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      functions = TestFirebaseFunctions();
      repository = EventRepository(firestore, functions);
    });

    test(
      'viewer read sends event, source-bound hints and the membership opt-in',
      () async {
        final callable =
            functions.httpsCallable('getEventViewerState') as TestHttpsCallable;
        callable.resultData = viewerResponse();
        final viewer = await repository.fetchViewerState(
          eventId: 'event-1',
          inviteCode: 'confirmed-invite',
          publicPaymentId: 'owned-payment',
        );
        expect(viewer.eventId, 'event-1');
        expect(callable.calls, [
          {
            'eventId': 'event-1',
            'inviteCode': 'confirmed-invite',
            'publicPaymentId': 'owned-payment',
            'includeHostMembership': true,
          },
        ]);
        expect((await firestore.collection('events').get()).docs, isEmpty);
      },
    );

    test(
      'a foreign event response cannot authorize the requested event',
      () async {
        final callable =
            functions.httpsCallable('getEventViewerState') as TestHttpsCallable;
        callable.resultData = viewerResponse(eventId: 'foreign-event');
        await expectLater(
          repository.fetchViewerState(eventId: 'event-1'),
          throwsA(
            isA<AppException>().having(
              (error) => error.cause,
              'cause',
              isA<FormatException>(),
            ),
          ),
        );
      },
    );

    test('private extra fields fail the callable response boundary', () async {
      final callable =
          functions.httpsCallable('getEventViewerState') as TestHttpsCallable;
      final response = viewerResponse();
      (response['viewer']! as Map<String, Object?>)['phoneNumber'] = 'private';
      callable.resultData = response;
      await expectLater(
        repository.fetchViewerState(eventId: 'event-1'),
        throwsA(
          isA<AppException>().having(
            (error) => error.cause,
            'cause',
            isA<FormatException>(),
          ),
        ),
      );
    });

    test('generateId uses an auto-generated document reference', () async {
      final generatedId = repository.generateId();

      expect(generatedId, isNotEmpty);
      final generatedDoc = await firestore
          .collection('events')
          .doc(generatedId)
          .get();
      expect(generatedDoc.exists, isFalse);
    });

    test('generateBroadcastRequestId does not write a receipt', () async {
      final requestId = repository.generateBroadcastRequestId();

      expect(requestId, isNotEmpty);
      expect(
        (await firestore
                .collection('eventBroadcastRequests')
                .doc(requestId)
                .get())
            .exists,
        isFalse,
      );
    });

    test(
      'converter round-trips Firestore data and injects the document id',
      () async {
        final rawEvent = buildEvent(
          id: 'event-88',
          constraints: const EventConstraints(minAge: 21, maxWomen: 6),
        );

        await _seedEvent(firestore, rawEvent);

        final decoded = await repository.fetchEvent(rawEvent.id);
        final encoded =
            (await firestore.collection('events').doc(rawEvent.id).get())
                .data()!;

        expect(decoded?.id, 'event-88');
        expect(decoded?.meetingPoint, 'Carter Road');
        expect(encoded.containsKey('id'), isFalse);
        expect(encoded['organizerId'], 'club-1');
        expect(encoded.containsKey('organizerId'), isFalse);
        expect(encoded['constraints'], {
          'minAge': 21,
          'maxAge': 99,
          'maxMen': null,
          'maxWomen': 6,
        });
        expect(decoded?.constraints, rawEvent.constraints);
      },
    );

    test('fetchEvent returns the decoded event when found', () async {
      final event = buildEvent();
      await _seedEvent(firestore, event);

      expect(await repository.fetchEvent('event-1'), event);
    });

    test('fetchEvent returns null when the document is missing', () async {
      expect(await repository.fetchEvent('event-missing'), isNull);
    });

    test(
      'watchEvent emits the decoded event when the document exists',
      () async {
        final event = buildEvent();
        await _seedEvent(firestore, event);

        await expectLater(repository.watchEvent('event-1'), emits(event));
      },
    );

    test('watchEvent emits null when the document is missing', () async {
      await expectLater(repository.watchEvent('event-missing'), emits(null));
    });

    test('direct public reads reject private and incomplete events', () async {
      await firestore.collection('events').doc('private-basics').set({
        'organizerId': 'club-1',
        'publicationState': 'private',
        'status': 'active',
        'startTime': Timestamp.fromDate(DateTime(2026, 10)),
      });
      await firestore.collection('events').doc('incomplete-public').set({
        'organizerId': 'club-1',
        'publicationState': 'published',
        'status': 'active',
        'startTime': Timestamp.fromDate(DateTime(2026, 10, 2)),
      });

      expect(await repository.fetchEvent('private-basics'), isNull);
      expect(await repository.fetchEvent('incomplete-public'), isNull);
      await expectLater(repository.watchEvent('private-basics'), emits(null));
      await expectLater(
        repository.watchEvent('incomplete-public'),
        emits(null),
      );
    });

    test(
      'watchEventsForOrganizer filters by club id and orders by start time',
      () async {
        final later = buildEvent(
          id: 'later',
          clubId: 'club-2',
          startTime: DateTime.now().add(const Duration(hours: 5)),
        );
        final earlier = buildEvent(
          id: 'earlier',
          clubId: 'club-2',
          startTime: DateTime.now().add(const Duration(hours: 2)),
        );
        await _seedEvent(firestore, later);
        await _seedEvent(firestore, earlier);
        await _seedEvent(
          firestore,
          buildEvent(id: 'other-club', clubId: 'club-3'),
        );

        await expectLater(
          repository.watchEventsForOrganizer(clubId: 'club-2'),
          emits([earlier, later]),
        );
      },
    );

    test('watchEventsForOrganizer excludes synthetic QA events', () async {
      final real = buildEvent(id: 'real', clubId: 'club-2');
      final synthetic = buildEvent(
        id: 'synthetic',
        clubId: 'club-2',
        synthetic: true,
        seedPrefix: 'cross_paths_mumbai_qa',
      );
      await _seedEvent(firestore, real);
      await _seedEvent(firestore, synthetic);
      await firestore.collection('events').doc(synthetic.id).update({
        'synthetic': true,
        'seedPrefix': 'cross_paths_mumbai_qa',
      });

      await expectLater(
        repository.watchEventsForOrganizer(clubId: 'club-2'),
        emits([real]),
      );
    });

    test(
      'public organizer queries exclude unlabelled and private events',
      () async {
        final published = buildEvent(id: 'public', clubId: 'club-2');
        final legacy = buildEvent(id: 'legacy', clubId: 'club-2');
        await _seedEvent(firestore, published);
        await firestore
            .collection('events')
            .doc(legacy.id)
            .set(legacy.toJson());
        await firestore.collection('events').doc('private-basics').set({
          'organizerId': 'club-2',
          'publicationState': 'private',
          'startTime': Timestamp.fromDate(published.startTime),
        });

        await expectLater(
          repository.watchEventsForOrganizer(clubId: 'club-2'),
          emits([published]),
        );
        await expectLater(
          repository.watchEventsForOrganizers(organizerIds: const ['club-2']),
          emits([published]),
        );
        expect(
          await repository.fetchUpcomingEventsForOrganizers(const ['club-2']),
          [published],
        );
      },
    );

    test('unlabelled rows do not consume published page positions', () async {
      final boundary = DateTime(2026, 8, 18, 12);
      final legacy = buildEvent(
        id: 'legacy-first',
        clubId: 'club-2',
        startTime: boundary.add(const Duration(hours: 1)),
        endTime: boundary.add(const Duration(hours: 2)),
      );
      final published = buildEvent(
        id: 'published-second',
        clubId: 'club-2',
        startTime: boundary.add(const Duration(hours: 3)),
        endTime: boundary.add(const Duration(hours: 4)),
      );
      await firestore.collection('events').doc(legacy.id).set(legacy.toJson());
      await _seedEvent(firestore, published);

      final page = await repository.fetchActiveEventsPage(
        organizerId: 'club-2',
        sessionBoundary: boundary,
        limit: 1,
      );
      expect(page.items, [published]);
      expect(page.hasMore, isFalse);
    });

    test(
      'organizer event timeline pages active and past independently',
      () async {
        final boundary = DateTime(2026, 8, 18, 12);
        final next = buildEvent(
          id: 'next',
          clubId: 'club-2',
          startTime: boundary.add(const Duration(hours: 1)),
          endTime: boundary.add(const Duration(hours: 2)),
        );
        final later = buildEvent(
          id: 'later',
          clubId: 'club-2',
          startTime: boundary.add(const Duration(days: 1)),
          endTime: boundary.add(const Duration(days: 1, hours: 1)),
        );
        final cancelledSoon = buildEvent(
          id: 'cancelled-soon',
          clubId: 'club-2',
          startTime: boundary.add(const Duration(hours: 2)),
          endTime: boundary.add(const Duration(hours: 3)),
        ).copyWith(status: EventLifecycleStatus.cancelled);
        final recentPast = buildEvent(
          id: 'recent-past',
          clubId: 'club-2',
          startTime: boundary.subtract(const Duration(hours: 2)),
          endTime: boundary.subtract(const Duration(hours: 1)),
        );
        final cancelledPast = buildEvent(
          id: 'cancelled-past',
          clubId: 'club-2',
          startTime: boundary.subtract(const Duration(minutes: 45)),
          endTime: boundary.subtract(const Duration(minutes: 15)),
        ).copyWith(status: EventLifecycleStatus.cancelled);
        final olderPast = buildEvent(
          id: 'older-past',
          clubId: 'club-2',
          startTime: boundary.subtract(const Duration(days: 2)),
          endTime: boundary.subtract(const Duration(days: 2, hours: -1)),
        );
        for (final event in [
          later,
          olderPast,
          next,
          recentPast,
          cancelledSoon,
          cancelledPast,
        ]) {
          await _seedEvent(firestore, event);
        }

        final activeFirst = await repository.fetchActiveEventsPage(
          organizerId: 'club-2',
          sessionBoundary: boundary,
          limit: 1,
        );
        expect(activeFirst.items, [next]);
        expect(activeFirst.hasMore, isTrue);
        final activeSecond = await repository.fetchActiveEventsPage(
          organizerId: 'club-2',
          sessionBoundary: boundary,
          startAfter: activeFirst.nextCursor,
          limit: 1,
        );
        expect(activeSecond.items, [later]);
        expect(activeSecond.hasMore, isFalse);

        final pastFirst = await repository.fetchPastEventsPage(
          organizerId: 'club-2',
          sessionBoundary: boundary,
          limit: 1,
        );
        expect(pastFirst.items, [recentPast]);
        expect(pastFirst.hasMore, isTrue);
        final pastSecond = await repository.fetchPastEventsPage(
          organizerId: 'club-2',
          sessionBoundary: boundary,
          startAfter: pastFirst.nextCursor,
          limit: 1,
        );
        expect(pastSecond.items, [olderPast]);
        expect(pastSecond.hasMore, isFalse);
      },
    );

    test(
      'watchEventsForOrganizers merges hosted clubs in start-time order',
      () async {
        final later = buildEvent(
          id: 'later',
          clubId: 'club-2',
          startTime: DateTime(2026, 7, 10, 20),
        );
        final earlier = buildEvent(
          id: 'earlier',
          startTime: DateTime(2026, 7, 10, 18),
        );
        await _seedEvent(firestore, later);
        await _seedEvent(firestore, earlier);
        await _seedEvent(firestore, buildEvent(id: 'other', clubId: 'club-3'));

        await expectLater(
          repository.watchEventsForOrganizers(
            organizerIds: const ['club-2', 'club-1'],
          ),
          emits([earlier, later]),
        );
      },
    );

    test('sendEventBroadcast uses typed payload and response', () async {
      final callable =
          functions.httpsCallable('sendEventBroadcast') as TestHttpsCallable;
      callable.resultData = {
        'broadcastId': 'broadcast-1',
        'status': 'partial',
        'recipientCount': 3,
        'excludedCount': 1,
        'activityAvailableCount': 3,
        'pushAttemptedCount': 2,
        'pushAcceptedCount': 1,
        'pushFailedCount': 1,
        'pushUnknownCount': 0,
        'idempotentReplay': false,
      };

      final response = await repository.sendEventBroadcast(
        requestId: 'request-1',
        eventId: 'event-1',
        audience: EventBroadcastAudience.booked,
        body: 'Doors open at 7:45.',
      );

      expect(callable.calls, [
        {
          'requestId': 'request-1',
          'eventId': 'event-1',
          'audience': 'booked',
          'body': 'Doors open at 7:45.',
        },
      ]);
      expect(response.broadcastId, 'broadcast-1');
      expect(response.isPartial, isTrue);
      expect(response.recipientCount, 3);
      expect(response.pushFailedCount, 1);
    });

    test(
      'watchAttendedEvents filters by attendee id and sorts descending',
      () async {
        final older = buildEvent(
          id: 'older',
          startTime: DateTime.now().subtract(const Duration(days: 2)),
        );
        final newer = buildEvent(
          id: 'newer',
          startTime: DateTime.now().subtract(const Duration(days: 1)),
        );
        await _seedEvent(firestore, older);
        await _seedEvent(firestore, newer);
        await _seedEvent(firestore, buildEvent(id: 'not-attended'));
        await _seedParticipation(
          firestore,
          event: older,
          uid: 'runner-1',
          status: EventParticipationStatus.attended,
        );
        await _seedParticipation(
          firestore,
          event: newer,
          uid: 'runner-1',
          status: EventParticipationStatus.attended,
        );
        await _seedParticipation(
          firestore,
          event: buildEvent(id: 'not-attended'),
          uid: 'runner-1',
          status: EventParticipationStatus.signedUp,
        );

        await expectLater(
          BookedEventsRepository(
            firestore,
            repository,
          ).watchAttendedEvents(uid: 'runner-1'),
          emits([newer, older]),
        );
      },
    );

    test(
      'watchSignedUpEvents filters by signup id and sorts ascending',
      () async {
        final later = buildEvent(
          id: 'later',
          startTime: DateTime.now().add(const Duration(hours: 5)),
        );
        final earlier = buildEvent(
          id: 'earlier',
          startTime: DateTime.now().add(const Duration(hours: 2)),
        );
        await _seedEvent(firestore, later);
        await _seedEvent(firestore, earlier);
        await _seedEvent(firestore, buildEvent(id: 'not-signed-up'));
        await _seedParticipation(
          firestore,
          event: later,
          uid: 'runner-1',
          status: EventParticipationStatus.signedUp,
        );
        await _seedParticipation(
          firestore,
          event: earlier,
          uid: 'runner-1',
          status: EventParticipationStatus.signedUp,
        );
        await _seedParticipation(
          firestore,
          event: buildEvent(id: 'not-signed-up'),
          uid: 'runner-1',
          status: EventParticipationStatus.waitlisted,
        );

        await expectLater(
          BookedEventsRepository(
            firestore,
            repository,
          ).watchSignedUpEvents(uid: 'runner-1'),
          emits([earlier, later]),
        );
      },
    );

    test('watchEventsByIds chunks ids, skips missing, and sorts', () async {
      final late = buildEvent(
        id: 'event-12',
        startTime: DateTime.now().add(const Duration(hours: 12)),
      );
      final early = buildEvent(
        startTime: DateTime.now().add(const Duration(hours: 1)),
      );
      await _seedEvent(firestore, late);
      await _seedEvent(firestore, early);
      await _seedEvent(firestore, buildEvent(id: 'not-requested'));

      await expectLater(
        repository.watchEventsByIds(
          eventIds: [for (var i = 1; i <= 12; i += 1) 'event-$i'],
        ),
        emits([early, late]),
      );
    });

    test(
      'fetchUpcomingEventsForOrganizers returns empty without querying for no clubs',
      () async {
        await _seedEvent(firestore, buildEvent());
        expect(
          await repository.fetchUpcomingEventsForOrganizers(const []),
          isEmpty,
        );
      },
    );

    test(
      'fetchUpcomingEventsForOrganizers filters upcoming events and limits results',
      () async {
        final event = buildEvent(clubId: 'club-3');
        await _seedEvent(firestore, event);
        await _seedEvent(
          firestore,
          buildEvent(
            id: 'past',
            clubId: 'club-3',
            startTime: DateTime.now().subtract(const Duration(hours: 2)),
          ),
        );
        await _seedEvent(
          firestore,
          buildEvent(id: 'other-club', clubId: 'club-11'),
        );

        final results = await repository.fetchUpcomingEventsForOrganizers(
          const ['club-1', 'club-2', 'club-3'],
        );

        expect(results, [event]);
      },
    );

    test(
      'fetchUpcomingEventsForOrganizers queries beyond the whereIn club cap',
      () async {
        final early = buildEvent(
          id: 'early',
          startTime: DateTime.now().add(const Duration(hours: 2)),
        );
        final late = buildEvent(
          id: 'late',
          clubId: 'club-12',
          startTime: DateTime.now().add(const Duration(hours: 4)),
        );
        await _seedEvent(firestore, early);
        await _seedEvent(firestore, late);

        final results = await repository.fetchUpcomingEventsForOrganizers([
          for (var i = 1; i <= 12; i += 1) 'club-$i',
        ]);

        expect(results, [early, late]);
      },
    );

    test(
      'createEvent calls the server-owned createEvent Cloud Function',
      () async {
        final event = buildEvent(
          id: 'event-42',
          name: 'Bandra Sunrise 5K',
          startingPointLat: 19.076,
          startingPointLng: 72.8777,
          photoUrl: 'https://img.example/events/event-42.jpg',
          constraints: const EventConstraints(minAge: 21, maxAge: 35),
        );
        final meetingLocation = event.effectiveMeetingLocation;

        await repository.createEvent(event: event);

        expect(functions.callables['createEvent']!.calls, [
          {
            'eventId': 'event-42',
            'name': event.name,
            'organizerId': event.clubId,
            'organizerId': event.organizerId,
            'startTimeMillis': event.startTime.millisecondsSinceEpoch,
            'endTimeMillis': event.endTime.millisecondsSinceEpoch,
            'meetingPoint': event.meetingPoint,
            'meetingLocation': meetingLocation!.toJson(),
            'startingPointLat': event.startingPointLat,
            'startingPointLng': event.startingPointLng,
            'itinerary': const <Object?>[],
            'photoUrl': event.photoUrl,
            'eventFormat': event.eventFormat.toJson(),
            'distanceKm': event.distanceKm,
            'pace': event.pace.name,
            'description': event.description,
            'capacityLimit': event.capacityLimit,
            'priceInPaise': event.priceInPaise,
            'currency': event.currency,
            'constraints': {
              'minAge': 21,
              'maxAge': 35,
              'maxMen': null,
              'maxWomen': null,
            },
          },
        ]);
      },
    );

    test(
      'updateEventDetails calls the server-owned updateEvent Cloud Function',
      () async {
        final event = buildEvent(
          id: 'event-42',
          name: 'Bandra Sunrise 5K',
          startingPointLat: 19.076,
          startingPointLng: 72.8777,
          photoUrl: 'https://img.example/events/event-42.jpg',
        );
        final meetingLocation = event.effectiveMeetingLocation;

        await repository.updateEventDetails(event: event);

        expect(functions.callables['updateEvent']!.calls, [
          {
            'eventId': 'event-42',
            'fields': {
              'name': event.name,
              'startTimeMillis': event.startTime.millisecondsSinceEpoch,
              'endTimeMillis': event.endTime.millisecondsSinceEpoch,
              'meetingPoint': event.meetingPoint,
              'meetingLocation': meetingLocation!.toJson(),
              'startingPointLat': event.startingPointLat,
              'startingPointLng': event.startingPointLng,
              'locationDetails': event.locationDetails,
              'itinerary': const <Object?>[],
              'photoUrl': event.photoUrl,
              'distanceKm': event.distanceKm,
              'pace': event.pace.name,
              'description': event.description,
              'eventFormat': event.eventFormat.toJson(),
            },
          },
        ]);
      },
    );

    test(
      'cancelEvent calls the server-owned cancelEvent Cloud Function',
      () async {
        await repository.cancelEvent(
          eventId: 'event-42',
          reason: 'Weather warning',
        );

        expect(functions.callables['cancelEvent']!.calls, [
          {'eventId': 'event-42', 'reason': 'Weather warning'},
        ]);
      },
    );

    test('cancelEvent omits a missing reason', () async {
      await repository.cancelEvent(eventId: 'event-42');

      expect(functions.callables['cancelEvent']!.calls, [
        {'eventId': 'event-42'},
      ]);
    });

    test(
      'deleteEvent calls the server-owned deleteEvent Cloud Function',
      () async {
        await repository.deleteEvent(eventId: 'event-42');

        expect(functions.callables['deleteEvent']!.calls, [
          {'eventId': 'event-42'},
        ]);
      },
    );

    test('joinWaitlistViaFunction calls the matching Cloud Function', () async {
      await repository.joinWaitlistViaFunction(
        eventId: 'event-1',
        inviteCode: 'CATCH-DELHI',
        inviteLinkId: 'invite-link-1',
      );

      expect(functions.callables['joinEventWaitlist']!.calls, [
        {
          'eventId': 'event-1',
          'inviteCode': 'CATCH-DELHI',
          'inviteLinkId': 'invite-link-1',
        },
      ]);
    });

    test('createInviteLink calls the matching Cloud Function', () async {
      (functions.httpsCallable('createEventInviteLink') as TestHttpsCallable)
          .resultData = {
        'inviteLinkId': 'invite-link-1',
        'inviteToken': 'v2_invite-link-1_test-token',
        'eventId': 'event-1',
        'label': 'Instagram bio',
        'source': 'instagram',
      };

      final result = await repository.createInviteLink(
        eventId: 'event-1',
        label: 'Instagram bio',
        source: 'instagram',
      );

      expect(functions.callables['createEventInviteLink']!.calls, [
        {'eventId': 'event-1', 'label': 'Instagram bio', 'source': 'instagram'},
      ]);
      expect(result.inviteLinkId, 'invite-link-1');
      expect(result.inviteToken, 'v2_invite-link-1_test-token');
      expect(result.label, 'Instagram bio');
    });

    test('creates an attributable attendee link and share intent', () async {
      (functions.httpsCallable('createAttendeeInviteLink') as TestHttpsCallable)
          .resultData = {
        'inviteLinkId': 'attendee-link-1',
        'inviteToken': 'v2_attendee-link-1_test-token',
        'eventId': 'event-1',
        'label': 'Attendee share',
        'source': 'consumer_app',
      };

      final result = await repository.createAttendeeInviteLink(
        eventId: 'event-1',
        label: 'Attendee share',
        source: 'consumer_app',
        destinationKind: 'externalBooking',
      );
      await repository.recordShareIntent(
        eventId: 'event-1',
        inviteLinkId: result.inviteLinkId,
        surface: 'consumerApp',
        creativeId: 'event-share-card',
        channelHint: 'systemShare',
      );

      expect(functions.callables['createAttendeeInviteLink']!.calls, [
        {
          'eventId': 'event-1',
          'label': 'Attendee share',
          'source': 'consumer_app',
          'linkKind': 'attendeeReferrer',
          'destinationKind': 'externalBooking',
        },
      ]);
      expect(functions.callables['recordEventShareIntent']!.calls, [
        {
          'eventId': 'event-1',
          'inviteLinkId': 'attendee-link-1',
          'surface': 'consumerApp',
          'creativeId': 'event-share-card',
          'channelHint': 'systemShare',
        },
      ]);
      expect(result.inviteToken, 'v2_attendee-link-1_test-token');
    });

    test('recordInviteLinkOpen calls the matching Cloud Function', () async {
      (functions.httpsCallable('recordEventInviteLinkOpen')
              as TestHttpsCallable)
          .resultData = {
        'accepted': true,
        'disabled': false,
        'eventId': 'event-1',
        'inviteLinkId': 'invite-link-1',
        'label': 'Instagram bio',
        'source': 'instagram',
      };

      final result = await repository.recordInviteLinkOpen(
        eventId: 'event-1',
        inviteLinkId: 'invite-link-1',
      );

      expect(functions.callables['recordEventInviteLinkOpen']!.calls, [
        {'eventId': 'event-1', 'inviteLinkId': 'invite-link-1'},
      ]);
      expect(result.accepted, isTrue);
      expect(result.source, 'instagram');
    });

    test('disableInviteLink calls the matching Cloud Function', () async {
      await repository.disableInviteLink(
        eventId: 'event-1',
        inviteLinkId: 'invite-link-1',
      );

      expect(functions.callables['disableEventInviteLink']!.calls, [
        {'eventId': 'event-1', 'inviteLinkId': 'invite-link-1'},
      ]);
    });

    test('leaveWaitlist calls the matching Cloud Function', () async {
      await repository.leaveWaitlist(eventId: 'event-1');

      expect(functions.callables['leaveEventWaitlist']!.calls, [
        {'eventId': 'event-1'},
      ]);
    });

    test('createWaitlistOffers calls the matching Cloud Function', () async {
      (functions.httpsCallable('createEventWaitlistOffers')
              as TestHttpsCallable)
          .resultData = {
        'createdCount': 2,
        'skippedCount': 1,
        'offers': [
          {
            'uid': 'runner-1',
            'status': 'created',
            'expiresAtMillis': 1767220200000,
          },
          {'uid': 'runner-3', 'status': 'skipped', 'reason': 'capacity_full'},
        ],
      };

      final result = await repository.createWaitlistOffers(
        eventId: 'event-1',
        userIds: ['runner-1', 'runner-2', 'runner-3'],
        expiresInMinutes: 45,
      );

      expect(functions.callables['createEventWaitlistOffers']!.calls, [
        {
          'eventId': 'event-1',
          'userIds': ['runner-1', 'runner-2', 'runner-3'],
          'expiresInMinutes': 45,
        },
      ]);
      expect(result.createdCount, 2);
      expect(result.skippedCount, 1);
      expect(result.offers.first.uid, 'runner-1');
      expect(result.offers.first.status, 'created');
      expect(result.offers.first.expiresAtMillis, 1767220200000);
      expect(result.offers.last.reason, 'capacity_full');
    });

    test('acceptWaitlistOffer calls the matching Cloud Function', () async {
      (functions.httpsCallable('acceptEventWaitlistOffer') as TestHttpsCallable)
          .resultData = {
        'accepted': true,
        'requiresPayment': true,
        'booked': false,
      };

      final result = await repository.acceptWaitlistOffer(eventId: 'event-1');

      expect(functions.callables['acceptEventWaitlistOffer']!.calls, [
        {'eventId': 'event-1'},
      ]);
      expect(result.accepted, isTrue);
      expect(result.requiresPayment, isTrue);
      expect(result.booked, isFalse);
    });

    test('declineWaitlistOffer calls the matching Cloud Function', () async {
      await repository.declineWaitlistOffer(eventId: 'event-1');

      expect(functions.callables['declineEventWaitlistOffer']!.calls, [
        {'eventId': 'event-1'},
      ]);
    });

    test('decideJoinRequest calls the matching Cloud Function', () async {
      await repository.decideJoinRequest(
        eventId: 'event-9',
        userId: 'runner-2',
        decision: 'approve',
      );

      expect(functions.callables['decideEventJoinRequest']!.calls, [
        {'eventId': 'event-9', 'userId': 'runner-2', 'decision': 'approve'},
      ]);
    });

    test('cancelSignUpViaFunction calls the matching Cloud Function', () async {
      await repository.cancelSignUpViaFunction(eventId: 'event-9');

      expect(functions.callables['cancelEventSignUp']!.calls, [
        {'eventId': 'event-9'},
      ]);
    });

    test('markAttendance calls the matching Cloud Function', () async {
      (functions.httpsCallable('markEventAttendance') as TestHttpsCallable)
          .resultData = {
        'attended': true,
      };
      final result = await repository.markAttendance(
        eventId: 'event-9',
        userId: 'user-1',
      );

      expect(result, true);
      expect(functions.callables['markEventAttendance']!.calls, [
        {'eventId': 'event-9', 'userId': 'user-1'},
      ]);
    });

    test('selfCheckInAttendance calls the matching Cloud Function', () async {
      await repository.selfCheckInAttendance(
        eventId: 'event-9',
        venueSessionToken: 'signed-live-session',
      );

      expect(functions.callables['selfCheckInAttendance']!.calls, [
        {'eventId': 'event-9', 'venueSessionToken': 'signed-live-session'},
      ]);
    });

    test('createVenueSession parses the signed Host session', () async {
      (functions.httpsCallable('createEventVenueSession') as TestHttpsCallable)
          .resultData = {
        'eventId': 'event-9',
        'venueSessionToken': 'signed-live-session',
        'expiresAtMillis': 2000,
        'refreshAfterMillis': 1000,
      };
      final session = await repository.createVenueSession(eventId: 'event-9');

      expect(session.venueSessionToken, 'signed-live-session');
      expect(functions.callables['createEventVenueSession']!.calls, [
        {'eventId': 'event-9'},
      ]);
    });
  });

  group('EventRepository providers', () {
    late FakeFirebaseFirestore firestore;
    late TestFirebaseFunctions functions;
    late ProviderContainer container;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      functions = TestFirebaseFunctions();
      container = ProviderContainer(
        overrides: [
          firebaseFirestoreProvider.overrideWithValue(firestore),
          firebaseFunctionsProvider.overrideWithValue(functions),
        ],
      );
    });

    tearDown(() => container.dispose());

    test(
      'eventRepositoryProvider builds a repository from Firebase providers',
      () {
        expect(container.read(eventRepositoryProvider), isA<EventRepository>());
      },
    );

    test('watchEventProvider delegates to the repository', () async {
      final event = buildEvent();
      await _seedEvent(firestore, event);

      final provider = watchEventProvider(event.id);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);

      final value = await container.read(provider.future);

      expect(value, event);
    });

    test(
      'watchEventProvider auto-disposes detail listeners when unwatched',
      () async {
        final event = buildEvent();
        final cancelCompleter = Completer<void>();
        final eventController = StreamController<Event?>(
          onCancel: () {
            if (!cancelCompleter.isCompleted) cancelCompleter.complete();
          },
        );
        addTearDown(() async {
          if (!cancelCompleter.isCompleted) await eventController.close();
        });

        final container = ProviderContainer(
          overrides: [
            eventRepositoryProvider.overrideWith(
              (ref) => _LifecycleEventRepository(
                eventStream: eventController.stream,
              ),
            ),
          ],
        );
        addTearDown(container.dispose);

        final provider = watchEventProvider(event.id);
        final subscription = container.listen(provider, (_, _) {});

        eventController.add(event);
        await container.pump();
        expect(subscription.read().value, event);

        subscription.close();
        await container.pump();

        await expectLater(cancelCompleter.future, completes);
      },
    );

    test(
      'watchEventsForOrganizerProvider delegates to the repository',
      () async {
        final event = buildEvent();
        await _seedEvent(firestore, event);

        final provider = watchEventsForOrganizerProvider('club-1');
        final subscription = container.listen(provider, (_, _) {});
        addTearDown(subscription.close);

        final value = await container.read(provider.future);

        expect(value, [event]);
      },
    );

    test(
      'watchEventsForOrganizersProvider delegates to the repository',
      () async {
        final first = buildEvent(id: 'first');
        final second = buildEvent(id: 'second', clubId: 'club-2');
        await _seedEvent(firestore, first);
        await _seedEvent(firestore, second);

        final provider = watchEventsForOrganizersProvider(
          EventsForOrganizersQuery(const ['club-2', 'club-1']),
        );
        final subscription = container.listen(provider, (_, _) {});
        addTearDown(subscription.close);

        expect(await container.read(provider.future), [first, second]);
      },
    );

    test('watchAttendedEventsProvider delegates to the repository', () async {
      final event = buildEvent();
      await _seedEvent(firestore, event);
      await _seedParticipation(
        firestore,
        event: event,
        uid: 'runner-1',
        status: EventParticipationStatus.attended,
      );

      final provider = watchAttendedEventsProvider('runner-1');
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);

      final value = await container.read(provider.future);

      expect(value, [event]);
    });

    test('watchSignedUpEventsProvider delegates to the repository', () async {
      final event = buildEvent();
      await _seedEvent(firestore, event);
      await _seedParticipation(
        firestore,
        event: event,
        uid: 'runner-1',
        status: EventParticipationStatus.signedUp,
      );

      final provider = watchSignedUpEventsProvider('runner-1');
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);

      final value = await container.read(provider.future);

      expect(value, [event]);
    });

    test('watchEventsByIdsProvider delegates to the repository', () async {
      final event = buildEvent();
      await _seedEvent(firestore, event);

      final provider = watchEventsByIdsProvider(
        EventsByIdQuery(const ['event-1']),
      );
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);

      final value = await container.read(provider.future);

      expect(value, [event]);
    });

    testWidgets(
      'watchSignedUpEventsProvider keeps realtime streams alive while idle',
      (tester) async {
        final event = buildEvent(bookedCount: 1);
        final signedUpEventsController = StreamController<List<Event>>();
        addTearDown(signedUpEventsController.close);

        final container = ProviderContainer(
          overrides: [
            bookedEventsRepositoryProvider.overrideWith(
              (ref) => _IdleBookedEventsRepository(
                signedUpEventsStream: signedUpEventsController.stream,
              ),
            ),
          ],
        );
        addTearDown(container.dispose);

        final provider = watchSignedUpEventsProvider('runner-1');
        final subscription = container.listen(provider, (_, _) {});
        addTearDown(subscription.close);

        signedUpEventsController.add([event]);
        await container.pump();
        expect(subscription.read().value, [event]);

        await tester.pump(_pastLegacyStreamTimeout);
        await container.pump();

        expect(subscription.read(), isA<AsyncData<List<Event>>>());
        expect(subscription.read().value, [event]);
      },
    );

    test('recommendedEventsProvider delegates to the repository', () async {
      final event = buildEvent();
      await _seedEvent(firestore, event);

      final results = await container.read(
        recommendedEventsProvider(
          RecommendedEventsQuery.fromOrganizerIds(const ['club-1']),
        ).future,
      );

      expect(results, [event]);
    });
  });
}
