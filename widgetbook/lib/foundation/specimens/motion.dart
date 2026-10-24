import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import 'metrics.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Stroke and motion',
  type: FoundationStrokeMotionTokens,
  path: '[Foundation tokens]/Core',
)
Widget foundationStrokeMotionTokens(BuildContext context) {
  return const FoundationStrokeMotionTokens();
}

class FoundationStrokeMotionTokens extends StatelessWidget {
  const FoundationStrokeMotionTokens({super.key});

  @override
  Widget build(BuildContext context) {
    return WidgetbookContractFrame.foundation(
      title: 'Stroke and motion',
      contractId: 'foundation.motion',
      states: const ['stroke', 'duration', 'curve'],
      children: const [
        WidgetbookFoundationSpecSection(
          title: 'Stroke widths',
          child: _StrokeStack(
            rows: [
              WidgetbookFoundationMetricSpec('hairline', CatchStroke.hairline),
              WidgetbookFoundationMetricSpec(
                'underline',
                CatchStroke.underline,
              ),
              WidgetbookFoundationMetricSpec(
                'avatarRing',
                CatchStroke.avatarRing,
              ),
              WidgetbookFoundationMetricSpec(
                'selection',
                CatchStroke.selection,
              ),
            ],
          ),
        ),
        WidgetbookFoundationSpecSection(
          title: 'Motion durations',
          child: _DurationStack(
            rows: [
              _DurationSpec('fast', CatchMotion.fast),
              _DurationSpec('micro', CatchMotion.micro),
              _DurationSpec('chatScroll', CatchMotion.chatScroll),
              _DurationSpec('base', CatchMotion.base),
              _DurationSpec('pageStep', CatchMotion.pageStep),
              _DurationSpec('calendarScroll', CatchMotion.calendarScroll),
              _DurationSpec('slow', CatchMotion.slow),
              _DurationSpec('pulse', CatchMotion.pulse),
              _DurationSpec('skeletonShimmer', CatchMotion.skeletonShimmer),
            ],
          ),
        ),
        WidgetbookFoundationSpecSection(
          title: 'Motion curves',
          child: _CurveGrid(
            rows: [
              _CurveSpec('standardCurve', CatchMotion.standardCurve),
              _CurveSpec('easeInOutCurve', CatchMotion.easeInOutCurve),
              _CurveSpec('easeOutCubicCurve', CatchMotion.easeOutCubicCurve),
              _CurveSpec('easeOutBackCurve', CatchMotion.easeOutBackCurve),
              _CurveSpec('elasticOutCurve', CatchMotion.elasticOutCurve),
              _CurveSpec('welcomeRevealCurve', CatchMotion.welcomeRevealCurve),
            ],
          ),
        ),
      ],
    );
  }
}

class _StrokeStack extends StatelessWidget {
  const _StrokeStack({required this.rows});

  final List<WidgetbookFoundationMetricSpec> rows;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final row in rows)
          Padding(
            padding: const EdgeInsets.only(bottom: CatchSpacing.s3),
            child: _StrokeRow(row: row),
          ),
      ],
    );
  }
}

class _StrokeRow extends StatelessWidget {
  const _StrokeRow({required this.row});

  final WidgetbookFoundationMetricSpec row;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Row(
      children: [
        SizedBox(
          width: WidgetbookPreviewLayout.foundationMetricLabelWidth,
          child: Text(row.name, style: CatchTextStyles.monoLabel(context)),
        ),
        Expanded(
          child: Align(
            alignment: Alignment.centerLeft,
            child: Container(
              height: WidgetbookPreviewLayout.foundationMotionTrackHeight,
              alignment: Alignment.centerLeft,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: t.primary,
                  borderRadius: BorderRadius.circular(CatchRadius.pill),
                ),
                child: SizedBox(
                  width: WidgetbookPreviewLayout.foundationMotionBarWidth,
                  height: row.value,
                ),
              ),
            ),
          ),
        ),
        SizedBox(
          width: WidgetbookPreviewLayout.foundationMetricValueWidth,
          child: Text(
            '${widgetbookFoundationNumber(row.value)} px',
            textAlign: TextAlign.end,
            style: CatchTextStyles.numericMeta(context),
          ),
        ),
      ],
    );
  }
}

