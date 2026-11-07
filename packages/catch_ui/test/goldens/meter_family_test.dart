@Tags(['golden'])
library;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

CatchThemeMode _themeOf(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? CatchThemeMode.night
    : CatchThemeMode.day;

/// The meters, markers and bar chart the host boards draw: the door's
/// checked-in bar, the step meter, the Catch bill cap, the source split, the
/// plan markers and the weekly bookings chart.
class _Family extends StatelessWidget {
  const _Family();

  @override
  Widget build(BuildContext context) => CatchRoot(
    theme: _themeOf(context),
    format: CatchFormat.games,
    child: const Padding(
      padding: EdgeInsets.all(CatchSpacing.s5),
      child: CatchStack(
        gap: CatchStackGap.g24,
        children: [
          CatchMeter(value: 19, max: 26, label: 'Checked in', showLabel: true),
          CatchMeter(
            value: 2,
            max: 4,
            variant: CatchMeterVariant.segments,
            size: CatchMeterSize.sm,
            label: 'Step 2 of 4',
          ),
          CatchMeter(
            value: 64,
            limit: 80,
            variant: CatchMeterVariant.cap,
            color: CatchMeterColor.warning,
            label: 'This cycle, against the ₹10,000 cap',
            showLabel: true,
          ),
          CatchMeter(
            value: 100,
            variant: CatchMeterVariant.stack,
            label: 'Where bookings came from',
            parts: [
              CatchMeterPart(label: 'Instagram bio', value: 61),
              CatchMeterPart(
                label: 'WhatsApp',
                value: 22,
                color: CatchMeterPartColor.courts,
              ),
              CatchMeterPart(
                label: 'Direct',
                value: 11,
                color: CatchMeterPartColor.games,
              ),
              CatchMeterPart(
                label: 'Other',
                value: 6,
                color: CatchMeterPartColor.muted,
              ),
            ],
          ),
          CatchSurface(
            block: CatchSurfaceBlock.spotlight,
            color: CatchSurfaceColor.games,
            child: CatchMeter(
              value: 60,
              label: 'Time in this step',
              showLabel: true,
            ),
          ),
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g12,
            align: CatchStackAlign.center,
            children: [
              CatchMarker(),
              CatchMarker(tone: CatchMarkerTone.warning),
              CatchMarker(tone: CatchMarkerTone.success),
              CatchMarker(tone: CatchMarkerTone.info),
              CatchMarker(tone: CatchMarkerTone.muted),
              CatchMarker(
                tone: CatchMarkerTone.format,
                size: CatchMarkerSize.lg,
                live: true,
              ),
              CatchMarker(
                variant: CatchMarkerVariant.ring,
                size: CatchMarkerSize.lg,
              ),
              CatchMarker(variant: CatchMarkerVariant.check),
              CatchMarker.number(1),
              CatchMarker.number(2, tone: CatchMarkerTone.muted),
            ],
          ),
          CatchBarIndicator.chart(
            label: 'Bookings each week',
            bars: [
              CatchBarIndicatorBar(label: '29 Sep', value: 58),
              CatchBarIndicatorBar(label: '6 Oct', value: 64),
              CatchBarIndicatorBar(label: '13 Oct', value: 71),
              CatchBarIndicatorBar(label: '20 Oct', value: 82),
              CatchBarIndicatorBar(label: '27 Oct', value: 37, partial: true),
            ],
          ),
        ],
      ),
    ),
  );
}

void main() {
  testWidgets('meters, markers and the weekly chart on a phone', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'meter_family',
      size: const Size(390, 760),
      builder: (_) => const _Family(),
    );
  });
}
