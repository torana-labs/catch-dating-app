import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_journal.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'event_controller_test_support.dart';

Map<String, Object?> offerEvent({
  String organizerId = 'club-1',
  String status = 'active',
  Object? setupRevision = 8,
}) => {
  'organizerId': organizerId,
  'status': status,
  'setupRevision': ?setupRevision,
  'startTime': Timestamp.fromMillisecondsSinceEpoch(1791043800000),
};

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  final hash = List.filled(64, 'a').join();

  EventOfferConfiguration configuration(int revision) => revision > 0
      ? const EventOfferConfiguration(
          organizerId: 'club-1',
          eventId: 'event-1',
          eventSourceRevision: 8,
          startsAtMillis: 1791043800000,
          nowMillis: 1790000000000,
          suggestedExpiresAtMillis: null,
          preferencesRevision: 1,
          preferences: null,
        )
      : EventOfferConfiguration.compose(
          organizerId: 'club-1',
          eventId: 'event-1',
          event: offerEvent(),
          preferences: null,
          now: DateTime.fromMillisecondsSinceEpoch(1790000000000),
        );
  ManagerEventSetupDefaults defaults() => ManagerEventSetupDefaults(
    organizerId: 'club-1',
    cityId: 'in-mh-mumbai',
    marketId: 'in-mh-mumbai',
    timezone: 'Asia/Kolkata',
    organizerDefaultsRevision: 1,
    basicsReviewedHash: hash,
    preferencesRevision: 1,
    preferences: const ManagerEventSetupPreferences(
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    ),
    preferencesHash: hash,
    reviewedDefaultsHash: hash,
  );
  EventOfferPreferencesUpdateRequest request(String id) =>
      EventOfferPreferencesUpdateRequest(
        organizerId: 'club-1',
        eventId: 'event-1',
        requestId: id,
        expectedEventSourceRevision: 8,
        expectedPreferencesRevision: 0,
        reviewedDefaultsHash: hash,
        intents: const PrivateEventPreferenceIntents(
          currency: EventSetupValue.set('INR'),
          expectedAmountMinor: EventSetupValue.set(120000),
        ),
      );

  test('the event fences offer settings by its own setupRevision', () {
    final now = DateTime.fromMillisecondsSinceEpoch(1790000000000);
    EventOfferConfiguration compose(Map<String, Object?>? event) =>
        EventOfferConfiguration.compose(
          organizerId: 'club-1',
          eventId: 'event-1',
          event: event,
          preferences: null,
          now: now,
        );
    expect(compose(offerEvent()).eventSourceRevision, 8);
    expect(compose(offerEvent()).nowMillis, now.millisecondsSinceEpoch);
    for (final (event, reason) in [
      (null, EventOfferSettingsUnavailableReason.eventUnavailable),
      (
        offerEvent(organizerId: 'other'),
        EventOfferSettingsUnavailableReason.eventUnavailable,
      ),
      (
        offerEvent(status: 'cancelled'),
        EventOfferSettingsUnavailableReason.eventCancelled,
      ),
      (
        offerEvent(setupRevision: null),
        EventOfferSettingsUnavailableReason.eventRevisionMissing,
      ),
    ]) {
      expect(
        () => compose(event),
        throwsA(
          isA<EventOfferSettingsUnavailable>().having(
            (error) => error.reason,
            'reason',
            reason,
          ),
        ),
      );
    }
  });

  test('suggested expiry follows the server rule against the clock', () {
    const start = 1791043800000;
    int? expiry(Object? validity, {int now = 1790000000000}) =>
        EventOfferConfiguration.suggestedExpiry(
          paymentTerms: {'offerValidityMinutes': validity},
          startsAtMillis: start,
          nowMillis: now,
        );
    expect(expiry(60), 1790000000000 + 60 * 60000);
    // Clamped at the event start.
    expect(expiry(60, now: start - 30 * 60000), start);
    expect(expiry(4), isNull);
    expect(expiry(10081), isNull);
    expect(expiry(null), isNull);
    expect(expiry(60, now: start), isNull);
  });

  test(
    'published event read and write reject malformed authority receipts',
    () {
      final projection = configuration(0);
      expect(projection.eventSourceRevision, 8);
      expect(projection.preferences, isNull);
      expect(
        () => EventOfferConfiguration.compose(
          organizerId: 'club-1',
          eventId: 'event-1',
          event: offerEvent(),
          preferences: const {
            'organizerId': 'club-1',
            'eventId': 'event-1',
            'revision': 1,
            'preferences': null,
            'paymentTerms': null,
          },
          now: DateTime.fromMillisecondsSinceEpoch(1790000000000),
        ),
        throwsFormatException,
      );
      expect(
        () => EventOfferPreferencesReceipt.fromResponse({
          'eventId': 'event-1',
          'preferencesRevision': 1,
          'replayed': 'false',
        }),
        throwsFormatException,
      );
      final body = request('request-1').toJson();
      expect(body['expectedEventSourceRevision'], 8);
      expect(body['reviewedDefaultsHash'], hash);
      expect((body['intents'] as Map)['expectedAmountMinor'], {
        'mode': 'set',
        'value': 120000,
      });
      expect(EventOfferPreferencesUpdateRequest.fromJson(body).toJson(), body);
    },
  );

  test(
    'lost reply, denied retry and reopen preserve the exact command',
    () async {
      var attempts = 0;
      final sent = <Map<String, Object?>>[];
      Future<EventOfferPreferencesReceipt> write(
        EventOfferPreferencesUpdateRequest value,
      ) async {
        sent.add(value.toJson());
        attempts++;
        if (attempts == 1) throw StateError('response lost');
        if (attempts == 2) throw StateError('permission denied');
        return const EventOfferPreferencesReceipt(
          eventId: 'event-1',
          preferencesRevision: 1,
          replayed: true,
        );
      }

      TestEventOfferPreferencesController controller() =>
          TestEventOfferPreferencesController(
            userId: 'host-1',
            organizerId: 'club-1',
            eventId: 'event-1',
            readConfiguration:
                ({required organizerId, required eventId}) async =>
                    configuration(attempts >= 3 ? 1 : 0),
            readDefaults: (_) async => defaults(),
            write: write,
          );
      final first = controller();
      await first.load();
      await first.save(request('request-1').intents);
      expect(first.canEdit, isFalse);
      final frozen = first.pending!.toJson();
      first.dispose();

      final reopened = controller();
      await reopened.load();
      expect(reopened.pending?.toJson(), frozen);
      await reopened.retryPending();
      expect(reopened.pending?.toJson(), frozen);
      await reopened.retryPending();
      expect(sent, everyElement(frozen));
      expect(reopened.pending, isNull);
      expect(
        await const EventOfferPreferencesJournal().load(
          userId: 'host-1',
          organizerId: 'club-1',
          eventId: 'event-1',
        ),
        isNull,
      );
      reopened.dispose();
    },
  );

  test('failed offer reread clears old editable authority', () async {
    var denied = false;
    final controller = TestEventOfferPreferencesController(
      userId: 'host-1',
      organizerId: 'club-1',
      eventId: 'event-1',
      readConfiguration: ({required organizerId, required eventId}) async {
        if (denied) throw StateError('manager access revoked');
        return configuration(0);
      },
      readDefaults: (_) async => defaults(),
      write: (_) async => throw StateError('must not write'),
    );
    await controller.load();
    expect(controller.canEdit, isTrue);
    // The listener reports the revoked access; nothing stale stays editable.
    denied = true;
    await controller.configurationFeed.refresh();
    await pumpEventQueue();
    expect(controller.configuration, isNull);
    expect(controller.canEdit, isFalse);
    // Retrying restarts only the failed listener.
    denied = false;
    await controller.load();
    expect(controller.canEdit, isTrue);
    controller.dispose();
  });

  test(
    'preview stages inherited changes and apply retains reviewed fences',
    () async {
      final sent = <EventOfferPreferencesUpdateRequest>[];
      final previews = <EventOfferPreferencesUpdateRequest>[];
      final controller = TestEventOfferPreferencesController(
        userId: 'host-1',
        organizerId: 'club-1',
        eventId: 'event-1',
        readConfiguration: ({required organizerId, required eventId}) async =>
            configuration(sent.isEmpty ? 0 : 1),
        readDefaults: (_) async => defaults(),
        readPreview: (request) async {
          previews.add(request);
          return EventOfferPreferencesPreview(
            request: request,
            current: null,
            candidate: PrivateEventPreferencesSnapshot(
              revision: 1,
              intents: request.intents,
              resolvedValues: const {},
              paymentTerms: const {},
            ),
          );
        },
        write: (request) async {
          sent.add(request);
          return const EventOfferPreferencesReceipt(
            eventId: 'event-1',
            preferencesRevision: 1,
            replayed: false,
          );
        },
      );
      await controller.load();
      controller.stage(request('staged-1').intents);
      expect(sent, isEmpty);
      await controller.previewChanges();
      expect(sent, isEmpty);
      expect(controller.review, isNotNull);
      await controller.applyReview();
      expect(sent.single.intents.toJson(), previews.single.intents.toJson());
      expect(
        sent.single.reviewedDefaultsHash,
        previews.single.reviewedDefaultsHash,
      );
      expect(sent.single.expectedPreferencesRevision, 0);
      expect(controller.review, isNull);
      controller.dispose();
    },
  );

  test(
    'reload invalidates an in-flight preview and stale apply never writes',
    () async {
      final deferred = Completer<EventOfferPreferencesPreview>();
      EventOfferPreferencesUpdateRequest? previewRequest;
      var writes = 0;
      final controller = TestEventOfferPreferencesController(
        userId: 'host-1',
        organizerId: 'club-1',
        eventId: 'event-1',
        readConfiguration: ({required organizerId, required eventId}) async =>
            configuration(0),
        readDefaults: (_) async => defaults(),
        readPreview: (request) {
          previewRequest = request;
          return deferred.future;
        },
        write: (_) async {
          writes++;
          throw StateError('Must not write');
        },
      );
      await controller.load();
      final reading = controller.previewChanges();
      expect(controller.canEdit, isFalse);
      await controller.load();
      deferred.complete(
        EventOfferPreferencesPreview(
          request: previewRequest!,
          current: null,
          candidate: PrivateEventPreferencesSnapshot(
            revision: 1,
            intents: previewRequest!.intents,
            resolvedValues: const {},
            paymentTerms: const {},
          ),
        ),
      );
      await reading;
      expect(controller.review, isNull);
      await controller.applyReview();
      expect(writes, 0);
      controller.dispose();
    },
  );

  test(
    'only an exact server stale rejection retires pending settings',
    () async {
      for (final kind in ['exact', 'generic', 'foreign']) {
        SharedPreferences.setMockInitialValues({});
        final controller = TestEventOfferPreferencesController(
          userId: 'host-1',
          organizerId: 'club-1',
          eventId: 'event-1',
          readConfiguration: ({required organizerId, required eventId}) async =>
              configuration(0),
          readDefaults: (_) async => defaults(),
          write: (request) async => throw FirebaseFunctionsException(
            code: 'aborted',
            message: 'Reload settings',
            details: kind == 'generic'
                ? null
                : {
                    'reason': 'event-preferences-review-stale',
                    'requestId': kind == 'foreign'
                        ? 'another-request'
                        : request.requestId,
                    'eventId': request.eventId,
                    'organizerId': request.organizerId,
                  },
          ),
        );
        await controller.load();
        await controller.save(request('request-1').intents);
        expect(controller.hasPending, kind != 'exact');
        if (kind == 'exact') {
          // The listeners already hold the current settings: no reload.
          expect(controller.canEdit, isTrue);
          expect(controller.hasPending, isFalse);
        }
        controller.dispose();
      }
    },
  );

  test('account change blocks settings preview and writes', () async {
    var actor = 'host-1';
    var calls = 0;
    final controller = TestEventOfferPreferencesController(
      userId: actor,
      organizerId: 'club-1',
      eventId: 'event-1',
      currentUserId: () => actor,
      readConfiguration: ({required organizerId, required eventId}) async =>
          configuration(0),
      readDefaults: (_) async => defaults(),
      readPreview: (_) async {
        calls++;
        throw StateError('Must not preview');
      },
      write: (_) async {
        calls++;
        throw StateError('Must not write');
      },
    );
    await controller.load();
    expect(
      controller.buildPreviewRequest(controller.intents).expectedActorUid,
      'host-1',
    );
    actor = 'host-2';
    expect(controller.canEdit, isFalse);
    await controller.previewChanges();
    await controller.save(request('request-1').intents);
    expect(calls, 0);
    controller.dispose();
  });
}
