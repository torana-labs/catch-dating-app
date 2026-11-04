import 'package:catch_dating_app/contexts/forms/data/event_offer_configuration_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

const _start = 1900000000000;
const _now = 1899990000000;

Future<void> _seedEvent(
  FakeFirebaseFirestore db, {
  Object? setupRevision = 4,
  String status = 'active',
}) => db.collection('events').doc('event-1').set({
  'organizerId': 'org-1',
  'status': status,
  'setupRevision': ?setupRevision,
  'startTime': Timestamp.fromMillisecondsSinceEpoch(_start),
});

void main() {
  EventOfferConfigurationReads reads(FakeFirebaseFirestore db) =>
      EventOfferConfigurationReads(
        db,
        clock: AppClock.custom(() => DateTime.fromMillisecondsSinceEpoch(_now)),
      );

  test('an event without saved settings fences by its setupRevision', () async {
    final db = FakeFirebaseFirestore();
    await _seedEvent(db);
    final configuration = await reads(
      db,
    ).watch(organizerId: 'org-1', eventId: 'event-1').first;
    expect(configuration.eventSourceRevision, 4);
    expect(configuration.startsAtMillis, _start);
    expect(configuration.nowMillis, _now);
    expect(configuration.preferencesRevision, 0);
    expect(configuration.preferences, isNull);
    expect(configuration.suggestedExpiresAtMillis, isNull);
  });

  test(
    'an event without setupRevision or a cancelled one takes no settings',
    () async {
      for (final (revision, status, reason) in [
        (
          null,
          'active',
          EventOfferSettingsUnavailableReason.eventRevisionMissing,
        ),
        (4, 'cancelled', EventOfferSettingsUnavailableReason.eventCancelled),
      ]) {
        final db = FakeFirebaseFirestore();
        await _seedEvent(db, setupRevision: revision, status: status);
        await expectLater(
          reads(db).watch(organizerId: 'org-1', eventId: 'event-1').first,
          // The listener's backend context wraps the typed reason.
          throwsA(
            isA<AppException>().having(
              (error) => error.cause,
              'cause',
              isA<EventOfferSettingsUnavailable>().having(
                (error) => error.reason,
                'reason',
                reason,
              ),
            ),
          ),
        );
      }
    },
  );

  test('settings for another event are a format error', () async {
    final db = FakeFirebaseFirestore();
    await _seedEvent(db);
    await db.collection('eventSetupPreferences').doc('event-1').set({
      'organizerId': 'org-2',
      'eventId': 'event-1',
      'revision': 1,
      'preferences': <String, Object?>{},
      'paymentTerms': <String, Object?>{},
    });
    await expectLater(
      reads(db).watch(organizerId: 'org-1', eventId: 'event-1').first,
      throwsA(anything),
    );
  });

  test('a later event write updates the open configuration', () async {
    final db = FakeFirebaseFirestore();
    await _seedEvent(db);
    final delivered = <EventOfferConfiguration>[];
    final subscription = reads(
      db,
    ).watch(organizerId: 'org-1', eventId: 'event-1').listen(delivered.add);
    addTearDown(subscription.cancel);
    await pumpEventQueue();
    await db.collection('events').doc('event-1').update({'setupRevision': 5});
    await pumpEventQueue();
    expect(delivered.map((value) => value.eventSourceRevision), [4, 5]);
  });
}
