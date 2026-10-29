import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_update_journal.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  const basics = PrivateEventBasics(
    name: 'Saturday mixer',
    city: EventSetupValue.set(
      EventSetupCity(cityId: 'in-mh-mumbai', marketId: 'in-mh-mumbai'),
    ),
    localDate: '2026-09-26',
    localStartTime: '19:00',
    timezone: EventSetupValue.set('Asia/Kolkata'),
  );
  const request = PrivateEventBasicsUpdateRequest(
    organizerId: 'club-1',
    eventId: 'event-1',
    requestId: 'update-1',
    expectedSetupRevision: 2,
    basics: basics,
  );

  test(
    'pending update survives a new repository instance with exact body',
    () async {
      await const PrivateEventUpdateJournal().save(
        userId: 'host-1',
        request: request,
      );
      final loaded = await const PrivateEventUpdateJournal().load(
        userId: 'host-1',
        organizerId: 'club-1',
        eventId: 'event-1',
      );
      expect(loaded?.toJson(), request.toJson());
      expect(loaded?.requestId, 'update-1');
      expect(loaded?.expectedSetupRevision, 2);
      expect(
        await const PrivateEventUpdateJournal().load(
          userId: 'host-2',
          organizerId: 'club-1',
          eventId: 'event-1',
        ),
        isNull,
      );
    },
  );

  test('late clear cannot erase a later request for the same event', () async {
    const journal = PrivateEventUpdateJournal();
    await journal.save(userId: 'host-1', request: request);
    const next = PrivateEventBasicsUpdateRequest(
      organizerId: 'club-1',
      eventId: 'event-1',
      requestId: 'update-2',
      expectedSetupRevision: 3,
      basics: basics,
    );
    await journal.save(userId: 'host-1', request: next);
    await journal.clear(userId: 'host-1', request: request);
    expect(
      (await journal.load(
        userId: 'host-1',
        organizerId: 'club-1',
        eventId: 'event-1',
      ))?.requestId,
      'update-2',
    );
    await journal.clear(userId: 'host-1', request: next);
    expect(
      await journal.load(
        userId: 'host-1',
        organizerId: 'club-1',
        eventId: 'event-1',
      ),
      isNull,
    );
  });
}
