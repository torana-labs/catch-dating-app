import 'dart:async';

import 'package:catch_dating_app/chats/presentation/event_chat_controller.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'event_chat_controller_test.dart' as fixtures;

class ActionRepository extends fixtures.Repository {
  final actions =
      <
        ({
          String uid,
          String messageId,
          EventChatSafetyAction action,
          EventChatReportReason? reason,
          String requestId,
          Completer<void> pending,
        })
      >[];

  @override
  Future<void> actOnMessage(
    String uid,
    String eventId,
    String messageId,
    EventChatSafetyAction action,
    EventChatReportReason? reason,
    String requestId,
  ) {
    final pending = Completer<void>();
    actions.add((
      uid: uid,
      messageId: messageId,
      action: action,
      reason: reason,
      requestId: requestId,
      pending: pending,
    ));
    return pending.future;
  }
}

EventChatPage messagePage({String sender = 'other', bool available = true}) =>
    EventChatPage(
      messages: [
        EventChatMessage(
          messageId: 'reviewed-message',
          sequence: 1,
          sentAt: DateTime.utc(2026),
          senderUid: sender,
          senderName: 'Demo person',
          available: available,
          text: available ? 'Welcome' : null,
          reply: null,
          reactionCounts: const {},
          myReaction: null,
          myReactionRevision: 0,
        ),
      ],
      nextBeforeSequence: null,
      typing: const [],
      ownTypingRevision: 0,
      serverTimeMillis: 0,
      typingHasMore: false,
    );

void main() {
  late ActionRepository repository;
  late ProviderContainer container;
  final provider = eventChatControllerProvider('event');
  setUp(() {
    repository = ActionRepository()..currentPage = messagePage();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((_) => Stream.value('person')),
        eventChatRepositoryProvider.overrideWithValue(repository),
      ],
    );
    container.listen(provider, (_, _) {});
  });
  tearDown(() => container.dispose());

  test(
    'report requires a reason; guests cannot remove someone else’s message',
    () async {
      final state = await container.read(provider.future);
      final controller = container.read(provider.notifier);
      final message = state.messages.single;
      expect(
        await controller.actOnMessage(
          message,
          EventChatSafetyAction.report,
          reviewedUid: 'person',
        ),
        false,
      );
      expect(
        await controller.actOnMessage(
          message,
          EventChatSafetyAction.block,
          reviewedUid: 'person',
          reason: EventChatReportReason.spam,
        ),
        false,
      );
      expect(
        await controller.actOnMessage(
          message,
          EventChatSafetyAction.remove,
          reviewedUid: 'person',
        ),
        false,
      );
      expect(
        await controller.actOnMessage(
          message,
          EventChatSafetyAction.block,
          reviewedUid: 'old-account',
        ),
        false,
      );
      expect(repository.actions, isEmpty);
    },
  );

  test(
    'lost acknowledgement retries the same report and guards double taps',
    () async {
      final state = await container.read(provider.future);
      final controller = container.read(provider.notifier);
      final message = state.messages.single;
      Future<bool> report() => controller.actOnMessage(
        message,
        EventChatSafetyAction.report,
        reviewedUid: 'person',
        reason: EventChatReportReason.spam,
      );
      final first = report();
      expect(await report(), false);
      expect(repository.actions, hasLength(1));
      repository.actions.single.pending.completeError(StateError('lost ack'));
      expect(await first, false);
      await controller.refresh();
      final retry = report();
      expect(
        repository.actions.last.requestId,
        repository.actions.first.requestId,
      );
      expect(repository.actions.last.reason, EventChatReportReason.spam);
      repository.actions.last.pending.complete();
      expect(await retry, true);
    },
  );

  test('changed sender or withdrawn message cannot use an old menu', () async {
    final state = await container.read(provider.future);
    final controller = container.read(provider.notifier);
    final reviewed = state.messages.single;
    repository.currentPage = messagePage(sender: 'different');
    await controller.refresh();
    expect(
      await controller.actOnMessage(
        reviewed,
        EventChatSafetyAction.block,
        reviewedUid: 'person',
      ),
      false,
    );
    repository.currentPage = messagePage(available: false);
    await controller.refresh();
    expect(
      await controller.actOnMessage(
        reviewed,
        EventChatSafetyAction.block,
        reviewedUid: 'person',
      ),
      false,
    );
    expect(repository.actions, isEmpty);
  });

  test('own message can be removed but not reported or blocked', () async {
    repository.currentPage = messagePage(sender: 'person');
    final state = await container.read(provider.future);
    final controller = container.read(provider.notifier);
    final reviewed = state.messages.single;
    expect(
      await controller.actOnMessage(
        reviewed,
        EventChatSafetyAction.report,
        reviewedUid: 'person',
        reason: EventChatReportReason.other,
      ),
      false,
    );
    expect(
      await controller.actOnMessage(
        reviewed,
        EventChatSafetyAction.block,
        reviewedUid: 'person',
      ),
      false,
    );
    final removal = controller.actOnMessage(
      reviewed,
      EventChatSafetyAction.remove,
      reviewedUid: 'person',
    );
    expect(repository.actions.single.action, EventChatSafetyAction.remove);
    repository.actions.single.pending.complete();
    expect(await removal, true);
  });

  test(
    'an account change cannot acknowledge or repeat the previous action',
    () async {
      container.dispose();
      final accounts = StreamController<String?>();
      addTearDown(accounts.close);
      container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((_) => accounts.stream),
          eventChatRepositoryProvider.overrideWithValue(repository),
        ],
      );
      container.listen(provider, (_, _) {});
      accounts.add('person');
      await flushTestEventQueue();
      final initial = await container.read(provider.future);
      final controller = container.read(provider.notifier);
      final message = initial.messages.single;
      final pending = controller.actOnMessage(
        message,
        EventChatSafetyAction.block,
        reviewedUid: 'person',
      );
      accounts.add('new-account');
      await flushTestEventQueue();
      await container.read(provider.future);
      repository.actions.single.pending.complete();
      expect(await pending, false);
      expect(
        await controller.actOnMessage(
          message,
          EventChatSafetyAction.block,
          reviewedUid: 'person',
        ),
        false,
      );
      expect(repository.actions, hasLength(1));
      expect(repository.actions.single.uid, 'person');
      expect(container.read(provider).requireValue.uid, 'new-account');
    },
  );
}
