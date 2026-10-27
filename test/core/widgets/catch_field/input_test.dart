import 'dart:math' as math;

import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../test_pump_helpers.dart';
import 'test_support.dart';

part 'input_selection_tests.dart';

void main() {
  for (final (mode, canFocus, readOnly, selectable) in [
    (CatchTextInputMode.editable, true, false, true),
    (CatchTextInputMode.readOnly, true, true, true),
    (CatchTextInputMode.inactive, false, true, true),
    (CatchTextInputMode.editableWithoutSelection, true, false, false),
    (CatchTextInputMode.readOnlyWithoutSelection, true, true, false),
    (CatchTextInputMode.inactiveWithoutSelection, false, true, false),
  ]) {
    testWidgets('CatchField preserves native ${mode.name} permissions', (
      tester,
    ) async {
      final focus = FocusNode();
      addTearDown(focus.dispose);
      await tester.pumpWidget(
        _wrap(
          CatchField.input(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Code',
            initialValue: 'ABC',
            focusNode: focus,
            labelMode: CatchFieldLabelTextMode.hidden,
            inputMode: mode,
          ),
        ),
      );
      // Inactive modes deliberately remove the input from hit testing.
      await tester.tapAt(tester.getCenter(find.byType(TextField)));
      await tester.pump();
      expect(focus.hasFocus, canFocus);
      final native = tester.widget<EditableText>(find.byType(EditableText));
      expect(native.readOnly, readOnly);
      expect(native.enableInteractiveSelection, selectable);
      expect(native.controller.text, 'ABC');
    });
  }

  testWidgets(
    'CatchField input derives length and validation from its contract',
    (tester) async {
      const contract = CatchContractFieldConstraints(
        path: 'fixture.code',
        minLength: 2,
        maxLength: 3,
        required: true,
        pattern: '^[A-Z]+\$',
      );
      final controller = TextEditingController();
      final formKey = GlobalKey<FormState>();
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        _wrap(
          Form(
            key: formKey,
            child: CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Code',
              contract: contract,
              controller: controller,
            ),
          ),
        ),
      );

      await tester.enterText(find.byType(TextField), 'ABCD');
      expect(controller.text, 'ABC');
      expect(formKey.currentState!.validate(), isTrue);

      controller.text = 'a';
      expect(formKey.currentState!.validate(), isFalse);
    },
  );

  testWidgets('CatchField choices expose only contract-supported values', (
    tester,
  ) async {
    const contract = CatchContractFieldConstraints(
      path: 'fixture.activity',
      enumValues: ['run', 'walk'],
    );

    await tester.pumpWidget(
      _wrap(
        CatchField<String>.choices(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Activity',
          contract: contract,
          contractValueBuilder: (value) => value,
          values: const ['run', 'walk', 'swim'],
          itemLabelBuilder: (value) => value,
          selected: const {'run'},
          disclosureMode: CatchFieldMode.localExpanded,
          onSelectionChanged: (_) {},
        ),
      ),
    );

    expect(find.text('run'), findsWidgets);
    expect(find.text('walk'), findsOneWidget);
    expect(find.text('swim'), findsNothing);
  });

  testWidgets('CatchField input preserves an explicit unbounded maxLines', (
    tester,
  ) async {
    final controller = TextEditingController(text: 'existing');
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      _wrap(
        CatchField.input(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Answer',
          controller: controller,
          maxLines: null,
          minLines: 1,
          keyboardType: TextInputType.multiline,
        ),
      ),
    );

    expect(tester.widget<CatchField>(find.byType(CatchField)).maxLines, isNull);
    expect(tester.widget<TextField>(find.byType(TextField)).maxLines, isNull);

    await tester.enterText(find.byType(TextField), 'first\nsecond');
    expect(controller.text, 'first\nsecond');
  });

  testWidgets('CatchField choices wrap and report caller-owned selection', (
    tester,
  ) async {
    Set<String>? nextSelection;

    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 280,
          child: CatchField<String>.choices(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Languages',
            body: 'English',
            values: const ['English', 'Hindi', 'Marathi', 'Gujarati'],
            itemLabelBuilder: (value) => value,
            selected: const {'English'},
            mode: CatchChipMode.multiple,
            disclosureMode: CatchFieldMode.localExpanded,
            onSelectionChanged: (selection) => nextSelection = selection,
            onCancel: () {},
            onSubmit: () {},
          ),
        ),
      ),
    );

    final chipRects = [
      for (final label in const ['English', 'Hindi', 'Marathi', 'Gujarati'])
        tester.getRect(find.byKey(ValueKey('catch-field-choice-$label'))),
    ];
    expect(chipRects.map((rect) => rect.top).toSet().length, greaterThan(1));
    final firstRowTop = chipRects.map((rect) => rect.top).reduce(math.min);
    final firstRowBottom = chipRects
        .where((rect) => (rect.top - firstRowTop).abs() < 0.1)
        .map((rect) => rect.bottom)
        .reduce(math.max);
    final secondRowTop = chipRects
        .where((rect) => rect.top > firstRowTop + 0.1)
        .map((rect) => rect.top)
        .reduce(math.min);
    expect(
      secondRowTop - firstRowBottom,
      closeTo(CatchFieldTokens.chipRunSpacing, 0.1),
    );
    final englishLabel = tester.widget<Text>(
      find.descendant(
        of: find.byKey(const ValueKey('catch-field-choice-English')),
        matching: find.text('English'),
      ),
    );
    expect(
      chipRects.first.height,
      greaterThanOrEqualTo(CatchPlatformTokens.minimumInteractiveExtent),
    );
    expect(
      englishLabel.style?.fontWeight,
      CatchTextStyles.titleS(
        tester.element(find.byType(CatchField)),
        color: CatchTokens.of(tester.element(find.byType(CatchField))).ink,
      ).fontWeight,
    );
    expect(englishLabel.style?.color, CatchTokens.editorialLight.primaryInk);
    final fieldRect = tester.getRect(find.byType(CatchField));
    final controlRect = tester.getRect(
      find.byWidgetPredicate((widget) => widget is CatchChoiceInput),
    );
    expect(
      controlRect.right,
      closeTo(fieldRect.right - CatchFieldTokens.rowHorizontalPadding, 0.1),
    );
    expect(
      tester
          .widget<AnimatedOpacity>(
            find.byKey(const ValueKey('catch-field-control-opacity')),
          )
          .duration,
      CatchMotion.base,
    );

    await tester.tap(find.byKey(const ValueKey('catch-field-choice-Hindi')));
    expect(nextSelection, const {'English', 'Hindi'});
  });

  testWidgets('CatchField disclosure validation follows its commit bar', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField.control(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Languages',
          body: 'English',

          disclosureMode: CatchFieldMode.localExpanded,
          error: 'Choose at least one language.',
          onCancel: () {},
          onSubmit: () {},
          child: const Text('Language control'),
        ),
      ),
    );

    final doneRect = tester.getRect(
      find.byKey(const ValueKey('catch-field-done')),
    );
    final errorRect = tester.getRect(
      find.text('Choose at least one language.'),
    );

    expect(errorRect.top, greaterThan(doneRect.bottom));
    expect(
      find.byKey(const ValueKey('catch-field-root-support')),
      findsOneWidget,
    );
  });

  testWidgets('CatchField clearable choice does not imply Optional copy', (
    tester,
  ) async {
    var selected = <String>{'Indore'};

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchField<String>.choices(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'City',
            values: const ['Indore', 'Mumbai'],
            itemLabelBuilder: (value) => value,
            selected: selected,
            allowEmptySelection: true,
            disclosureMode: CatchFieldMode.localExpanded,
            onSelectionChanged: (next) => setState(() => selected = next),
            onCancel: () {},
            onSubmit: () {},
          ),
        ),
      ),
    );

    expect(find.textContaining('Optional'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('catch-field-choice-Indore')));
    await tester.pump();
    expect(selected, isEmpty);
    expect(find.textContaining('Optional'), findsNothing);
  });

  testWidgets(
    'CatchField standardizes empty input and choice Add rows at rest',
    (tester) async {
      final inputKey = GlobalKey();
      final multilineInputKey = GlobalKey();
      final choiceKey = GlobalKey();

      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 320,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CatchField.input(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  key: inputKey,
                  title: 'Job title',
                  icon: CatchIcons.work,
                  labelMode: CatchFieldLabelTextMode.optional,
                ),
                CatchField.input(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  key: multilineInputKey,
                  title: 'Review',
                  minLines: 2,
                  maxLines: 4,
                  labelMode: CatchFieldLabelTextMode.optional,
                ),
                CatchField<String>.choices(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  key: choiceKey,
                  title: 'Workout',
                  values: const ['Never', 'Often'],
                  itemLabelBuilder: (value) => value,
                  selected: const {},
                  onSelectionChanged: (_) {},
                  addable: true,
                  labelMode: CatchFieldLabelTextMode.optional,
                  icon: CatchIcons.fitness,
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Add job title · Optional'), findsOneWidget);
      expect(find.text('Add review · Optional'), findsOneWidget);
      expect(find.text('Add workout · Optional'), findsOneWidget);
      expect(find.text('Job title'), findsNothing);
      expect(find.text('Review'), findsNothing);
      expect(find.text('Workout'), findsNothing);
      expect(
        tester.getSize(find.byKey(inputKey)).height,
        closeTo(tester.getSize(find.byKey(choiceKey)).height, 0.1),
      );
      expect(
        tester.getSize(find.byKey(multilineInputKey)).height,
        closeTo(tester.getSize(find.byKey(choiceKey)).height, 0.1),
      );
      expect(
        tester.getCenter(find.byIcon(CatchIcons.work)).dy,
        closeTo(tester.getCenter(find.text('Add job title · Optional')).dy, 1),
      );

      final addText = tester.widget<Text>(
        find.text('Add job title · Optional'),
      );
      final spans = (addText.textSpan! as TextSpan).children!;
      expect(spans.first.style?.color, CatchTokens.editorialLight.primary);
      expect(spans.first.style?.fontSize, CatchFieldTokens.valueFontSize);
      expect(spans.first.style?.fontWeight, FontWeight.w600);
      expect(spans.last.style?.color, CatchTokens.editorialLight.ink3);
      expect(spans.last.style?.fontWeight, FontWeight.w500);

      final multilineTextField = find.descendant(
        of: find.byKey(multilineInputKey),
        matching: find.byType(TextField),
      );
      expect(tester.widget<TextField>(multilineTextField).minLines, isNull);
      expect(tester.widget<TextField>(multilineTextField).maxLines, 1);

      await tester.tap(multilineTextField);
      await tester.pump();

      expect(tester.widget<TextField>(multilineTextField).minLines, 2);
      expect(tester.widget<TextField>(multilineTextField).maxLines, 4);
      expect(find.text('Review'), findsOneWidget);
      expect(find.text('Add review · Optional'), findsNothing);
    },
  );

  testWidgets('CatchField syncs external controller edits into validation', (
    tester,
  ) async {
    final formKey = GlobalKey<FormState>();
    final controller = TextEditingController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      _wrap(
        Form(
          key: formKey,
          child: CatchField.input(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Date of birth',
            controller: controller,
            inputMode: CatchTextInputMode.readOnly,
            onTap: () => controller.text = '15/04/1997',
            onValidate: (value) =>
                value == null || value.isEmpty ? 'Pick a date' : null,
          ),
        ),
      ),
    );

    expect(formKey.currentState!.validate(), isFalse);

    await tester.tap(find.text('Date of birth'));
    await tester.pump();

    expect(controller.text, '15/04/1997');
    expect(formKey.currentState!.validate(), isTrue);
  });

  testWidgets('CatchField row counter appears on focus or error', (
    tester,
  ) async {
    final controller = TextEditingController(text: 'ABC');
    addTearDown(controller.dispose);

    Widget field({String? error}) => _wrap(
      CatchField.input(
        copy: catchFieldCopy(AppLocalizationsEn()),
        title: 'Invite code',
        controller: controller,
        maxLength: 10,
        error: error,
      ),
    );

    await tester.pumpWidget(field());
    expect(find.text('3 / 10'), findsNothing);

    await tester.tap(find.byType(TextField));
    await tester.pump();
    expect(find.text('3 / 10'), findsOneWidget);

    tester.binding.focusManager.primaryFocus?.unfocus();
    await tester.pump();
    expect(find.text('3 / 10'), findsNothing);

    await tester.pumpWidget(field(error: 'Use a valid code.'));
    await tester.pump();
    expect(find.text('3 / 10'), findsOneWidget);
  });

  testWidgets('CatchField underline counter remains focus-only', (
    tester,
  ) async {
    final controller = TextEditingController(text: 'Hello');
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      _wrap(
        CatchField.input(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Bio',
          controller: controller,
          variant: CatchFieldVariant.underline,
          maxLength: 20,
          error: 'Review this value.',
        ),
      ),
    );

    expect(find.text('5 / 20'), findsNothing);
    await tester.tap(find.byType(TextField));
    await tester.pump();
    expect(find.text('5 / 20'), findsOneWidget);

    tester.binding.focusManager.primaryFocus?.unfocus();
    await tester.pump();
    expect(find.text('5 / 20'), findsNothing);
  });

  testWidgets('CatchField renders optional field marker', (tester) async {
    await tester.pumpWidget(
      _wrap(
        CatchField.input(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Bio',
          labelMode: CatchFieldLabelTextMode.optional,
          placeholder: 'Share a little about yourself',
        ),
      ),
    );

    expect(find.text('Bio'), findsNothing);
    expect(find.text('Add bio · Optional'), findsOneWidget);
    expect(find.text(' · Optional'), findsNothing);
    expect(find.text('Optional'), findsNothing);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics &&
            widget.properties.label == 'Add bio, optional',
      ),
      findsOneWidget,
    );

    await tester.tap(find.byType(TextField));
    await tester.pump();
    await tester.pump(CatchMotion.base);

    expect(find.text('Bio'), findsOneWidget);
    expect(find.text(' · Optional'), findsOneWidget);
    expect(find.text('Share a little about yourself'), findsOneWidget);
  });

  testWidgets(
    'CatchField keeps empty native text entry mounted through focus',
    (tester) async {
      final controller = TextEditingController();
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 320,
            child: CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Public name',
              controller: controller,
              inputHint: 'e.g. Aanya',
            ),
          ),
        ),
      );

      expect(find.text('Public name'), findsNothing);
      expect(find.text('Add public name'), findsOneWidget);
      expect(find.text('e.g. Aanya'), findsNothing);
      expect(find.byType(TextField), findsOneWidget);
      final inputElement = tester.element(find.byType(TextField));

      await tester.tap(find.byType(TextField));
      await tester.pump();
      await tester.pump(CatchMotion.base);

      expect(find.byType(TextField), findsOneWidget);
      expect(tester.element(find.byType(TextField)), same(inputElement));
      expect(find.text('Public name'), findsOneWidget);
      expect(find.text('e.g. Aanya'), findsOneWidget);

      var editableText = tester.widget<EditableText>(find.byType(EditableText));
      expect(editableText.focusNode.hasFocus, isTrue);

      await tester.enterText(find.byType(TextField), 'Aanya');
      await tester.pump();

      expect(controller.text, 'Aanya');
      editableText = tester.widget<EditableText>(find.byType(EditableText));
      expect(editableText.style.fontSize, CatchFieldTokens.valueFontSize);
      expect(editableText.style.fontWeight, FontWeight.w500);

      await tester.enterText(find.byType(TextField), '');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pump();
      await tester.pump(CatchMotion.base);

      expect(controller.text, isEmpty);
      expect(find.byType(TextField), findsOneWidget);
      expect(tester.element(find.byType(TextField)), same(inputElement));
      expect(find.text('Public name'), findsNothing);
      expect(find.text('Add public name'), findsOneWidget);
    },
  );

  testWidgets('CatchField keeps labels out of focused input hints', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 320,
          child: CatchField.input(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Instagram',
            inputHint: 'Instagram',
          ),
        ),
      ),
    );

    expect(find.text('Add instagram'), findsOneWidget);
    await tester.tap(find.byType(TextField));
    await tester.pump();
    await tester.pump(CatchMotion.base);

    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.decoration?.hintText, isNull);
    expect(find.text('Instagram'), findsOneWidget);
  });

  testWidgets('CatchField row inputs keep value emphasis at any line count', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 320,
          child: CatchField.input(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Answer',
            initialValue: 'Catch me if you can',
            maxLines: 3,
            minLines: 2,
          ),
        ),
      ),
    );

    var editable = tester.widget<EditableText>(find.byType(EditableText));
    var field = tester.widget<TextField>(find.byType(TextField));
    expect(editable.style.fontSize, CatchFieldTokens.valueFontSize);
    expect(editable.style.fontWeight, FontWeight.w500);
    expect(editable.style.height, CatchFieldTokens.multilineValueLineHeight);
    expect(field.decoration?.hintStyle?.fontWeight, FontWeight.w500);
    expect(
      field.decoration?.hintStyle?.height,
      CatchFieldTokens.multilineValueLineHeight,
    );

    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 320,
          child: CatchField.input(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Display name',
            initialValue: 'Aanya',
          ),
        ),
      ),
    );

    editable = tester.widget<EditableText>(find.byType(EditableText));
    field = tester.widget<TextField>(find.byType(TextField));
    expect(editable.style.fontWeight, FontWeight.w500);
    expect(editable.style.height, CatchFieldTokens.valueLineHeight);
    expect(field.decoration?.hintStyle?.fontWeight, FontWeight.w500);
    expect(
      field.decoration?.hintStyle?.height,
      CatchFieldTokens.valueLineHeight,
    );
  });

  testWidgets('CatchField collapsed text entry reports focus changes', (
    tester,
  ) async {
    final changes = <bool>[];

    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 320,
          child: CatchField.input(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Public name',
            inputHint: 'e.g. Aanya',
            onFocusChanged: changes.add,
          ),
        ),
      ),
    );

    await tester.tap(find.byType(TextField));
    await tester.pump();
    await tester.pump(CatchMotion.base);

    expect(changes, <bool>[true]);

    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump();

    expect(changes, <bool>[true, false]);
  });

  testWidgets(
    'CatchField expands collapsed text entry when validation fails before focus',
    (tester) async {
      final formKey = GlobalKey<FormState>();

      await tester.pumpWidget(
        _wrap(
          Form(
            key: formKey,
            child: SizedBox(
              width: 320,
              child: CatchField.input(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Public name',
                inputHint: 'e.g. Aanya',
                onValidate: _requiredPublicName,
              ),
            ),
          ),
        ),
      );

      expect(find.text('Public name'), findsNothing);
      expect(find.text('Add public name'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
      final inputElement = tester.element(find.byType(TextField));

      expect(formKey.currentState!.validate(), isFalse);
      await tester.pump();
      await tester.pump(CatchMotion.base);

      expect(find.byType(TextField), findsOneWidget);
      expect(tester.element(find.byType(TextField)), same(inputElement));
      expect(find.text('Public name'), findsOneWidget);
      expect(find.text('e.g. Aanya'), findsOneWidget);
      expect(find.text('Public name is required'), findsOneWidget);
    },
  );

  testWidgets(
    'CatchField expands initial text and collapses after external clear',
    (tester) async {
      final controller = TextEditingController(text: 'Aanya');
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 320,
            child: CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Public name',
              controller: controller,
              inputHint: 'e.g. Aanya',
            ),
          ),
        ),
      );

      expect(find.byType(TextField), findsOneWidget);

      controller.clear();
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pump();
      await tester.pump(CatchMotion.base);

      expect(find.byType(TextField), findsOneWidget);
      expect(find.text('Public name'), findsNothing);
      expect(find.text('Add public name'), findsOneWidget);
    },
  );

  testWidgets(
    'CatchField populated clear target does not change collapsed row height',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 320,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CatchField.input(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  key: const ValueKey('plain-populated-field'),
                  title: 'Public name',
                  initialValue: 'Run',
                ),
                CatchField.input(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  key: const ValueKey('clearable-populated-field'),
                  title: 'Display name',
                  initialValue: 'Run',
                  showClearButton: true,
                ),
              ],
            ),
          ),
        ),
      );

      final plainHeight = tester
          .getSize(find.byKey(const ValueKey('plain-populated-field')))
          .height;
      final clearableHeight = tester
          .getSize(find.byKey(const ValueKey('clearable-populated-field')))
          .height;
      expect(clearableHeight, closeTo(plainHeight, 0.1));
      expectMinimumAccessibleTarget(
        tester,
        find.byTooltip('Clear Display name'),
      );
      final clearRect = tester.getRect(find.byTooltip('Clear Display name'));
      final rowRect = tester.getRect(
        find.byKey(const ValueKey('clearable-populated-field')),
      );
      expect(clearRect.top, greaterThanOrEqualTo(rowRect.top));
      expect(clearRect.bottom, lessThanOrEqualTo(rowRect.bottom));
    },
  );

  testWidgets('CatchField compact input centers hint and icon vertically', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        Center(
          child: SizedBox(
            width: 320,
            child: CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Search',
              labelMode: CatchFieldLabelTextMode.hidden,
              placeholder: 'Search by name',
              size: CatchFieldSize.compact,
              leading: Icon(CatchIcons.search, size: 18),
            ),
          ),
        ),
      ),
    );

    final fieldRect = tester.getRect(find.byType(TextField));
    final hintRect = tester.getRect(find.text('Search by name'));
    final iconRect = tester.getRect(find.byIcon(CatchIcons.search));

    expect(
      (hintRect.center.dy - fieldRect.center.dy).abs(),
      lessThanOrEqualTo(2),
    );
    expect(
      (iconRect.center.dy - fieldRect.center.dy).abs(),
      lessThanOrEqualTo(2),
    );
  });

  testWidgets('CatchField keeps a same-name hint when its label is hidden', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 320,
          child: CatchField.input(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Search for a meeting point',
            labelMode: CatchFieldLabelTextMode.hidden,
            placeholder: 'Search for a meeting point',
            size: CatchFieldSize.floating,
          ),
        ),
      ),
    );

    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('Search for a meeting point'), findsOneWidget);
  });

  _registerInputSelectionTests();

  testWidgets(
    'CatchField.input pins controller, formatter, submit, validator, and support',
    (tester) async {
      final controller = TextEditingController();
      final formKey = GlobalKey<FormState>();
      String? submitted;
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        _wrap(
          Form(
            key: formKey,
            child: CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Invite code',
              controller: controller,
              autofocus: true,
              helperText: 'Three digits',
              maxLength: 3,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onValidate: (value) => value == null || value.length != 3
                  ? 'Enter three digits'
                  : null,
              onSubmitted: (value) => submitted = value,
            ),
          ),
        ),
      );

      expect(find.text('Three digits'), findsOneWidget);
      await tester.enterText(find.byType(TextField), '1a234');
      await tester.pump();
      expect(controller.text, '123');
      expect(find.text('3 / 3'), findsOneWidget);
      await tester.testTextInput.receiveAction(TextInputAction.done);
      expect(submitted, '123');
      expect(formKey.currentState!.validate(), isTrue);

      controller.text = '12';
      expect(formKey.currentState!.validate(), isFalse);
      await tester.pump();
      expect(find.text('Enter three digits'), findsOneWidget);
    },
  );

  testWidgets(
    'CatchField.inputActions commits, cancels to its snapshot, and disables while saving',
    (tester) async {
      final controller = TextEditingController(text: 'Original');
      var original = controller.text;
      var open = false;
      var saving = false;
      var submits = 0;
      late StateSetter update;
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) {
              update = setState;
              return CatchField.inputActions(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Bio',
                controller: controller,
                open: open,
                onOpenChanged: (next) => setState(() {
                  open = next;
                  if (next) original = controller.text;
                }),
                status: saving
                    ? CatchFieldStatus.saving
                    : CatchFieldStatus.idle,
                onCancel: () => setState(() {
                  controller.text = original;
                  open = false;
                }),
                onSubmit: () => setState(() {
                  submits += 1;
                  open = false;
                }),
              );
            },
          ),
        ),
      );

      await tester.tap(find.byType(CatchField));
      await _pumpCatchFieldMotion(tester);
      await tester.enterText(find.byType(TextField), 'Committed');
      await tester.tap(find.byKey(const ValueKey('catch-field-done')));
      await _pumpCatchFieldMotion(tester);
      expect(submits, 1);
      expect(open, isFalse);

      await tester.tap(find.byType(CatchField));
      await _pumpCatchFieldMotion(tester);
      await tester.enterText(find.byType(TextField), 'Discarded');
      await tester.tap(find.byKey(const ValueKey('catch-field-cancel')));
      await _pumpCatchFieldMotion(tester);
      expect(controller.text, 'Committed');

      update(() {
        open = true;
        saving = true;
      });
      await tester.pump();
      final doneButton = tester.widget<CatchFieldCommitButton>(
        find.byKey(const ValueKey('catch-field-done')),
      );
      expect(doneButton.onPressed, isNull);
      expect(submits, 1);
    },
  );

  for (final scale in [1.3, 2.0]) {
    testWidgets('CatchField input remains usable at ${scale}x text', (
      tester,
    ) async {
      final controller = TextEditingController(
        text: 'A long club description that must remain editable',
      );
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 280,
            child: CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Description',
              controller: controller,
              maxLines: 3,
            ),
          ),
          textScale: scale,
        ),
      );

      expect(tester.takeException(), isNull);
      expectMinimumAccessibleTarget(tester, find.byType(TextField));
    });

    testWidgets('CatchField select remains usable at ${scale}x text', (
      tester,
    ) async {
      final selected = cityOptionByName('mumbai')!;
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 280,
            child: CatchField<CityOption>.select(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Preferred city',
              values: defaultCityOptions,
              itemLabelBuilder: (city) => city.label,
              value: selected,
              leading: Icon(CatchIcons.location),
              onChanged: (_) {},
            ),
          ),
          textScale: scale,
        ),
      );

      expect(tester.takeException(), isNull);
      expectMinimumAccessibleTarget(
        tester,
        find.bySemanticsLabel('Preferred city'),
      );
    });
  }

  testWidgets('CatchField input lanes mirror in RTL', (tester) async {
    await tester.pumpWidget(
      _wrap(
        Directionality(
          textDirection: TextDirection.rtl,
          child: SizedBox(
            width: 280,
            child: CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'City',
              initialValue: 'Mumbai',
              leading: Icon(CatchIcons.location),
            ),
          ),
        ),
      ),
    );

    expect(
      tester.getCenter(find.byIcon(CatchIcons.location)).dx,
      greaterThan(tester.getCenter(find.byType(EditableText)).dx),
    );
  });

  testWidgets('CatchField select lanes mirror in RTL', (tester) async {
    await tester.pumpWidget(
      _wrap(
        Directionality(
          textDirection: TextDirection.rtl,
          child: SizedBox(
            width: 280,
            child: CatchField<CityOption>.select(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'City',
              values: defaultCityOptions,
              itemLabelBuilder: (city) => city.label,
              value: cityOptionByName('mumbai'),
              leading: Icon(CatchIcons.location),
              onChanged: (_) {},
            ),
          ),
        ),
      ),
    );

    expect(
      tester.getCenter(find.byIcon(CatchIcons.location)).dx,
      greaterThan(tester.getCenter(find.byIcon(CatchIcons.expand)).dx),
    );
  });
}

Widget _wrap(Widget child, {ThemeData? theme, double textScale = 1}) {
  return MaterialApp(
    theme: theme ?? AppTheme.light,
    home: MediaQuery(
      data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
      child: Scaffold(body: Center(child: child)),
    ),
  );
}

Future<void> _pumpCatchFieldMotion(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(CatchMotion.base);
  await tester.pump();
}

String? _requiredPublicName(String? value) {
  return value == null || value.isEmpty ? 'Public name is required' : null;
}
