import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_conversation_history_controller.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

class _HistoryRepository extends Fake implements ConversationRepository {
  final cursors = <ConversationMessageCursor?>[];
  final requests = <Completer<ConversationMessagePage>>[];
  @override
  Future<ConversationMessagePage> fetchMessagesPage({
    required String conversationId,
    ConversationMessageCursor? cursor,
  }) {
    cursors.add(cursor);
    final response = Completer<ConversationMessagePage>();
    requests.add(response);
    return response.future;
  }
}

void main() {
  final provider = hostConversationHistoryProvider('conversation');
  ProviderContainer containerFor(_HistoryRepository repository) {
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('host')),
        conversationRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    return container;
  }

  test(
    'history gets an opaque cursor before loading beyond the live window',
    () async {
      final firestore = FakeFirebaseFirestore();
      for (var i = 0; i <= ReadLimitPolicy.historyPage; i++) {
        await firestore
            .collection('matches/conversation/messages')
            .doc('$i')
            .set({
              'senderId': 'guest',
              'text': 'Message $i',
              'sentAt': Timestamp.fromDate(
                DateTime(2026, 9).add(Duration(minutes: i)),
              ),
            });
      }
      final storage = FirestoreConversationRepository(
        chatRepository: ChatRepository(firestore),
        matchRepository: MatchRepository(firestore),
      );
      final first = await storage.fetchMessagesPage(
        conversationId: 'conversation',
      );
      expect(first.nextCursor, isNotNull);
      final second = await storage.fetchMessagesPage(
        conversationId: 'conversation',
        cursor: first.nextCursor,
      );
      final repository = _HistoryRepository();
      final container = containerFor(repository);
      final controller = container.read(provider.notifier);
      final loading = controller.loadMore();
      await controller.loadMore();
      expect(repository.cursors, [null]);
      repository.requests.first.complete(first);
      await flushTestEventQueue();
      expect(repository.cursors, [null, first.nextCursor]);
      repository.requests.last.complete(
        ConversationMessagePage(
          messages: [first.messages.first, ...second.messages],
        ),
      );
      await loading;
      final state = container.read(provider);
      expect(state.messages, hasLength(ReadLimitPolicy.historyPage + 1));
      expect(state.hasMore, isFalse);
      expect(state.error, isNull);
      await controller.loadMore();
      expect(repository.requests, hasLength(2));
    },
  );

  test(
    'history failure is retryable and account changes discard late replies',
    () async {
      final repository = _HistoryRepository();
      final container = containerFor(repository);
      final controller = container.read(provider.notifier);
      var loading = controller.loadMore();
      repository.requests.last.completeError(StateError('offline'));
      await loading;
      expect(container.read(provider).error, isNotNull);
      expect(container.read(provider).loading, isFalse);
      loading = controller.loadMore();
      container.updateOverrides([
        uidProvider.overrideWithValue(const AsyncData('other-host')),
        conversationRepositoryProvider.overrideWithValue(repository),
      ]);
      await container.pump();
      repository.requests.last.complete(
        const ConversationMessagePage(
          messages: [
            ChatMessage(
              id: 'private',
              senderId: 'guest',
              text: 'Private history',
            ),
          ],
        ),
      );
      await loading;
      expect(container.read(provider).messages, isEmpty);
      expect(container.read(provider).started, isFalse);
      expect(container.read(provider).error, isNull);
    },
  );
}
