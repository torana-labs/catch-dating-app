import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

// Public for Widgetbook.
class MessageBubble extends StatelessWidget {
  const MessageBubble({
    super.key,
    required this.text,
    required this.isMe,
    required this.sentAt,
    this.imageUrl,
    this.isFirstInGroup = true,
    this.isLastInGroup = true,
  });

  final String text;
  final bool isMe;
  final DateTime? sentAt;
  final String? imageUrl;
  final bool isFirstInGroup;
  final bool isLastInGroup;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final sentAt = this.sentAt;
    final timeStr = sentAt == null
        ? context.l10n.chatsMessageBubbleVisiblecopySending
        : AppTimeFormatters.time(sentAt);
    final messageStyle = CatchTextStyles.bodyL(
      context,
      color: isMe ? t.primaryInk : t.ink,
    );
    final timestampStyle = CatchTextStyles.meta(
      context,
      color: isMe
          ? t.primaryInk.withValues(alpha: CatchOpacity.onDarkMuted)
          : t.ink3,
    );

    return Padding(
      padding: isLastInGroup
          ? CatchInsets.chatBubbleGroupEnd
          : CatchInsets.chatBubbleGroupContinue,
      child: Row(
        mainAxisAlignment: isMe
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) gapW4,
          Flexible(
            child: CatchFractionalViewport(
              fraction: CatchLayout.chatBubbleMaxWidthFraction,
              maxWidth: CatchLayout.chatBubbleMaxWidth,
              alignment: isMe
                  ? AlignmentDirectional.centerEnd
                  : AlignmentDirectional.centerStart,
              child: CatchSurface(
                padding: CatchInsets.chatBubbleContent,
                backgroundColor: isMe ? t.primary : t.surface,
                borderRole: isMe ? null : CatchBorderRole.separator,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(
                    isMe || isFirstInGroup ? CatchRadius.lg : CatchRadius.sm,
                  ),
                  topRight: Radius.circular(
                    !isMe || isFirstInGroup ? CatchRadius.lg : CatchRadius.sm,
                  ),
                  bottomLeft: Radius.circular(
                    isMe || !isLastInGroup ? CatchRadius.lg : CatchRadius.sm,
                  ),
                  bottomRight: Radius.circular(
                    isMe && isLastInGroup ? CatchRadius.sm : CatchRadius.lg,
                  ),
                ),
                child: imageUrl == null && text.isNotEmpty
                    ? CatchTimestampedMessageText(
                        text: text,
                        timestamp: timeStr,
                        textStyle: messageStyle,
                        timestampStyle: timestampStyle,
                      )
                    : MediaMessageBody(
                        text: text,
                        timestamp: timeStr,
                        imageUrl: imageUrl,
                        textStyle: messageStyle,
                        timestampStyle: timestampStyle,
                      ),
              ),
            ),
          ),
          if (isMe) gapW4,
        ],
      ),
    );
  }
}

class MediaMessageBody extends StatelessWidget {
  const MediaMessageBody({
    super.key,
    required this.text,
    required this.timestamp,
    required this.imageUrl,
    required this.textStyle,
    required this.timestampStyle,
  });

  final String text;
  final String timestamp;
  final String? imageUrl;
  final TextStyle textStyle;
  final TextStyle timestampStyle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (imageUrl != null)
          Padding(
            padding: CatchInsets.chatMediaAttachmentBottom,
            child: CatchSurface(
              duration: Duration.zero,
              tone: CatchSurfaceTone.transparent,
              radius: CatchRadius.md,
              clipBehavior: Clip.antiAlias,
              child: AspectRatio(
                aspectRatio: CatchAspectRatio.standardPhoto,
                child: CatchNetworkImage(
                  imageUrl!,
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                  loadingBuilder: (_, child, progress) {
                    if (progress == null) return child;
                    return Center(
                      child: CircularProgressIndicator(
                        value: progress.expectedTotalBytes != null
                            ? progress.cumulativeBytesLoaded /
                                  progress.expectedTotalBytes!
                            : null,
                        strokeWidth: CatchStroke.focusRing,
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
        if (text.isNotEmpty) ...[
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: Text(text, style: textStyle),
          ),
          gapH2,
        ],
        Text(timestamp, style: timestampStyle),
      ],
    );
  }
}
