import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  testWidgets('toggle inputs preserve both geometry recipes', (tester) async {
    await matchCatchGolden(
      tester,
      'toggle_input_family',
      size: const Size(440, 220),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Row(
              children: [
                CatchToggleInput(value: false, onChanged: (_) {}),
                CatchToggleInput(value: true, onChanged: (_) {}),
                const CatchToggleInput(value: false, onChanged: null),
                const CatchToggleInput(value: true, onChanged: null),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                CatchToggleInput.field(value: false, onChanged: (_) {}),
                CatchToggleInput.field(value: true, onChanged: (_) {}),
                const CatchToggleInput.field(value: false, onChanged: null),
                const CatchToggleInput.field(value: true, onChanged: null),
              ],
            ),
          ],
        ),
      ),
    );
  }, tags: const ['golden']);
}
