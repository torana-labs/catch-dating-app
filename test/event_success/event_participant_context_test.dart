import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_participant_context_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_participant_context.dart';
import 'package:catch_dating_app/event_success/presentation/event_participant_context_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const eventId = 'context-event', uid = 'context-guest';
Map<String, Object?> sample(String name) =>
    (jsonDecode(
              File(
                'test/event_success/fixtures/participant_context.json',
              ).readAsStringSync(),
            )
            as Map)[name]
        as Map<String, Object?>;
EventParticipantContext snapshot(String name) =>
    EventParticipantContext.fromCallableData(
      sample(name),
      eventId: eventId,
      subjectUid: uid,
    );
void main() {
  test(
    'reads actual server projections without inventing a selected attendee',
    () {
      expect(snapshot('unlinked').identity, isA<EventParticipantUnlinked>());
      expect(snapshot('ambiguous').identity, isA<EventParticipantAmbiguous>());
      final linked = snapshot('linked').identity as EventParticipantLinked;
      expect(linked.scope.attendeeId, 'own');
      expect(linked.scope.organizerId, 'context-organizer');
    },
  );
  test(
    'foreign identity, extra candidate data and inconsistent shapes fail',
    () {
      for (final mutate in <void Function(Map<String, Object?>)>[
        (m) => m['eventId'] = 'another-event',
        (m) => m['subjectUid'] = 'another-user',
        (m) => m['serverTime'] = -1,
        (m) => (m['resolution'] as Map)['kind'] = 'ambiguous',
        (m) => (m['resolution'] as Map)['phoneE164'] = '+919999999999',
        (m) => (m['resolution'] as Map)['sourceHash'] = 'bad',
        (m) => m['resolution'] = {'kind': 'unknown'},
      ]) {
        final raw = sample('linked');
        mutate(raw);
        expect(
          () => EventParticipantContext.fromCallableData(
            raw,
            eventId: eventId,
            subjectUid: uid,
          ),
          throwsFormatException,
        );
      }
    },
  );
  test('refresh retires the old link before resolving a new source', () async {
    final repository = _Repository();
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(uid)),
        eventParticipantContextRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
      ],
    );
    addTearDown(container.dispose);
    final query = eventParticipantContextReaderProvider(eventId);
    container.listen(query, (_, _) {});
    await container.pump();
    expect(container.read(query).error, isNull);
    await repository.waitForReads(1);
    repository.reads.single.complete(snapshot('linked'));
    await container.pump();
    final old = container.read(query).requireValue;
    container.read(query.notifier).reload();
    await container.pump();
    expect(old.isCurrent, isFalse);
    expect(container.read(query).isLoading, isTrue);
    repository.reads.last.complete(snapshot('ambiguous'));
    await container.pump();
    expect(
      container.read(query).requireValue.view.identity,
      isA<EventParticipantAmbiguous>(),
    );
  });
  test('same UID re-entry cannot revive a late old-account identity', () async {
    final auth = StreamController<String?>.broadcast();
    final repository = _Repository();
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventParticipantContextRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
      ],
    );
    addTearDown(() => container.dispose());
    addTearDown(auth.close);
    final query = eventParticipantContextReaderProvider(eventId);
    container.listen(query, (_, _) {});
    await container.pump();
    auth.add(uid);
    await container.pump();
    expect(container.read(query).error, isNull);
    await repository.waitForReads(1);
    expect(repository.reads, hasLength(1));
    auth.add(null);
    await container.pump();
    expect(container.read(query).hasError, isTrue);
    auth.add(uid);
    await container.pump();
    await repository.waitForReads(2);
    expect(repository.reads, hasLength(2));
    repository.reads.last.complete(snapshot('unlinked'));
    await container.pump();
    final current = container.read(query).requireValue;
    repository.reads.first.complete(snapshot('linked'));
    await container.pump();
    expect(container.read(query).requireValue, same(current));
    expect(current.view.identity, isA<EventParticipantUnlinked>());
  });
}

class _Repository extends Fake implements EventParticipantContextRepository {
  Completer<void> _changed = Completer<void>();
  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 5));
    }
  }

  final reads = <Completer<EventParticipantContext>>[];
  @override
  Future<EventParticipantContext> fetch({
    required String eventId,
    required String subjectUid,
  }) {
    final result = Completer<EventParticipantContext>();
    reads.add(result);
    _changed.complete();
    _changed = Completer<void>();
    return result.future;
  }
}
