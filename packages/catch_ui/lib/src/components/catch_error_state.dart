import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/components/catch_error_state_mode.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_icon_tile.dart';
import 'package:flutter/material.dart';

/// Canonical error content with full-region, inline and compact placement.
class CatchErrorState extends StatelessWidget {
  const CatchErrorState({
    super.key,
    required this.title,
    required this.message,
    this.icon,
    this.onRetry,
    this.retryLabel,
    this.actions = const [],
    this.mode = CatchErrorStateMode.fullScreen,
  }) : assert(
         onRetry == null || retryLabel != null,
         'CatchErrorState requires retryLabel when onRetry is provided.',
       );

  final String title;
  final String message;

  /// Defaults to [CatchIcons.error].
  final IconData? icon;
  final VoidCallback? onRetry;

  /// Caller-resolved label, required when [onRetry] is supplied.
  final String? retryLabel;
  final List<Widget> actions;
  final CatchErrorStateMode mode;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final isCompact = mode == CatchErrorStateMode.compact;
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CatchIconTile.error(
          icon: icon ?? CatchIcons.error,
          size: isCompact ? 48 : 64,
          iconSize: isCompact ? 24 : 30,
        ),
        SizedBox(height: isCompact ? CatchSpacing.s3 : CatchSpacing.s4),
        Text(
          title,
          style: isCompact
              ? CatchTextStyles.sectionTitle(context)
              : CatchTextStyles.titleL(context),
          textAlign: TextAlign.center,
        ),
        gapH8,
        Text(
          message,
          style: CatchTextStyles.bodyLead(context, color: t.ink2),
          textAlign: TextAlign.center,
          // Cap message lines because unhandled exceptions can serialize stack
          // traces into `error.toString()` and otherwise consume the viewport.
          maxLines: isCompact ? 4 : 8,
          overflow: TextOverflow.ellipsis,
        ),
        if (onRetry != null || actions.isNotEmpty) ...[
          SizedBox(height: isCompact ? CatchSpacing.s3 : CatchSpacing.s4),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: CatchSpacing.s3,
            runSpacing: CatchSpacing.s2,
            children: [
              if (onRetry != null)
                CatchButton(
                  label: retryLabel!,
                  onPressed: onRetry,
                  size: isCompact ? CatchButtonSize.md : CatchButtonSize.lg,
                  leading: Icon(CatchIcons.refreshRounded),
                ),
              ...actions,
            ],
          ),
        ],
      ],
    );

    if (mode == CatchErrorStateMode.inline ||
        mode == CatchErrorStateMode.compact) {
      // Error content inherits containment from its section. A state change
      // must not introduce a second card, fill, or outline around the same
      // content module.
      return Padding(
        padding: EdgeInsets.all(isCompact ? CatchSpacing.s4 : CatchSpacing.s5),
        child: content,
      );
    }

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(CatchSpacing.s5),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: content,
        ),
      ),
    );
  }
}
