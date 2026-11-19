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
    this.trailing,
    this.gap = CatchSpacing.micro6,
    this.fullWidth = false,
    this.allowMultiline = false,
    this.mode = CatchButtonContentRowMode.label,
  });

  /// Above this text scale a label may wrap between words.
  static const double wrapTextScale = 1.3;

  final String label;
  final Color color;
  final Widget? leading;

  /// An icon after the label, such as open-external on "Open Razorpay".
  final Widget? trailing;
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
    // A label keeps to one line, shrinking a little to fit a narrow button
    // ("WhatsApp", never "WhatsA / pp"). Only at large text sizes may it
    // wrap, between words, so the type stays readable.
    final wraps =
        allowMultiline &&
        MediaQuery.textScalerOf(context).scale(CatchSpacing.s4) >
            CatchSpacing.s4 * CatchButtonContentRow.wrapTextScale;
    final style = textStyle.copyWith(color: color);
    final labelWidget = wraps
        ? Text(
            label,
            overflow: TextOverflow.visible,
            textAlign: TextAlign.center,
            style: style,
          )
        : FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              label,
              maxLines: 1,
              softWrap: false,
              textAlign: TextAlign.center,
              style: style,
            ),
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
        if (trailing case final trailing?) ...[
          SizedBox(width: gap),
          IconTheme(
            data: IconThemeData(color: color, size: CatchIconSize.md),
            child: trailing,
          ),
        ],
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
