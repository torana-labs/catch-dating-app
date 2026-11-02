import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/material.dart';

/// Where one step of a [CatchSectionTimeline] stands.
enum CatchSectionStepState { done, current, next }

/// The tone of a [CatchSectionStepState.current] step that waits on something.
enum CatchSectionStepTone { neutral, warning, danger }

/// One step of a journey, shared with `@catch/web-ui`'s CatchSectionStep.
class CatchSectionStep {
  const CatchSectionStep({
    required this.title,
    required this.state,
    this.subtitle,
    this.meta,
    this.tone = CatchSectionStepTone.neutral,
  });

  final String title;
  final String? subtitle;

  /// When it happened ("Mon 28 Oct", "Now", "Next").
  final String? meta;
  final CatchSectionStepState state;
  final CatchSectionStepTone tone;
}

/// What a screen reader says before each step's title.
class CatchSectionTimelineCopy {
  const CatchSectionTimelineCopy({
    required this.done,
    required this.current,
    required this.next,
  });

  final String done;
  final String current;
  final String next;
}

/// A journey drawn as joined markers: a filled marker for a step that is done,
/// a heavy ring for the step now, and a light ring for what comes next. The line
/// under a done step is ink; every other line is quiet.
class CatchSectionTimeline extends StatelessWidget {
  const CatchSectionTimeline({
    super.key,
    required this.steps,
    required this.copy,
  });

  static const double _markerSize = 16;
  static const double _lineWidth = 2;
  static const double _markerTop = 2;

  final List<CatchSectionStep> steps;
  final CatchSectionTimelineCopy copy;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final (index, step) in steps.indexed)
          _row(context, t, step, last: index == steps.length - 1),
      ],
    );
  }

  Widget _row(
    BuildContext context,
    CatchTokens t,
    CatchSectionStep step, {
    required bool last,
  }) {
    final next = step.state == CatchSectionStepState.next;
    final textColor = next ? t.ink2 : t.ink;
    final subtitle = step.subtitle;
    final meta = step.meta;
    final prefix = switch (step.state) {
      CatchSectionStepState.done => copy.done,
      CatchSectionStepState.current => copy.current,
      CatchSectionStepState.next => copy.next,
    };
    return MergeSemantics(
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: _markerSize,
              child: Column(
                children: [
                  const SizedBox(height: _markerTop),
                  _marker(t, step),
                  if (!last)
                    Expanded(
                      child: Container(
                        key: const ValueKey('catch-section-timeline-line'),
                        width: _lineWidth,
                        color: step.state == CatchSectionStepState.done
                            ? t.ink
                            : t.line2,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: CatchSpacing.s3),
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(bottom: last ? 0 : CatchSpacing.s5),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Semantics(
                            label: '$prefix: ${step.title}',
                            excludeSemantics: true,
                            child: Text(
                              step.title,
                              style: CatchTextStyles.supportingStrong(
                                context,
                                color: textColor,
                              ),
                            ),
                          ),
                          if (subtitle != null)
                            Text(
                              subtitle,
                              style: CatchTextStyles.supporting(
                                context,
                                color: t.ink2,
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (meta != null) ...[
                      const SizedBox(width: CatchSpacing.s3),
                      Text(
                        meta,
                        style: CatchTextStyles.meta(context, color: t.ink2),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _marker(CatchTokens t, CatchSectionStep step) {
    final color = switch (step.state) {
      CatchSectionStepState.done => t.ink,
      CatchSectionStepState.next => t.line2,
      CatchSectionStepState.current => switch (step.tone) {
        CatchSectionStepTone.neutral => t.ink,
        CatchSectionStepTone.warning => t.warning,
        CatchSectionStepTone.danger => t.danger,
      },
    };
    return Container(
      width: _markerSize,
      height: _markerSize,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: step.state == CatchSectionStepState.done ? t.ink : t.surface,
        border: Border.all(
          color: color,
          width: step.state == CatchSectionStepState.current ? 5 : 2,
        ),
      ),
    );
  }
}
