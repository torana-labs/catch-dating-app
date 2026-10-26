import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:flutter/material.dart';

enum CatchLoadingIndicatorVariant { circular, dots, inline }

/// Indeterminate activity feedback with circular, dots and inline recipes.
class CatchLoadingIndicator extends StatefulWidget {
  const CatchLoadingIndicator({
    super.key,
    this.strokeWidth = CatchStroke.progressIndicator,
    this.color,
  }) : size = CatchFieldTokens.spinnerExtent,
       variant = CatchLoadingIndicatorVariant.circular;

  /// Compact motion-independent feedback for busy button content.
  const CatchLoadingIndicator.dots({super.key, required Color this.color})
    : size = CatchFieldTokens.spinnerExtent,
      strokeWidth = CatchStroke.progressIndicator,
      variant = CatchLoadingIndicatorVariant.dots;

  /// Fixed-cadence glyph for status and commit feedback beside field content.
  const CatchLoadingIndicator.inline({
    super.key,
    this.size = CatchFieldTokens.spinnerExtent,
    required Color this.color,
  }) : strokeWidth = CatchStroke.progressIndicator,
       variant = CatchLoadingIndicatorVariant.inline;

  final double size;
  final CatchLoadingIndicatorVariant variant;
  final double strokeWidth;
  final Color? color;

  @override
  State<CatchLoadingIndicator> createState() => _CatchLoadingIndicatorState();
}

class _CatchLoadingIndicatorState extends State<CatchLoadingIndicator>
    with TickerProviderStateMixin {
  AnimationController? _rotation;

  @override
  void initState() {
    super.initState();
    _syncRotation();
  }

  @override
  void didUpdateWidget(CatchLoadingIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.variant != oldWidget.variant) _syncRotation();
  }

  void _syncRotation() {
    if (widget.variant == CatchLoadingIndicatorVariant.inline) {
      _rotation = AnimationController(
        vsync: this,
        duration: CatchFieldTokens.spinnerPeriod,
      )..repeat();
    } else {
      _rotation?.dispose();
      _rotation = null;
    }
  }

  @override
  void dispose() {
    _rotation?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.variant == CatchLoadingIndicatorVariant.inline) {
      return RotationTransition(
        key: const ValueKey('catch-field-spinner'),
        turns: _rotation!,
        child: Icon(CatchIcons.loading, size: widget.size, color: widget.color),
      );
    }
    if (widget.variant == CatchLoadingIndicatorVariant.dots) {
      return Row(
        key: const ValueKey('catch-button-loading'),
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(3, (index) {
          return Padding(
            padding: EdgeInsets.only(left: index == 0 ? 0 : CatchSpacing.s1),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: widget.color!.withValues(
                  alpha: CatchOpacity.loadingDotAlphas[index],
                ),
                borderRadius: BorderRadius.circular(CatchRadius.pill),
              ),
              child: const SizedBox.square(dimension: CatchSpacing.micro6),
            ),
          );
        }),
      );
    }
    return Center(
      child: CircularProgressIndicator(
        strokeWidth: widget.strokeWidth,
        color: widget.color,
      ),
    );
  }
}
