import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

void main() {
  testWidgets('transparent thumbnail recipe paints and lets taps through', (
    tester,
  ) async {
    var taps = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Center(
          child: SizedBox(
            width: 200,
            height: 120,
            child: Stack(
              fit: StackFit.expand,
              children: [
                GestureDetector(
                  onTap: () => taps++,
                  child: const ColoredBox(color: Colors.white),
                ),
                const CatchMediaOverlay.thumbnail(
                  variant: CatchMediaOverlayVariant.none,
                ),
              ],
            ),
          ),
        ),
      ),
    );
    expect(tester.takeException(), isNull);
    await tester.tapAt(tester.getCenter(find.byType(CatchMediaOverlay)));
    expect(taps, 1);
  });

  testWidgets('media readability preserves every production gradient', (
    tester,
  ) async {
    await matchCatchGolden(
      tester,
      'media_overlay_family',
      size: const Size(440, 570),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            for (final overlay in [
              const CatchMediaOverlay.detailHero(),
              const CatchMediaOverlay.photoFrame(),
              CatchMediaOverlay.heroTint(base: CatchTokens.of(context).ink),
              const CatchMediaOverlay.thumbnail(
                variant: CatchMediaOverlayVariant.bottom,
              ),
              const CatchMediaOverlay.thumbnail(
                variant: CatchMediaOverlayVariant.full,
              ),
            ])
              SizedBox(
                width: 190,
                height: 160,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        CatchTokens.of(context).primary,
                        CatchTokens.of(context).surface,
                      ],
                    ),
                  ),
                  child: overlay,
                ),
              ),
          ],
        ),
      ),
    );
  }, tags: const ['golden']);
}
