import 'package:catch_dating_app/contexts/audience/data/host_roster_intake_draft_journal.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  const journal = HostRosterIntakeDraftJournal();
  final sessionId = 'hri_${List.filled(48, 'a').join()}';

  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('saved session is isolated by account, organizer, and event', () async {
    await journal.save(
      userId: 'host-a',
      organizerId: 'organizer-a',
      eventId: 'event-a',
      sessionId: sessionId,
    );

    expect(
      await journal.load(
        userId: 'host-a',
        organizerId: 'organizer-a',
        eventId: 'event-a',
      ),
      sessionId,
    );
    expect(
      await journal.load(
        userId: 'host-b',
        organizerId: 'organizer-a',
        eventId: 'event-a',
      ),
      isNull,
    );
    expect(
      await journal.load(
        userId: 'host-a',
        organizerId: 'organizer-a',
        eventId: 'event-b',
      ),
      isNull,
    );
  });

  test('clear only removes the exact completed session', () async {
    await journal.save(
      userId: 'host-a',
      organizerId: 'organizer-a',
      eventId: 'event-a',
      sessionId: sessionId,
    );
    await journal.clear(
      userId: 'host-a',
      organizerId: 'organizer-a',
      eventId: 'event-a',
      sessionId: 'hri_${List.filled(48, 'b').join()}',
    );
    expect(
      await journal.load(
        userId: 'host-a',
        organizerId: 'organizer-a',
        eventId: 'event-a',
      ),
      sessionId,
    );

    await journal.clear(
      userId: 'host-a',
      organizerId: 'organizer-a',
      eventId: 'event-a',
      sessionId: sessionId,
    );
    expect(
      await journal.load(
        userId: 'host-a',
        organizerId: 'organizer-a',
        eventId: 'event-a',
      ),
      isNull,
    );
  });
}
