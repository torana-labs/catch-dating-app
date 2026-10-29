import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_conversation_history_controller.g.dart';

class HostConversationHistoryState {
  const HostConversationHistoryState({
    this.messages = const [],
    this.cursor,
    this.started = false,
    this.hasMore = true,
    this.loading = false,
    this.error,
  });
  final List<ChatMessage> messages;
  final ConversationMessageCursor? cursor;
  final bool started;
  final bool hasMore;
  final bool loading;
  final Object? error;
  bool canLoadMore(int liveCount) =>
      hasMore && (started || liveCount >= ReadLimitPolicy.historyPage);
}

@riverpod
class HostConversationHistory extends _$HostConversationHistory {
  int _generation = 0;
  @override
  HostConversationHistoryState build(String conversationId) {
    ref.watch(uidProvider);
    _generation++;
    return const HostConversationHistoryState();
  }

  Future<void> loadMore() async {
    final previous = state;
    if (previous.loading || !previous.hasMore) return;
    final generation = _generation;
    state = HostConversationHistoryState(
      messages: previous.messages,
      cursor: previous.cursor,
      started: previous.started,
      loading: true,
    );
    try {
      final repository = ref.read(conversationRepositoryProvider);
      var page = await repository.fetchMessagesPage(
        conversationId: conversationId,
        cursor: previous.cursor,
      );
      final messages = <ChatMessage>[...previous.messages, ...page.messages];
      // Acquire the first cursor before asking for messages older than the live window.
      if (!previous.started &&
          page.hasMore &&
          ref.mounted &&
          generation == _generation) {
        page = await repository.fetchMessagesPage(
          conversationId: conversationId,
          cursor: page.nextCursor,
        );
        messages.addAll(page.messages);
      }
      if (!ref.mounted || generation != _generation) return;
      state = HostConversationHistoryState(
        messages: List.unmodifiable(
          {for (final message in messages) message.id: message}.values,
        ),
        cursor: page.nextCursor,
        started: true,
        hasMore: page.hasMore,
      );
    } on Object catch (error) {
      if (!ref.mounted || generation != _generation) return;
      state = HostConversationHistoryState(
        messages: previous.messages,
        cursor: previous.cursor,
        started: previous.started,
        hasMore: previous.hasMore,
        error: error,
      );
    }
  }
}