class _DurationStack extends StatelessWidget {
  const _DurationStack({required this.rows});

  final List<_DurationSpec> rows;

  @override
  Widget build(BuildContext context) {
    final maxMs = rows
        .map((row) => row.duration.inMilliseconds)
        .reduce((a, b) => a > b ? a : b);
    return Column(
      children: [
        for (final row in rows)
          Padding(
            padding: const EdgeInsets.only(bottom: CatchSpacing.s2),
            child: _DurationRow(row: row, maxMs: maxMs),
          ),
      ],
    );
  }
}

class _DurationRow extends StatelessWidget {
  const _DurationRow({required this.row, required this.maxMs});

  final _DurationSpec row;
  final int maxMs;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final width = (row.duration.inMilliseconds / maxMs * 240).clamp(1, 240);
    return Row(
      children: [
        SizedBox(
          width: WidgetbookPreviewLayout.foundationMetricLabelWidth,
          child: Text(row.name, style: CatchTextStyles.monoLabel(context)),
        ),
        Expanded(
          child: Align(
            alignment: Alignment.centerLeft,
            child: Container(
              width: width.toDouble(),
              height: WidgetbookPreviewLayout.foundationMetricBarHeight,
              decoration: BoxDecoration(
                color: t.primary,
                borderRadius: BorderRadius.circular(CatchRadius.pill),
              ),
            ),
          ),
        ),
        SizedBox(
          width: WidgetbookPreviewLayout.foundationMetricValueWidth,
          child: Text(
            '${row.duration.inMilliseconds} ms',
            textAlign: TextAlign.end,
            style: CatchTextStyles.numericMeta(context),
          ),
        ),
      ],
    );
  }
}

class _CurveGrid extends StatelessWidget {
  const _CurveGrid({required this.rows});

  final List<_CurveSpec> rows;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: CatchSpacing.s4,
      runSpacing: CatchSpacing.s4,
      children: [for (final row in rows) _CurveTile(row: row)],
    );
  }
}

class _CurveTile extends StatelessWidget {
  const _CurveTile({required this.row});

  final _CurveSpec row;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return SizedBox(
      width: WidgetbookPreviewLayout.foundationCurveTileWidth,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: t.raised,
          border: Border.all(color: t.line),
          borderRadius: BorderRadius.circular(CatchRadius.md),
        ),
        child: Padding(
          padding: CatchInsets.contentDense,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                height: WidgetbookPreviewLayout.foundationInsetSampleHeight,
                child: CustomPaint(
                  painter: _CurvePainter(curve: row.curve, tokens: t),
                  child: const SizedBox.expand(),
                ),
              ),
              gapH10,
              Text(row.name, style: CatchTextStyles.statusLabel(context)),
            ],
          ),
        ),
      ),
    );
  }
}

class _CurvePainter extends CustomPainter {
  const _CurvePainter({required this.curve, required this.tokens});

  final Curve curve;
  final CatchTokens tokens;

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = tokens.line
      ..strokeWidth = CatchStroke.hairline;
    canvas.drawLine(
      Offset(0, size.height),
      Offset(size.width, size.height),
      gridPaint,
    );
    canvas.drawLine(Offset.zero, Offset(0, size.height), gridPaint);

    final path = Path();
    for (var i = 0; i <= 24; i++) {
      final x = i / 24;
      final y = curve.transform(x.clamp(0, 1));
      final point = Offset(x * size.width, (1 - y) * size.height);
      if (i == 0) {
        path.moveTo(point.dx, point.dy);
      } else {
        path.lineTo(point.dx, point.dy);
      }
    }
    final curvePaint = Paint()
      ..color = tokens.primary
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = CatchStroke.selection;
    canvas.drawPath(path, curvePaint);
  }

  @override
  bool shouldRepaint(_CurvePainter oldDelegate) =>
      oldDelegate.curve != curve || oldDelegate.tokens != tokens;
}

class _DurationSpec {
  const _DurationSpec(this.name, this.duration);

  final String name;
  final Duration duration;
}

class _CurveSpec {
  const _CurveSpec(this.name, this.curve);

  final String name;
  final Curve curve;
}
