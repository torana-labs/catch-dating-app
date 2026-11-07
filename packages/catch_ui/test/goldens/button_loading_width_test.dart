@Tags(['golden'])
library;

import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  testWidgets('a loading button keeps its width', (tester) async {
    await matchCatchGolden(
      tester,
      'button_loading_width',
      size: const Size(440, 330),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 16,
          children: [
            const CatchButton(
              label: 'Save changes',
              onPressed: _noop,
              fullWidth: true,
            ),
            const CatchButton(
              key: ValueKey('loading-full-width'),
              label: 'Save changes',
              onPressed: _noop,
              fullWidth: true,
              status: CatchButtonStatus.loading,
            ),
            const CatchButton(label: 'Save changes', onPressed: _noop),
            const CatchButton(
              key: ValueKey('loading-intrinsic'),
              label: 'Save changes',
              onPressed: _noop,
              status: CatchButtonStatus.loading,
            ),
          ],
        ),
      ),
    );
  }, tags: const ['golden']);

  for (final fullWidth in [true, false]) {
    testWidgets('loading keeps the idle width, fullWidth $fullWidth', (
      tester,
    ) async {
      Future<double> widthWhen(CatchButtonStatus status) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: CatchTheme.light,
            home: Align(
              alignment: Alignment.topLeft,
              child: SizedBox(
                width: 320,
                child: CatchButton(
                  label: 'Save changes',
                  onPressed: _noop,
                  fullWidth: fullWidth,
                  status: status,
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        return tester.getSize(find.byType(CatchButton)).width;
      }

      final idle = await widthWhen(CatchButtonStatus.idle);
      final loading = await widthWhen(CatchButtonStatus.loading);
      expect(loading, idle);
      if (fullWidth) expect(loading, 320);
    });
  }
}

void _noop() {}
