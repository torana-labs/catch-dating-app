import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

CatchFormValidationCopy _copy(String prefix) => CatchFormValidationCopy(
  requiredMessage: (label) => '$prefix: $label required',
  minLengthMessage: (label, min) => '$prefix: $label needs $min letters',
  maxLengthMessage: (label, max) => '$prefix: $label allows $max letters',
  patternMessage: (label) => '$prefix: $label format',
);

Widget _app(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(body: SingleChildScrollView(child: child)),
);

Future<void> _pumpFieldMotion(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(CatchFieldTokens.reveal);
  await tester.pump();
}

void main() {
  test(
    'text descriptors validate with supplied copy without a build context',
    () {
      final row = CatchFormTextRow<String>(
        id: 'name',
        icon: CatchIcons.person,
        label: 'Name',
        currentValue: '',
        validationCopy: _copy('Custom'),
        contract: const CatchContractFieldConstraints(
          path: 'test.name',
          required: true,
          minLength: 2,
        ),
        patchForValue: (value) => value as String,
      );

      expect(row.validate(''), 'Custom: Name required');
      expect(row.validate('A'), 'Custom: Name needs 2 letters');
      expect(row.validate('Aarav'), isNull);
    },
  );

  testWidgets('text editor uses new caller copy and prevents invalid saves', (
    tester,
  ) async {
    var prefix = 'Original';
    String? saved;
    late StateSetter rebuild;
    await tester.pumpWidget(
      _app(
        StatefulBuilder(
          builder: (context, setState) {
            rebuild = setState;
            return CatchFormList<String>(
              fieldCopy: catchFieldCopy(AppLocalizationsEn()),
              rows: [
                CatchFormTextRow<String>(
                  id: 'name',
                  icon: CatchIcons.person,
                  label: 'Name',
                  currentValue: 'Before',
                  validationCopy: _copy(prefix),
                  contract: const CatchContractFieldConstraints(
                    path: 'test.name',
                    minLength: 2,
                  ),
                  patchForValue: (value) => value as String,
                ),
              ],
              onSave: (patch) async {
                saved = patch;
                return true;
              },
              errorTextBuilder: (_, error) => error.toString(),
            );
          },
        ),
      ),
    );

    await tester.tap(find.text('Name'));
    await _pumpFieldMotion(tester);
    await tester.enterText(
      find.byKey(const ValueKey('catch-field-text-entry')),
      'A',
    );
    rebuild(() => prefix = 'Updated');
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('catch-field-done')));
    await _pumpFieldMotion(tester);
    expect(find.text('Updated: Name needs 2 letters'), findsOneWidget);
    expect(saved, isNull);

    await tester.enterText(
      find.byKey(const ValueKey('catch-field-text-entry')),
      'After',
    );
    await tester.tap(find.byKey(const ValueKey('catch-field-done')));
    await _pumpFieldMotion(tester);
    expect(saved, 'After');
  });

  testWidgets(
    'choice labels preserve plain-value single and multiple patches',
    (tester) async {
      final saved = <Object?>[];
      await tester.pumpWidget(
        _app(
          CatchFormList<Object?>(
            fieldCopy: catchFieldCopy(AppLocalizationsEn()),
            rows: [
              CatchFormSingleChoiceRow<Object?, int>(
                id: 'single',
                icon: CatchIcons.person,
                label: 'Single',
                values: const [1, 2],
                value: 1,
                itemLabel: (value) => 'Option $value',
                patchForValue: (value) => value,
              ),
              CatchFormMultiChoiceRow<Object?, int>(
                id: 'multiple',
                icon: CatchIcons.people,
                label: 'Multiple',
                values: const [3, 4],
                selected: const [3],
                itemLabel: (value) => 'Item $value',
                patchForValues: (values) => values,
              ),
            ],
            onSave: (patch) async {
              saved.add(patch);
              return true;
            },
            errorTextBuilder: (_, error) => error.toString(),
          ),
        ),
      );

      await tester.tap(find.text('Single'));
      await _pumpFieldMotion(tester);
      await tester.tap(find.text('Option 2').hitTestable());
      await tester.tap(find.byKey(const ValueKey('catch-field-done')));
      await _pumpFieldMotion(tester);
      expect(saved, [2]);

      await tester.tap(find.text('Multiple'));
      await _pumpFieldMotion(tester);
      await tester.tap(find.text('Item 4').hitTestable());
      await tester.tap(find.byKey(const ValueKey('catch-field-done')));
      await _pumpFieldMotion(tester);
      expect(saved, [
        2,
        [3, 4],
      ]);
    },
  );
}
