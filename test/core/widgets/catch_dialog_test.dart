import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

enum _Decision { share, mute, block }

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('confirmation returns a typed stacked action at scale $scale', (
      tester,
    ) async {
      _Decision? result;
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(scale)),
            child: child!,
          ),
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () async {
                  result = await showDialog<_Decision>(
                    context: context,
                    builder: (_) => const CatchDialog<_Decision>.confirmation(
                      title: 'Chat actions',
                      message: 'Choose an action.',
                      actions: [
                        CatchDialogAction(
                          label: 'Share',
                          value: _Decision.share,
                        ),
                        CatchDialogAction(label: 'Mute', value: _Decision.mute),
                        CatchDialogAction(
                          label: 'Block',
                          value: _Decision.block,
                          isDestructive: true,
                        ),
                      ],
                    ),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await pumpFeatureUi(tester);
      final share = find.widgetWithText(CatchButton, 'Share');
      final mute = find.widgetWithText(CatchButton, 'Mute');
      final block = find.widgetWithText(CatchButton, 'Block');
      expect(
        tester.getTopLeft(mute).dy,
        greaterThan(tester.getBottomLeft(share).dy),
      );
      expect(
        tester.getTopLeft(block).dy,
        greaterThan(tester.getBottomLeft(mute).dy),
      );
      expect(tester.getSize(share).width, tester.getSize(block).width);
      await tester.tap(block);
      await pumpFeatureUi(tester);
      expect(result, _Decision.block);
      expect(find.byType(CatchDialog<_Decision>), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }

  for (final scenario in [
    (scale: 2.0, label: 'Confirm'),
    (scale: 1.0, label: 'Remove this member'),
  ]) {
    testWidgets('confirmation reflows ${scenario.label} at ${scenario.scale}', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          home: MediaQuery(
            data: MediaQueryData(textScaler: TextScaler.linear(scenario.scale)),
            child: Scaffold(
              body: CatchDialog<bool>.confirmation(
                title: 'Confirm?',
                message: '',
                actions: [
                  const CatchDialogAction(label: 'Cancel', value: false),
                  CatchDialogAction(
                    label: scenario.label,
                    value: true,
                    isDefault: true,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      final cancel = find.widgetWithText(CatchButton, 'Cancel');
      final confirm = find.widgetWithText(CatchButton, scenario.label);
      expect(
        tester.getTopLeft(confirm).dy,
        greaterThan(tester.getBottomLeft(cancel).dy),
      );
      final paragraph = tester.renderObject<RenderParagraph>(
        find.text(scenario.label),
      );
      var offset = 0;
      for (final word in scenario.label.split(' ')) {
        final boxes = paragraph.getBoxesForSelection(
          TextSelection(baseOffset: offset, extentOffset: offset + word.length),
        );
        expect(boxes, hasLength(1), reason: 'Keep the word "$word" intact');
        expect(boxes.single.right, lessThanOrEqualTo(paragraph.size.width));
        offset += word.length + 1;
      }
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('slotted content keeps edit state and caller-owned actions', (
    tester,
  ) async {
    String? saved;
    final controller = TextEditingController(text: 'Draft');
    try {
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          home: Scaffold(
            body: CatchDialog<void>(
              title: 'Edit name',
              actions: [
                CatchButton(
                  label: 'Save',
                  onPressed: () => saved = controller.text,
                ),
              ],
              child: TextField(controller: controller),
            ),
          ),
        ),
      );
      await tester.enterText(find.byType(TextField), 'Renamed');
      await tester.tap(find.text('Save'));
      await pumpFeatureUi(tester);
      expect(saved, 'Renamed');
      expect(find.byType(CatchDialog<void>), findsOneWidget);
      expect(controller.text, 'Renamed');
      expect(tester.takeException(), isNull);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    }
  });

  testWidgets(
    'recipes retain one keyed dialog element and omit empty content',
    (tester) async {
      const key = ValueKey('dialog');
      Widget app(Widget dialog) => MaterialApp(
        theme: CatchTheme.light,
        home: Scaffold(body: dialog),
      );
      await tester.pumpWidget(
        app(
          const CatchDialog<void>(
            key: key,
            title: 'Read only',
            actions: [],
            child: Text('Saved value'),
          ),
        ),
      );
      final element = tester.element(find.byKey(key));
      expect(find.byType(CatchButton), findsNothing);
      await tester.pumpWidget(
        app(
          const CatchDialog<void>.confirmation(
            key: key,
            title: 'Confirm?',
            message: '',
            actions: [
              CatchDialogAction(label: 'No', value: null),
              CatchDialogAction(label: 'Yes', value: null, isDefault: true),
            ],
          ),
        ),
      );
      expect(tester.element(find.byKey(key)), same(element));
      expect(find.text('Saved value'), findsNothing);
      expect(find.text(''), findsNothing);
      final cancel = find.widgetWithText(CatchButton, 'No');
      final confirm = find.widgetWithText(CatchButton, 'Yes');
      expect(tester.getCenter(cancel).dy, tester.getCenter(confirm).dy);
      expect(tester.getSize(cancel).width, tester.getSize(confirm).width);
      expect(tester.takeException(), isNull);
    },
  );
}
