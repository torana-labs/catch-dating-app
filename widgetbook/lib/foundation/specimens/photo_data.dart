import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import 'color_samples.dart';
import 'metrics.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Data pairs and photo grade',
  type: FoundationDataPhotoTokens,
  path: '[Foundation tokens]/Core',
)
Widget foundationDataPhotoTokens(BuildContext context) {
  return const FoundationDataPhotoTokens();
}

class FoundationDataPhotoTokens extends StatelessWidget {
  const FoundationDataPhotoTokens({super.key});

  @override
  Widget build(BuildContext context) {
    return WidgetbookContractFrame.foundation(
      title: 'Data pairs and photo grade',
      contractId: 'foundation.photo-data',
      states: const ['data-pair', 'photo-grade', 'light-dark'],
      children: [
        const WidgetbookFoundationSpecSection(
          title: 'Data pair examples',
          child: _DataPairExamples(),
        ),
        WidgetbookFoundationDualThemeSection(
          title: 'Photo grade',
          builder: (context) => _PhotoGradePanel(grade: CatchGrade.of(context)),
        ),
      ],
    );
  }
}

class _DataPairExamples extends StatelessWidget {
  const _DataPairExamples();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchMetricSection(
          items: const [
            CatchMetricValue(value: '24', label: 'spots'),
            CatchMetricValue(value: '8:30', label: 'starts'),
            CatchMetricValue(value: '6', unit: 'km', label: 'away'),
          ],
        ),
        gapH16,
        CatchMetricSection(
          items: const [
            CatchMetricValue(value: '4.8', label: 'rating'),
            CatchMetricValue(value: '126', label: 'guests'),
            CatchMetricValue(value: '12', label: 'hosts'),
            CatchMetricValue(value: '3', label: 'rooms'),
          ],
        ),
      ],
    );
  }
}

class _PhotoGradePanel extends StatelessWidget {
  const _PhotoGradePanel({required this.grade});

  final CatchGrade grade;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: CatchSpacing.s4,
          runSpacing: CatchSpacing.s4,
          children: const [
            _PhotoGradeTile(label: 'Raw sample', enabled: false),
            _PhotoGradeTile(label: 'Catch grade', enabled: true),
          ],
        ),
        gapH16,
        WidgetbookFoundationMetricStack(
          maxBarWidth: 160,
          rows: [
            WidgetbookFoundationMetricSpec('saturation', grade.saturation),
            WidgetbookFoundationMetricSpec('contrast', grade.contrast),
            WidgetbookFoundationMetricSpec('brightness', grade.brightness),
            WidgetbookFoundationMetricSpec('grainOpacity', grade.grainOpacity),
          ],
        ),
        gapH12,
        WidgetbookFoundationColorGrid(
          colors: [
            WidgetbookFoundationColorSpec('warmShadow', grade.warmShadow),
            WidgetbookFoundationColorSpec('warmHighlight', grade.warmHighlight),
          ],
        ),
      ],
    );
  }
}

class _PhotoGradeTile extends StatelessWidget {
  const _PhotoGradeTile({required this.label, required this.enabled});

  final String label;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return SizedBox(
      width: WidgetbookPreviewLayout.foundationPhotoGradeTileWidth,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(CatchRadius.md),
            child: CatchGradedImage(
              enabled: enabled,
              child: const AspectRatio(
                aspectRatio: CatchAspectRatio.portrait4x5,
                child: _PhotoGradeSample(),
              ),
            ),
          ),
          gapH8,
          Text(label, style: CatchTextStyles.statusLabel(context)),
          Text(
            enabled ? 'display-time grade' : 'ungraded source',
            style: CatchTextStyles.monoLabelS(context, color: t.ink2),
          ),
        ],
      ),
    );
  }
}

class _PhotoGradeSample extends StatelessWidget {
  const _PhotoGradeSample();

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final activity = ActivityPalette.of(
      context,
    ).getActivity(ActivityKind.dinner);
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [activity.soft, activity.accent, activity.deep, t.ink],
          stops: [0, 0.38, 0.68, 1],
        ),
      ),
      child: CustomPaint(
        painter: _PhotoGradeSamplePainter(
          glow: t.surface.withValues(alpha: CatchOpacity.coverStoryGlow),
          shadow: t.ink.withValues(alpha: CatchOpacity.disabledControl),
          glint: t.surface.withValues(
            alpha: CatchOpacity.ticketPerforationLine,
          ),
        ),
      ),
    );
  }
}

class _PhotoGradeSamplePainter extends CustomPainter {
  const _PhotoGradeSamplePainter({
    required this.glow,
    required this.shadow,
    required this.glint,
  });

  final Color glow;
  final Color shadow;
  final Color glint;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = glow;
    canvas.drawCircle(
      Offset(size.width * 0.70, size.height * 0.22),
      size.shortestSide * 0.18,
      paint,
    );
    paint.color = shadow;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          size.width * 0.12,
          size.height * 0.56,
          size.width * 0.76,
          size.height * 0.26,
        ),
        const Radius.circular(CatchRadius.md),
      ),
      paint,
    );
    paint.color = glint;
    for (var i = 0; i < 5; i++) {
      final x = size.width * (0.18 + i * 0.15);
      canvas.drawCircle(Offset(x, size.height * 0.42), 3, paint);
    }
  }

  @override
  bool shouldRepaint(_PhotoGradeSamplePainter oldDelegate) => false;
}
