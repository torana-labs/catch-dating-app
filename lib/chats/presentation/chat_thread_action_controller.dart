import 'package:catch_dating_app/chats/presentation/chat_controller.dart';
import 'package:catch_dating_app/chats/presentation/host_chat_screen_state.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_share_card.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ChatThreadActionController {
  const ChatThreadActionController({required this.safetyRunner});

  final ChatSafetyActionRunner safetyRunner;

  ChatProfileNavigationRequest? profileNavigationRequest(
    HostChatScreenState chatState,
  ) {
    final otherUid = chatState.otherUid;
    if (otherUid == null || !chatState.profileNavigationEnabled) {
      return null;
    }

    return ChatProfileNavigationRequest(
      uid: otherUid,
      profile: chatState.profile,
    );
  }

  Future<void> runThreadAction({
    required ChatThreadAction action,
    required HostChatScreenState chatState,
    required List<ChatMessage> messages,
    required String? uid,
    required Event? event,
    required ExternalShareController share,
    required ChatThreadActionUi ui,
  }) async {
    final intent = chatState.intentForThreadAction(action);
    if (intent == null) return;

    await runIntent(
      intent,
      messages: messages,
      uid: uid,
      event: event,
      share: share,
      ui: ui,
    );
  }

  Future<void> runIntent(
    HostChatActionIntent intent, {
    required List<ChatMessage> messages,
    required String? uid,
    required Event? event,
    required ExternalShareController share,
    required ChatThreadActionUi ui,
  }) async {
    switch (intent.type) {
      case HostChatActionIntentType.shareCard:
        if (uid == null) return;
        if (!hasShareableChatMessages(messages)) {
          ui.showFeedback('Send a message before sharing a card.');
          return;
        }

        ui.showShareCard(
          ChatShareCardRequest(
            messages: messages,
            currentUid: uid,
            event: event,
            share: share,
          ),
        );
        return;
      case HostChatActionIntentType.reportUser:
        final targetUserId = intent.targetUserId;
        final targetName = intent.targetName;
        if (targetUserId == null || targetName == null) return;

        try {
          await safetyRunner.reportUser(targetUserId: targetUserId);
        } catch (_) {
          return;
        }
        ui.showFeedback('Report submitted for $targetName.');
        return;
      case HostChatActionIntentType.blockUser:
        final targetUserId = intent.targetUserId;
        final targetName = intent.targetName;
        if (targetUserId == null || targetName == null) return;

        final confirmed = await ui.confirmBlock(targetName);
        if (!confirmed) return;

        try {
          await safetyRunner.blockUser(targetUserId: targetUserId);
        } catch (_) {
          return;
        }
        ui.closeAfterBlock();
        return;
    }
  }
}

class ChatProfileNavigationRequest {
  const ChatProfileNavigationRequest({
    required this.uid,
    required this.profile,
  });

  final String uid;
  final PublicProfile? profile;
}

class ChatShareCardRequest {
  const ChatShareCardRequest({
    required this.messages,
    required this.currentUid,
    required this.event,
    required this.share,
  });

  final List<ChatMessage> messages;
  final String currentUid;
  final Event? event;
  final ExternalShareController share;
}

class ChatThreadActionUi {
  const ChatThreadActionUi({
    required this.showFeedback,
    required this.showShareCard,
    required this.confirmBlock,
    required this.closeAfterBlock,
  });

  final void Function(String message) showFeedback;
  final void Function(ChatShareCardRequest request) showShareCard;
  final Future<bool> Function(String targetName) confirmBlock;
  final void Function() closeAfterBlock;
}

abstract class ChatSafetyActionRunner {
  Future<void> reportUser({required String targetUserId});

  Future<void> blockUser({required String targetUserId});
}

class RiverpodChatSafetyActionRunner implements ChatSafetyActionRunner {
  const RiverpodChatSafetyActionRunner({
    required this.ref,
    required this.matchId,
  });

  final WidgetRef ref;
  final String matchId;

  @override
  Future<void> reportUser({required String targetUserId}) async {
    await ChatController.reportUserMutation.run(ref, (tx) async {
      await tx
          .get(chatControllerProvider.notifier)
          .reportUser(targetUserId: targetUserId, matchId: matchId);
    });
  }

  @override
  Future<void> blockUser({required String targetUserId}) async {
    await ChatController.blockUserMutation.run(ref, (tx) async {
      await tx
          .get(chatControllerProvider.notifier)
          .blockUser(targetUserId: targetUserId);
    });
  }
}
