import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('divider contracts at scale $scale', (tester) async {
      await matchCatchGolden(
        tester,
        'divider_family@$scale',
        textScale: scale,
        size: const Size(440, 700),
        builder: (context) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 24,
            children: [
              const CatchDivider.section(),
              const CatchDivider.fieldRow(),
              const CatchDivider.fieldSection(),
              CatchDivider.section(
                indent: 16,
                endIndent: 24,
                color: CatchTokens.of(context).primary,
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  const CatchDivider.vertical(),
                  CatchDivider.vertical(color: CatchTokens.of(context).primary),
                ],
              ),
              const CatchMetricSection(
                items: [
                  CatchMetricValue(value: '12', label: 'Guests'),
                  CatchMetricValue(value: '3', label: 'Events'),
                ],
              ),
              const CatchTicketDivider(),
              CatchTicketDivider(
                height: 32,
                notchRadius: 20,
                lineColor: CatchTokens.of(context).primary,
              ),
            ],
          ),
        ),
      );
    }, tags: const ['golden']);
  }
}
