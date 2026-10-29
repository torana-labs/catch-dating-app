import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/cursor_page.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'chat_repository.g.dart';

String normalizeOutgoingChatText(String text) {
  final normalized = text.trim();
  if (normalized.isEmpty) {
    throw ArgumentError.value(text, 'text', 'Message text must not be empty.');
  }
  return normalized;
}

String buildChatPreviewText(String text, {int maxLength = 80}) {
  if (text.length <= maxLength) return text;
  return '${text.substring(0, maxLength)}…';
}

/// Firestore-backed message store for the current Catch chat schema.
///
/// UI and controllers should usually depend on `ConversationRepository` rather
/// than this class directly. This repository intentionally remains a thin data
/// adapter around `matches/{matchId}/messages`.
class ChatRepository {
  ChatRepository(this._db);

  static const _matchesCollectionPath = 'matches';

  final FirebaseFirestore _db;

  CollectionReference<ChatMessage> _messagesRef(String matchId) => _db
      .collection(_matchesCollectionPath)
      .doc(matchId)
      .collection('messages')
      .withDocumentIdConverter<ChatMessage>(
        idField: 'id',
        fromJson: ChatMessage.fromJson,
        toJson: (msg) => msg.toJson(),
      );

  // ── Read ──────────────────────────────────────────────────────────────────

  Stream<List<ChatMessage>> watchMessages({required String matchId}) =>
      withBackendErrorStream(
        () => _messagesRef(matchId)
            .orderBy('sentAt', descending: true)
            .limit(ReadLimitPolicy.historyPage)
            .snapshots()
            .map(
              (snap) => snap.docs
                  .map((document) => document.data())
                  .toList(growable: false)
                  .reversed
                  .toList(growable: false),
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch chat messages',
          resource: _matchesCollectionPath,
        ),
      );

  /// Fetches one newest-first history page. Consumers prepend older pages
  /// after reversing for chronological presentation.
  Future<CursorPage<ChatMessage, DocumentSnapshot<ChatMessage>>>
  fetchMessagesPage({
    required String matchId,
    DocumentSnapshot<ChatMessage>? startAfter,
    int limit = ReadLimitPolicy.historyPage,
  }) => withBackendErrorContext(
    () async {
      final page = await _messagesRef(matchId)
          .orderBy('sentAt', descending: true)
          .fetchDocumentCursorPage(
            limit: limit,
            startAfter: startAfter,
            errorContext: const BackendErrorContext(
              service: BackendService.firestore,
              action: 'fetch chat message page',
              resource: _matchesCollectionPath,
            ),
          );
      return CursorPage(
        items: List.unmodifiable(page.items.map((document) => document.data())),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'fetch chat message page',
      resource: _matchesCollectionPath,
    ),
  );

  // ── Write ─────────────────────────────────────────────────────────────────

  Future<String> createMessageId({required String matchId}) =>
      withBackendErrorContext(
        () async => _db
            .collection(_matchesCollectionPath)
            .doc(matchId)
            .collection('messages')
            .doc()
            .id,
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'create message id',
          resource: 'messages',
        ),
      );

  Future<void> sendMessage({
    required String matchId,
    required String senderId,
    required String text,
    String? messageId,
  }) => withBackendErrorContext(
    () async {
      final normalizedText = normalizeOutgoingChatText(text);
      final message = _db
          .collection(_matchesCollectionPath)
          .doc(matchId)
          .collection('messages')
          .doc(messageId);
      if (messageId == null) {
        await message.set({
          'senderId': senderId,
          'text': normalizedText,
          'sentAt': FieldValue.serverTimestamp(),
        });
        return;
      }
      await _db.runTransaction((transaction) async {
        final existing = await transaction.get(message);
        if (existing.exists) {
          final data = existing.data()!;
          if (data['senderId'] != senderId ||
              data['text'] != normalizedText ||
              data['imageUrl'] != null) {
            throw StateError(
              'Message operation is already bound to different content.',
            );
          }
          return;
        }
        transaction.set(message, {
          'senderId': senderId,
          'text': normalizedText,
          'sentAt': FieldValue.serverTimestamp(),
        });
      });
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'send message',
      resource: _matchesCollectionPath,
    ),
  );

  /// Sends a message with [imageUrl]. The message text is empty because the UI
  /// renders the image inline.
  Future<void> sendImageMessage({
    required String matchId,
    required String senderId,
    required String messageId,
    required String imageUrl,
  }) => withBackendErrorContext(
    () async {
      await _db
          .collection(_matchesCollectionPath)
          .doc(matchId)
          .collection('messages')
          .doc(messageId)
          .set({
            'senderId': senderId,
            'text': '',
            'imageUrl': imageUrl,
            'sentAt': FieldValue.serverTimestamp(),
          });
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'send image',
      resource: _matchesCollectionPath,
    ),
  );
}

@riverpod
ChatRepository chatRepository(Ref ref) =>
    ChatRepository(ref.watch(firebaseFirestoreProvider));
