import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef ChatThreadSelectedCallback = void Function(ChatThreadPreview preview);
typedef ChatPreviewTextBuilder = String Function(ChatThreadPreview preview);
typedef ChatTimestampTextBuilder = String Function(ChatThreadPreview preview);

class ChatConversationsList extends StatelessWidget {
  const ChatConversationsList({
    super.key,
    required this.matches,
    required this.onThreadSelected,
    this.previewTextFor,
    this.timestampTextFor,
    this.selectedMatchId,
    this.now,
  });

  final List<ChatThreadPreview> matches;
  final ChatThreadSelectedCallback onThreadSelected;
  final ChatPreviewTextBuilder? previewTextFor;
  final ChatTimestampTextBuilder? timestampTextFor;
  final String? selectedMatchId;
  final DateTime? now;

  @override
  Widget build(BuildContext context) {
    return CatchSection.sliverRows(
      itemCount: matches.length,
      indexForKeyBuilder: (key) {
        final index = matches.indexWhere(
          (preview) => ValueKey(preview.matchId) == key,
        );
        return index < 0 ? null : index;
      },
      itemBuilder: (context, index) {
        final preview = matches[index];
        final unread = preview.unreadCount;
        final fresh = !preview.hasConversation;
        return CatchField.navigate(
          key: ValueKey(preview.matchId),
          states: {
            if (selectedMatchId == preview.matchId) WidgetState.selected,
          },
          onActivate: () => onThreadSelected(preview),
          content: CatchConversationLayout(
            name: preview.displayName,
            imageUrl: preview.photoUrl,
            avatarShape: preview.match.isOrganizerHostInquiry
                ? CatchAvatarVariant.square
                : CatchAvatarVariant.circle,
            preview: previewTextFor?.call(preview) ?? preview.previewText,
            timestamp:
                timestampTextFor?.call(preview) ??
                AppTimeFormatters.chatTimestamp(preview.timestamp, now: now),
            activityLabel: unread > 0
                ? '$unread'
                : fresh
                ? context.l10n.coreCatchPersonRowLabelNewMatch
                : null,
            activitySemantics: unread > 0
                ? context.l10n.coreCatchPersonRowLabelLabelUnreadChats(
                    label: unread,
                  )
                : fresh
                ? context.l10n.coreCatchPersonRowLabelNewMatch
                : null,
          ),
        );
      },
    );
  }
}
