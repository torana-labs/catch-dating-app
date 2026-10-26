import 'dart:ui' as ui;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

const _frameKey = ValueKey('loading-frame');
const _actionKey = ValueKey('loading-action');

void main() {
  for (final brightness in Brightness.values) {
    for (final manual in [true, false]) {
      for (final reduceMotion in [false, true]) {
        testWidgets(
          '${brightness.name} ${manual ? 'explicit' : 'derived'} loading '
          '${reduceMotion ? 'stays static' : 'animates'}',
          (tester) async {
            await _mount(
              tester,
              child: manual
                  ? CatchSkeleton.box(width: 120, height: 32)
                  : const CatchSkeleton.content(child: Text('Loading details')),
              brightness: brightness,
              reduceMotion: reduceMotion,
            );
            // Observe two known phases of the token-owned animation cycle.
            // Waiting for settlement cannot prove a repeating effect moves.
            await tester.pump(CatchMotion.skeletonShimmer ~/ 4);
            final first = await _pixels(tester);
            await tester.pump(CatchMotion.skeletonShimmer ~/ 4);
            final second = await _pixels(tester);
            expect(listEquals(first, second), reduceMotion);
            expect(tester.takeException(), isNull);
          },
        );
      }
    }
  }

  testWidgets('const loading layouts exclude all shared sample semantics', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          home: Scaffold(
            body: CatchSection.loadingRows(
              layouts: [
                CatchRecordLayout.placeholder(
                  icon: CatchIcons.event,
                  hasMetadata: true,
                  factCount: 1,
                  hasDescription: true,
                ),
                const CatchPersonLayout.placeholder(
                  hasSupportingText: true,
                  hasContext: true,
                  hasBadge: true,
                ),
                const CatchConversationLayout.placeholder(
                  hasTimestamp: true,
                  hasContext: true,
                  hasActivity: true,
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pump();
      expect(find.text(CatchSkeleton.sampleRecordTitle), findsOneWidget);
      expect(find.text(CatchSkeleton.samplePersonName), findsOneWidget);
      expect(find.text(CatchSkeleton.sampleConversationName), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('Loading')), findsNothing);
      expect(tester.takeException(), isNull);
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('loading hides placeholder labels and blocks their actions', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    var presses = 0;
    try {
      for (final manual in [true, false]) {
        final action = TextButton(
          key: _actionKey,
          onPressed: () => presses++,
          child: const Text('Real action'),
        );
        await _mount(
          tester,
          child: manual
              ? CatchSkeleton.custom(child: action)
              : CatchSkeleton.content(child: action),
        );
        expect(find.bySemanticsLabel('Real action'), findsNothing);
        await tester.tapAt(tester.getCenter(find.byKey(_actionKey)));
        await tester.pump();
        expect(presses, 0);
      }

      await _mount(
        tester,
        child: CatchSkeleton.content(
          enabled: false,
          child: TextButton(
            key: _actionKey,
            onPressed: () => presses++,
            child: const Text('Real action'),
          ),
        ),
      );
      expect(find.bySemanticsLabel('Real action'), findsOneWidget);
      await tester.tap(find.byKey(_actionKey));
      await tester.pump();
      expect(presses, 1);
    } finally {
      semantics.dispose();
    }
  });
}

Future<void> _mount(
  WidgetTester tester, {
  required Widget child,
  Brightness brightness = Brightness.light,
  bool reduceMotion = false,
}) => tester.pumpWidget(
  MaterialApp(
    key: UniqueKey(),
    theme: brightness == Brightness.light ? CatchTheme.light : CatchTheme.dark,
    home: MediaQuery(
      data: MediaQueryData(disableAnimations: reduceMotion),
      child: Scaffold(
        body: Center(
          child: RepaintBoundary(
            key: _frameKey,
            child: SizedBox(
              width: 160,
              height: 80,
              child: Center(child: child),
            ),
          ),
        ),
      ),
    ),
  ),
);

Future<Uint8List> _pixels(WidgetTester tester) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(_frameKey),
  );
  return (await tester.runAsync(() async {
    final image = await boundary.toImage();
    try {
      final data = (await image.toByteData(
        format: ui.ImageByteFormat.rawRgba,
      ))!;
      return Uint8List.fromList(data.buffer.asUint8List());
    } finally {
      image.dispose();
    }
  }))!;
}
