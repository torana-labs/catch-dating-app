import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../test_pump_helpers.dart';

void main() {
  testWidgets('copy rebuild preserves an in-progress edit and focus', (
    tester,
  ) async {
    final copy = ValueNotifier(_copy('First'));
    addTearDown(copy.dispose);
    await tester.pumpWidget(
      _host(
        ValueListenableBuilder<CatchFieldCopy>(
          valueListenable: copy,
          builder: (context, value, child) => CatchField.input(
            key: const ValueKey('name'),
            copy: value,
            title: 'Name',
            initialValue: 'Original',
            variant: CatchFieldVariant.underline,
            labelMode: CatchFieldLabelTextMode.optional,
            showClearButton: true,
          ),
        ),
      ),
    );
    await tester.enterText(find.byType(TextField), 'Uncommitted draft');
    await pumpFeatureUi(tester);
    final state = tester.state(find.byKey(const ValueKey('name')));
    final before = tester.widget<EditableText>(find.byType(EditableText));
    expect(before.focusNode.hasFocus, isTrue);
    expect(find.byTooltip('First clear Name'), findsOneWidget);

    copy.value = _copy('Next');
    await pumpFeatureUi(tester);
    final after = tester.widget<EditableText>(find.byType(EditableText));
    expect(tester.state(find.byKey(const ValueKey('name'))), same(state));
    expect(after.controller, same(before.controller));
    expect(after.controller.text, 'Uncommitted draft');
    expect(after.focusNode, same(before.focusNode));
    expect(after.focusNode.hasFocus, isTrue);
    expect(find.byTooltip('Next clear Name'), findsOneWidget);
    expect(find.byTooltip('First clear Name'), findsNothing);
    expect(find.text(' · Next optional'), findsOneWidget);
  });

  testWidgets('validation and selection use caller grammar without app l10n', (
    tester,
  ) async {
    final form = GlobalKey<FormState>();
    await tester.pumpWidget(
      _host(
        Form(
          key: form,
          child: Column(
            children: [
              CatchField.input(
                copy: _copy('Custom'),
                title: 'Name',
                variant: CatchFieldVariant.underline,
                contract: const CatchContractFieldConstraints(
                  path: 'example.name',
                  required: true,
                ),
              ),
              CatchField<String>.select(
                copy: _copy('Custom'),
                title: 'Language',
                values: const ['one'],
                itemLabelBuilder: (value) => value,
                onChanged: (_) {},
              ),
            ],
          ),
        ),
      ),
    );
    expect(find.text('Custom select Language'), findsOneWidget);
    expect(form.currentState!.validate(), isFalse);
    await pumpFeatureUi(tester);
    expect(find.text('Custom required Name'), findsOneWidget);
  });

  testWidgets('disclosure actions and progress retain distinct caller copy', (
    tester,
  ) async {
    var saving = false;
    late StateSetter update;
    await tester.pumpWidget(
      _host(
        StatefulBuilder(
          builder: (context, setState) {
            update = setState;
            return Column(
              children: [
                CatchField.control(
                  copy: _copy('Custom'),
                  title: 'Choice',
                  body: 'One',

                  disclosureMode: CatchFieldMode.controlledExpanded,
                  onCancel: () {},
                  onSubmit: () {},

                  status: saving
                      ? CatchFieldStatus.saving
                      : CatchFieldStatus.idle,
                  child: const Text('Choices'),
                ),
                CatchField.read(
                  key: const ValueKey('status'),
                  copy: _copy('Custom'),
                  title: 'Status',
                  status: saving
                      ? CatchFieldStatus.saving
                      : CatchFieldStatus.idle,
                ),
              ],
            );
          },
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Custom cancel'), findsOneWidget);
    expect(find.text('Custom done'), findsOneWidget);
    update(() => saving = true);
    await tester.pump();
    final actionBar = tester.widget<CatchFieldActionRow>(
      find.byType(CatchFieldActionRow),
    );
    expect(actionBar.savingLabel, 'Custom working');
    final indicator = tester.widget<CatchFieldStatusIndicator>(
      find.descendant(
        of: find.byKey(const ValueKey('status')),
        matching: find.byType(CatchFieldStatusIndicator),
      ),
    );
    expect(indicator.savingSemanticLabel, 'Custom saving announcement');
    expect(indicator.savedSemanticLabel, 'Custom saved announcement');
  });

  test(
    'app adapter preserves casing, blank-title and explicit-override rules',
    () {
      final english = catchFieldCopy(AppLocalizationsEn());
      final otherLocale = catchFieldCopy(AppLocalizationsEn('fr'));
      expect(english.emptyValueText('  Display Name  '), 'Add display name');
      expect(
        otherLocale.emptyValueText('  Display Name  '),
        'Add Display Name',
      );
      expect(english.selectPlaceholder(null), 'Select');
      expect(english.selectPlaceholder('  '), 'Select');
      expect(
        english.selectPlaceholder('  Display Name  '),
        'Select display name',
      );
      expect(english.clearTooltip(null), 'Clear field');
      expect(english.clearTooltip(''), 'Clear ');
      expect(
        CatchField.resolveEmptyValueText(
          english,
          title: ' Name ',
          emptyValueText: ' name ',
        ),
        'Add name',
      );
      expect(
        CatchField.resolveEmptyValueText(
          english,
          title: 'Name',
          emptyValueText: ' Add your public name ',
        ),
        'Add your public name',
      );
    },
  );
}

// SDK localization only: a field must render without the app's catalog delegate.
Widget _host(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(body: child),
);

CatchFieldCopy _copy(String prefix) => CatchFieldCopy(
  label: CatchFieldLabelTextCopy(
    optionalLabel: '$prefix optional',
    optionalSuffix: ' · $prefix optional',
    optionalSemantics: (label) => '$prefix optional $label',
  ),
  validation: CatchFormValidationCopy(
    requiredMessage: (label) => '$prefix required $label',
    minLengthMessage: (label, count) => '$prefix minimum $label $count',
    maxLengthMessage: (label, count) => '$prefix maximum $label $count',
    patternMessage: (label) => '$prefix pattern $label',
  ),
  cancelLabel: '$prefix cancel',
  doneLabel: '$prefix done',
  savingLabel: '$prefix working',
  savingSemanticLabel: '$prefix saving announcement',
  savedSemanticLabel: '$prefix saved announcement',
  emptyValueText: (title) => '$prefix add $title',
  selectPlaceholder: (title) => '$prefix select $title',
  clearTooltip: (title) => '$prefix clear $title',
);
