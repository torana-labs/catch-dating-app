import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/material.dart';

/// Where one step of a [CatchSectionTimeline] stands.
enum CatchSectionStepStatus { done, current, next }

/// The tone of a [CatchSectionStepStatus.current] step that waits on something.
enum CatchSectionStepTone { neutral, warning, danger }

/// One step of a journey, shared with `@catch/web-ui`'s CatchSectionStep.
class CatchSectionStep {
  const CatchSectionStep({
    required this.title,
    required this.status,
    this.subtitle,
    this.meta,
    this.tone = CatchSectionStepTone.neutral,
  });

  final String title;
  final String? subtitle;

  /// When it happened ("Mon 28 Oct", "Now", "Next").
  final String? meta;
  final CatchSectionStepStatus status;
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
      children: steps.indexed
          .map((entry) {
            final (index, step) = entry;
            final last = index == steps.length - 1;
            final done = step.status == CatchSectionStepStatus.done;
            final current = step.status == CatchSectionStepStatus.current;
            final markerColor = switch (step.status) {
              CatchSectionStepStatus.done => t.ink,
              CatchSectionStepStatus.next => t.line2,
              CatchSectionStepStatus.current => switch (step.tone) {
                CatchSectionStepTone.neutral => t.ink,
                CatchSectionStepTone.warning => t.warning,
                CatchSectionStepTone.danger => t.danger,
              },
            };
            final prefix = switch (step.status) {
              CatchSectionStepStatus.done => copy.done,
              CatchSectionStepStatus.current => copy.current,
              CatchSectionStepStatus.next => copy.next,
            };
            final subtitle = step.subtitle;
            final meta = step.meta;
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
                          Container(
                            width: _markerSize,
                            height: _markerSize,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: done ? t.ink : t.surface,
                              border: Border.all(
                                color: markerColor,
                                width: current ? 5 : 2,
                              ),
                            ),
                          ),
                          if (!last)
                            Expanded(
                              child: Container(
                                key: const ValueKey(
                                  'catch-section-timeline-line',
                                ),
                                width: _lineWidth,
                                color: done ? t.ink : t.line2,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: CatchSpacing.s3),
                    Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(
                          bottom: last ? 0 : CatchSpacing.s5,
                        ),
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
                                        color:
                                            step.status ==
                                                CatchSectionStepStatus.next
                                            ? t.ink2
                                            : t.ink,
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
                                style: CatchTextStyles.supporting(
                                  context,
                                  color: t.ink2,
                                ),
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
          })
          .toList(growable: false),
    );
  }
}
