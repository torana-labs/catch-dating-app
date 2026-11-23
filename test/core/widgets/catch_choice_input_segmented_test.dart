import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

String _value(String value) => value;
Widget _app(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(
    body: Align(alignment: Alignment.topLeft, child: child),
  ),
);

void main() {
  testWidgets('a fitting control never scrolls an ancestor pager', (
    tester,
  ) async {
    final pager = PageController(initialPage: 1);
    addTearDown(pager.dispose);
    Widget screen(String selected) => _app(
      PageView(
        controller: pager,
        allowImplicitScrolling: true,
        children: [
          CatchChoiceInput<String>.segmented(
            key: const ValueKey('local-control'),
            selected: selected,
            options: const [
              CatchOption(value: 'a', label: 'A'),
              CatchOption(value: 'b', label: 'B'),
            ],
            onChanged: (_) {},
          ),
          const Center(child: Text('Current page', style: TextStyle())),
        ],
      ),
    );
    await tester.pumpWidget(screen('a'));
    await pumpFeatureUi(tester);
    expect(
      find.byKey(const ValueKey('local-control'), skipOffstage: false),
      findsOneWidget,
    );
    expect(pager.page, 1);
    await tester.pumpWidget(screen('b'));
    await pumpFeatureUi(tester);
    expect(pager.page, 1);
  });

  testWidgets(
    'same-length source changes refresh contract-filtered label anchors',
    (tester) async {
      const contract = CatchContractFieldConstraints(
        path: 'choice',
        enumValues: ['a', 'b'],
      );
      Widget input(List<CatchOption<String>> options) => _app(
        CatchChoiceInput<String>.segmented(
          key: const ValueKey('input'),
          options: options,
          selected: 'a',
          contract: contract,
          contractValueBuilder: _value,
          onChanged: (_) {},
        ),
      );
      await tester.pumpWidget(
        input(const [
          CatchOption(value: 'a', label: 'First'),
          CatchOption(value: 'x', label: 'Excluded'),
        ]),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Excluded'), findsNothing);
      await tester.pumpWidget(
        input(const [
          CatchOption(value: 'b', label: 'Second'),
          CatchOption(value: 'a', label: 'First'),
        ]),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Second').hitTestable(), findsOneWidget);
      expect(find.text('First').hitTestable(), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'switching checked and segmented recipes preserves the input identity',
    (tester) async {
      const key = ValueKey('input');
      final selected = <Set<String>>[];
      Widget segmented() => _app(
        CatchChoiceInput<String>.segmented(
          key: key,
          options: const [
            CatchOption(value: 'a', label: 'First'),
            CatchOption(value: 'b', label: 'Second'),
          ],
          selected: 'a',
          onChanged: (value) => selected.add({value}),
        ),
      );
      await tester.pumpWidget(segmented());
      await pumpFeatureUi(tester);
      final state = tester.state(find.byKey(key));
      await tester.tap(find.text('Second'));
      await tester.pumpWidget(
        _app(
          CatchChoiceInput<String>(
            key: key,
            values: const ['a', 'b'],
            selected: const {'a'},
            mode: CatchChipMode.single,
            itemLabelBuilder: (value) => value == 'a' ? 'First' : 'Second',
            onChanged: selected.add,
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(tester.state(find.byKey(key)), same(state));
      await tester.tap(find.text('Second'));
      await tester.pumpWidget(segmented());
      await pumpFeatureUi(tester);
      expect(tester.state(find.byKey(key)), same(state));
      await tester.tap(find.text('Second'));
      expect(selected, [
        {'b'},
        {'b'},
        {'b'},
      ]);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'nullable segmented values distinguish no selection from an explicit null option',
    (tester) async {
      const options = [
        CatchOption<String?>(value: null, label: 'All'),
        CatchOption<String?>(value: 'a', label: 'First'),
      ];
      String? received = 'unchanged';
      var closes = 0;
      final input = CatchChoiceInput<String?>.segmented(
        options: options,
        selected: null,
        onChanged: (value) => received = value,
      );
      expect(input.selected, <String?>{null});
      expect(
        const CatchChoiceInput<String>.segmented(
          options: [CatchOption(value: 'a', label: 'First')],
          selected: null,
        ).selected,
        isEmpty,
      );
      await tester.pumpWidget(
        _app(
          NotificationListener<CatchFieldChoicePickedNotification>(
            onNotification: (_) {
              closes++;
              return true;
            },
            child: input,
          ),
        ),
      );
      await pumpFeatureUi(tester);
      await tester.tap(find.text('All'));
      expect(received, isNull);
      expect(closes, 0);
    },
  );
  testWidgets(
    'reentering segmented reveals an explicit null option at the end',
    (tester) async {
      tester.view.physicalSize = const Size(320, 600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      const key = ValueKey('input');
      Widget segmented() => _app(
        CatchChoiceInput<String?>.segmented(
          key: key,
          options: [
            for (var index = 0; index < 8; index++)
              CatchOption(value: '$index', label: 'Option $index'),
            const CatchOption(value: null, label: 'Everything'),
          ],
          selected: null,
          onChanged: (_) {},
        ),
      );
      await tester.pumpWidget(segmented());
      await pumpFeatureUi(tester);
      expect(find.text('Everything').hitTestable(), findsOneWidget);
      await tester.pumpWidget(
        _app(
          CatchChoiceInput<String?>(
            key: key,
            values: const ['a'],
            selected: const {'a'},
            mode: CatchChipMode.single,
            itemLabelBuilder: (_) => 'First',
            onChanged: (_) {},
          ),
        ),
      );
      await pumpFeatureUi(tester);
      await tester.pumpWidget(segmented());
      await pumpFeatureUi(tester);
      expect(find.text('Everything').hitTestable(), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
