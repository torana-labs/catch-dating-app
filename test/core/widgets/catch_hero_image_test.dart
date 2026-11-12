import 'dart:async';

import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

const _capture = ValueKey('hero-capture');
const _photo = 'assets/branding/catch_icon.png';
const _missing = 'assets/branding/missing-hero-fixture.png';

void main() {
  for (final source in [null, '', ' \t ']) {
    testWidgets('an absent hero source uses the shared surface: $source', (
      tester,
    ) async {
      await tester.pumpWidget(_frame(CatchHeroImage(imageUrl: source)));
      expect(find.byType(CatchImageFallbackSurface), findsOneWidget);
      expect(find.byType(CatchNetworkImage), findsNothing);
      expect(find.byType(CatchGradedImage), findsNothing);
      expect(find.byType(CatchMediaOverlay), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  for (final brightness in Brightness.values) {
    for (final source in [_photo, _missing]) {
      testWidgets('hero image confines its paint: $brightness / $source', (
        tester,
      ) async {
        await tester.pumpWidget(
          _frame(
            CatchHeroImage(
              imageUrl: ' $source ',
              semanticLabel: 'Hero photo',
              showScrim: false,
            ),
            brightness: brightness,
          ),
        );
        final imageFinder = find.byType(Image);
        final imageWidget = tester.widget<Image>(imageFinder);
        final configuration = createLocalImageConfiguration(
          tester.element(imageFinder),
        );
        final loaded = await tester.runAsync(() async {
          final result = Completer<bool>();
          final stream = imageWidget.image.resolve(configuration);
          final listener = ImageStreamListener(
            (_, _) => result.complete(true),
            onError: (Object error, StackTrace? stack) =>
                result.complete(false),
          );
          stream.addListener(listener);
          try {
            return await result.future.timeout(const Duration(seconds: 5));
          } finally {
            stream.removeListener(listener);
          }
        });
        await pumpFeatureUi(tester);
        expect(loaded, source == _photo);
        expect(
          tester.widget<CatchNetworkImage>(find.byType(CatchNetworkImage)).url,
          source,
        );
        expect(find.byType(CatchMediaOverlay), findsNothing);
        expect(find.byType(CatchGradedImage), findsOneWidget);
        if (source == _photo) {
          expect(
            tester.renderObject<RenderImage>(find.byType(RawImage)).image,
            isNotNull,
          );
          expect(imageWidget.semanticLabel, 'Hero photo');
          expect(find.byType(CatchImageFallbackSurface), findsNothing);
        } else {
          expect(find.byType(CatchImageFallbackSurface), findsOneWidget);
        }
        final boundary = tester.renderObject<RenderRepaintBoundary>(
          find.byKey(_capture),
        );
        final pixels = await tester.runAsync(() async {
          final image = await boundary.toImage();
          try {
            return await image.toByteData();
          } finally {
            image.dispose();
          }
        });
        expect(pixels!.buffer.asUint8List(0, 4), [
          0,
          255,
          0,
          255,
        ], reason: 'Image treatment must not tint the surrounding page.');
        expect(tester.takeException(), isNull);
      });
    }
  }
}

Widget _frame(Widget child, {Brightness brightness = Brightness.light}) =>
    MaterialApp(
      theme: brightness == Brightness.light
          ? CatchTheme.light
          : CatchTheme.dark,
      home: Scaffold(
        body: Center(
          child: RepaintBoundary(
            key: _capture,
            child: SizedBox(
              width: 320,
              height: 240,
              child: ColoredBox(
                color: const Color(0xff00ff00),
                child: Padding(padding: const EdgeInsets.all(40), child: child),
              ),
            ),
          ),
        ),
      ),
    );
