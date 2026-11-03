import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/material.dart';

/// Animated, uncapped numeric text for count-bearing headers.
class CatchCountText extends StatelessWidget {
  const CatchCountText({super.key, required this.count, this.color});

  final int count;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: MediaQuery.maybeOf(context)?.disableAnimations == true
          ? Duration.zero
          : CatchMotion.base,
      switchInCurve: CatchMotion.springCurve,
      switchOutCurve: CatchMotion.standardCurve,
      transitionBuilder: (child, animation) {
        final slide = Tween<Offset>(
          begin: const Offset(0, 0.4),
          end: Offset.zero,
        ).animate(animation);
        return ClipRect(
          child: FadeTransition(
            opacity: animation,
            child: SlideTransition(position: slide, child: child),
          ),
        );
      },
      layoutBuilder: (currentChild, previousChildren) {
        return Stack(
          alignment: Alignment.centerRight,
          children: [...previousChildren, ?currentChild],
        );
      },
      child: Text(
        count.toString(),
        key: ValueKey<int>(count),
        style: CatchTextStyles.numericMeta(
          context,
          color: color ?? CatchTokens.of(context).ink2,
        ).copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}
