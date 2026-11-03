import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/widgets.dart';
import 'package:skeletonizer/skeletonizer.dart';

/// One paint and motion policy for every Catch loading composition.
PaintingEffect catchSkeletonEffect(BuildContext context) {
  final t = CatchTokens.of(context);
  final reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations == true;
  return reduceMotion
      ? SolidColorEffect(color: t.tile)
      : ShimmerEffect(
          baseColor: t.tile,
          highlightColor: t.ground,
          duration: CatchMotion.skeletonShimmer,
        );
}
