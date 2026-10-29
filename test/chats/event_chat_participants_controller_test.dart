import 'dart:async';

import 'package:catch_dating_app/chats/presentation/event_chat_participants_controller.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_participant.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

EventChatParticipantPage page(String name, {bool more = false}) =>
    EventChatParticipantPage(
      items: name.isEmpty
          ? []
          : [EventChatParticipant(uid: name, displayName: name, isHost: false)],
      nextCursor: more
          ? {'after': 'cursor', 'eventId': 'event', 'accountUid': 'me'}
          : null,
    );

class ParticipantsRepository extends Fake implements EventChatRepository {
  final reads = <({String uid, Map<String, Object?>? cursor})>[];
  Future<EventChatParticipantPage> Function(String, Map<String, Object?>?)
  read = (_, _) async => page('Sara');
  @override
  Future<EventChatAccess> access(String eventId) async => EventChatAccess(
    eventId: eventId,
    title: 'Event',
    organizerId: 'org',
    roomStatus: 'open',
    roomRevision: 1,
    membershipStatus: 'joined',
    membershipRevision: 1,
    canManage: false,
    canJoin: true,
    canReadMessages: true,
    profileClaimRequired: false,
    termsVersion: 'event-chat-v1',
  );
  @override
  Future<EventChatParticipantPage> participants(
    String uid,
    String eventId, {
    Map<String, Object?>? cursor,
  }) {
    reads.add((uid: uid, cursor: cursor));
    return read(uid, cursor);
  }
}

void main() {
  final provider = eventChatParticipantsControllerProvider('event');
  late ParticipantsRepository repo;
  late ProviderContainer container;
  ProviderContainer create({Stream<String?>? accounts}) => ProviderContainer(
    overrides: [
      uidProvider.overrideWith((_) => accounts ?? Stream.value('me')),
      eventChatRepositoryProvider.overrideWithValue(repo),
    ],
  );
  setUp(() {
    repo = ParticipantsRepository();
    container = create();
  });
  tearDown(() => container.dispose());
  test(
    'empty filtered scans can continue; every loaded page is revalidated',
    () async {
      repo.read = (_, cursor) async =>
          cursor == null ? page('', more: true) : page('Sara');
      container.listen(provider, (_, _) {});
      final first = await container.read(provider.future);
      expect(first.page.items, isEmpty);
      await container.read(provider.notifier).loadMore();
      expect(
        container.read(provider).requireValue.page.items.single.displayName,
        'Sara',
      );
      expect(repo.reads.map((r) => r.cursor?['after']), [null, null, 'cursor']);
      repo.read = (_, _) async => page('Fresh');
      await container.read(provider.notifier).refresh();
      expect(
        container.read(provider).requireValue.page.items.single.displayName,
        'Fresh',
      );
    },
  );
  test('authority failure removes all loaded names', () async {
    container.listen(provider, (_, _) {});
    await container.read(provider.future);
    repo.read = (_, _) async => throw StateError('revoked');
    await container.read(provider.notifier).refresh();
    expect(container.read(provider).hasError, true);
    expect(container.read(provider).asData, isNull);
  });
  test('background hides names; a late old read cannot restore them', () async {
    container.listen(provider, (_, _) {});
    await container.read(provider.future);
    final pending = Completer<EventChatParticipantPage>();
    repo.read = (_, _) => pending.future;
    final c = container.read(provider.notifier);
    final old = c.refresh();
    c.setForeground(false);
    pending.complete(page('Old'));
    await old;
    expect(container.read(provider).asData, isNull);
    repo.read = (_, _) async => page('Fresh');
    c.setForeground(true);
    await flushTestEventQueue();
    expect(
      container.read(provider).requireValue.page.items.single.displayName,
      'Fresh',
    );
  });
  test(
    'account change resets pagination and ignores a pending old account read',
    () async {
      container.dispose();
      final accounts = StreamController<String?>();
      addTearDown(accounts.close);
      container = create(accounts: accounts.stream);
      container.listen(provider, (_, _) {});
      accounts.add('me');
      await flushTestEventQueue();
      await container.read(provider.future);
      final pending = Completer<EventChatParticipantPage>();
      repo.read = (_, _) => pending.future;
      final old = container.read(provider.notifier).refresh();
      repo.read = (_, _) async => page('Current');
      accounts.add('other');
      await flushTestEventQueue();
      await container.read(provider.future);
      pending.complete(page('Old private'));
      await old;
      expect(container.read(provider).requireValue.uid, 'other');
      expect(
        container.read(provider).requireValue.page.items.single.displayName,
        'Current',
      );
      expect(repo.reads.last.uid, 'other');
      expect(repo.reads.last.cursor, isNull);
    },
  );
}
