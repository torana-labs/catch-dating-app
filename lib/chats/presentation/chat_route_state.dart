import 'package:catch_dating_app/chats/presentation/chat_thread_lookup_state.dart';
import 'package:catch_dating_app/chats/presentation/host_chat_screen_state.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/messaging/domain/suvbot_action_item.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';

class ChatRouteStateArgs {
  const ChatRouteStateArgs({
    required this.matchId,
    required this.initialProfile,
  });

  final String matchId;
  final PublicProfile? initialProfile;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChatRouteStateArgs &&
          runtimeType == other.runtimeType &&
          matchId == other.matchId &&
          initialProfile == other.initialProfile;

  @override
  int get hashCode => Object.hash(matchId, initialProfile);
}

class ChatRouteState {
  const ChatRouteState({
    required this.uidAsync,
    required this.uid,
    required this.matchAsync,
    required this.messagesAsync,
    required this.lookupState,
    required this.chatState,
    required this.eventAsync,
    required this.suvbotActionsAsync,
    required this.share,
    required this.suvbotPending,
    required this.sendMessagePending,
    required this.sendImagePending,
  });

  final CatchAsyncState<String?> uidAsync;
  final String? uid;
  final CatchAsyncState<Match?> matchAsync;
  final CatchAsyncState<List<ChatMessage>> messagesAsync;
  final ChatThreadLookupState lookupState;
  final HostChatScreenState chatState;
  final CatchAsyncState<Event?> eventAsync;
  final CatchAsyncState<List<SuvbotActionItem>> suvbotActionsAsync;
  final ExternalShareController share;
  final bool suvbotPending;
  final bool sendMessagePending;
  final bool sendImagePending;

  List<ChatMessage>? get initialMessages =>
      messagesAsync.status == CatchAsyncStatus.data
      ? messagesAsync.value
      : null;
  List<ChatMessage> get messages => initialMessages ?? const [];
  Event? get event =>
      eventAsync.status == CatchAsyncStatus.data ? eventAsync.value : null;
  bool get isSuvbot => lookupState.isSuvbot;
  bool get isAuthLoading => uidAsync.isLoading;
  Object? get authError => uidAsync.hasError ? uidAsync.error : null;
  bool get _blocksThreadUi => isAuthLoading || authError != null;
  CatchAsyncState<List<ChatMessage>> get displayMessagesAsync =>
      isAuthLoading ? const CatchAsyncState.loading() : messagesAsync;
  HostChatRouteError? get routeError => chatState.routeError;
  bool get showEventContextHeader =>
      !_blocksThreadUi && !isSuvbot && routeError == null;
  bool get showSuvbotActionBar =>
      !_blocksThreadUi && isSuvbot && routeError == null;
  bool get showComposer => !_blocksThreadUi && !isSuvbot && routeError == null;
}

extension ChatRouteCatchAsyncStateX<T> on CatchAsyncState<T> {
  bool get isLoading => status == CatchAsyncStatus.loading;
  bool get hasError => status == CatchAsyncStatus.error;
}
