import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_journal.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'event_controller_test_support.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  final hash = List.filled(64, 'a').join();

  PrivateEventBasicSummary event(int revision) => PrivateEventBasicSummary(
    eventId: 'event-1',
    organizerId: 'club-1',
    setupRevision: revision,
    name: 'Run',
    city: const EventSetupCity(
      cityId: 'in-mh-mumbai',
      marketId: 'in-mh-mumbai',
    ),
    localDate: '2026-09-26',
    localStartTime: '08:00',
    timezone: 'Asia/Kolkata',
    startTimeMillis: 1790409600000,
    status: 'active',
    setupDefaults: const {},
    detailsConfigured: false,
    eventPreferences: null,
    canEditBasics: true,
  );
  ManagerEventSetupDefaults defaults() => ManagerEventSetupDefaults(
    organizerId: 'club-1',
    cityId: 'in-mh-mumbai',
    marketId: 'in-mh-mumbai',
    timezone: 'Asia/Kolkata',
    organizerDefaultsRevision: 1,
    basicsReviewedHash: hash,
    preferencesRevision: 1,
    preferences: const ManagerEventSetupPreferences(timezone: 'Asia/Kolkata'),
    preferencesHash: hash,
    reviewedDefaultsHash: hash,
  );
  PrivateEventPreferencesUpdateRequest request(String id) =>
      PrivateEventPreferencesUpdateRequest(
        organizerId: 'club-1',
        eventId: 'event-1',
        requestId: id,
        expectedSetupRevision: 3,
        expectedPreferencesRevision: 0,
        reviewedDefaultsHash: hash,
        intents: const PrivateEventPreferenceIntents(
          currency: EventSetupValue.set('INR'),
          collectionPreference: EventSetupValue.set(
            EventCollectionPreference.manualInstructions,
          ),
          expectedAmountMinor: EventSetupValue.set(120000),
        ),
      );

  test('all ten three-state intentions serialize; amount cannot inherit', () {
    final body = request('request-1').toJson();
    final intents = body['intents'] as Map<String, Object?>;
    expect(intents.keys.toSet(), eventPreferenceFields);
    expect(intents['currency'], {'mode': 'set', 'value': 'INR'});
    expect(intents['preferredVenueId'], {'mode': 'inherit'});
    expect(intents['expectedAmountMinor'], {'mode': 'set', 'value': 120000});
    expect(PrivateEventPreferencesUpdateRequest.fromJson(body).toJson(), body);
    expect(
      const PrivateEventPreferenceIntents(
        expectedAmountMinor: EventSetupValue.inherit(),
      ).isValid,
      isFalse,
    );
    expect(
      PrivateEventPreferenceIntents.fromJson({
        ...intents,
        'expectedAmountMinor': {'mode': 'clear'},
      }).expectedAmountMinor.mode,
      EventSetupValueMode.clear,
    );
  });

  test(
    'pending event command is scoped and cannot be silently replaced',
    () async {
      const journal = PrivateEventPreferencesJournal();
      final original = request('request-1');
      await journal.save(userId: 'host-1', request: original);
      expect(
        (await journal.load(
          userId: 'host-1',
          organizerId: 'club-1',
          eventId: 'event-1',
        ))?.toJson(),
        original.toJson(),
      );
      expect(
        await journal.load(
          userId: 'host-2',
          organizerId: 'club-1',
          eventId: 'event-1',
        ),
        isNull,
      );
      expect(
        await journal.load(
          userId: 'host-1',
          organizerId: 'club-1',
          eventId: 'event-2',
        ),
        isNull,
      );
      await expectLater(
        journal.save(userId: 'host-1', request: request('request-2')),
        throwsA(anything),
      );
      await journal.clear(userId: 'host-1', request: request('request-2'));
      expect(
        (await journal.load(
          userId: 'host-1',
          organizerId: 'club-1',
          eventId: 'event-1',
        ))?.requestId,
        'request-1',
      );
    },
  );

  test(
    'lost receipt, revoked retry, and reopen replay exact command',
    () async {
      final sent = <Map<String, Object?>>[];
      var attempts = 0;
      Future<PrivateEventCreateReceipt> write(
        PrivateEventPreferencesUpdateRequest value,
      ) async {
        sent.add(value.toJson());
        attempts++;
        if (attempts == 1) throw StateError('response lost');
        if (attempts == 2) throw StateError('permission denied');
        return const PrivateEventCreateReceipt(
          eventId: 'event-1',
          setupRevision: 4,
          replayed: true,
        );
      }

      TestPrivateEventPreferencesController controller() =>
          TestPrivateEventPreferencesController(
            userId: 'host-1',
            organizerId: 'club-1',
            eventId: 'event-1',
            readEvent: ({required organizerId, required eventId}) async =>
                event(attempts >= 3 ? 4 : 3),
            readDefaults: (_) async => defaults(),
            write: write,
          );
      final first = controller();
      await first.load();
      await first.save(request('request-1').intents);
      expect(first.pending, isNotNull);
      expect(first.canEdit, isFalse);
      final frozen = first.pending!.toJson();
      first.dispose();

      final reopened = controller();
      await reopened.load();
      expect(reopened.pending?.toJson(), frozen);
      await reopened.retryPending();
      expect(reopened.pending?.toJson(), frozen);
      expect(reopened.canEdit, isFalse);
      await reopened.retryPending();
      expect(sent, everyElement(frozen));
      expect(reopened.pending, isNull);
      expect(reopened.event?.setupRevision, 4);
      expect(
        await const PrivateEventPreferencesJournal().load(
          userId: 'host-1',
          organizerId: 'club-1',
          eventId: 'event-1',
        ),
        isNull,
      );
      reopened.dispose();
    },
  );

  test('failed private settings reread disables stale editing', () async {
    var denied = false;
    final controller = TestPrivateEventPreferencesController(
      userId: 'host-1',
      organizerId: 'club-1',
      eventId: 'event-1',
      readEvent: ({required organizerId, required eventId}) async {
        if (denied) throw StateError('manager access revoked');
        return event(3);
      },
      readDefaults: (_) async => defaults(),
      write: (_) async => throw StateError('must not write'),
    );
    await controller.load();
    expect(controller.canEdit, isTrue);
    denied = true;
    await controller.load();
    expect(controller.event, isNull);
    expect(controller.defaults, isNull);
    expect(controller.canEdit, isFalse);
    controller.dispose();
  });

  test(
    'only an exact server stale rejection retires pending settings',
    () async {
      for (final kind in ['exact', 'generic', 'foreign']) {
        SharedPreferences.setMockInitialValues({});
        final controller = TestPrivateEventPreferencesController(
          userId: 'host-1',
          organizerId: 'club-1',
          eventId: 'event-1',
          readEvent: ({required organizerId, required eventId}) async =>
              event(3),
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
          expect(controller.event, isNull);
          await controller.load();
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
    final controller = TestPrivateEventPreferencesController(
      userId: actor,
      organizerId: 'club-1',
      eventId: 'event-1',
      currentUserId: () => actor,
      readEvent: ({required organizerId, required eventId}) async => event(3),
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
