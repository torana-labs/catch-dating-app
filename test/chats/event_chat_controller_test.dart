import 'dart:async';

import 'package:catch_dating_app/chats/presentation/event_chat_controller.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

EventChatAccess roomAccess({bool admitted = true, bool join = false}) =>
    EventChatAccess(
      eventId: 'event',
      title: 'Demo event',
      organizerId: 'org',
      roomStatus: 'open',
      roomRevision: 1,
      membershipStatus: join ? 'notJoined' : 'joined',
      membershipRevision: 1,
      canManage: false,
      canJoin: admitted,
      canReadMessages: admitted && !join,
      profileClaimRequired: false,
      termsVersion: 'event-chat-v1',
    );
EventChatMessage message(String text, {int sequence = 1, int revision = 0}) =>
    EventChatMessage(
      messageId: 'message-$sequence',
      sequence: sequence,
      sentAt: DateTime.utc(2026),
      senderUid: 'person',
      senderName: 'Sara',
      available: true,
      text: text,
      reply: null,
      reactionCounts: const {},
      myReaction: null,
      myReactionRevision: revision,
    );
EventChatPage page(
  String text, {
  int? cursor,
  int typingRevision = 0,
  int sequence = 1,
}) => EventChatPage(
  messages: [message(text, sequence: sequence)],
  nextBeforeSequence: cursor,
  typing: const [],
  ownTypingRevision: typingRevision,
  serverTimeMillis: 1000,
  typingHasMore: false,
);

class Repository extends Fake implements EventChatRepository {
  EventChatAccess available = roomAccess();
  EventChatPage currentPage = page('Initial');
  Object? readError;
  Completer<EventChatPage>? deferredRead;
  final cursors = <int?>[];
  final history = <int, EventChatPage>{};
  final sends = <(String, String?, String, Completer<void>)>[];
  final reactions = <(EventChatMessage, EventChatReaction?, String)>[];
  final typings = <(bool, int, Completer<int>)>[];
  @override
  Future<EventChatAccess> access(String eventId) async => available;
  @override
  Future<EventChatPage> messages(String eventId, {int? beforeSequence}) async {
    cursors.add(beforeSequence);
    if (readError != null) throw readError!;
    if (deferredRead case final pending?) {
      deferredRead = null;
      return pending.future;
    }
    return history[beforeSequence] ?? currentPage;
  }

  @override
  Future<void> send(
    String uid,
    String eventId,
    String text,
    String? replyToMessageId,
    String requestId,
  ) {
    final pending = Completer<void>();
    sends.add((text, replyToMessageId, requestId, pending));
    return pending.future;
  }

  @override
  Future<void> react(
    String uid,
    String eventId,
    EventChatMessage message,
    EventChatReaction? reaction,
    String requestId,
  ) async {
    reactions.add((message, reaction, requestId));
  }

  @override
  Future<int> typing(
    String uid,
    String eventId,
    bool isTyping,
    int expectedRevision,
  ) {
    final pending = Completer<int>();
    typings.add((isTyping, expectedRevision, pending));
    return pending.future;
  }
}

