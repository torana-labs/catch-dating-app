import 'package:catch_dating_app/chats/presentation/chat_controller.dart';
import 'package:catch_dating_app/chats/presentation/chat_route_state.dart';
import 'package:catch_dating_app/chats/presentation/chat_thread_lookup_state.dart';
import 'package:catch_dating_app/chats/presentation/host_chat_screen_state.dart';
import 'package:catch_dating_app/chats/presentation/suvbot_controller.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/suvbot_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/suvbot_action_item.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'chat_route_view_model.g.dart';

@riverpod
ChatRouteState chatRouteState(Ref ref, ChatRouteStateArgs args) {
  final uidAsync = ref.watch(uidProvider);
  final uidState = _catchAsyncState(uidAsync);
  final uid = uidState.value;
  final messagesAsync = ref.watch(
    watchConversationMessagesProvider(args.matchId),
  );
  final matchAsync = ref.watch(matchStreamProvider(args.matchId));
  final matchState = _catchAsyncState(matchAsync);
  final match = matchState.value;

  final initialLookupState = ChatThreadLookupState.resolve(
    matchId: args.matchId,
    uid: uid,
    match: match,
    routeProfile: args.initialProfile,
  );
  final hostInquiryClubAsync = initialLookupState.hostInquiryClubId == null
      ? const AsyncData<Club?>(null)
      : ref.watch(watchClubProvider(initialLookupState.hostInquiryClubId!));
  final hostInquiryClub = _catchAsyncState(hostInquiryClubAsync).value;
  final lookupState = ChatThreadLookupState.resolve(
    matchId: args.matchId,
    uid: uid,
    match: match,
    routeProfile: args.initialProfile,
    hostInquiryClub: hostInquiryClub,
  );

  final eventAsync = lookupState.latestEventId == null
      ? const AsyncData<Event?>(null)
      : ref.watch(watchEventProvider(lookupState.latestEventId!));
  final otherProfileAsync = lookupState.publicProfileUid == null
      ? const AsyncData<PublicProfile?>(null)
      : ref.watch(watchPublicProfileProvider(lookupState.publicProfileUid!));
  final suvbotActionsAsync = lookupState.isSuvbot
      ? ref.watch(suvbotActionsProvider)
      : const AsyncData(<SuvbotActionItem>[]);

  final profile =
      _catchAsyncState(otherProfileAsync).value ?? lookupState.initialProfile;
  final messagesState = _catchAsyncState(messagesAsync);
  final suvbotActionsState = _catchAsyncState(suvbotActionsAsync);
  final chatState = HostChatScreenState.resolve(
    matchId: args.matchId,
    uid: uid,
    matchAsync: matchState,
    messagesAsync: messagesState,
    suvbotActionsAsync: suvbotActionsState,
    profile: profile,
    hostProfile: lookupState.hostProfile,
    reportUserPending: ref.watch(ChatController.reportUserMutation).isPending,
    blockUserPending: ref.watch(ChatController.blockUserMutation).isPending,
  );

  return ChatRouteState(
    uidAsync: uidState,
    uid: uid,
    matchAsync: matchState,
    messagesAsync: messagesState,
    lookupState: lookupState,
    chatState: chatState,
    eventAsync: _catchAsyncState(eventAsync),
    suvbotActionsAsync: suvbotActionsState,
    share: ref.watch(externalShareControllerProvider),
    suvbotPending: ref.watch(SuvbotController.requestMutation).isPending,
    sendMessagePending: ref.watch(ChatController.sendMessageMutation).isPending,
    sendImagePending: ref.watch(ChatController.sendImageMutation).isPending,
  );
}

CatchAsyncState<T> _catchAsyncState<T>(AsyncValue<T> value) {
  return catchAsyncStateFromAsyncValue(value);
}
