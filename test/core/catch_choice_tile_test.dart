import 'dart:ui' show CheckedState, Tristate;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

Widget _app(Widget child, {double scale = 1}) => MaterialApp(
  theme: CatchTheme.light,
  home: MediaQuery(
    data: MediaQueryData(textScaler: TextScaler.linear(scale)),
    child: Scaffold(body: SizedBox(width: 320, child: child)),
  ),
);

void main() {
  testWidgets(
    'one checked target includes copy, keyboard action and disabled state',
    (tester) async {
      final semantics = tester.ensureSemantics();
      try {
        var selected = false;
        var enabled = true;
        var calls = 0;
        late StateSetter rebuild;
        const key = ValueKey('described-choice');
        await tester.pumpWidget(
          _app(
            StatefulBuilder(
              builder: (context, setState) {
                rebuild = setState;
                return CatchChoiceTile(
                  key: key,
                  title: 'Invite only',
                  subtitle: 'Use the invitation code.',
                  selected: selected,
                  onTap: enabled ? () => calls++ : null,
                );
              },
            ),
          ),
        );
        var data = tester.getSemantics(find.byKey(key)).getSemanticsData();
        expect(data.label, 'Invite only\nUse the invitation code.');
        expect(data.flagsCollection.isChecked != CheckedState.none, isTrue);
        expect(data.flagsCollection.isChecked == CheckedState.isTrue, isFalse);
        expect(data.flagsCollection.isInMutuallyExclusiveGroup, isTrue);
        expect(data.flagsCollection.isEnabled == Tristate.isTrue, isTrue);
        expect(find.bySemanticsLabel(data.label), findsOneWidget);
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pump();
        expect(calls, 1);
        final surface = tester.widget<CatchLegacySurface>(
          find.byType(CatchLegacySurface),
        );
        expect(surface.borderSpec!.width, CatchStroke.focusRing);
        rebuild(() {
          selected = true;
          enabled = false;
        });
        await pumpFeatureUi(tester);
        data = tester.getSemantics(find.byKey(key)).getSemanticsData();
        expect(data.flagsCollection.isChecked == CheckedState.isTrue, isTrue);
        expect(data.flagsCollection.isEnabled == Tristate.isTrue, isFalse);
        expect(data.hasAction(SemanticsAction.tap), isFalse);
        await tester.tap(find.text('Use the invitation code.'));
        await tester.sendKeyEvent(LogicalKeyboardKey.space);
        expect(calls, 1);
        expect(tester.takeException(), isNull);
      } finally {
        semantics.dispose();
      }
    },
  );

  testWidgets('large explanatory copy remains inside one full-width target', (
    tester,
  ) async {
    var calls = 0;
    await tester.pumpWidget(
      _app(
        CatchChoiceTile(
          title: 'A choice requiring an explanation',
          subtitle: 'All of this supporting copy selects the same option.',
          onTap: () => calls++,
        ),
        scale: 2,
      ),
    );
    final target = tester.getRect(find.byType(CatchChoiceTile));
    expect(target.width, 320);
    expect(
      target.height,
      greaterThanOrEqualTo(CatchPlatformTokens.minimumInteractiveExtent),
    );
    expect(
      target.contains(
        tester.getCenter(
          find.text('All of this supporting copy selects the same option.'),
        ),
      ),
      isTrue,
    );
    await tester.tap(find.text('A choice requiring an explanation'));
    await tester.tap(
      find.text('All of this supporting copy selects the same option.'),
    );
    expect(calls, 2);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'described input starts empty, filters values and commits before close',
    (tester) async {
      var selected = <int>{};
      final events = <String>[];
      await tester.pumpWidget(
        _app(
          NotificationListener<CatchFieldChoicePickedNotification>(
            onNotification: (notification) {
              events.add('close:${notification.autoClose}');
              return true;
            },
            child: StatefulBuilder(
              builder: (context, setState) => CatchChoiceInput<int>.described(
                values: const [1, 2, 3],
                selected: selected,
                itemLabelBuilder: (value) => 'Option $value',
                itemSubtitleBuilder: (value) => 'Explanation $value',
                itemKeyBuilder: (value) => ValueKey('option-$value'),
                contract: const CatchContractFieldConstraints(
                  path: 'test.choice',
                  valueTypes: ['string'],
                  enumValues: ['1', '2'],
                ),
                contractValueBuilder: (value) => '$value',
                autoClose: true,
                onChanged: (next) {
                  events.add('pick:${next.single}');
                  setState(() => selected = next);
                },
              ),
            ),
          ),
        ),
      );
      expect(find.byType(CatchChoiceTile), findsNWidgets(2));
      expect(find.text('Option 3'), findsNothing);
      expect(
        tester
            .widgetList<CatchChoiceTile>(find.byType(CatchChoiceTile))
            .every((tile) => !tile.selected),
        isTrue,
      );
      expect(
        tester.getTopLeft(find.byKey(const ValueKey('option-2'))).dy -
            tester.getBottomLeft(find.byKey(const ValueKey('option-1'))).dy,
        CatchSpacing.s2,
      );
      await tester.tap(find.text('Explanation 2'));
      await tester.pump();
      expect(events, ['pick:2', 'close:true']);
      expect(selected, {2});
      events.clear();
      await tester.tap(find.byKey(const ValueKey('option-2')));
      await tester.pump();
      expect(selected, {2});
      expect(events, ['pick:2', 'close:true']);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'same-label described choices retain value identity through reordering',
    (tester) async {
      var values = [1, 2];
      var selected = <int>{1};
      late StateSetter rebuild;
      await tester.pumpWidget(
        _app(
          StatefulBuilder(
            builder: (context, setState) {
              rebuild = setState;
              return CatchChoiceInput<int>.described(
                values: values,
                selected: selected,
                itemLabelBuilder: (_) => 'Same title',
                itemSubtitleBuilder: (value) => 'Choice $value',
                onChanged: (next) => setState(() => selected = next),
              );
            },
          ),
        ),
      );
      Finder tile(int value) =>
          find.widgetWithText(CatchChoiceTile, 'Choice $value');
      final first = tester.state(tile(1));
      final second = tester.state(tile(2));
      await tester.tap(find.text('Choice 2'));
      await tester.pump();
      rebuild(() => values = [2, 1]);
      await tester.pump();
      expect(tester.state(tile(1)), same(first));
      expect(tester.state(tile(2)), same(second));
      expect(selected, {2});
      expect(tester.takeException(), isNull);
    },
  );
}
