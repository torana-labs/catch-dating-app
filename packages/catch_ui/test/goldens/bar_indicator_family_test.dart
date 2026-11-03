import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('bar indicators preserve bounded values at $scale', (
      tester,
    ) async {
      await matchCatchGolden(
        tester,
        'bar_indicator_family@$scale',
        size: const Size(440, 1450),
        textScale: scale,
        builder: (context) => DefaultTextStyle(
          style: CatchTextStyles.bodyL(context),
          child: const Padding(
            padding: EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 16,
              children: [
                Text(
                  'Single bars: negative, zero, tiny, partial, full, clamped',
                ),
                SizedBox(
                  height: 100,
                  child: Row(
                    spacing: 12,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: CatchBarIndicator(value: -4, maxValue: 8),
                      ),
                      Expanded(child: CatchBarIndicator(value: 0, maxValue: 8)),
                      Expanded(
                        child: CatchBarIndicator(value: 0.1, maxValue: 8),
                      ),
                      Expanded(child: CatchBarIndicator(value: 2, maxValue: 8)),
                      Expanded(child: CatchBarIndicator(value: 8, maxValue: 8)),
                      Expanded(
                        child: CatchBarIndicator(value: 16, maxValue: 8),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }, tags: const ['golden']);
  }
}
