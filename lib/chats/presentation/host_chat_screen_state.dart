import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/messaging/domain/suvbot_action_item.dart';
import 'package:catch_dating_app/contexts/messaging/domain/suvbot_identity.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/l10n/generated/structured_domain_copy.g.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';

class HostChatScreenState {
  const HostChatScreenState({
    required this.name,
    required this.photoUrl,
    required this.otherUid,
    required this.profile,
    required this.routeError,
    required this.isSuvbot,
    required this.isHostInquiry,
    required this.profileNavigationEnabled,
    required this.shareCardEnabled,
    required this.safetyActionsEnabled,
    required this.threadActions,
    required this.disabledThreadActions,
    required this.safetyTargetName,
    required this.messageOtherName,
    required this.messagesRetryIntent,
    required this.suvbotActionsRetryIntent,
    required this.composerDisabledReason,
  });

  final String name;
  final String? photoUrl;
  final String? otherUid;
  final PublicProfile? profile;
  final HostChatRouteError? routeError;
  final bool isSuvbot;
  final bool isHostInquiry;
  final bool profileNavigationEnabled;
  final bool shareCardEnabled;
  final bool safetyActionsEnabled;
  final List<ChatThreadAction> threadActions;
  final Set<ChatThreadAction> disabledThreadActions;
  final String safetyTargetName;
  final String messageOtherName;
  final HostChatRetryIntent? messagesRetryIntent;
  final HostChatRetryIntent? suvbotActionsRetryIntent;
  final String? composerDisabledReason;

  HostChatActionIntent? intentForThreadAction(ChatThreadAction action) {
    if (!threadActions.contains(action) ||
        disabledThreadActions.contains(action)) {
      return null;
    }

    switch (action) {
      case ChatThreadAction.shareCard:
        return shareCardEnabled ? const HostChatActionIntent.shareCard() : null;
      case ChatThreadAction.report:
        final targetUserId = otherUid;
        return safetyActionsEnabled && targetUserId != null
            ? HostChatActionIntent.reportUser(
                targetUserId: targetUserId,
                targetName: safetyTargetName,
              )
            : null;
      case ChatThreadAction.block:
        final targetUserId = otherUid;
        return safetyActionsEnabled && targetUserId != null
            ? HostChatActionIntent.blockUser(
                targetUserId: targetUserId,
                targetName: safetyTargetName,
              )
            : null;
    }
  }

  factory HostChatScreenState.resolve({
    required String matchId,
    required String? uid,
    required CatchAsyncState<Match?> matchAsync,
    required CatchAsyncState<List<ChatMessage>> messagesAsync,
    required CatchAsyncState<List<SuvbotActionItem>> suvbotActionsAsync,
    required PublicProfile? profile,
    required ClubHostProfile? hostProfile,
    bool reportUserPending = false,
    bool blockUserPending = false,
    DateTime? now,
  }) {
    final match = matchAsync.status == CatchAsyncStatus.data
        ? matchAsync.value
        : null;
    final otherUid = uid == null ? null : match?.otherId(uid);
    final isSuvbot = isSuvbotConversation(matchId: matchId, otherUid: otherUid);
    final isHostInquiry = match?.isClubHostInquiry == true;
    final isCrossPathsEventPlan = match?.isCrossPathsEventPlan == true;
    final name = isSuvbot
        ? StructuredDomainCopy.chatSuvbotTitle
        : hostProfile?.displayName ??
              profile?.name ??
              (isHostInquiry
                  ? StructuredDomainCopy.chatHostConversationTitle
                  : StructuredDomainCopy.chatTitle);
    final photoUrl = isSuvbot
        ? null
        : hostProfile?.avatarUrl ?? profile?.primaryPhotoThumbnailUrl;
    final composerDisabledReason = _chatComposerDisabledReason(
      matchAsync: matchAsync,
      match: match,
      now: now ?? DateTime.now(),
    );
    final shareCardEnabled =
        otherUid != null &&
        !isSuvbot &&
        !isHostInquiry &&
        !isCrossPathsEventPlan;
    final safetyActionsEnabled = otherUid != null && !isSuvbot;

    return HostChatScreenState(
      name: name,
      photoUrl: photoUrl,
      otherUid: isSuvbot ? null : otherUid,
      profile: isSuvbot ? null : profile,
      routeError: matchAsync.status == CatchAsyncStatus.error
          ? HostChatRouteError(error: matchAsync.error!)
          : null,
      isSuvbot: isSuvbot,
      isHostInquiry: isHostInquiry,
      profileNavigationEnabled: !isHostInquiry && !isSuvbot,
      shareCardEnabled: shareCardEnabled,
      safetyActionsEnabled: safetyActionsEnabled,
      threadActions: [
        if (shareCardEnabled) ChatThreadAction.shareCard,
        if (safetyActionsEnabled) ChatThreadAction.report,
        if (safetyActionsEnabled) ChatThreadAction.block,
      ],
      disabledThreadActions: {
        if (reportUserPending) ChatThreadAction.report,
        if (blockUserPending) ChatThreadAction.block,
      },
      safetyTargetName: profile?.name ?? 'this person',
      messageOtherName: isSuvbot
          ? StructuredDomainCopy.chatSuvbotTitle
          : isHostInquiry
          ? name
          : profile?.name ?? 'your match',
      messagesRetryIntent: messagesAsync.status == CatchAsyncStatus.error
          ? HostChatRetryIntent.reloadMessages
          : null,
      suvbotActionsRetryIntent:
          isSuvbot && suvbotActionsAsync.status == CatchAsyncStatus.error
          ? HostChatRetryIntent.reloadSuvbotActions
          : null,
      composerDisabledReason: composerDisabledReason,
    );
  }
}

enum ChatThreadAction { shareCard, report, block }

enum HostChatRetryIntent { reloadMatch, reloadMessages, reloadSuvbotActions }

enum HostChatActionIntentType { shareCard, reportUser, blockUser }

class HostChatActionIntent {
  const HostChatActionIntent._({
    required this.type,
    this.targetUserId,
    this.targetName,
  });

  const HostChatActionIntent.shareCard()
    : this._(type: HostChatActionIntentType.shareCard);

  const HostChatActionIntent.reportUser({
    required String targetUserId,
    required String targetName,
  }) : this._(
         type: HostChatActionIntentType.reportUser,
         targetUserId: targetUserId,
         targetName: targetName,
       );

  const HostChatActionIntent.blockUser({
    required String targetUserId,
    required String targetName,
  }) : this._(
         type: HostChatActionIntentType.blockUser,
         targetUserId: targetUserId,
         targetName: targetName,
       );

  final HostChatActionIntentType type;
  final String? targetUserId;
  final String? targetName;
}

class HostChatRouteError {
  const HostChatRouteError({
    required this.error,
    this.retryIntent = HostChatRetryIntent.reloadMatch,
  });

  final Object error;
  final HostChatRetryIntent retryIntent;
}

String? _chatComposerDisabledReason({
  required CatchAsyncState<Match?> matchAsync,
  required Match? match,
  required DateTime now,
}) {
  if (matchAsync.status == CatchAsyncStatus.error) return 'Chat unavailable.';
  if (matchAsync.status == CatchAsyncStatus.loading) return 'Loading chat...';
  if (match == null) return 'Chat unavailable.';
  if (match.isBlocked ||
      match.isClosed ||
      (match.isCrossPathsEventPlan &&
          match.eventPlanExpiresAt?.isBefore(now) == true)) {
    return 'This chat is closed.';
  }
  return null;
}
