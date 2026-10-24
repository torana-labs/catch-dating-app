import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Read-only star row. [rating] is 1-5 (integers for filled stars).
class StarRatingRow extends StatelessWidget {
  const StarRatingRow({
    super.key,
    required this.rating,
    this.size = CatchIcon.xs,
  });

  final int rating;
  final double size;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final clampedRating = rating.clamp(0, 5);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(
        5,
        (i) => Icon(
          i < clampedRating
              ? CatchIcons.starRounded
              : CatchIcons.starOutlineRounded,
          size: size,
          // Ratings are ink data — pigment never touches stars: filled ink,
          // empty line2.
          color: i < clampedRating ? t.ink : t.line2,
        ),
      ),
    );
  }
}

/// Tappable star row for picking a rating.
class StarRatingPicker extends StatelessWidget {
  const StarRatingPicker({
    super.key,
    required this.rating,
    required this.onChanged,
    this.size = 40,
    this.keyBuilder,
    this.enabled = true,
  });

  final int rating;
  final ValueChanged<int> onChanged;
  final double size;
  final Key Function(int rating)? keyBuilder;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final clampedRating = rating.clamp(0, 5);

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(5, (i) {
        final value = i + 1;
        return Tooltip(
          message: context.l10n.reviewsStarRatingMessageValueStarValue2(
            value: value,
            value2: value == 1 ? '' : context.l10n.reviewsStarRatingMessageS,
          ),
          child: Semantics(
            button: true,
            enabled: enabled,
            label: context.l10n.reviewsStarRatingLabelRateValueStarValue2(
              value: value,
              value2: value == 1 ? '' : context.l10n.reviewsStarRatingLabelS,
            ),
            selected: clampedRating == value,
            child: CatchSurface(
              duration: Duration.zero,
              tone: CatchSurfaceTone.transparent,
              key: keyBuilder?.call(value),
              radius: CatchRadius.none,
              onTap: enabled ? () => onChanged(value) : null,
              child: Padding(
                padding: CatchInsets.inlineHorizontalTight,
                child: Icon(
                  i < clampedRating
                      ? CatchIcons.starRounded
                      : CatchIcons.starOutlineRounded,
                  size: size,
                  color: i < clampedRating ? t.ink : t.line2,
                ),
              ),
            ),
          ),
        );
      }),
    );
  }
}
