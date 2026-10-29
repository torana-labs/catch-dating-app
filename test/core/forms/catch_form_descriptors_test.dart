import 'dart:async';

import 'package:catch_dating_app/kernel/labelled.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('CatchFormList maps rows through one accordion and save', (
    tester,
  ) async {
    final pendingSave = Completer<bool>();
    _Patch? savedPatch;

    await tester.pumpWidget(
      _wrap(
        CatchFormList<_Patch>(
          fieldCopy: catchFieldCopy(AppLocalizationsEn()),
          title: 'About you',
          rows: [
            CatchFormReadRow<_Patch>(
              id: 'identity',
              icon: CatchIcons.person,
              label: 'Identity',
              body: 'Verified',
            ),
            CatchFormSingleChoiceRow<_Patch, _Option>(
              itemLabel: (value) => value.label,
              id: 'city',
              icon: CatchIcons.location,
              label: 'City',
              values: _Option.values,
              value: _Option.mumbai,
              patchForValue: (value) => _Patch(value?.label),
            ),
            CatchFormCustomRow<_Patch>(
              id: 'custom',
              icon: CatchIcons.filters,
              label: 'Custom',
              build: (context, scope) => CatchField.control(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Custom',
                disclosureMode: scope.isExpanded
                    ? CatchFieldMode.controlledExpanded
                    : CatchFieldMode.controlledCollapsed,
                onOpenChanged: (_) => scope.toggle(),
                child: const Text('Custom control'),
              ),
            ),
          ],
          onSave: (patch) {
            savedPatch = patch;
            return pendingSave.future;
          },
          errorTextBuilder: (_, error) => error.toString(),
        ),
      ),
    );

    expect(find.text('ABOUT YOU'), findsOneWidget);
    expect(find.text('Verified'), findsOneWidget);

    await tester.tap(find.text('City'));
    await _pumpFieldMotion(tester);
    expect(find.text('Delhi').hitTestable(), findsOneWidget);

    await tester.tap(find.text('Delhi'));
    await tester.tap(find.byKey(const ValueKey('catch-field-done')));
    await tester.pump();
    expect(savedPatch?.value, 'Delhi');
    expect(find.byKey(const ValueKey('catch-field-spinner')), findsOneWidget);

    pendingSave.complete(true);
    await tester.pump();
    await _pumpFieldMotion(tester);
    expect(
      find
          .byWidgetPredicate(
            (widget) => widget is CatchChip && widget.mode != null,
          )
          .hitTestable(),
      findsNothing,
    );

    await tester.tap(find.text('Custom'));
    await _pumpFieldMotion(tester);
    expect(find.text('Custom control').hitTestable(), findsOneWidget);
  });

  test('descriptor family preserves typed patch factories', () {
    final text = CatchFormTextRow<_Patch>(
      validationCopy: catchFormValidationCopy(AppLocalizationsEn()),
      id: 'name',
      icon: CatchIcons.person,
      label: 'Name',
      currentValue: 'Before',
      patchForValue: (value) => _Patch(value as String),
    );
    final multi = CatchFormMultiChoiceRow<_Patch, _Option>(
      itemLabel: (value) => value.label,
      id: 'cities',
      icon: CatchIcons.location,
      label: 'Cities',
      values: _Option.values,
      selected: const [_Option.mumbai],
      patchForValues: (values) =>
          _Patch(values.map((item) => item.label).join()),
    );
    final range = CatchFormRangeRow<_Patch>(
      id: 'range',
      icon: CatchIcons.filters,
      label: 'Range',
      value: '1 - 2',
      currentMin: 1,
      currentMax: 2,
      sliderMin: 0,
      sliderMax: 10,
      divisions: 10,
      labelText: (value) => value.round().toString(),
      patchForRange: (min, max) => _Patch('$min-$max'),
    );

    expect(text.patchForValue('After').value, 'After');
    expect(multi.patchForValues(_Option.values).value, 'MumbaiDelhi');
    expect(range.patchForRange(3, 7).value, '3-7');
  });

  testWidgets('text rows default to explicit confirmation', (tester) async {
    _Patch? savedPatch;

    await tester.pumpWidget(
      _wrap(
        CatchFormList<_Patch>(
          fieldCopy: catchFieldCopy(AppLocalizationsEn()),
          rows: [
            CatchFormTextRow<_Patch>(
              validationCopy: catchFormValidationCopy(AppLocalizationsEn()),
              id: 'name',
              icon: CatchIcons.person,
              label: 'Name',
              currentValue: 'Before',
              patchForValue: (value) => _Patch(value as String),
            ),
          ],
          onSave: (patch) async {
            savedPatch = patch;
            return true;
          },
          errorTextBuilder: (_, error) => error.toString(),
        ),
      ),
    );

    expect(find.byKey(const ValueKey('catch-field-done')), findsNothing);

    await tester.tap(find.text('Name'));
    await _pumpFieldMotion(tester);

    expect(find.byKey(const ValueKey('catch-field-cancel')), findsOneWidget);
    expect(find.byKey(const ValueKey('catch-field-done')), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('catch-field-text-entry')),
      'After',
    );
    await tester.tap(find.byKey(const ValueKey('catch-field-done')));
    await tester.pump();

    expect(savedPatch?.value, 'After');
  });

  testWidgets('a form section can preserve on-blur text commits', (
    tester,
  ) async {
    _Patch? savedPatch;

    await tester.pumpWidget(
      _wrap(
        CatchFormList<_Patch>(
          fieldCopy: catchFieldCopy(AppLocalizationsEn()),
          textCommitMode: CatchFormListMode.onBlur,
          rows: [
            CatchFormTextRow<_Patch>(
              validationCopy: catchFormValidationCopy(AppLocalizationsEn()),
              id: 'name',
              icon: CatchIcons.person,
              label: 'Name',
              currentValue: 'Before',
              patchForValue: (value) => _Patch(value as String),
            ),
          ],
          onSave: (patch) async {
            savedPatch = patch;
            return true;
          },
          errorTextBuilder: (_, error) => error.toString(),
        ),
      ),
    );

    expect(find.byKey(const ValueKey('catch-field-done')), findsNothing);

    final input = find.byKey(const ValueKey('catch-field-text-entry'));
    await tester.enterText(input, 'After');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();

    expect(savedPatch?.value, 'After');
    expect(find.byKey(const ValueKey('catch-field-done')), findsNothing);
  });
}

class _Patch {
  const _Patch(this.value);

  final String? value;
}

enum _Option implements Labelled {
  mumbai('Mumbai'),
  delhi('Delhi');

  const _Option(this.label);

  @override
  final String label;
}

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: AppTheme.light,
    home: Scaffold(body: SingleChildScrollView(child: child)),
  );
}

Future<void> _pumpFieldMotion(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(CatchFieldTokens.reveal);
  await tester.pump();
}
