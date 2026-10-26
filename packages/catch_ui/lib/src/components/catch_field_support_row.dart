import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_field_support_row_tone.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/material.dart';

/// Field helper/error and optional counter row.
class CatchFieldSupportRow extends StatelessWidget {
  const CatchFieldSupportRow({
    super.key,
    this.text,
    this.counter,
    required this.color,
    this.showErrorIcon = false,
    this.padding = EdgeInsets.zero,
  });

  final String? text;
  final String? counter;
  final Color color;
  final bool showErrorIcon;
  final EdgeInsetsGeometry padding;

  /// Semantic support palette shared with native text and content-row renderers.
  static Color resolveColor(
    BuildContext context,
    CatchFieldSupportRowTone tone,
  ) {
    final tokens = CatchTokens.of(context);
    return switch (tone) {
      CatchFieldSupportRowTone.neutral => tokens.ink2,
      CatchFieldSupportRowTone.brand => tokens.primary,
      CatchFieldSupportRowTone.success => tokens.success,
    };
  }

  @override
  Widget build(BuildContext context) {
    final normalizedText = text?.trim();
    final normalizedCounter = counter?.trim();
    final hasText = normalizedText?.isNotEmpty == true;
    final hasCounter = normalizedCounter?.isNotEmpty == true;
    if (!hasText && !hasCounter) return const SizedBox.shrink();

    final label = Text(
      normalizedText ?? '',
      // Helpers and errors explain the consequence of a setting or how to
      // recover. They must remain readable at narrow widths and large text.
      style: CatchTextStyles.supporting(context, color: color).copyWith(
        fontSize: CatchFieldTokens.captionFontSize,
        fontWeight: FontWeight.w500,
        height: CatchFieldTokens.supportLineHeight,
      ),
    );
    final support = showErrorIcon
        ? Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              ExcludeSemantics(
                child: Icon(
                  CatchIcons.error,
                  size: CatchFieldTokens.errorGlyphExtent,
                  color: color,
                ),
              ),
              const SizedBox(width: CatchFieldTokens.errorGlyphGap),
              Flexible(child: label),
            ],
          )
        : label;

    final counterStyle = CatchTextStyles.monoLabel(
      context,
      color: CatchTokens.of(context).ink3,
    ).copyWith(fontSize: CatchFieldTokens.counterFontSize);
    final counterLabel = Text(
      normalizedCounter ?? '',
      style: counterStyle,
      textAlign: TextAlign.end,
    );
    final content = Padding(
      padding: padding,
      child: LayoutBuilder(
        builder: (context, constraints) {
          // A counter alone must receive the field's width so large text can
          // wrap rather than overflowing a narrow input beside its dial code.
          if (!hasText) {
            return Align(
              alignment: AlignmentDirectional.centerEnd,
              child: counterLabel,
            );
          }
          if (!hasCounter) {
            // Keep helper-only and error-only content in the full field lane.
            // Returning the label directly would shrink an intrinsic parent.
            return Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [Expanded(child: support)],
            );
          }

          final counterPainter = TextPainter(
            text: TextSpan(text: normalizedCounter, style: counterStyle),
            textDirection: Directionality.of(context),
            textScaler: MediaQuery.textScalerOf(context),
          )..layout();
          final counterWidth = counterPainter.width;
          counterPainter.dispose();
          final supportMinimum = showErrorIcon
              ? CatchFieldTokens.errorGlyphExtent +
                    CatchFieldTokens.errorGlyphGap
              : 0.0;
          if (counterWidth +
                  CatchFieldTokens.supportingCounterGap +
                  supportMinimum >=
              constraints.maxWidth) {
            // Preserve all helper/error copy when the counter cannot share a
            // baseline. Both lines retain the full available field width.
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                support,
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: counterLabel,
                ),
              ],
            );
          }
          return Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Expanded(child: support),
              const SizedBox(width: CatchFieldTokens.supportingCounterGap),
              counterLabel,
            ],
          );
        },
      ),
    );
    if (!showErrorIcon || !hasText) return content;
    return Semantics(
      label: normalizedText,
      liveRegion: true,
      child: ExcludeSemantics(child: content),
    );
  }
}
