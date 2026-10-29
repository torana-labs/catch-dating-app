import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../test_pump_helpers.dart';

void main() {
  testWidgets('generic mode changes retain state and replace typed selection', (
    tester,
  ) async {
    const key = ValueKey('generic-field');
    final textField = CatchField<String>.select(
      copy: catchFieldCopy(AppLocalizationsEn()),
      key: key,
      title: 'Selection',
      values: const ['First', 'Second'],
      itemLabelBuilder: (value) => value,
      value: 'First',
      onChanged: (_) {},
    );
    final numberField = CatchField<int>.select(
      copy: catchFieldCopy(AppLocalizationsEn()),
      key: key,
      title: 'Selection',
      values: const [1, 2],
      itemLabelBuilder: (value) => '$value',
      value: 2,
      onChanged: (_) {},
    );
    expect(Widget.canUpdate(textField, numberField), isTrue);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(body: SizedBox(width: 320, child: textField)),
      ),
    );
    final state = tester.state(find.byType(CatchField));
    expect(find.text('First'), findsOneWidget);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(body: SizedBox(width: 320, child: numberField)),
      ),
    );
    await pumpFeatureUi(tester);
    expect(tester.state(find.byType(CatchField)), same(state));
    expect(find.text('2'), findsOneWidget);
    expect(find.text('First'), findsNothing);
    final choiceFactory = CatchField<int>.choices;
    final choices = choiceFactory(
      copy: catchFieldCopy(AppLocalizationsEn()),
      key: key,
      title: 'Choices',
      values: const [1, 2],
      itemLabelBuilder: (value) => '$value',
      selected: const {2},
      onSelectionChanged: (_) {},
      disclosureMode: CatchFieldMode.localExpanded,
    );
    expect(Widget.canUpdate(numberField, choices), isTrue);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(body: SizedBox(width: 320, child: choices)),
      ),
    );
    await pumpFeatureUi(tester);
    expect(tester.state(find.byType(CatchField)), same(state));
    expect(tester.takeException(), isNull);
  });
}
