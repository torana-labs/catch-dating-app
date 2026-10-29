import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

const _options = [
  CatchOption(value: 'people', label: 'People'),
  CatchOption(value: 'forms', label: 'Forms'),
];

Widget _wrap(Widget child, {double scale = 1}) => MaterialApp(
  theme: AppTheme.light,
  home: MediaQuery(
    data: MediaQueryData(textScaler: TextScaler.linear(scale)),
    child: Scaffold(
      body: Align(alignment: Alignment.topLeft, child: child),
    ),
  ),
);

void main() {
  testWidgets(
    'pager drag interpolates the underline without committing semantics',
    (tester) async {
      final semantics = tester.ensureSemantics();
      try {
        final controller = TabController(length: 2, vsync: tester);
        addTearDown(controller.dispose);
        await tester.pumpWidget(
          _wrap(
            CatchPageTabBar<String>.controlled(
              controller: controller,
              options: _options,
            ),
          ),
        );
        await pumpFeatureUi(tester);
        final rule = find.byType(AnimatedPositioned);
        final first = tester.getRect(rule);
        controller.index = 1;
        await pumpFeatureUi(tester);
        final last = tester.getRect(rule);
        controller.index = 0;
        controller.offset = .5;
        await pumpFeatureUi(tester);
        final half = tester.getRect(rule);
        expect(half.left, closeTo((first.left + last.left) / 2, .01));
        expect(half.width, closeTo((first.width + last.width) / 2, .01));
        expect(
          tester.getSemantics(find.text('People')),
          matchesSemantics(
            label: 'People',
            isButton: true,
            isSelected: true,
            hasSelectedState: true,
            isFocusable: true,
            hasFocusAction: true,
            hasEnabledState: true,
            isEnabled: true,
            hasTapAction: true,
          ),
        );
        expect(controller.index, 0);
        controller.offset = 0;
        await tester.tap(find.text('Forms'));
        await pumpFeatureUi(tester);
        expect(controller.index, 1);
        expect(tester.getRect(rule), last);
      } finally {
        semantics.dispose();
      }
    },
  );

  testWidgets(
    'replacing controllers releases the old binding and never owns disposal',
    (tester) async {
      final first = TabController(length: 2, vsync: tester);
      final second = TabController(length: 2, initialIndex: 1, vsync: tester);
      addTearDown(first.dispose);
      addTearDown(second.dispose);
      Widget bar(TabController controller) => _wrap(
        CatchPageTabBar<String>.controlled(
          key: const ValueKey('page-tabs'),
          controller: controller,
          options: _options,
        ),
      );
      await tester.pumpWidget(bar(first));
      await pumpFeatureUi(tester);
      await tester.pumpWidget(bar(second));
      await pumpFeatureUi(tester);
      first.index = 1;
      await tester.tap(find.text('People'));
      await pumpFeatureUi(tester);
      expect(first.index, 1);
      expect(second.index, 0);
      await tester.pumpWidget(const SizedBox.shrink());
      first.index = 0;
      second.index = 1;
      await tester.pump();
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'controlled and value recipes reserve identical scaled operational geometry',
    (tester) async {
      final controller = TabController(length: 2, vsync: tester);
      addTearDown(controller.dispose);
      for (final scale in [1.0, 2.0]) {
        for (final variant in [
          CatchChoiceInputVariant.label,
          CatchChoiceInputVariant.operational,
        ]) {
          final value = CatchPageTabBar<String>(
            selected: 'people',
            options: _options,
            onChanged: (_) {},
            variant: variant,
          );
          final controlled = CatchPageTabBar<String>.controlled(
            controller: controller,
            options: _options,
            variant: variant,
          );
          await tester.pumpWidget(_wrap(value, scale: scale));
          await pumpFeatureUi(tester);
          final valueRect = tester.getRect(
            find.byType(CatchPageTabBar<String>),
          );
          await tester.pumpWidget(_wrap(controlled, scale: scale));
          await pumpFeatureUi(tester);
          final finder = find.byType(CatchPageTabBar<String>);
          expect(tester.getRect(finder), valueRect);
          expect(controlled.preferredSize, value.preferredSize);
          expect(
            valueRect.height,
            controlled.preferredSizeFor(tester.element(finder)).height,
          );
          expect(tester.takeException(), isNull);
        }
      }
    },
  );

  testWidgets(
    'controlled choices retain disabled reasons and do not navigate',
    (tester) async {
      final controller = TabController(length: 2, vsync: tester);
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        _wrap(
          CatchPageTabBar<String>.controlled(
            controller: controller,
            options: const [
              CatchOption(value: 'people', label: 'People'),
              CatchOption(
                value: 'forms',
                label: 'Forms',
                enabled: false,
                disabledReason: 'Unavailable',
              ),
            ],
          ),
        ),
      );
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Forms'));
      await pumpFeatureUi(tester);
      expect(controller.index, 0);
      expect(find.byTooltip('Unavailable'), findsOneWidget);
    },
  );
}
