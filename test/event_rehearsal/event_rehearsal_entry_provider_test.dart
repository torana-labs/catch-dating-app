import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_entry_view_model.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../organizers/organizers_test_helpers.dart' show buildOrganizer;
import 'event_rehearsal_configuration_test.dart' show rehearsalSourceEvent;

void main() {
  test(
    'custom practice never reads an unrelated upcoming event roster',
    () async {
      var sourceReads = 0;
      final container = ProviderContainer.test(
        retry: (_, _) => null,
        overrides: [
          organizersRepositoryProvider.overrideWithValue(_Organizers()),
          eventRepositoryProvider.overrideWithValue(
            _Events(rehearsalSourceEvent()),
          ),
          eventRehearsalSourcePlanProvider('event-1').overrideWith((ref) async {
            sourceReads++;
            throw StateError('Unrelated roster unavailable');
          }),
        ],
      );
      container.listen(eventRehearsalEntryProvider('club-1', null), (_, _) {});
      final data = await container.read(
        eventRehearsalEntryProvider('club-1', null).future,
      );
      expect(data.events, hasLength(1));
      expect(data.initialConfiguration.sourceEvent, isNull);
      expect(data.initialConfiguration.useSimulatedGuests, isTrue);
      expect(sourceReads, 0);
    },
  );

  test(
    'explicit event failure remains an error, not sample defaults',
    () async {
      final container = ProviderContainer.test(
        retry: (_, _) => null,
        overrides: [
          organizersRepositoryProvider.overrideWithValue(_Organizers()),
          eventRepositoryProvider.overrideWithValue(
            _Events(rehearsalSourceEvent()),
          ),
          eventRehearsalSourcePlanProvider(
            'event-1',
          ).overrideWith((ref) async => throw StateError('Roster unavailable')),
        ],
      );
      container.listen(
        eventRehearsalEntryProvider('club-1', 'event-1'),
        (_, _) {},
      );
      await expectLater(
        container.read(eventRehearsalEntryProvider('club-1', 'event-1').future),
        throwsA(
          isA<StateError>().having(
            (error) => error.message,
            'message',
            'Roster unavailable',
          ),
        ),
      );
    },
  );

  test('another organizer event is rejected before reading roster', () async {
    var sourceReads = 0;
    final container = ProviderContainer.test(
      retry: (_, _) => null,
      overrides: [
        organizersRepositoryProvider.overrideWithValue(_Organizers()),
        eventRepositoryProvider.overrideWithValue(
          _Events(rehearsalSourceEvent().copyWith(clubId: 'other')),
        ),
        eventRehearsalSourcePlanProvider('event-1').overrideWith((ref) async {
          sourceReads++;
          return (plan: null, guestCount: 18);
        }),
      ],
    );
    container.listen(
      eventRehearsalEntryProvider('club-1', 'event-1'),
      (_, _) {},
    );
    await expectLater(
      container.read(eventRehearsalEntryProvider('club-1', 'event-1').future),
      throwsA(isA<PermissionException>()),
    );
    expect(sourceReads, 0);
  });
}

class _Organizers extends Fake implements OrganizersRepository {
  @override
  Future<Organizer?> fetchOrganizer(String id) async =>
      buildOrganizer().copyWith(id: id);
}

class _Events extends Fake implements EventRepository {
  _Events(this.event);
  final Event event;
  @override
  Future<List<Event>> fetchUpcomingEventsForOrganizers(
    List<String> organizerIds,
  ) async => [event];
  @override
  Future<Event?> fetchEvent(String id) async => event;
}
