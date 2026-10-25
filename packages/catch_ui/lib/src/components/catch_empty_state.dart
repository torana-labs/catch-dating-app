import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_empty_state_variant.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_icon_tile.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/material.dart';

/// Canonical successful-empty content with bounded and inline layout.
class CatchEmptyState extends StatelessWidget {
  const CatchEmptyState({
    super.key,
    this.icon,
    this.title,
    this.message,
    this.actions = const [],
    this.surface = false,
    this.iconVariant = CatchIconTileVariant.plain,
    this.variant = CatchEmptyStateVariant.stacked,
    this.iconSize,
    this.iconContainerSize,
    this.padding = const EdgeInsets.symmetric(horizontal: CatchSpacing.s6),
    this.titleStyle,
    this.messageStyle,
  });

  final IconData? icon;
  final String? title;
  final String? message;
  final List<Widget> actions;
  final bool surface;
  final CatchIconTileVariant iconVariant;
  final CatchEmptyStateVariant variant;
  final double? iconSize;
  final double? iconContainerSize;
  final EdgeInsetsGeometry padding;
  final TextStyle? titleStyle;
  final TextStyle? messageStyle;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final content = LayoutBuilder(
      builder: (context, constraints) {
        final effectiveTitleStyle =
            titleStyle ?? CatchTextStyles.sectionTitle(context);
        final effectiveMessageStyle =
            messageStyle ??
            (variant == CatchEmptyStateVariant.stacked
                ? CatchTextStyles.bodyS(context, color: t.ink2)
                : CatchTextStyles.supporting(context, color: t.ink2));
        final iconData = icon;
        final titleText = title;
        final messageText = message;
        final actionWidget = switch (actions.length) {
          0 => null,
          1 => actions.single,
          _ => Wrap(
            alignment: variant == CatchEmptyStateVariant.inline
                ? WrapAlignment.start
                : WrapAlignment.center,
            spacing: CatchSpacing.s3,
            runSpacing: CatchSpacing.s2,
            children: actions,
          ),
        };

        final child = switch (variant) {
          CatchEmptyStateVariant.stacked => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (iconData != null)
                CatchIconTile.empty(
                  icon: iconData,
                  variant: iconVariant,
                  iconSize: iconSize,
                  size: iconContainerSize,
                ),
              if (_hasText(titleText)) ...[
                if (iconData != null) gapH12,
                Text(
                  titleText!,
                  style: effectiveTitleStyle,
                  textAlign: TextAlign.center,
                ),
              ],
              if (_hasText(messageText)) ...[
                if (_hasText(titleText))
                  gapH6
                else if (iconData != null)
                  gapH12,
                Text(
                  messageText!,
                  style: effectiveMessageStyle,
                  textAlign: TextAlign.center,
                ),
              ],
              if (actionWidget != null) ...[gapH16, actionWidget],
            ],
          ),
          CatchEmptyStateVariant.inline => Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_hasText(titleText))
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (iconData != null) ...[
                      Icon(iconData, size: CatchIconSize.md, color: t.ink3),
                      gapW8,
                    ],
                    Expanded(
                      child: Text(titleText!, style: effectiveTitleStyle),
                    ),
                  ],
                ),
              if (_hasText(messageText)) ...[
                if (_hasText(titleText)) gapH8,
                Text(messageText!, style: effectiveMessageStyle),
              ],
              if (actionWidget != null) ...[gapH16, actionWidget],
            ],
          ),
        };

        final constrainedChild = constraints.hasBoundedWidth
            ? SizedBox(width: constraints.maxWidth, child: child)
            : child;
        if (!constraints.hasBoundedHeight) return constrainedChild;
        return SingleChildScrollView(
          primary: false,
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Align(child: constrainedChild),
          ),
        );
      },
    );

    if (!surface) {
      return Padding(padding: padding, child: content);
    }

    return CatchSurface(
      padding: padding,
      borderRole: CatchBorderRole.separator,
      child: content,
    );
  }
}

bool _hasText(String? value) => value != null && value.isNotEmpty;
