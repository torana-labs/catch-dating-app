import 'package:catch_dating_app/chats/presentation/host_chat_screen_state.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/suvbot_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ChatRetryController {
  const ChatRetryController({required this.ref, required this.matchId});

  final WidgetRef ref;
  final String matchId;

  void run(HostChatRetryIntent intent) {
    switch (intent) {
      case HostChatRetryIntent.reloadMatch:
        ref.invalidate(matchStreamProvider(matchId));
      case HostChatRetryIntent.reloadMessages:
        ref.invalidate(watchConversationMessagesProvider(matchId));
      case HostChatRetryIntent.reloadSuvbotActions:
        ref.invalidate(suvbotActionsProvider);
    }
  }
}
