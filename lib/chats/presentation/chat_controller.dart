import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'chat_controller.g.dart';

/// **Pattern A: Action controller + static Mutations**
///
/// Holds no Riverpod state ([build] returns void). [Mutation]s track the
/// lifecycle of single-shot operations so the UI can show loading spinners
/// and error banners. UI wraps calls in `mutation.run(ref, ...)`.
@riverpod
class ChatController extends _$ChatController {
  static final sendMessageMutation = Mutation<void>();
  static final sendImageMutation = Mutation<void>();
  static final blockUserMutation = Mutation<void>();
  static final reportUserMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> sendMessage({
    required String matchId,
    required String senderId,
    required String text,
    String? messageId,
  }) async {
    await withBackendErrorContext(
      () => ref
          .read(conversationRepositoryProvider)
          .sendTextMessage(
            conversationId: matchId,
            senderId: senderId,
            text: text,
            messageId: messageId,
          ),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'send text message',
        resource: 'conversations',
      ),
    );
  }

  Future<void> sendImage({
    required String matchId,
    required String senderId,
  }) async {
    final imageUploadRepository = ref.read(imageUploadRepositoryProvider);
    final image = await imageUploadRepository.pickImage(
      purpose: ImageUploadPurpose.chatImage,
    );
    if (image == null) return; // User cancelled
    final conversationRepository = ref.read(conversationRepositoryProvider);
    final messageId = await conversationRepository.createMessageId(
      conversationId: matchId,
    );
    final uploaded = await imageUploadRepository.uploadChatImageWithMetadata(
      matchId: matchId,
      messageId: messageId,
      uploaderUid: senderId,
      image: image,
    );
    try {
      await withBackendErrorContext(
        () => conversationRepository.sendImageMessage(
          conversationId: matchId,
          senderId: senderId,
          messageId: messageId,
          imageUrl: uploaded.url,
        ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'send image message',
          resource: 'conversations',
        ),
      );
    } catch (_) {
      // The message write failed, so the uploaded image would orphan in
      // Storage. Compensate by deleting it before surfacing the error.
      await imageUploadRepository.deleteByPath(uploaded.storagePath);
      rethrow;
    }
  }

  Future<void> blockUser({required String targetUserId}) async {
    await ref
        .read(safetyRepositoryProvider)
        .blockUser(targetUserId: targetUserId, source: 'chat');
  }

  Future<void> reportUser({
    required String targetUserId,
    required String matchId,
  }) async {
    await ref
        .read(safetyRepositoryProvider)
        .reportUser(
          targetUserId: targetUserId,
          source: 'chat',
          contextId: matchId,
          reasonCode: 'chat_safety_concern',
        );
  }
}
