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
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'chat_route_view_model.g.dart';

// provider-graph: high-fan-out:chatRouteStateProvider accepted -- The eight dependencies form one route projection: conversation, match and host-inquiry context, event/profile enrichment, share capability, and action pending state. The provider has no cycles and prevents the screen from assembling those waves itself.
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
  final hostInquiryOrganizerAsync =
      initialLookupState.hostInquiryOrganizerId == null
      ? const AsyncData<Organizer?>(null)
      : ref.watch(
          watchOrganizerProvider(initialLookupState.hostInquiryOrganizerId!),
        );
  final hostInquiryOrganizer = _catchAsyncState(
    hostInquiryOrganizerAsync,
  ).value;
  final lookupState = ChatThreadLookupState.resolve(
    matchId: args.matchId,
    uid: uid,
    match: match,
    routeProfile: args.initialProfile,
    hostInquiryOrganizer: hostInquiryOrganizer,
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
