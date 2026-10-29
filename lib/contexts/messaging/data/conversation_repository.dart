import 'package:catch_dating_app/contexts/connections/connections.dart';
import 'package:catch_dating_app/contexts/messaging/data/chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'conversation_repository.g.dart';

/// Opaque history position. Only the repository can construct storage cursors.
final class ConversationMessageCursor {
  const ConversationMessageCursor._(this._document);
  final DocumentSnapshot<ChatMessage> _document;
}

final class ConversationMessagePage {
  const ConversationMessagePage({required this.messages, this.nextCursor});
  final List<ChatMessage> messages;
  final ConversationMessageCursor? nextCursor;
  bool get hasMore => nextCursor != null;
}

/// App-facing conversation boundary.
///
/// The current implementation is backed by `matches/{matchId}/messages`, but
/// presentation code should depend on this contract instead of the Firestore
/// message store. If Catch later moves to Stream, Sendbird, or another chat
/// backend, this is the seam that should absorb the migration.
abstract interface class ConversationRepository {
  Stream<List<ChatMessage>> watchMessages({required String conversationId});

  Future<ConversationMessagePage> fetchMessagesPage({
    required String conversationId,
    ConversationMessageCursor? cursor,
  });

  Future<String> createMessageId({required String conversationId});

  Future<void> sendTextMessage({
    required String conversationId,
    required String senderId,
    required String text,
    String? messageId,
  });

  Future<void> sendImageMessage({
    required String conversationId,
    required String senderId,
    required String messageId,
    required String imageUrl,
  });

  Future<void> markRead({required String conversationId, required String uid});
}

class FirestoreConversationRepository implements ConversationRepository {
  const FirestoreConversationRepository({
    required this._chatRepository,
    required this._matchRepository,
  });

  final ChatRepository _chatRepository;
  final MatchRepository _matchRepository;

  @override
  Stream<List<ChatMessage>> watchMessages({required String conversationId}) =>
      _chatRepository.watchMessages(matchId: conversationId);

  @override
  Future<ConversationMessagePage> fetchMessagesPage({
    required String conversationId,
    ConversationMessageCursor? cursor,
  }) async {
    final page = await _chatRepository.fetchMessagesPage(
      matchId: conversationId,
      startAfter: cursor?._document,
    );
    return ConversationMessagePage(
      messages: page.items,
      nextCursor: page.nextCursor == null
          ? null
          : ConversationMessageCursor._(page.nextCursor!),
    );
  }

  @override
  Future<String> createMessageId({required String conversationId}) =>
      _chatRepository.createMessageId(matchId: conversationId);

  @override
  Future<void> sendTextMessage({
    required String conversationId,
    required String senderId,
    required String text,
    String? messageId,
  }) => _chatRepository.sendMessage(
    matchId: conversationId,
    senderId: senderId,
    text: text,
    messageId: messageId,
  );

  @override
  Future<void> sendImageMessage({
    required String conversationId,
    required String senderId,
    required String messageId,
    required String imageUrl,
  }) => _chatRepository.sendImageMessage(
    matchId: conversationId,
    senderId: senderId,
    messageId: messageId,
    imageUrl: imageUrl,
  );

  @override
  Future<void> markRead({
    required String conversationId,
    required String uid,
  }) => withBackendErrorContext(
    () => _matchRepository.resetUnread(matchId: conversationId, uid: uid),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'mark conversation read',
      resource: 'matches',
    ),
  );
}

@riverpod
ConversationRepository conversationRepository(Ref ref) =>
    FirestoreConversationRepository(
      chatRepository: ref.watch(chatRepositoryProvider),
      matchRepository: ref.watch(matchRepositoryProvider),
    );

@riverpod
Stream<List<ChatMessage>> watchConversationMessages(
  Ref ref,
  String conversationId,
) => ref
    .watch(conversationRepositoryProvider)
    .watchMessages(conversationId: conversationId);
