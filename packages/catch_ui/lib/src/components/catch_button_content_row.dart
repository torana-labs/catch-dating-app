import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/primitives/catch_loading_indicator.dart';
import 'package:flutter/material.dart';

/// What the row shows: its label, or its spinner while a command runs.
enum CatchButtonContentRowMode { label, loading }

class CatchButtonContentRow extends StatelessWidget {
  const CatchButtonContentRow({
    super.key,
    required this.label,
    required this.color,
    required this.textStyle,
    this.leading,
    this.gap = CatchSpacing.micro6,
    this.fullWidth = false,
    this.allowMultiline = false,
    this.mode = CatchButtonContentRowMode.label,
  });

  final String label;
  final Color color;
  final Widget? leading;
  final double gap;
  final bool fullWidth;
  final bool allowMultiline;
  final TextStyle textStyle;

  /// Loading draws the spinner, in the row's colour, centred over the label.
  /// The label stays laid out, unseen, so the button keeps the width it had.
  final CatchButtonContentRowMode mode;

  @override
  Widget build(BuildContext context) {
    final iconWidget = leading;
    final labelWidget = Text(
      label,
      maxLines: allowMultiline ? null : 1,
      overflow: allowMultiline ? TextOverflow.visible : TextOverflow.ellipsis,
      textAlign: TextAlign.center,
      style: textStyle.copyWith(color: color),
    );
    final content = Row(
      mainAxisSize: allowMultiline && fullWidth
          ? MainAxisSize.max
          : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (iconWidget != null) ...[
          IconTheme(
            data: IconThemeData(color: color, size: CatchIconSize.md),
            child: iconWidget,
          ),
          SizedBox(width: gap),
        ],
        Flexible(child: labelWidget),
      ],
    );

    if (mode == CatchButtonContentRowMode.label) return content;
    return Stack(
      alignment: Alignment.center,
      children: [
        ExcludeSemantics(
          child: Visibility(
            visible: false,
            maintainSize: true,
            maintainAnimation: true,
            maintainState: true,
            child: content,
          ),
        ),
        CatchLoadingIndicator.dots(color: color),
      ],
    );
  }
}
