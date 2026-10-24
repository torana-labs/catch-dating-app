import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/material.dart';

/// Measured welcome lockup and rich reel paint, with copy supplied by the caller.
///
/// Features own localization and animation state. This material owns the fixed
/// typography, text-scale cap, fitting, period paint and underline geometry.
class CatchWelcomeText extends StatelessWidget {
  const CatchWelcomeText.focus({
    super.key,
    required String this.brandLabel,
    required Color this.catchColor,
    required double this.maxWidth,
    this.phrase,
    this.phraseColor,
    this.underlineColor,
    this.showBrandUnderscore = false,
  }) : periodColor = null,
       _focus = true,
       assert(
         phrase == null || (phraseColor != null && underlineColor != null),
       );

  const CatchWelcomeText.reel({
    super.key,
    required String this.phrase,
    required Color this.phraseColor,
    required Color this.periodColor,
    this.underlineColor,
  }) : brandLabel = null,
       catchColor = null,
       maxWidth = null,
       showBrandUnderscore = false,
       _focus = false;

  static const textKey = ValueKey<String>('welcome-focus-lockup-text');
  static const underlineKey = ValueKey<String>(
    'welcome-focus-lockup-underline',
  );
  static const reelUnderlineKey = ValueKey<String>(
    'welcome-reel-focused-underline',
  );

  final String? brandLabel;
  final String? phrase;
  final Color? catchColor;
  final Color? phraseColor;
  final Color? periodColor;
  final Color? underlineColor;
  final double? maxWidth;
  final bool showBrandUnderscore;
  final bool _focus;

  @override
  Widget build(BuildContext context) {
    final style = catchWelcomeTextStyle(_focus ? catchColor! : phraseColor!);
    final requestedScale = MediaQuery.textScalerOf(context).scale(1);
    final textScaler = TextScaler.linear(
      requestedScale.clamp(1.0, CatchWelcomeTokens.welcomeReelMaxTextScale),
    );
    if (!_focus) {
      return Stack(
        clipBehavior: Clip.none,
        children: [
          Text.rich(
            TextSpan(
              children: [
                TextSpan(text: phrase),
                TextSpan(
                  text: '.',
                  style: style.copyWith(color: periodColor),
                ),
              ],
            ),
            style: style,
            maxLines: 2,
            overflow: TextOverflow.clip,
            softWrap: true,
            textScaler: textScaler,
          ),
          if (underlineColor != null)
            Positioned(
              key: reelUnderlineKey,
              left: 0,
              right: 0,
              bottom:
                  -CatchWelcomeTokens.welcomeReelUnderlineGap -
                  CatchWelcomeTokens.welcomeReelUnderlineThickness,
              height: CatchWelcomeTokens.welcomeReelUnderlineThickness,
              child: ColoredBox(color: underlineColor!),
            ),
        ],
      );
    }

    final catchLabel = brandLabel!;
    final phraseText = phrase == null ? null : '$phrase.';
    final children = <InlineSpan>[
      TextSpan(text: catchLabel, style: style),
      if (showBrandUnderscore)
        TextSpan(
          text: '_',
          style: style.copyWith(color: CatchWelcomeColors.wordmarkBlank),
        ),
      if (phraseText != null) ...[
        TextSpan(text: ' ', style: style),
        TextSpan(
          text: phraseText,
          style: style.copyWith(color: phraseColor),
        ),
      ],
    ];
    final lockupSpan = TextSpan(children: children);
    final painter = TextPainter(
      text: lockupSpan,
      textDirection: Directionality.of(context),
      textScaler: textScaler,
      maxLines: 1,
    )..layout();
    final phraseStart = phraseText == null ? null : catchLabel.length + 1;
    final phraseBoxes = phraseStart == null
        ? const <TextBox>[]
        : painter.getBoxesForSelection(
            TextSelection(
              baseOffset: phraseStart,
              extentOffset: phraseStart + phrase!.length,
            ),
          );
    final phraseBox = phraseBoxes.isEmpty ? null : phraseBoxes.first;
    final underlineTop =
        painter.height + CatchWelcomeTokens.welcomeReelUnderlineGap;
    final contentHeight = phraseBox == null
        ? painter.height
        : math.max(
            painter.height,
            underlineTop + CatchWelcomeTokens.welcomeReelUnderlineThickness,
          );
    final fitScale = painter.width <= 0
        ? 1.0
        : math.min(1.0, maxWidth! / painter.width);
    final fittedWidth = painter.width * fitScale;
    final fittedHeight = contentHeight * fitScale;
    final semanticLabel = phraseText == null
        ? catchLabel
        : '$catchLabel $phraseText';

    return Semantics(
      label: semanticLabel,
      excludeSemantics: true,
      child: SizedBox(
        width: fittedWidth,
        height: fittedHeight,
        child: OverflowBox(
          alignment: Alignment.topLeft,
          minWidth: painter.width,
          maxWidth: painter.width,
          minHeight: contentHeight,
          maxHeight: contentHeight,
          child: Transform.scale(
            scale: fitScale,
            alignment: Alignment.topLeft,
            child: SizedBox(
              width: painter.width,
              height: contentHeight,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Text.rich(
                    key: textKey,
                    lockupSpan,
                    style: style,
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.visible,
                    textScaler: textScaler,
                  ),
                  if (phraseBox != null)
                    Positioned(
                      left: phraseBox.left,
                      top: underlineTop,
                      width: phraseBox.right - phraseBox.left,
                      height: CatchWelcomeTokens.welcomeReelUnderlineThickness,
                      child: ColoredBox(
                        key: underlineKey,
                        color: underlineColor!,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
