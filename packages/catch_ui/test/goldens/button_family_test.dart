import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('button recipes at scale $scale', (tester) async {
      await matchCatchGolden(
        tester,
        'button_family@$scale',
        size: const Size(440, 1700),
        textScale: scale,
        builder: (context) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 20,
            children: [
              for (final variant in CatchButtonVariant.values)
                CatchButton(
                  label: 'Continue',
                  variant: variant,
                  onPressed: _noop,
                  leading: const Icon(Icons.check),
                ),
              const CatchButton(
                label: 'Continue',
                onPressed: _noop,
                mode: CatchButtonMode.rounded,
                fullWidth: true,
              ),
              const CatchButton.selection(
                label: 'A long current selection',
                onPressed: _noop,
                leading: Icon(Icons.place),
              ),
              const CatchButton.command(
                label: 'Sort',
                onPressed: _noop,
                leading: Icon(Icons.sort),
              ),
              const CatchButton.command(
                label: 'Filter',
                onPressed: _noop,
                trailing: Icon(Icons.tune),
              ),
              CatchButton.floating(label: 'Map', onPressed: _noop),
              CatchButton.floating(
                label: 'Map',
                icon: Icons.map,
                count: 24,
                onPressed: _noop,
              ),
              CatchButton.floating(
                label: 'Map',
                value: 'Nearby places',
                icon: Icons.map,
                count: 123,
                onPressed: _noop,
              ),
            ],
          ),
        ),
      );
    }, tags: const ['golden']);
  }
}

void _noop() {}
