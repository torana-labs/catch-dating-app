import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_share_card.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_external_share_sheet.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/design_fixtures/matches_chat_surface_fixtures.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/matches/shared/match_celebration_dialog.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

final widgetbookMatchesConsumerMatches =
    MatchesChatSurfaceFixtures.populatedMatches;

final widgetbookMatchesHostMatches =
    MatchesChatSurfaceFixtures.hostInquiryMatches;

final widgetbookMatchesTaylorMatch =
    MatchesChatSurfaceFixtures.activeConversationMatch();

final widgetbookMatchesEvent = MatchesChatSurfaceFixtures.event;

final widgetbookMatchesClub = MatchesChatSurfaceFixtures.club;

class WidgetbookMatchesCelebrationPreview extends StatelessWidget {
  const WidgetbookMatchesCelebrationPreview({super.key, required this.match});

  final Match match;

  @override
  Widget build(BuildContext context) {
    return MatchCelebrationDialog(
      match: match,
      otherUid: match.otherId(MatchesChatSurfaceFixtures.viewerUid),
      onSendMessage: () {},
      onKeepSwiping: () {},
    );
  }
}

CatchField widgetbookMatchesChatPersonRowForPreview(
  BuildContext context,
  ChatThreadPreview preview, {
  bool divider = false,
  VoidCallback? onTap,
}) {
  final unreadCount = preview.unreadCount;
  final isNew = !preview.hasConversation;
  return CatchField.navigate(
    onActivate: onTap ?? () {},
    content: CatchConversationLayout(
      name: preview.displayName,
      preview: preview.previewText,
      imageUrl: preview.photoUrl,
      timestamp: AppTimeFormatters.chatTimestamp(preview.timestamp),
      context: null,
      avatarShape: preview.match.isClubHostInquiry
          ? CatchAvatarVariant.square
          : CatchAvatarVariant.circle,
      activityLabel: (unreadCount) > 0
          ? (unreadCount).toString()
          : (unreadCount == 0 && isNew)
          ? (catchPersonRowCopy(context.l10n)).newMatchLabel
          : null,
      activitySemantics: (unreadCount) > 0
          ? (catchPersonRowCopy(context.l10n)).unreadCountLabel(unreadCount)
          : (unreadCount == 0 && isNew)
          ? (catchPersonRowCopy(context.l10n)).newMatchLabel
          : null,
    ),
  );
}

class WidgetbookMatchesShareCardPreview extends StatelessWidget {
  const WidgetbookMatchesShareCardPreview({
    super.key,
    required this.messages,
    required this.event,
  });

  final List<ChatMessage> messages;
  final Event event;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Align(
          alignment: Alignment.bottomCenter,
          child: CatchExternalShareSheet(
            media: ChatShareCard(
              messages: messages,
              currentUid: MatchesChatSurfaceFixtures.viewerUid,
              event: event,
            ),
            share: ExternalShareController((_) async {}),
            fileName: 'catch-chat-card.png',
            buttonLabel: 'Share card',
            footnote: 'Names, photos, and timestamps are hidden.',
            subject: 'Catch chat card',
            text: 'Shared from Catch.',
            maxWidth: CatchLayout.chatShareCardWidth,
            pixelRatio: CatchLayout.chatShareCardPixelRatio,
          ),
        ),
      ),
    );
  }
}

ChatsListViewModel widgetbookMatchesConsumerViewModel() {
  return widgetbookMatchesViewModelFor(
    uid: MatchesChatSurfaceFixtures.viewerUid,
    matches: widgetbookMatchesConsumerMatches,
  );
}

ChatsListViewModel widgetbookMatchesHostInboxViewModel() {
  return widgetbookMatchesViewModelFor(
    uid: MatchesChatSurfaceFixtures.hostUid,
    matches: widgetbookMatchesHostMatches,
  );
}

ChatsListViewModel widgetbookMatchesEmptySearchViewModel({
  required int totalThreadCount,
}) {
  return ChatsListViewModel(
    newMatches: const [],
    conversations: const [],
    totalThreadCount: totalThreadCount,
  );
}

ChatsListViewModel widgetbookMatchesViewModelFor({
  required String uid,
  required List<Match> matches,
}) {
  final newMatches = <ChatThreadPreview>[];
  final conversations = <ChatThreadPreview>[];
  for (final match in matches) {
    final preview = widgetbookMatchesThreadPreviewFor(match: match, uid: uid);
    if (preview.hasConversation) {
      conversations.add(preview);
    } else {
      newMatches.add(preview);
    }
  }
  newMatches.sort((a, b) => b.timestamp.compareTo(a.timestamp));
  conversations.sort((a, b) => b.timestamp.compareTo(a.timestamp));
  return ChatsListViewModel(
    newMatches: List.unmodifiable(newMatches),
    conversations: List.unmodifiable(conversations),
    totalThreadCount: matches.length,
  );
}

ChatThreadPreview widgetbookMatchesThreadPreviewFor({
  required Match match,
  required String uid,
}) {
  final otherUid = match.otherId(uid);
  final profile = MatchesChatSurfaceFixtures.profileFor(otherUid);
  final hostProfile = match.isClubHostInquiry
      ? widgetbookMatchesClub.displayHostProfiles
            .where((host) => host.uid == otherUid)
            .firstOrNull
      : null;
  final displayName = hostProfile?.displayName ?? profile.name;
  final hasConversation = match.lastMessagePreview != null;
  final previewText = !hasConversation
      ? match.isClubHostInquiry
            ? 'Ask the host'
            : 'You matched!'
      : match.lastMessageSenderId == uid
      ? 'You: ${match.lastMessagePreview}'
      : match.lastMessagePreview!;

  return ChatThreadPreview(
    match: match,
    matchId: match.id,
    otherUid: otherUid,
    displayName: displayName,
    photoUrl: hostProfile?.avatarUrl ?? profile.primaryPhotoThumbnailUrl,
    previewText: previewText,
    timestamp: match.lastMessageAt ?? match.createdAt,
    unreadCount: match.unreadConversationCountFor(uid),
    hasConversation: hasConversation,
    eventIds: match.eventIds,
  );
}
