import 'dart:async';

import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';

class FakeConversationRepository implements ConversationRepository {
  FakeConversationRepository({
    this.failSends = false,
    this.messageStream,
    this.sendCompleter,
  });

  final bool failSends;
  final Stream<List<ChatMessage>>? messageStream;
  final Completer<void>? sendCompleter;
  final Map<String, List<ChatMessage>> messagesByMatch = {};
  final List<(String matchId, String senderId, String text)> sendCalls = [];
  final List<(String matchId, String uid)> markReadCalls = [];

  @override
  Future<ConversationMessagePage> fetchMessagesPage({
    required String conversationId,
    ConversationMessageCursor? cursor,
  }) async => const ConversationMessagePage(messages: []);

  @override
  Future<void> sendTextMessage({
    required String conversationId,
    required String senderId,
    required String text,
    String? messageId,
  }) async {
    sendCalls.add((conversationId, senderId, text));
    await sendCompleter?.future;
    if (failSends) {
      throw Exception('send failed');
    }
  }

  @override
  Stream<List<ChatMessage>> watchMessages({required String conversationId}) {
    return messageStream ??
        Stream.value(messagesByMatch[conversationId] ?? const []);
  }

  @override
  Future<String> createMessageId({required String conversationId}) async =>
      'message-1';

  @override
  Future<void> sendImageMessage({
    required String conversationId,
    required String senderId,
    required String messageId,
    required String imageUrl,
  }) async {}

  @override
  Future<void> markRead({
    required String conversationId,
    required String uid,
  }) async {
    markReadCalls.add((conversationId, uid));
  }
}
