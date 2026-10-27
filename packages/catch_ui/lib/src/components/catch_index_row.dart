import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_row_press_surface.dart';
import 'package:flutter/material.dart';

/// Canonical hairline index row for compact directories and browse lists.
///
/// A [subtitle] and a [footer] stack under the title for browse rows that
/// carry a second fact line and badges, such as an organiser's event list.
class CatchIndexRow extends StatelessWidget {
  const CatchIndexRow({
    super.key,
    required this.title,
    required this.onTap,
    this.subtitle,
    this.footer,
    this.leading,
    this.trailing,
    this.selected = false,
    this.semanticLabel,
    this.titleStyle,
    this.titleMaxLines = 1,
  });

  final String title;
  final VoidCallback? onTap;
  final String? subtitle;
  final Widget? footer;
  final Widget? leading;
  final Widget? trailing;
  final bool selected;
  final String? semanticLabel;
  final TextStyle? titleStyle;
  final int titleMaxLines;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final subtitleText = subtitle?.trim();
    final hasSubtitle = subtitleText != null && subtitleText.isNotEmpty;
    final titleText = Text(
      title,
      maxLines: titleMaxLines,
      overflow: TextOverflow.ellipsis,
      style: titleStyle ?? CatchTextStyles.titleL(context, color: t.ink),
    );
    final stacked = hasSubtitle || footer != null;
    final copy = !stacked
        ? titleText
        : Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              titleText,
              if (hasSubtitle) ...[
                gapH2,
                Text(
                  subtitleText,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: CatchTextStyles.supporting(context, color: t.ink2),
                ),
              ],
              if (footer != null) ...[gapH6, footer!],
            ],
          );
    final content = CatchRowPressSurface(
      onTap: onTap,
      semanticButton: false,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: t.line)),
        ),
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            minHeight: CatchLayout.eventTypeIndexRowHeight,
          ),
          child: Padding(
            // A stacked row keeps a band above and below its copy; a
            // single-line row centres in the minimum height as before.
            padding: stacked
                ? const EdgeInsets.symmetric(vertical: CatchSpacing.s3)
                : EdgeInsets.zero,
            child: Row(
              children: [
                if (leading != null) ...[leading!, gapW16],
                Expanded(child: copy),
                if (trailing != null) ...[gapW12, trailing!],
              ],
            ),
          ),
        ),
      ),
    );
    return Semantics(
      button: onTap != null,
      enabled: onTap != null,
      selected: selected,
      label: semanticLabel ?? (hasSubtitle ? '$title, $subtitleText' : title),
      onTap: onTap,
      child: ExcludeSemantics(child: content),
    );
  }
}
