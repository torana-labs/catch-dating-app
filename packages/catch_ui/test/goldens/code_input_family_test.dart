import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('code entry preserves states at scale $scale', (tester) async {
      final partial = TextEditingController(text: '12');
      final complete = TextEditingController(text: '123456');
      final error = TextEditingController(text: '12');
      addTearDown(partial.dispose);
      addTearDown(complete.dispose);
      addTearDown(error.dispose);
      await matchCatchGolden(
        tester,
        'code_input_family${scale == 1 ? '' : '@2.0'}',
        textScale: scale,
        size: const Size(440, 500),
        builder: (context) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CatchCodeInput(
                controller: partial,
                semanticsLabel: 'Partial code',
                onChanged: (_) {},
                onSubmitted: (_) {},
              ),
              const SizedBox(height: 24),
              CatchCodeInput(
                controller: complete,
                semanticsLabel: 'Complete code',
                onChanged: (_) {},
                onSubmitted: (_) {},
              ),
              const SizedBox(height: 24),
              CatchCodeInput(
                controller: error,
                semanticsLabel: 'Invalid code',
                status: CatchCodeInputStatus.error,
                onChanged: (_) {},
                onSubmitted: (_) {},
              ),
              const SizedBox(height: 24),
              const CatchCodeInputRow(
                length: 4,
                value: '12',
                active: 3,
                caret: false,
              ),
            ],
          ),
        ),
      );
    }, tags: const ['golden']);
  }
}
