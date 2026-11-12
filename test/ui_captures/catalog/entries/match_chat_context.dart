// Marketing capture `match_chat_context`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'dart:async';
import 'package:catch_dating_app/chats/presentation/chat_screen.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/match_chat_fixtures.dart';

final matchChatContextCapture = ScreenCaptureEntry(
  id: 'match_chat_context',
  routeIds: const <String>['chatScreen'],
  device: CaptureDevice.iphone17Pro,
  marketingFixtureKeys: const <String>['salesDemo.member.matchChatContext'],
  providerOverrides: [
    uidProvider.overrideWith((ref) => Stream.value(matchChatViewerUid)),
    matchRepositoryProvider.overrideWithValue(_matchChatMatchRepository),
    conversationRepositoryProvider.overrideWithValue(
      _matchChatConversationRepository,
    ),
    watchEventProvider(
      matchChatEvent.id,
    ).overrideWith((ref) => Stream.value(matchChatEvent)),
    watchPublicProfileProvider(
      matchChatOtherProfile.uid,
    ).overrideWith((ref) => Stream.value(matchChatOtherProfile)),
  ],
  builder: (context) => ReferenceChromeSafeArea(
    child: ChatScreen(
      matchId: matchChatMatch.id,
      otherProfile: matchChatOtherProfile,
    ),
  ),
);

class _CaptureConversationRepository implements ConversationRepository {
  const _CaptureConversationRepository({required this.messagesByConversation});

  final Map<String, List<ChatMessage>> messagesByConversation;

  @override
  Stream<List<ChatMessage>> watchMessages({required String conversationId}) =>
      Stream.value(messagesByConversation[conversationId] ?? const []);

  @override
  Future<String> createMessageId({required String conversationId}) async =>
      '$conversationId-new-message';

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
  }) async {}

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
  }) async {}
}

final _matchChatMessages = [
  ChatMessage(
    id: 'match-chat-message-1',
    senderId: matchChatOtherProfile.uid,
    text: 'Loved the pace today — that last point was unreal.',
    sentAt: DateTime(2026, 6, 22, 9, 38),
  ),
  ChatMessage(
    id: 'match-chat-message-2',
    senderId: matchChatOtherProfile.uid,
    text: 'Same court next Sunday?',
    sentAt: DateTime(2026, 6, 22, 9, 38),
  ),
  ChatMessage(
    id: 'match-chat-message-3',
    senderId: matchChatViewerUid,
    text: 'Ha, you set that one up. In for Sunday.',
    sentAt: DateTime(2026, 6, 22, 9, 41),
  ),
  ChatMessage(
    id: 'match-chat-message-4',
    senderId: matchChatViewerUid,
    text: 'Bringing the good racket this time.',
    sentAt: DateTime(2026, 6, 22, 9, 41),
  ),
  ChatMessage(
    id: 'match-chat-message-5',
    senderId: matchChatOtherProfile.uid,
    text: 'Deal. 9am, court 2.',
    sentAt: DateTime(2026, 6, 22, 9, 42),
  ),
];
final _matchChatMatchRepository = CaptureMatchRepository(
  matches: [matchChatMatch],
);
final _matchChatConversationRepository = _CaptureConversationRepository(
  messagesByConversation: {matchChatMatch.id: _matchChatMessages},
);
