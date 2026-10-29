import 'dart:async';

import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeConversationRepository extends Fake
    implements ConversationRepository {
  final messagesByMatch = <String, List<ChatMessage>>{};

  @override
  Stream<List<ChatMessage>> watchMessages({required String conversationId}) =>
      Stream.value(messagesByMatch[conversationId] ?? const []);
}

ChatMessage _buildMessage({
  String id = 'message-1',
  String senderId = 'runner-1',
  String text = 'Hello there',
  DateTime? sentAt,
}) {
  return ChatMessage(
    id: id,
    senderId: senderId,
    text: text,
    sentAt: sentAt ?? DateTime(2025, 1, 1, 7, 30),
  );
}

void main() {
  group('normalizeOutgoingChatText', () {
    test('trims surrounding whitespace', () {
      expect(normalizeOutgoingChatText('  hello there  '), 'hello there');
    });

    test('rejects blank messages', () {
      expect(
        () => normalizeOutgoingChatText('   \n\t  '),
        throwsA(isA<ArgumentError>()),
      );
    });
  });

  group('buildChatPreviewText', () {
    test('returns the original text when it fits', () {
      expect(buildChatPreviewText('Hello'), 'Hello');
    });

    test('truncates long text with an ellipsis', () {
      final longText = 'a' * 100;

      final preview = buildChatPreviewText(longText);

      expect(preview, '${'a' * 80}…');
      expect(preview.length, 81);
    });
  });

  group('ChatRepository', () {
    late FakeFirebaseFirestore firestore;
    late ChatRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      repository = ChatRepository(firestore);
    });

    test('watchMessages orders by sentAt and maps snapshot data', () async {
      final firstMessage = _buildMessage(text: 'First');
      final secondMessage = _buildMessage(
        id: 'message-2',
        text: 'Second',
        sentAt: DateTime(2025, 1, 1, 8),
      );
      await _seedMessage(firestore, 'match-1', secondMessage);
      await _seedMessage(firestore, 'match-1', firstMessage);

      await expectLater(
        repository.watchMessages(matchId: 'match-1'),
        emits([firstMessage, secondMessage]),
      );
    });

    test('sendMessage writes only the message document', () async {
      await repository.sendMessage(
        matchId: 'match-1',
        senderId: 'runner-1',
        text: '  hello there  ',
      );

      final messages = await repository.watchMessages(matchId: 'match-1').first;
      expect(messages, hasLength(1));
      expect(messages.single.senderId, 'runner-1');
      expect(messages.single.text, 'hello there');
      expect(messages.single.sentAt, isA<DateTime>());
    });

    test(
      'a stable send operation is idempotent and rejects conflicting reuse',
      () async {
        await repository.sendMessage(
          matchId: 'match-1',
          senderId: 'runner-1',
          text: 'Hello',
          messageId: 'operation-1',
        );
        await repository.sendMessage(
          matchId: 'match-1',
          senderId: 'runner-1',
          text: 'Hello',
          messageId: 'operation-1',
        );
        expect(
          await repository.watchMessages(matchId: 'match-1').first,
          hasLength(1),
        );
        await expectLater(
          repository.sendMessage(
            matchId: 'match-1',
            senderId: 'runner-1',
            text: 'Changed',
            messageId: 'operation-1',
          ),
          throwsA(anything),
        );
        final messages = await repository
            .watchMessages(matchId: 'match-1')
            .first;
        expect(messages.single.text, 'Hello');
        await repository.sendMessage(
          matchId: 'match-2',
          senderId: 'runner-1',
          text: 'Hello',
          messageId: 'operation-1',
        );
        expect(
          await repository.watchMessages(matchId: 'match-2').first,
          hasLength(1),
        );
      },
    );

    test('sendImageMessage stores the already-uploaded image URL', () async {
      await repository.sendImageMessage(
        matchId: 'match-1',
        senderId: 'runner-1',
        messageId: 'message-1',
        imageUrl: 'https://storage.test/chat-image.jpg',
      );

      final messages = await repository.watchMessages(matchId: 'match-1').first;
      expect(messages.single.imageUrl, 'https://storage.test/chat-image.jpg');
      expect(messages.single.text, isEmpty);
    });
  });

  group('FirestoreConversationRepository', () {
    late FakeFirebaseFirestore firestore;
    late FirestoreConversationRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      repository = FirestoreConversationRepository(
        chatRepository: ChatRepository(firestore),
        matchRepository: MatchRepository(firestore),
      );
    });

    test('sends text through the conversation boundary', () async {
      await repository.sendTextMessage(
        conversationId: 'match-1',
        senderId: 'runner-1',
        text: '  hello from the boundary  ',
      );

      final messages = await repository
          .watchMessages(conversationId: 'match-1')
          .first;

      expect(messages, hasLength(1));
      expect(messages.single.senderId, 'runner-1');
      expect(messages.single.text, 'hello from the boundary');
    });

    test('marks a conversation read through match metadata', () async {
      await firestore.collection('matches').doc('match-1').set({
        'user1Id': 'runner-1',
        'user2Id': 'runner-2',
        'eventIds': <String>[],
        'createdAt': Timestamp.fromDate(DateTime(2026, 5, 9)),
        'unreadCounts': {'runner-1': 4},
      });

      await repository.markRead(conversationId: 'match-1', uid: 'runner-1');

      final matchDoc = await firestore
          .collection('matches')
          .doc('match-1')
          .get();
      final data = matchDoc.data();
      expect(data?['unreadCounts'], {'runner-1': 0});
    });
  });

  test(
    'watchConversationMessagesProvider streams messages from the repository',
    () async {
      final fakeRepository = _FakeConversationRepository();
      final message = _buildMessage();
      final container = ProviderContainer(
        overrides: [
          conversationRepositoryProvider.overrideWithValue(fakeRepository),
        ],
      );
      addTearDown(container.dispose);
      fakeRepository.messagesByMatch['match-1'] = [message];
      final subscription = container.listen<AsyncValue<List<ChatMessage>>>(
        watchConversationMessagesProvider('match-1'),
        (_, _) {},
      );
      addTearDown(subscription.close);

      final messages = await container.read(
        watchConversationMessagesProvider('match-1').future,
      );

      expect(messages, [message]);
    },
  );

  test(
    'watchConversationMessagesProvider auto-disposes route listeners when unwatched',
    () async {
      final message = _buildMessage();
      final cancelCompleter = Completer<void>();
      final messagesController = StreamController<List<ChatMessage>>(
        onCancel: () {
          if (!cancelCompleter.isCompleted) cancelCompleter.complete();
        },
      );
      addTearDown(() async {
        if (!cancelCompleter.isCompleted) await messagesController.close();
      });

      final container = ProviderContainer(
        overrides: [
          conversationRepositoryProvider.overrideWithValue(
            _LifecycleConversationRepository(messagesController.stream),
          ),
        ],
      );
      addTearDown(container.dispose);

      final provider = watchConversationMessagesProvider('match-1');
      final subscription = container.listen(provider, (_, _) {});

      messagesController.add([message]);
      await container.pump();
      expect(subscription.read().value, [message]);

      subscription.close();
      await container.pump();

      await expectLater(cancelCompleter.future, completes);
    },
  );
}

class _LifecycleConversationRepository extends Fake
    implements ConversationRepository {
  _LifecycleConversationRepository(this.messagesStream);

  final Stream<List<ChatMessage>> messagesStream;

  @override
  Stream<List<ChatMessage>> watchMessages({required String conversationId}) =>
      messagesStream;
}

Future<void> _seedMessage(
  FakeFirebaseFirestore firestore,
  String matchId,
  ChatMessage message,
) {
  return firestore
      .collection('matches')
      .doc(matchId)
      .collection('messages')
      .doc(message.id)
      .set(message.toJson());
}
