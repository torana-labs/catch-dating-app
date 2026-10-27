import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';

const _viewport = ValueKey('overlay-viewport');
const _capture = ValueKey('overlay-capture');
const _actions = ValueKey('catch_bottom_action_overlay.actions');
const _meta = ValueKey('catch_bottom_action_overlay.notice');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(loadCatchTestFonts);
  for (final brightness in Brightness.values) {
    testWidgets('transparent controls have an opaque backing: $brightness', (
      tester,
    ) async {
      late Color background;
      await tester.pumpWidget(
        _frame(
          brightness: brightness,
          child: Builder(
            builder: (context) {
              background = CatchTokens.of(context).bg;
              return const CatchBottomActionOverlay(
                body: ColoredBox(color: Colors.red),
                actions: SizedBox(height: 130),
              );
            },
          ),
        ),
      );
      final boundary = tester.renderObject<RenderRepaintBoundary>(
        find.byKey(_capture),
      );
      final point = boundary.globalToLocal(
        tester.getRect(find.byKey(_actions)).topCenter + const Offset(0, 2),
      );
      final pixels = await tester.runAsync(() async {
        final image = await boundary.toImage();
        try {
          return await image.toByteData();
        } finally {
          image.dispose();
        }
      });
      final offset = (point.dy.floor() * 320 + point.dx.floor()) * 4;
      expect(
        pixels!.buffer.asUint8List(offset, 4),
        [
          (background.r * 255).round(),
          (background.g * 255).round(),
          (background.b * 255).round(),
          255,
        ],
        reason: 'Scrolling content must never paint through a quiet action.',
      );
    });
  }

  for (final scale in [1.0, 2.0]) {
    for (final safeBottom in [0.0, 34.0]) {
      testWidgets(
        'measured controls and final field clear at $scale/$safeBottom',
        (tester) async {
          final controller = ScrollController();
          addTearDown(controller.dispose);
          var presses = 0;
          await tester.pumpWidget(
            _frame(
              scale: scale,
              safeBottom: safeBottom,
              child: CatchBottomActionOverlay(
                body: SingleChildScrollView(
                  controller: controller,
                  padding: CatchInsets.formStepBodyWithBottomActions,
                  child: const Column(
                    children: [SizedBox(height: 700), Text('Last form field')],
                  ),
                ),
                meta: const Center(
                  child: Padding(
                    padding: EdgeInsets.all(8),
                    child: Text('Your changes have been saved.'),
                  ),
                ),
                actions: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CatchButton(
                      label: 'Save and continue',
                      onPressed: () => presses++,
                      fullWidth: true,
                    ),
                    const SizedBox(height: 8),
                    CatchButton(
                      label: 'Previous',
                      onPressed: () {},
                      variant: CatchButtonVariant.quiet,
                      fullWidth: true,
                    ),
                  ],
                ),
              ),
            ),
          );
          final viewport = tester.getRect(find.byKey(_viewport));
          final actions = tester.getRect(find.byKey(_actions));
          final meta = tester.getRect(find.byKey(_meta));
          expect(
            meta.height,
            tester.getSize(find.text('Your changes have been saved.')).height +
                16,
          );
          expect(meta.bottom + CatchSpacing.s2, actions.top);
          expect(
            viewport.bottom - actions.bottom,
            safeBottom > CatchLayout.bottomActionMinimumBottomPadding
                ? safeBottom
                : CatchLayout.bottomActionMinimumBottomPadding,
          );
          controller.jumpTo(controller.position.maxScrollExtent);
          await tester.pump();
          final field = tester.getRect(find.text('Last form field'));
          expect(field.top, greaterThanOrEqualTo(viewport.top));
          expect(
            field.bottom,
            lessThanOrEqualTo(
              tester
                  .getTopLeft(
                    find.byKey(
                      const ValueKey('catch_bottom_action_overlay.scrim'),
                    ),
                  )
                  .dy,
            ),
          );
          expect(find.text('Last form field').hitTestable(), findsOneWidget);
          await tester.tap(find.text('Save and continue'));
          expect(presses, 1);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}

Widget _frame({
  required Widget child,
  Brightness brightness = Brightness.light,
  double scale = 1,
  double safeBottom = 34,
}) => MaterialApp(
  theme: brightness == Brightness.light ? CatchTheme.light : CatchTheme.dark,
  home: Scaffold(
    body: MediaQuery(
      data: MediaQueryData(
        padding: EdgeInsets.only(bottom: safeBottom),
        textScaler: TextScaler.linear(scale),
      ),
      child: Align(
        alignment: Alignment.topLeft,
        child: RepaintBoundary(
          key: _capture,
          child: SizedBox(
            key: _viewport,
            width: 320,
            height: 600,
            child: DefaultTextStyle(
              style: const TextStyle(fontSize: 14),
              child: child,
            ),
          ),
        ),
      ),
    ),
  ),
);
