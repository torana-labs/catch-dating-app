import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_details_journal.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/core/media/uploaded_photo.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_details_controller.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'private_event_details_test_support.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test(
    'photo upload locks duplicate edits and retries the exact attachment',
    () async {
      final upload = Completer<List<UploadedPhoto>>();
      final sent = <PrivateEventDetailsUpdateRequest>[];
      var picks = 0;
      final controller = _reconciliationController(
        (_) async => _progress,
        pickAndUploadPhotos: (_) {
          picks++;
          return upload.future;
        },
        writeDetails: (request) async {
          sent.add(request);
          throw StateError('Response lost');
        },
      );
      addTearDown(controller.dispose);
      await controller.load();
      final saving = controller.addPhotos();
      expect(controller.uploading, isTrue);
      expect(controller.canEdit, isFalse);
      await controller.addPhotos();
      expect(picks, 1);
      upload.complete([
        UploadedPhoto.fromUpload(
          url: 'https://example.com/photo.jpg',
          storagePath: 'events/event-1/media/p1/original.jpg',
          position: 0,
        ),
      ]);
      await saving;
      expect(controller.pending?.details.eventPhotos, hasLength(1));
      expect(controller.canEdit, isFalse);
      final original = jsonEncode(sent.single.toJson());
      await controller.retryPending();
      expect(sent, hasLength(2));
      expect(jsonEncode(sent.last.toJson()), original);
      expect(picks, 1);
    },
  );

  test(
    'optional media and itinerary survive JSON journal and explicit clearing',
    () {
      final photo = UploadedPhoto.fromUpload(
        url: 'https://example.com/photo.jpg',
        storagePath: 'events/event1/media/photo/original.jpg',
        position: 0,
        now: DateTime(2026),
      );
      final patch = PrivateEventDetailsPatch(
        eventPhotos: [photo],
        itinerary: const [
          EventItineraryItem(
            id: 'stop1',
            kind: EventItineraryKind.stop,
            offsetMinutes: 10,
            title: 'Water stop',
            durationMinutes: 5,
            routeDistanceMeters: 800,
          ),
        ],
      );
      final restored = PrivateEventDetailsPatch.fromJson(
        Map<String, Object?>.from(
          jsonDecode(jsonEncode(patch.toJson())) as Map,
        ),
      );
      expect(restored.eventPhotos, [photo]);
      expect(restored.itinerary, patch.itinerary);
      expect(restored.toJson(), patch.toJson());
      const clear = PrivateEventDetailsPatch(eventPhotos: [], itinerary: []);
      expect(clear.isValid, isTrue);
      expect(clear.toJson(), {'eventPhotos': [], 'itinerary': []});
      final snapshot = PrivateEventDetailsSnapshot.fromResponse({
        'endTimeMillis': null,
        'venueName': null,
        'sourceVenueId': null,
        'eventFormat': null,
        ...patch.toJson(),
      });
      expect(snapshot.eventPhotos, [photo]);
      expect(snapshot.itinerary, patch.itinerary);
    },
  );

  test(
    'partial details preserve inherit, set and clear without implied values',
    () {
      const details = PrivateEventDetailsPatch(
        durationMinutes: EventSetupValue.inherit(),
        venue: EventSetupValue.set('Town Hall'),
        eventFormat: EventSetupValue.clear(),
      );
      expect(details.toJson(), {
        'durationMinutes': {'mode': 'inherit'},
        'venue': {
          'mode': 'set',
          'value': {'name': 'Town Hall'},
        },
        'eventFormat': {'mode': 'clear'},
      });
      expect(
        PrivateEventDetailsPatch.fromJson(details.toJson()).toJson(),
        details.toJson(),
      );
      expect(const PrivateEventDetailsPatch().isValid, isFalse);
      expect(
        const PrivateEventDetailsPatch(
          durationMinutes: EventSetupValue.set(14),
        ).isValid,
        isFalse,
      );
      expect(
        const PrivateEventDetailsPatch(
          durationMinutes: EventSetupValue.set(241),
        ).isValid,
        isFalse,
      );
      expect(
        const PrivateEventDetailsPatch(
          eventFormat: EventSetupValue.inherit(),
        ).isValid,
        isFalse,
      );
      final format = EventFormatSnapshot.fromActivityKind(ActivityKind.dinner);
      final formatPatch = PrivateEventDetailsPatch(
        eventFormat: EventSetupValue.set(format),
      );
      expect(
        PrivateEventDetailsPatch.fromJson(
          formatPatch.toJson(),
        ).eventFormat!.value!.activityKind,
        ActivityKind.dinner,
      );
    },
  );

  test(
    'map location survives the exact-command journal without invented coordinates',
    () {
      const location = EventMeetingLocation(
        name: 'Town Hall',
        latitude: 19.2,
        longitude: 72.9,
        placeId: 'test-place',
      );
      const patch = PrivateEventDetailsPatch(meetingLocation: location);
      final restored = PrivateEventDetailsPatch.fromJson(patch.toJson());
      expect(restored.meetingLocation, location);
      expect(restored.toJson(), patch.toJson());
      expect(restored.venue, isNull);
      expect(
        const PrivateEventDetailsPatch(
          meetingLocation: location,
          venue: EventSetupValue.clear(),
        ).isValid,
        isFalse,
      );
      expect(
        PrivateEventDetailsPatch(
          meetingLocation: location.copyWith(latitude: double.nan),
        ).isValid,
        isFalse,
      );
      expect(
        () => PrivateEventDetailsPatch.fromJson({
          'venue': {
            'mode': 'set',
            'value': {'name': 'Broken', 'latitude': 19.2},
          },
        }),
        throwsA(anything),
      );
    },
  );

  test(
    'listing terms journal retains exact price and rejects invalid policies',
    () {
      const terms = PrivateEventAdmissionTerms(
        capacityLimit: 12,
        priceInPaise: 50025,
        currency: 'INR',
        cancellationPolicyId: 'strict',
      );
      const patch = PrivateEventDetailsPatch(
        admissionTerms: terms,
        description: 'Shared dinner',
        distanceKm: 5.5,
        pace: 'easy',
      );
      expect(patch.isValid, isTrue);
      final restored = PrivateEventDetailsPatch.fromJson(patch.toJson());
      expect(restored.toJson(), patch.toJson());
      expect(restored.admissionTerms?.priceInPaise, 50025);
      expect(
        const PrivateEventDetailsPatch(
          admissionTerms: PrivateEventAdmissionTerms(
            capacityLimit: 12,
            priceInPaise: 0,
            currency: 'INR',
            cancellationPolicyId: 'strict',
          ),
        ).isValid,
        isFalse,
      );
      expect(
        const PrivateEventDetailsPatch(distanceKm: double.nan).isValid,
        isFalse,
      );
      expect(
        () => PrivateEventAdmissionTerms.fromResponse({
          ...terms.toJson(),
          'unexpected': true,
        }),
        throwsFormatException,
      );
      final snapshot = PrivateEventDetailsSnapshot.fromResponse({
        'endTimeMillis': null,
        'venueName': null,
        'sourceVenueId': null,
        'eventFormat': null,
        'description': 'Shared dinner',
        'admissionTerms': terms.toJson(),
        'distanceKm': 5.5,
        'pace': 'easy',
      });
      expect(snapshot.admissionTerms?.toJson(), terms.toJson());
      expect(snapshot.distanceKm, 5.5);
    },
  );

  test(
    'lost response, revocation and reopen replay one exact journaled command',
    () async {
      final hash = List.filled(64, 'a').join();
      var serverRevision = 2;
      var attempts = 0;
      final sentBodies = <String>[];
      final defaults = ManagerEventSetupDefaults(
        organizerId: 'club-1',
        cityId: 'in-mh-mumbai',
        marketId: 'in-mh-mumbai',
        timezone: 'Asia/Kolkata',
        organizerDefaultsRevision: 1,
        basicsReviewedHash: hash,
        preferencesRevision: 1,
        preferences: const ManagerEventSetupPreferences(
          usualDurationMinutes: 90,
        ),
        preferencesHash: hash,
        reviewedDefaultsHash: hash,
      );
      PrivateEventBasicSummary read() => PrivateEventBasicSummary(
        eventId: 'event-1',
        organizerId: 'club-1',
        setupRevision: serverRevision,
        name: 'Saturday mixer',
        city: const EventSetupCity(
          cityId: 'in-mh-mumbai',
          marketId: 'in-mh-mumbai',
        ),
        localDate: '2026-10-03',
        localStartTime: '19:00',
        timezone: 'Asia/Kolkata',
        startTimeMillis: 1791043800000,
        status: 'active',
        setupDefaults: const {},
        detailsConfigured: serverRevision > 2,
        eventPreferences: null,
        eventDetails: PrivateEventDetailsSnapshot(
          endTimeMillis: serverRevision > 2 ? 1791049200000 : null,
        ),
      );
      Future<PrivateEventCreateReceipt> write(
        PrivateEventDetailsUpdateRequest request,
      ) async {
        sentBodies.add(jsonEncode(request.toJson()));
        attempts++;
        if (attempts == 1) {
          serverRevision = 3;
          throw StateError('Response lost after commit');
        }
        if (attempts == 2) {
          throw StateError('Manager access temporarily revoked');
        }
        return const PrivateEventCreateReceipt(
          eventId: 'event-1',
          setupRevision: 3,
          replayed: true,
        );
      }

      TestPrivateEventDetailsController controller() => createDetailsController(
        userId: 'host-1',
        organizerId: 'club-1',
        eventId: 'event-1',
        readEvent: ({required organizerId, required eventId}) async => read(),
        readDefaults: (_) async => defaults,
        write: write,
      );
      final first = controller();
      await first.load();
      // Existing guests lock basic/format changes, not later venue or duration.
      expect(first.canEdit, isTrue);
      expect(first.canEditFormat, isFalse);
      await first.save(
        const PrivateEventDetailsPatch(eventFormat: EventSetupValue.clear()),
      );
      expect(sentBodies, isEmpty);
      expect(first.pending, isNull);
      expect(first.error, isA<StateError>());
      await first.save(
        const PrivateEventDetailsPatch(
          durationMinutes: EventSetupValue.inherit(),
        ),
      );
      expect(first.pending, isNotNull);
      expect(first.canEdit, isFalse);
      final journal = const PrivateEventDetailsJournal();
      final persisted = await journal.load(
        userId: 'host-1',
        organizerId: 'club-1',
        eventId: 'event-1',
      );
      expect(persisted?.toJson(), first.pending!.toJson());
      first.dispose();

      final reopened = controller();
      await reopened.load();
      expect(reopened.pending?.toJson(), persisted?.toJson());
      await reopened.retryPending();
      expect(reopened.pending, isNotNull);
      expect(reopened.canEdit, isFalse);
      await reopened.retryPending();
      expect(reopened.pending, isNull);
      expect(reopened.event!.setupRevision, 3);
      expect(sentBodies, everyElement(sentBodies.first));
      expect(
        await journal.load(
          userId: 'host-1',
          organizerId: 'club-1',
          eventId: 'event-1',
        ),
        isNull,
      );
      reopened.dispose();
    },
  );

  test('failed details reread disables stale editing', () async {
    final hash = List.filled(64, 'a').join();
    var denied = false;
    final controller = createDetailsController(
      userId: 'host-1',
      organizerId: 'club-1',
      eventId: 'event-1',
      readEvent: ({required organizerId, required eventId}) async {
        if (denied) throw StateError('manager access revoked');
        return const PrivateEventBasicSummary(
          eventId: 'event-1',
          organizerId: 'club-1',
          setupRevision: 2,
          name: 'Saturday mixer',
          city: EventSetupCity(
            cityId: 'in-mh-mumbai',
            marketId: 'in-mh-mumbai',
          ),
          localDate: '2026-10-03',
          localStartTime: '19:00',
          timezone: 'Asia/Kolkata',
          startTimeMillis: 1791043800000,
          status: 'active',
          setupDefaults: {},
          detailsConfigured: false,
          eventPreferences: null,
        );
      },
      readDefaults: (_) async => ManagerEventSetupDefaults(
        organizerId: 'club-1',
        cityId: null,
        marketId: null,
        timezone: null,
        organizerDefaultsRevision: null,
        basicsReviewedHash: hash,
        preferencesRevision: 0,
        preferences: const ManagerEventSetupPreferences(),
        preferencesHash: hash,
        reviewedDefaultsHash: hash,
      ),
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
    'wrong-identity reread never unlocks another event after save',
    () async {
      final hash = List.filled(64, 'a').join();
      var saved = false;
      var cancelled = false;
      var currentUid = 'host-1';
      var writes = 0;
      final controller = createDetailsController(
        userId: 'host-1',
        organizerId: 'club-1',
        eventId: 'event-1',
        readEvent: ({required organizerId, required eventId}) async =>
            PrivateEventBasicSummary(
              eventId: saved ? 'other-event' : eventId,
              organizerId: organizerId,
              setupRevision: saved ? 3 : 2,
              name: 'Saturday mixer',
              city: const EventSetupCity(
                cityId: 'in-mh-mumbai',
                marketId: 'in-mh-mumbai',
              ),
              localDate: '2026-10-03',
              localStartTime: '19:00',
              timezone: 'Asia/Kolkata',
              startTimeMillis: 1791043800000,
              status: cancelled ? 'cancelled' : 'active',
              setupDefaults: const {},
              detailsConfigured: false,
              eventPreferences: null,
            ),
        readDefaults: (_) async => ManagerEventSetupDefaults(
          organizerId: 'club-1',
          cityId: null,
          marketId: null,
          timezone: null,
          organizerDefaultsRevision: null,
          basicsReviewedHash: hash,
          preferencesRevision: 0,
          preferences: const ManagerEventSetupPreferences(),
          preferencesHash: hash,
          reviewedDefaultsHash: hash,
        ),
        currentUserId: () => currentUid,
        write: (_) async {
          writes++;
          saved = true;
          return const PrivateEventCreateReceipt(
            eventId: 'event-1',
            setupRevision: 3,
            replayed: false,
          );
        },
      );
      addTearDown(controller.dispose);
      await controller.load();
      await controller.save(
        const PrivateEventDetailsPatch(venue: EventSetupValue.set('Town Hall')),
      );
      expect(controller.pending, isNull);
      expect(controller.event, isNull);
      expect(controller.canEdit, isFalse);
      expect(controller.error, isA<FormatException>());

      saved = false;
      cancelled = true;
      await controller.load();
      expect(controller.canEdit, isFalse);
      await controller.save(
        const PrivateEventDetailsPatch(
          venue: EventSetupValue.set('Another venue'),
        ),
      );
      expect(saved, isFalse);
      cancelled = false;
      await controller.load();
      expect(controller.canEdit, isTrue);
      currentUid = 'host-2';
      await controller.save(
        const PrivateEventDetailsPatch(
          venue: EventSetupValue.set('Other account venue'),
        ),
      );
      expect(writes, 1);
      expect(controller.canEdit, isFalse);
      controller.invalidateActor();
      currentUid = 'host-1';
      await controller.load();
      expect(controller.event, isNull);
      expect(controller.canEdit, isFalse);
    },
  );

  test(
    'guest reconciliation resumes the exact admission command after restart',
    () async {
      var attempt = 0;
      final bodies = <String>[];
      Future<PrivateSeatReconciliationResult> reconcile(
        PrivateEventDetailsUpdateRequest request,
      ) async {
        bodies.add(jsonEncode(request.toJson()));
        attempt++;
        if (attempt == 2) throw StateError('Response lost during guest scan');
        if (attempt == 1) return _progress;
        return const PrivateSeatReconciliationResult.complete(
          PrivateEventCreateReceipt(
            eventId: 'event-1',
            setupRevision: 3,
            replayed: true,
          ),
        );
      }

      final first = _reconciliationController(reconcile);
      await first.load();
      await first.save(_terms);
      expect(first.pending, isNotNull);
      expect(first.reconciliationProgress?.scannedRows, 25);
      first.dispose();
      final resumed = _reconciliationController(reconcile);
      addTearDown(resumed.dispose);
      await resumed.load();
      await resumed.retryPending();
      expect(resumed.pending, isNull);
      expect(resumed.reconciliationProgress, isNull);
      expect(bodies, everyElement(bodies.first));
      expect(
        await const PrivateEventDetailsJournal().load(
          userId: 'host-1',
          organizerId: 'club-1',
          eventId: 'event-1',
        ),
        isNull,
      );
    },
  );

  test('bounded automatic guest checks preserve a resumable command', () async {
    var count = 0;
    final controller = _reconciliationController((_) async {
      count++;
      return _progress;
    });
    addTearDown(controller.dispose);
    await controller.load();
    await controller.save(_terms);
    expect(count, 12);
    expect(controller.pending, isNotNull);
    expect(controller.error, isNull);
    expect(controller.saving, isFalse);
    expect(controller.canEdit, isFalse);
    await controller.retryPending();
    expect(count, 24);
  });

  for (final definitive in [true, false]) {
    test(
      'only exact stale review clears admission command: $definitive',
      () async {
        final controller = _reconciliationController((request) async {
          throw FirebaseFunctionsException(
            code: 'aborted',
            message: 'Review changed',
            details: definitive
                ? {
                    'reason': 'event-details-review-stale',
                    'eventId': request.eventId,
                    'organizerId': request.organizerId,
                    'requestId': request.requestId,
                    'expectedSetupRevision': request.expectedSetupRevision,
                    'reviewedDefaultsHash': request.reviewedDefaultsHash,
                  }
                : null,
          );
        });
        addTearDown(controller.dispose);
        await controller.load();
        await controller.save(_terms);
        expect(controller.pending == null, definitive);
        expect(controller.canEdit, definitive);
        expect(controller.error, isA<FirebaseFunctionsException>());
      },
    );
  }

  test('switching accounts during progress stops further requests', () async {
    var uid = 'host-1';
    var calls = 0;
    final controller = _reconciliationController((_) async {
      calls++;
      uid = 'host-2';
      return _progress;
    }, currentUserId: () => uid);
    addTearDown(controller.dispose);
    await controller.load();
    await controller.save(_terms);
    expect(calls, 1);
    expect(controller.pending, isNotNull);
    expect(controller.reconciliationProgress, isNull);
    expect(controller.canEdit, isFalse);
  });

  test('discard intent survives a lost response and restart', () async {
    var discardCalls = 0;
    Future<PrivateSeatReconciliationResult> write(
      PrivateEventDetailsUpdateRequest request,
    ) async {
      if (!request.discard) throw StateError('Reviewed capacity is too small');
      discardCalls++;
      if (discardCalls == 1) throw StateError('Discard response lost');
      return PrivateSeatReconciliationResult.discarded(
        request.eventId,
        request.requestId,
      );
    }

    final first = _reconciliationController(write);
    await first.load();
    await first.save(_terms);
    final original = first.pending!;
    await first.discardPending();
    expect(first.pending?.discard, isTrue);
    expect(first.pending?.withDiscard(false).toJson(), original.toJson());
    first.dispose();
    final next = _reconciliationController(write);
    addTearDown(next.dispose);
    await next.load();
    expect(next.pending?.discard, isTrue);
    await next.retryPending();
    expect(next.pending, isNull);
    expect(next.canEdit, isTrue);
    expect(discardCalls, 2);
  });

  test('a raced apply switches discard retry back to original save', () async {
    var complete = false;
    final controller = _reconciliationController((request) async {
      if (request.discard) {
        throw FirebaseFunctionsException(
          code: 'failed-precondition',
          message: 'Changes have begun',
          details: {
            'reason': 'seat-reconciliation-discard-unavailable',
            'eventId': request.eventId,
            'organizerId': request.organizerId,
            'requestId': request.requestId,
            'expectedSetupRevision': request.expectedSetupRevision,
            'reviewedDefaultsHash': request.reviewedDefaultsHash,
          },
        );
      }
      if (!complete) throw StateError('Lost response during application');
      return const PrivateSeatReconciliationResult.complete(
        PrivateEventCreateReceipt(
          eventId: 'event-1',
          setupRevision: 3,
          replayed: true,
        ),
      );
    });
    addTearDown(controller.dispose);
    await controller.load();
    await controller.save(_terms);
    final original = controller.pending!.toJson();
    await controller.discardPending();
    expect(controller.pending!.toJson(), original);
    expect(controller.canDiscardPending, isFalse);
    expect(controller.error, isA<FirebaseFunctionsException>());
    complete = true;
    await controller.retryPending();
    expect(controller.pending, isNull);
  });

  test('progress rejects complete phases and fabricated occupied counts', () {
    final valid = {
      'kind': 'progress',
      'progress': {
        'eventId': 'event-1',
        'migrationRevision': 1,
        'phase': 'scan',
        'scannedRows': 25,
        'appliedRows': 0,
        'outputRows': 0,
        'occupied': null,
      },
    };
    expect(
      PrivateSeatReconciliationResult.fromResponse(valid).progress?.scannedRows,
      25,
    );
    for (final changed in [
      {'phase': 'complete'},
      {'occupied': 1},
      {'appliedRows': 2},
    ]) {
      expect(
        () => PrivateSeatReconciliationResult.fromResponse({
          ...valid,
          'progress': {...valid['progress']! as Map, ...changed},
        }),
        throwsFormatException,
      );
    }
  });
}

const _terms = PrivateEventDetailsPatch(
  admissionTerms: PrivateEventAdmissionTerms(
    capacityLimit: 40,
    priceInPaise: 0,
    currency: 'INR',
    cancellationPolicyId: 'notApplicable',
  ),
);
const _progress = PrivateSeatReconciliationResult.pending(
  PrivateSeatReconciliationProgress(
    eventId: 'event-1',
    phase: 'scan',
    scannedRows: 25,
  ),
);
TestPrivateEventDetailsController _reconciliationController(
  Future<PrivateSeatReconciliationResult> Function(
    PrivateEventDetailsUpdateRequest,
  )
  reconcile, {
  String? Function()? currentUserId,
  WritePrivateEventDetails? writeDetails,
  Future<List<UploadedPhoto>> Function(int)? pickAndUploadPhotos,
}) {
  final hash = List.filled(64, 'a').join();
  return createDetailsController(
    userId: 'host-1',
    organizerId: 'club-1',
    eventId: 'event-1',
    currentUserId: currentUserId,
    reconcile: reconcile,
    pickAndUploadPhotos: pickAndUploadPhotos,
    write:
        writeDetails ??
        (_) async =>
            throw StateError('Admission terms must use reconciliation'),
    readEvent: ({required organizerId, required eventId}) async =>
        const PrivateEventBasicSummary(
          eventId: 'event-1',
          organizerId: 'club-1',
          setupRevision: 2,
          name: 'Synthetic mixer',
          city: EventSetupCity(
            cityId: 'in-mh-mumbai',
            marketId: 'in-mh-mumbai',
          ),
          localDate: '2026-10-03',
          localStartTime: '19:00',
          timezone: 'Asia/Kolkata',
          startTimeMillis: 1791043800000,
          status: 'active',
          setupDefaults: {},
          detailsConfigured: false,
          eventPreferences: null,
        ),
    readDefaults: (_) async => ManagerEventSetupDefaults(
      organizerId: 'club-1',
      cityId: null,
      marketId: null,
      timezone: null,
      organizerDefaultsRevision: null,
      basicsReviewedHash: hash,
      preferencesRevision: 0,
      preferences: const ManagerEventSetupPreferences(),
      preferencesHash: hash,
      reviewedDefaultsHash: hash,
    ),
  );
}
