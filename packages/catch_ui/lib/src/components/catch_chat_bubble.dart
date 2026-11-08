import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_avatar.dart';
import 'package:catch_ui/src/components/catch_timestamped_message_text.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// Who sent a chat message: the viewer ([mine], ink, at the end), someone
/// else ([theirs], grey, after their avatar), the [host] (the event colour,
/// full width) or the app itself ([system], a centred muted line).
enum CatchChatBubbleVariant { mine, theirs, host, system }

/// Where the viewer message is: [sending], [sent], [read], or [failed]
/// (which draws in the danger tone).
enum CatchChatBubbleStatus { sending, sent, failed, read }

/// Who wrote a message in a group chat: the [name] drawn over the first
/// bubble of a run (with a caller-localized [note] such as "host" after it)
/// and the avatar beside it, from [imageUrl] or the [initials] on a palette
/// [color].
@immutable
class CatchChatAuthor {
  const CatchChatAuthor({
    required this.name,
    this.note,
    this.imageUrl,
    this.initials,
    this.color,
  });

  final String name;
  final String? note;
  final String? imageUrl;
  final String? initials;
  final CatchAvatarColor? color;
}

/// The system ChatMessage: one message in a group or one-to-one chat.
///
/// The [text] sits in a bubble with the caller-formatted [time] on its last
/// line when it fits, or just under it ([CatchTimestampedMessageText]). A
/// [status] draws a small mark under a [CatchChatBubbleVariant.mine] bubble.
/// [leading] takes the avatar of a [CatchChatBubbleVariant.theirs] sender;
/// a [continued] message from the same sender keeps the avatar column empty
/// and sits closer to the one before it. [format] colours a host bubble.
/// An [author] names a theirs or host sender over the first bubble of a run
/// and draws their avatar when there is no [leading]. [footer] goes under
/// the bubble: an attachment, a card, buttons.
class CatchChatBubble extends StatelessWidget {
  const CatchChatBubble({
    super.key,
    required this.text,
    this.variant = CatchChatBubbleVariant.theirs,
    this.status,
    this.time,
    this.leading,
    this.continued = false,
    this.format = CatchFormat.games,
    this.author,
    this.footer,
  });

  final String text;
  final CatchChatBubbleVariant variant;
  final CatchChatBubbleStatus? status;

  /// The caller-formatted time: "7:12 PM".
  final String? time;
  final Widget? leading;
  final bool continued;
  final CatchFormat format;
  final CatchChatAuthor? author;
  final Widget? footer;

  /// The width of the avatar column beside a theirs message.
  static const double leadingWidth = GeneratedCatchSizeTokens.avatarSm;

  @override
  Widget build(BuildContext context) {
    if (variant == CatchChatBubbleVariant.system) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: CatchSpacing.s3),
        child: CatchText(
          text,
          variant: CatchTextVariant.bodyMeta,
          tone: CatchTextTone.secondary,
          align: TextAlign.center,
        ),
      );
    }
    final t = CatchTokens.of(context);
    final sizeClass = CatchRootScope.sizeClassOf(context);
    final mine = variant == CatchChatBubbleVariant.mine;
    final host = variant == CatchChatBubbleVariant.host;
    final (fill, ink) = switch (variant) {
      CatchChatBubbleVariant.mine => (t.primary, t.primaryInk),
      CatchChatBubbleVariant.host => (format.accent, format.ink),
      _ => (t.tile, t.ink),
    };
    const large = Radius.circular(CatchRadius.lg);
    const small = Radius.circular(CatchRadius.xs);
    final radius = host
        ? BorderRadius.circular(CatchRadius.md)
        : BorderRadiusDirectional.only(
            topStart: large,
            topEnd: large,
            bottomStart: mine ? large : small,
            bottomEnd: mine ? small : large,
          ).resolve(Directionality.of(context));
    final textStyle = CatchTextVariant.body
        .style(sizeClass)
        .copyWith(color: ink);
    final time = this.time;
    final message = time == null
        ? Text(text, style: textStyle)
        : CatchTimestampedMessageText(
            text: text,
            timestamp: time,
            textStyle: textStyle,
            timestampStyle: CatchTextVariant.bodyMeta
                .style(sizeClass)
                .copyWith(
                  color: ink.withValues(alpha: CatchOpacity.onFillMuted),
                ),
          );
    final bubble = DecoratedBox(
      decoration: BoxDecoration(color: fill, borderRadius: radius),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: CatchSpacing.micro14,
          vertical: CatchSpacing.micro10,
        ),
        child: message,
      ),
    );
    final status = this.status;
    final author = this.author;
    final footer = this.footer;
    final column = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: mine
          ? CrossAxisAlignment.end
          : CrossAxisAlignment.start,
      spacing: CatchSpacing.s1,
      children: [
        if (author != null && !continued && !mine)
          CatchText(
            author.note == null
                ? author.name
                : '${author.name} · ${author.note}',
            variant: CatchTextVariant.labelKicker,
            tone: CatchTextTone.secondary,
            maxLines: 1,
          ),
        bubble,
        ?footer,
        if (mine && status != null)
          Icon(
            switch (status) {
              CatchChatBubbleStatus.sending => CatchIcons.pending,
              CatchChatBubbleStatus.sent => CatchIcons.check,
              CatchChatBubbleStatus.read => CatchIcons.success,
              CatchChatBubbleStatus.failed => CatchIcons.error,
            },
            size: CatchIconSize.sm,
            color: status == CatchChatBubbleStatus.failed ? t.danger : t.ink3,
          ),
      ],
    );
    return Padding(
      padding: EdgeInsets.only(
        top: continued ? CatchSpacing.micro2 : CatchSpacing.s2,
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final maxWidth = host
              ? constraints.maxWidth
              : (constraints.maxWidth * CatchLayout.chatBubbleMaxWidthFraction)
                    .clamp(0.0, CatchLayout.chatBubbleMaxWidth);
          return Row(
            mainAxisAlignment: mine
                ? MainAxisAlignment.end
                : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.end,
            spacing: CatchSpacing.s2,
            children: [
              if (variant == CatchChatBubbleVariant.theirs)
                SizedBox(
                  width: leadingWidth,
                  child: continued
                      ? null
                      : leading ??
                            (author == null
                                ? null
                                : CatchAvatar.system(
                                    size: CatchAvatarSize.sm,
                                    name: author.name,
                                    imageUrl: author.imageUrl,
                                    initials: author.initials,
                                    color: author.color,
                                  )),
                ),
              Flexible(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: maxWidth),
                  child: column,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
