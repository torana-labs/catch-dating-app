import 'package:catch_dating_app/chats/presentation/chat_controller.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

void main() {
  test(
    'sendImage deletes the uploaded image when the message write fails',
    () async {
      final imageRepo = _FakeImageUploadRepository();
      final conversationRepo = _FakeConversationRepository(failSend: true);
      final container = _container(imageRepo, conversationRepo);
      addTearDown(container.dispose);

      final controller = container.read(chatControllerProvider.notifier);

      await expectLater(
        controller.sendImage(matchId: 'match-1', senderId: 'sender-1'),
        throwsA(isA<Exception>()),
      );

      // The orphaned upload must be cleaned up, not left in Storage.
      expect(imageRepo.deletedPaths, [imageRepo.lastStoragePath]);
    },
  );

  test('sendImage leaves the image in place on success', () async {
    final imageRepo = _FakeImageUploadRepository();
    final conversationRepo = _FakeConversationRepository(failSend: false);
    final container = _container(imageRepo, conversationRepo);
    addTearDown(container.dispose);

    final controller = container.read(chatControllerProvider.notifier);
    await controller.sendImage(matchId: 'match-1', senderId: 'sender-1');

    expect(imageRepo.deletedPaths, isEmpty);
    expect(conversationRepo.sentImageUrls, [imageRepo.lastUrl]);
  });

  test('sendImage is a no-op when the user cancels the picker', () async {
    final imageRepo = _FakeImageUploadRepository(pickReturnsNull: true);
    final conversationRepo = _FakeConversationRepository(failSend: false);
    final container = _container(imageRepo, conversationRepo);
    addTearDown(container.dispose);

    final controller = container.read(chatControllerProvider.notifier);
    await controller.sendImage(matchId: 'match-1', senderId: 'sender-1');

    expect(conversationRepo.sentImageUrls, isEmpty);
    expect(imageRepo.deletedPaths, isEmpty);
  });

  test(
    'sendImage propagates upload rejection without writing a message',
    () async {
      final uploadError = Exception('storage permission denied');
      final imageRepo = _FakeImageUploadRepository(uploadError: uploadError);
      final conversationRepo = _FakeConversationRepository(failSend: false);
      final container = _container(imageRepo, conversationRepo);
      addTearDown(container.dispose);

      final controller = container.read(chatControllerProvider.notifier);

      await expectLater(
        controller.sendImage(matchId: 'match-1', senderId: 'sender-1'),
        throwsA(same(uploadError)),
      );

      expect(conversationRepo.sentImageUrls, isEmpty);
      expect(imageRepo.deletedPaths, isEmpty);
    },
  );
}

ProviderContainer _container(
  ImageUploadRepository imageRepo,
  ConversationRepository conversationRepo,
) => ProviderContainer(
  overrides: [
    imageUploadRepositoryProvider.overrideWithValue(imageRepo),
    conversationRepositoryProvider.overrideWithValue(conversationRepo),
  ],
);

class _FakeImageUploadRepository extends Fake implements ImageUploadRepository {
  _FakeImageUploadRepository({this.pickReturnsNull = false, this.uploadError});

  final bool pickReturnsNull;
  final Object? uploadError;
  final deletedPaths = <String>[];
  String lastStoragePath = '';
  String lastUrl = '';

  @override
  Future<XFile?> pickImage({
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    int? imageQuality,
  }) async => pickReturnsNull ? null : XFile('picked.jpg');

  @override
  Future<UploadedImage> uploadChatImageWithMetadata({
    required String matchId,
    required String messageId,
    required String uploaderUid,
    required XFile image,
  }) async {
    if (uploadError case final error?) throw error;
    lastStoragePath = 'matches/$matchId/images/${messageId}_1.jpg';
    lastUrl = 'https://example.com/$messageId.jpg';
    return UploadedImage(url: lastUrl, storagePath: lastStoragePath);
  }

  @override
  Future<void> deleteByPath(String storagePath) async {
    deletedPaths.add(storagePath);
  }
}

class _FakeConversationRepository extends Fake
    implements ConversationRepository {
  _FakeConversationRepository({required this.failSend});

  final bool failSend;
  final sentImageUrls = <String>[];

  @override
  Future<String> createMessageId({required String conversationId}) async =>
      'message-1';

  @override
  Future<void> sendImageMessage({
    required String conversationId,
    required String senderId,
    required String messageId,
    required String imageUrl,
  }) async {
    if (failSend) {
      throw Exception('message write failed');
    }
    sentImageUrls.add(imageUrl);
  }
}
