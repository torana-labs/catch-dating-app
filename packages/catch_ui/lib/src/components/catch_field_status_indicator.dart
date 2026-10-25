import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_field_motion.dart';
import 'package:catch_ui/src/components/catch_field_status.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/primitives/catch_loading_indicator.dart';
import 'package:flutter/material.dart';

/// Animated saving/saved feedback for the `CatchField` trailing lane.
///
/// Product surfaces normally receive this through `CatchFieldTrailingRow.status`
/// or `CatchFieldTrailingRow.toggle`. It is public so the field family keeps a
/// cataloged, directly testable status contract instead of a private widget
/// destination.
class CatchFieldStatusIndicator extends StatefulWidget {
  const CatchFieldStatusIndicator({
    super.key,
    required this.status,
    required this.savingSemanticLabel,
    required this.savedSemanticLabel,
    this.includeTrailingGap = false,
  });

  final CatchFieldStatus status;
  final String savingSemanticLabel;
  final String savedSemanticLabel;
  final bool includeTrailingGap;

  @override
  State<CatchFieldStatusIndicator> createState() =>
      _CatchFieldStatusIndicatorState();
}

class _CatchFieldStatusIndicatorState extends State<CatchFieldStatusIndicator> {
  late CatchFieldStatus _displayedStatus;
  bool _appeared = false;
  bool _appearanceScheduled = false;

  @override
  void initState() {
    super.initState();
    _displayedStatus = widget.status;
    _scheduleAppearance();
  }

  void _scheduleAppearance() {
    if (_displayedStatus == CatchFieldStatus.idle || _appearanceScheduled) {
      return;
    }
    _appearanceScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _appearanceScheduled = false;
      if (!mounted || _displayedStatus == CatchFieldStatus.idle) return;
      setState(() => _appeared = true);
    });
  }

  @override
  void didUpdateWidget(covariant CatchFieldStatusIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    _displayedStatus = widget.status;
    if (oldWidget.status != widget.status) {
      _appeared = false;
      _scheduleAppearance();
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final duration = catchFieldMotionDuration(context, CatchMotion.base);
    final child = switch (_displayedStatus) {
      CatchFieldStatus.idle => const SizedBox.shrink(
        key: ValueKey('catch-field-status-idle'),
      ),
      CatchFieldStatus.saving => Semantics(
        key: const ValueKey('catch-field-status-saving'),
        label: widget.savingSemanticLabel,
        child: ExcludeSemantics(
          child: AnimatedOpacity(
            key: const ValueKey('catch-field-status-entry-opacity'),
            duration: duration,
            curve: CatchMotion.standardCurve,
            opacity: _appeared ? 1 : 0,
            child: SizedBox.square(
              dimension: CatchFieldTokens.spinnerExtent,
              child: CatchLoadingIndicator.inline(color: t.ink3),
            ),
          ),
        ),
      ),
      CatchFieldStatus.saved => Semantics(
        key: const ValueKey('catch-field-status-saved'),
        label: widget.savedSemanticLabel,
        child: ExcludeSemantics(
          child: AnimatedOpacity(
            key: const ValueKey('catch-field-status-entry-opacity'),
            duration: duration,
            curve: CatchMotion.standardCurve,
            opacity: _appeared ? 1 : 0,
            child: AnimatedScale(
              duration: duration,
              curve: CatchMotion.easeOutBackCurve,
              scale: _appeared ? 1 : 0.85,
              child: Icon(
                CatchIcons.success,
                key: const ValueKey('catch-field-saved'),
                size: CatchFieldTokens.disclosureGlyphExtent,
                color: t.success,
              ),
            ),
          ),
        ),
      ),
    };
    final gappedChild =
        widget.includeTrailingGap && _displayedStatus != CatchFieldStatus.idle
        ? Padding(
            key: child.key,
            padding: const EdgeInsetsDirectional.only(
              end: CatchFieldTokens.trailingGap,
            ),
            child: KeyedSubtree(child: child),
          )
        : child;

    return AnimatedSwitcher(
      key: const ValueKey('catch-field-status-switcher'),
      duration: duration,
      transitionBuilder: (child, animation) {
        final fade = CurvedAnimation(
          parent: animation,
          curve: CatchMotion.standardCurve,
          reverseCurve: CatchMotion.standardCurve,
        );
        final faded = FadeTransition(opacity: fade, child: child);
        if (child.key != const ValueKey('catch-field-status-saved')) {
          return faded;
        }
        final scale = Tween<double>(begin: 0.85, end: 1).animate(
          CurvedAnimation(
            parent: animation,
            curve: CatchMotion.easeOutBackCurve,
            reverseCurve: CatchMotion.standardCurve,
          ),
        );
        return ScaleTransition(scale: scale, child: faded);
      },
      child: gappedChild,
    );
  }
}