void main() {
  late Repository repository;
  late ProviderContainer container;
  late DateTime now;
  final provider = eventChatControllerProvider('event');
  setUp(() {
    repository = Repository();
    now = DateTime.utc(2026);
    container = ProviderContainer(
      overrides: [
        eventChatNowProvider.overrideWithValue(() => now),
        uidProvider.overrideWith((ref) => Stream.value('person')),
        eventChatRepositoryProvider.overrideWithValue(repository),
      ],
    );
    container.listen(provider, (_, _) {});
  });
  tearDown(() => container.dispose());

  test('lost send acknowledgement retries the exact payload ID once', () async {
    await container.read(provider.future);
    final controller = container.read(provider.notifier);
    final first = controller.send(' Hello ', reviewedUid: 'person');
    expect(await controller.send('Hello', reviewedUid: 'person'), false);
    expect(repository.sends, hasLength(1));
    repository.sends.last.$4.completeError(StateError('connection lost'));
    expect(await first, false);
    expect(container.read(provider).hasError, true);
    await controller.refresh();
    final retry = controller.send('Hello', reviewedUid: 'person');
    expect(repository.sends.last.$3, repository.sends.first.$3);
    repository.sends.last.$4.complete();
    expect(await retry, true);
    expect(repository.sends.last.$1, 'Hello');
  });

  test(
    'failed authority refresh removes messages and disables new writes',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      repository.readError = StateError('access denied');
      await controller.refresh();
      expect(container.read(provider).asData, isNull);
      expect(
        await controller.send('Cannot leak', reviewedUid: 'person'),
        false,
      );
      expect(repository.sends, isEmpty);
      repository.readError = null;
      repository.available = roomAccess(admitted: false);
      await controller.refresh();
      final state = container.read(provider).requireValue;
      expect(state.messages, isEmpty);
      expect(state.canSend, false);
    },
  );

  test('late read cannot restore content after backgrounding', () async {
    await container.read(provider.future);
    final controller = container.read(provider.notifier);
    final deferred = Completer<EventChatPage>();
    repository.deferredRead = deferred;
    final refresh = controller.refresh();
    await flushTestEventQueue();
    controller.setForeground(false);
    deferred.complete(page('Late private content'));
    await refresh;
    expect(container.read(provider).asData, isNull);
    expect(await controller.send('No', reviewedUid: 'person'), false);
    controller.setForeground(true);
    await flushTestEventQueue();
    expect(
      container.read(provider).requireValue.messages.single.text,
      'Initial',
    );
  });

  test(
    'new message snapshot and reaction revision replace stale copies',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      final old = container.read(provider).requireValue.messages.single;
      repository.currentPage = EventChatPage(
        messages: [message('Redacted/replaced', revision: 2)],
        nextBeforeSequence: null,
        typing: const [],
        ownTypingRevision: 0,
        serverTimeMillis: 1000,
        typingHasMore: false,
      );
      await controller.refresh();
      expect(
        await controller.react(
          old,
          EventChatReaction.love,
          reviewedUid: 'person',
        ),
        false,
      );
      expect(repository.reactions, isEmpty);
      final current = container.read(provider).requireValue.messages.single;
      expect(
        await controller.react(
          current,
          EventChatReaction.love,
          reviewedUid: 'person',
        ),
        true,
      );
      expect(repository.reactions.single.$1.myReactionRevision, 2);
    },
  );

  test(
    'older history is re-read rather than retaining stale reply copies',
    () async {
      repository.currentPage = page('Newest', cursor: 3, sequence: 3);
      repository.history[3] = page('Older', sequence: 2);
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      final earlier = controller.loadEarlier();
      await controller.loadEarlier();
      await earlier;
      expect(repository.cursors, [null, null, 3]);
      expect(
        container.read(provider).requireValue.messages.map((m) => m.text),
        ['Newest', 'Older'],
      );
      repository.history[3] = page('Now unavailable', sequence: 2);
      await controller.refresh();
      expect(
        container.read(provider).requireValue.messages.map((m) => m.text),
        ['Newest', 'Now unavailable'],
      );
      expect(repository.cursors, [null, null, 3, null, 3]);
    },
  );

  test(
    'in-flight typing start is followed by stop with acknowledged revision',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      controller.draftChanged(true);
      controller.draftChanged(false);
      expect(repository.typings, hasLength(1));
      repository.typings[0].$3.complete(1);
      await flushTestEventQueue();
      expect(repository.typings, hasLength(2));
      expect(repository.typings[1].$1, false);
      expect(repository.typings[1].$2, 1);
      repository.typings[1].$3.complete(2);
      await flushTestEventQueue();
      await controller.refresh();
      expect(repository.typings, hasLength(2));
    },
  );

  test(
    'an idle unsent draft stops typing instead of sending heartbeats',
    () async {
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      controller.draftChanged(true);
      repository.typings.last.$3.complete(1);
      await flushTestEventQueue();
      now = now.add(const Duration(seconds: 7));
      await controller.refresh();
      expect(repository.typings, hasLength(2));
      expect(repository.typings.last.$1, false);
      repository.typings.last.$3.complete(2);
      await flushTestEventQueue();
      now = now.add(const Duration(seconds: 7));
      await controller.refresh();
      expect(repository.typings, hasLength(2));
    },
  );

  test('typing expiry uses server time even when device clock differs', () {
    final received = DateTime.utc(2030);
    final state = EventChatState(
      uid: 'person',
      access: roomAccess(),
      messages: [],
      typing: [
        const EventChatTyping(
          uid: 'other',
          displayName: 'Alex',
          expiresAtMillis: 2000,
        ),
      ],
      nextBeforeSequence: null,
      receivedAt: received,
      serverTimeMillis: 1000,
    );
    expect(state.typingAt(received), hasLength(1));
    expect(state.typingAt(received.add(const Duration(seconds: 2))), isEmpty);
  });

  test(
    'a previous account cannot replace current messages or clear its state',
    () async {
      container.dispose();
      final accounts = StreamController<String?>();
      addTearDown(accounts.close);
      container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          eventChatRepositoryProvider.overrideWithValue(repository),
        ],
      );
      container.listen(provider, (_, _) {});
      accounts.add('person');
      await flushTestEventQueue();
      await container.read(provider.future);
      final controller = container.read(provider.notifier);
      final pending = controller.send(
        'Only account one',
        reviewedUid: 'person',
      );
      accounts.add('other');
      repository.currentPage = page('Account two');
      await flushTestEventQueue();
      await container.read(provider.future);
      repository.sends.last.$4.complete();
      expect(await pending, false);
      expect(container.read(provider).requireValue.uid, 'other');
      expect(
        await controller.send('Old screen draft', reviewedUid: 'person'),
        false,
      );
      expect(
        await controller.updateAccess(
          EventChatAction.leave,
          reviewedUid: 'person',
        ),
        false,
      );
      expect(
        await controller.react(
          container.read(provider).requireValue.messages.single,
          EventChatReaction.love,
          reviewedUid: 'person',
        ),
        false,
      );
      expect(repository.sends, hasLength(1));
      expect(
        container.read(provider).requireValue.messages.single.text,
        'Account two',
      );
    },
  );
}
