import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_badge.dart';
import 'package:catch_ui/src/components/catch_field_label_text_mode.dart';
import 'package:catch_ui/src/components/catch_field_label_text_size.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/material.dart';

/// Already-localized optional-field copy supplied by the caller.
class CatchFieldLabelTextCopy {
  const CatchFieldLabelTextCopy({
    required this.optionalLabel,
    required this.optionalSuffix,
    required this.optionalSemantics,
  });

  final String optionalLabel;
  final String optionalSuffix;
  final String Function(String label) optionalSemantics;
}

/// Field-owned visible label and localized optional accessibility description.
class CatchFieldLabelText extends StatelessWidget {
  const CatchFieldLabelText({
    super.key,
    required this.label,
    required this.copy,
    this.mode = CatchFieldLabelTextMode.visible,
    this.hasError = false,
    this.size = CatchFieldLabelTextSize.sm,
  }) : inlineOptional = false,
       style = null,
       maxLines = 1;

  const CatchFieldLabelText.inline({
    super.key,
    required this.label,
    required this.copy,
    required this.style,
    this.mode = CatchFieldLabelTextMode.visible,
    this.hasError = false,
    this.maxLines = 1,
  }) : inlineOptional = true,
       size = CatchFieldLabelTextSize.sm;

  final String label;
  final CatchFieldLabelTextCopy copy;
  final CatchFieldLabelTextMode mode;
  bool get isOptional => mode.isOptional;
  final bool hasError;
  final CatchFieldLabelTextSize size;
  final bool inlineOptional;
  final TextStyle? style;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    if (!mode.showsLabel) {
      return Semantics(
        label: isOptional ? copy.optionalSemantics(label) : label,
        child: const SizedBox.shrink(),
      );
    }
    final t = CatchTokens.of(context);
    final showOptionalBadge =
        isOptional && MediaQuery.textScalerOf(context).scale(1) < 1.5;
    final labelStyle = size == CatchFieldLabelTextSize.lg
        ? CatchTextStyles.titleS(context, color: hasError ? t.danger : t.ink2)
        // `.t-field-label` — 11.5 / w500 / ink3 (sentence case, not mono).
        : CatchTextStyles.fieldLabel(
            context,
            color: hasError ? t.danger : null,
          );

    if (inlineOptional) {
      final effectiveStyle = style ?? labelStyle;
      final labelText = Text(
        label,
        style: effectiveStyle,
        maxLines: maxLines,
        overflow: TextOverflow.ellipsis,
      );
      if (!isOptional) return labelText;

      // Keep the visible label as its own text node so clients can target the
      // field name without folding the optional qualifier into that name.
      final text = Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Flexible(child: labelText),
          Text(
            copy.optionalSuffix,
            style: effectiveStyle.copyWith(
              color: hasError ? t.danger : t.ink3,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
          ),
        ],
      );
      return Semantics(
        label: copy.optionalSemantics(label),
        excludeSemantics: true,
        child: text,
      );
    }

    return Semantics(
      label: isOptional ? copy.optionalSemantics(label) : label,
      excludeSemantics: true,
      child: Row(
        children: [
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: labelStyle,
            ),
          ),
          if (showOptionalBadge) ...[
            const SizedBox(width: CatchSpacing.s2),
            CatchBadge.optional(label: copy.optionalLabel, hasError: hasError),
          ],
        ],
      ),
    );
  }
}
