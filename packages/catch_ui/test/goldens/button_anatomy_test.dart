import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('button content and loading recipes at scale $scale', (
      tester,
    ) async {
      await matchCatchGolden(
        tester,
        'button_anatomy@$scale',
        size: const Size(440, 1000),
        textScale: scale,
        builder: (context) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 24,
            children: [
              const CatchButton(label: 'Continue', onPressed: _noop),
              const CatchButton(
                label: 'Save changes',
                leading: Icon(Icons.check),
                onPressed: _noop,
                fullWidth: true,
              ),
              const CatchButton(
                label: 'Saving',
                onPressed: _noop,
                status: CatchButtonStatus.loading,
              ),
              const CatchButton(
                label: 'Saving',
                onPressed: _noop,
                status: CatchButtonStatus.loading,
                variant: CatchButtonVariant.secondary,
              ),
              const CatchLoadingIndicator.dots(color: Colors.blue),
              CatchButtonContentRow(
                label: 'A longer label that must wrap without shrinking',
                color: Theme.of(context).colorScheme.onSurface,
                textStyle: CatchTextStyles.control(context),
                leading: const Icon(Icons.check),
                fullWidth: true,
                allowMultiline: true,
              ),
              const SizedBox.square(
                dimension: 40,
                child: CatchLoadingIndicator(),
              ),
            ],
          ),
        ),
      );
    }, tags: const ['golden']);
  }
}

void _noop() {}
