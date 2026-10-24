import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_dating_app/core/widgets/event_backdrop_image.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

/// The single highest-leverage golden: a sheet of the design tokens, the full
/// type ramp, and the activity palette. Any regression in the palette, the
/// fonts/type scale, or the activity-color re-grade shows up here, in light AND
/// dark. Regenerate intentionally with:
///   flutter test --update-goldens test/goldens
void main() {
  testWidgets('design system sheet (light + dark)', (tester) async {
    await matchCatchGolden(tester, 'design_system_sheet', builder: _sheet);
    final headline = find.text('Tonight in Bandra.');
    final clubDisplay = find.text('Sundowner Run Club');
    expect(headline, findsOneWidget);
    expect(clubDisplay, findsOneWidget);
    final headlineRect = tester.getRect(headline);
    final clubRect = tester.getRect(clubDisplay);
    expect(headlineRect.height, greaterThan(30));
    expect(headlineRect.bottom, lessThanOrEqualTo(clubRect.top));
  }, tags: const ['golden']);
}

Widget _sheet(BuildContext context) {
  final t = CatchTokens.of(context);
  final ap = ActivityPalette.of(context);

  final swatches = <(String, Color)>[
    ('bg', t.bg),
    ('surface', t.surface),
    ('raised', t.raised),
    ('ink', t.ink),
    ('ink2', t.ink2),
    ('ink3', t.ink3),
    ('primary', t.primary),
    ('success', t.success),
    ('warning', t.warning),
    ('danger', t.danger),
    ('run', ap.forKind(ActivityKind.socialRun).accent),
    ('dinner', ap.forKind(ActivityKind.dinner).accent),
    ('pickle', ap.forKind(ActivityKind.pickleball).accent),
    ('quiz', ap.forKind(ActivityKind.pubQuiz).accent),
    ('bar', ap.forKind(ActivityKind.barCrawl).accent),
  ];

  return SingleChildScrollView(
    padding: const EdgeInsets.all(CatchSpacing.s5),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Catch — design system', style: CatchTextStyles.headline(context)),
        const SizedBox(height: CatchSpacing.s5),

        _section(context, 'COLOR'),
        const SizedBox(height: CatchSpacing.s3),
        Wrap(
          spacing: CatchSpacing.s3,
          runSpacing: CatchSpacing.s3,
          children: [for (final s in swatches) _swatch(context, s.$1, s.$2)],
        ),
        const SizedBox(height: CatchSpacing.s6),

        _section(context, 'TYPE'),
        const SizedBox(height: CatchSpacing.s3),
        Text('Tonight in Bandra.', style: CatchTextStyles.headline(context)),
        Text(
          'Sundowner Run Club',
          style: CatchTextStyles.clubDisplay(
            context,
            step: CatchTextStylesSize.m,
          ),
        ),
        Text(
          'Long table, short questions',
          style: CatchTextStyles.eventDisplay(
            context,
            step: CatchTextStylesSize.s,
          ),
        ),
        const SizedBox(height: CatchSpacing.s2),
        Text('Section title', style: CatchTextStyles.titleL(context)),
        Text(
          'Functional UI body, set in the platform font for controls and dense text.',
          style: CatchTextStyles.bodyL(context),
        ),
        Text(
          'Readable prose, set in the platform font for bios and details.',
          style: CatchTextStyles.bodyL(context),
        ),
        const SizedBox(height: CatchSpacing.s2),
        Text(
          'TONIGHT · 8:50 PM',
          style: CatchTextStyles.kicker(
            context,
            color: CatchTokens.of(context).primary,
          ),
        ),
        Text('7/10 · ₹1,400', style: CatchTextStyles.numericLarge(context)),
        Text('5.2 KM · 24 MIN', style: CatchTextStyles.mono(context)),
        const SizedBox(height: CatchSpacing.s6),

        _section(context, 'ACTIVITY ART'),
        const SizedBox(height: CatchSpacing.s3),
        Row(
          children: [
            _art(context, ActivityKind.socialRun),
            const SizedBox(width: CatchSpacing.s3),
            _art(context, ActivityKind.dinner),
            const SizedBox(width: CatchSpacing.s3),
            _art(context, ActivityKind.pubQuiz),
          ],
        ),
      ],
    ),
  );
}

Widget _section(BuildContext context, String label) => Text(
  label,
  style: CatchTextStyles.kicker(context, color: CatchTokens.of(context).ink3),
);

Widget _swatch(BuildContext context, String name, Color color) {
  final t = CatchTokens.of(context);
  return SizedBox(
    width: 64,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 64,
          height: 44,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(CatchRadius.sm),
            border: Border.all(color: t.line2),
          ),
        ),
        const SizedBox(height: 4),
        Text(name, style: CatchTextStyles.statusLabel(context)),
      ],
    ),
  );
}

Widget _art(BuildContext context, ActivityKind kind) => ClipRRect(
  borderRadius: BorderRadius.circular(CatchRadius.md),
  child: SizedBox(
    width: 116,
    height: 80,
    child: EventBackdropImage(
      visual: eventActivityVisual(kind, context: context),
      dense: true,
      iconSize: 64,
      iconOpacity: 0.22,
      patternOpacity: 0.24,
    ),
  ),
);
