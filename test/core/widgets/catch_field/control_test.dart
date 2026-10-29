import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../test_pump_helpers.dart';
import 'test_support.dart';

part 'control_interaction_tests.dart';

void main() {
  testWidgets('CatchField preserves the last state when control is released', (
    tester,
  ) async {
    var controlled = true;
    late VoidCallback releaseControl;

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) {
            releaseControl = () => setState(() => controlled = false);
            return CatchField.control(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Capacity',
              disclosureMode: controlled
                  ? CatchFieldMode.controlledExpanded
                  : CatchFieldMode.localCollapsed,
              onOpenChanged: (_) {},
              child: const Text('Capacity choices'),
            );
          },
        ),
      ),
    );

    expect(find.text('Capacity choices').hitTestable(), findsOneWidget);

    releaseControl();
    await tester.pump();

    expect(find.text('Capacity choices').hitTestable(), findsOneWidget);

    await tester.tap(find.text('Capacity'));
    await _pumpCatchFieldMotion(tester);

    expect(find.text('Capacity choices'), findsNothing);
    expect(find.text('Capacity choices', skipOffstage: false), findsOneWidget);
  });

  testWidgets('CatchField closed control subtree cannot retain focus', (
    tester,
  ) async {
    final controlFocus = FocusNode();
    addTearDown(controlFocus.dispose);
    var open = true;
    late void Function(bool value) setOpen;

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) {
            setOpen = (value) => setState(() => open = value);
            return CatchField.control(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Age range',
              disclosureMode: open
                  ? CatchFieldMode.controlledExpanded
                  : CatchFieldMode.controlledCollapsed,
              onOpenChanged: setOpen,
              child: TextField(focusNode: controlFocus),
            );
          },
        ),
      ),
    );

    controlFocus.requestFocus();
    await tester.pump();
    expect(controlFocus.hasFocus, isTrue);

    setOpen(false);
    await tester.pump();
    expect(controlFocus.hasFocus, isFalse);

    await _pumpCatchFieldMotion(tester);
    expect(find.byType(TextField), findsNothing);
    expect(find.byType(TextField, skipOffstage: false), findsOneWidget);
  });

  testWidgets('CatchField choices preserves an explicit body override', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField<String>.choices(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Distances',
          body: '5K and beyond',
          values: const ['5K', '10K'],
          itemLabelBuilder: (value) => value,
          selected: const {'5K', '10K'},
          mode: CatchChipMode.multiple,
          onSelectionChanged: (_) {},
        ),
      ),
    );

    expect(find.text('5K and beyond'), findsOneWidget);
    expect(find.text('5K · 10K'), findsNothing);
  });

  testWidgets('CatchField choices forwards helper and per-item accent', (
    tester,
  ) async {
    const accent = Color(0xFF8C5BFF);
    await tester.pumpWidget(
      _wrap(
        CatchField<String>.choices(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Format',
          helperText: 'Pick the format guests will see.',
          values: const ['Social', 'Competitive'],
          itemLabelBuilder: (value) => value,
          itemAccentBuilder: (value) => value == 'Social' ? accent : null,
          selected: const {'Social'},
          disclosureMode: CatchFieldMode.localExpanded,
          onSelectionChanged: (_) {},
        ),
      ),
    );

    expect(find.text('Pick the format guests will see.'), findsOneWidget);
    final chip = tester.widget<CatchChip>(
      find.byKey(const ValueKey('catch-field-choice-Social')),
    );
    expect(chip.accent, accent);
    expect(chip.selected, isTrue);
  });

  testWidgets(
    'CatchField optionCards keeps each title and description in one target',
    (tester) async {
      var selected = 'open';
      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) => CatchField<String>.optionCards(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Admission format',
              values: const ['open', 'invite'],
              itemTitleBuilder: (value) =>
                  value == 'open' ? 'Open' : 'Invite only',
              itemDescriptionBuilder: (value) => value == 'open'
                  ? 'Anyone eligible can book until capacity.'
                  : 'Only people with the invite code can book.',
              selected: selected,
              disclosureMode: CatchFieldMode.localExpanded,
              onChanged: (value) => setState(() => selected = value),
            ),
          ),
        ),
      );

      final openCard = tester.widget<CatchChoiceTile>(
        find.byKey(const ValueKey('catch-field-option-card-Open')),
      );
      final inviteCard = tester.widget<CatchChoiceTile>(
        find.byKey(const ValueKey('catch-field-option-card-Invite only')),
      );
      expect(openCard.subtitle, 'Anyone eligible can book until capacity.');
      expect(openCard.selected, isTrue);
      expect(inviteCard.subtitle, 'Only people with the invite code can book.');
      expect(inviteCard.selected, isFalse);

      await tester.tap(
        find.byKey(const ValueKey('catch-field-option-card-Invite only')),
      );
      await tester.pump();
      expect(selected, 'invite');
      expect(
        tester
            .widget<CatchChoiceTile>(
              find.byKey(
                const ValueKey('catch-field-option-card-Invite only'),
                skipOffstage: false,
              ),
            )
            .selected,
        isTrue,
      );
    },
  );

  testWidgets('CatchField stepper reports bounded changes', (tester) async {
    num value = 168;

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchField.stepper(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Height',
            body: '$value cm',
            value: value,
            min: 167,
            max: 169,
            step: 2,
            unit: 'cm',
            disclosureMode: CatchFieldMode.localExpanded,
            decreaseSemanticLabel: 'Decrease height',
            increaseSemanticLabel: 'Increase height',
            onChanged: (next) => setState(() => value = next),
            onCancel: () {},
            onSubmit: () {},
          ),
        ),
      ),
    );

    await tester.tap(find.bySemanticsLabel('Increase height'));
    await tester.pump();
    expect(value, 169);
    expect(find.text('169 cm'), findsNWidgets(2));
    final decreaseVisual = tester.getRect(
      find.byKey(const ValueKey('catch-field-stepper-Decrease height-visual')),
    );
    final decreaseHit = tester.getRect(
      find.byKey(
        const ValueKey('catch-field-stepper-Decrease height-focus-outline'),
      ),
    );
    final stepperValue = tester.getRect(
      find.byKey(const ValueKey('catch-field-stepper-value')),
    );
    final increaseVisual = tester.getRect(
      find.byKey(const ValueKey('catch-field-stepper-Increase height-visual')),
    );
    final increaseHit = tester.getRect(
      find.byKey(
        const ValueKey('catch-field-stepper-Increase height-focus-outline'),
      ),
    );
    expect(
      stepperValue.left - decreaseVisual.right,
      closeTo(CatchFieldTokens.stepperGap, 0.1),
    );
    expect(
      increaseVisual.left - stepperValue.right,
      closeTo(CatchFieldTokens.stepperGap, 0.1),
    );
    expect(decreaseVisual.center, decreaseHit.center);
    expect(increaseVisual.center, increaseHit.center);
    expectMinimumAccessibleTarget(
      tester,
      find.byKey(
        const ValueKey('catch-field-stepper-Decrease height-focus-outline'),
      ),
    );
    expectMinimumAccessibleTarget(
      tester,
      find.byKey(
        const ValueKey('catch-field-stepper-Increase height-focus-outline'),
      ),
    );

    final increase = tester.widget<Semantics>(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics && widget.properties.label == 'Increase height',
      ),
    );
    expect(increase.properties.enabled, isFalse);
    expect(
      tester.widget<Icon>(find.byIcon(CatchIcons.add)).size,
      CatchFieldTokens.stepperGlyphExtent,
    );
  });

  testWidgets('CatchField stepper hold cadence matches the handoff boundary', (
    tester,
  ) async {
    var steps = 0;
    await tester.pumpWidget(
      _wrap(
        CatchStepper(
          value: 168,
          min: 100,
          max: 220,
          decreaseSemanticLabel: 'Decrease height',
          increaseSemanticLabel: 'Increase height',
          onChanged: (_) => steps += 1,
        ),
      ),
    );

    final gesture = await tester.startGesture(
      tester.getCenter(find.bySemanticsLabel('Increase height')),
    );
    await tester.pump();
    expect(steps, 1);

    await tester.pump(
      CatchFieldTokens.repeatDelay - const Duration(milliseconds: 1),
    );
    expect(steps, 1);
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 1));
    expect(steps, 2);

    await pumpFeatureUiFor(tester, const Duration(milliseconds: 1000));
    expect(steps, 11);
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 99));
    expect(steps, 11);
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 1));
    expect(steps, 12);
    await tester.pump(
      CatchFieldTokens.repeatAccelerated - const Duration(milliseconds: 1),
    );
    expect(steps, 12);
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 1));
    expect(steps, 13);
    await gesture.up();
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 1000));
    expect(steps, 13);
  });

  testWidgets('CatchField stepper stops touch repeat after drag exit', (
    tester,
  ) async {
    var steps = 0;
    await tester.pumpWidget(
      _wrap(
        CatchStepper(
          value: 168,
          min: 100,
          max: 220,
          decreaseSemanticLabel: 'Decrease height',
          increaseSemanticLabel: 'Increase height',
          onChanged: (_) => steps += 1,
        ),
      ),
    );

    final target = find.bySemanticsLabel('Increase height');
    final gesture = await tester.startGesture(tester.getCenter(target));
    await tester.pump();
    expect(steps, 1);

    await gesture.moveTo(
      tester.getRect(target).bottomRight + const Offset(8, 8),
    );
    await tester.pump(
      CatchFieldTokens.repeatDelay + const Duration(seconds: 1),
    );
    expect(steps, 1);
    await gesture.up();
  });

  testWidgets('CatchField commit buttons paint immediate outer focus rings', (
    tester,
  ) async {
    final previousHighlightStrategy = FocusManager.instance.highlightStrategy;
    FocusManager.instance.highlightStrategy =
        FocusHighlightStrategy.alwaysTraditional;
    addTearDown(
      () => FocusManager.instance.highlightStrategy = previousHighlightStrategy,
    );

    await tester.pumpWidget(
      _wrap(
        CatchField.control(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Height',
          body: '168 cm',
          disclosureMode: CatchFieldMode.localExpanded,

          onCancel: _noop,
          onSubmit: _noop,
          child: const Text('Height control'),
        ),
      ),
    );

    for (final key in const [
      ValueKey('catch-field-cancel'),
      ValueKey('catch-field-done'),
    ]) {
      final buttonRoot = find.byKey(key);
      final textButtonFinder = find.descendant(
        of: buttonRoot,
        matching: find.byType(TextButton),
      );
      final buttonRect = tester.getRect(textButtonFinder);
      tester.widget<TextButton>(textButtonFinder).focusNode!.requestFocus();
      await tester.pump();

      final outline = find.descendant(
        of: buttonRoot,
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is CustomPaint &&
              widget.painter.runtimeType.toString() ==
                  '_CatchFieldFocusPainter',
        ),
      );
      expect(outline, findsOneWidget);
      expect(tester.getRect(textButtonFinder), buttonRect);
      expect(CatchFieldTokens.focusRingWidth, 2);
      expect(CatchFieldTokens.focusRingOffset, 2);
    }
  });

  testWidgets('CatchField single choice closes after the handoff delay', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField<String>.choices(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'City',
          values: const ['Indore', 'Mumbai'],
          itemLabelBuilder: (value) => value,
          selected: const {'Indore'},
          onSelectionChanged: (_) {},
          disclosureMode: CatchFieldMode.localExpanded,
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('catch-field-choice-Mumbai')));
    await tester.pump(
      CatchFieldTokens.singleChoiceCloseDelay - CatchFieldTokens.fast,
    );
    expect(find.text('Mumbai').hitTestable(), findsOneWidget);

    await tester.pump(CatchFieldTokens.fast);
    await _pumpCatchFieldMotion(tester);
    expect(find.text('Mumbai'), findsNothing);
  });

  testWidgets('CatchField local control cancel closes before callback', (
    tester,
  ) async {
    var cancelCount = 0;

    await tester.pumpWidget(
      _wrap(
        CatchField.control(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Height',
          disclosureMode: CatchFieldMode.localExpanded,

          onCancel: () => cancelCount++,
          onSubmit: () {},
          child: const Text('Height control'),
        ),
      ),
    );

    await tester.tap(find.text('Cancel'));
    await _pumpCatchFieldMotion(tester);

    expect(cancelCount, 1);
    expect(find.text('Height control'), findsNothing);
    expect(find.text('Height control', skipOffstage: false), findsOneWidget);
  });

  testWidgets('CatchField local control Done submits and closes', (
    tester,
  ) async {
    var submitCount = 0;

    await tester.pumpWidget(
      _wrap(
        CatchField.control(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Height',
          disclosureMode: CatchFieldMode.localExpanded,

          onCancel: () {},
          onSubmit: () => submitCount++,
          child: const Text('Height control'),
        ),
      ),
    );

    await tester.tap(find.text('Done'));
    await _pumpCatchFieldMotion(tester);

    expect(submitCount, 1);
    expect(find.text('Height control'), findsNothing);
    expect(find.text('Height control', skipOffstage: false), findsOneWidget);
  });

  testWidgets('CatchField controlled Done leaves disclosure parent-owned', (
    tester,
  ) async {
    var submitCount = 0;
    final openChanges = <bool>[];

    await tester.pumpWidget(
      _wrap(
        CatchField.control(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Height',
          disclosureMode: CatchFieldMode.controlledExpanded,
          onOpenChanged: openChanges.add,

          onCancel: () {},
          onSubmit: () => submitCount++,
          child: const Text('Height control'),
        ),
      ),
    );

    await tester.tap(find.text('Done'));
    await _pumpCatchFieldMotion(tester);

    expect(submitCount, 1);
    expect(openChanges, isEmpty);
    expect(find.text('Height control'), findsOneWidget);
  });

  testWidgets('CatchField local control reports open and cancel changes', (
    tester,
  ) async {
    final openChanges = <bool>[];

    await tester.pumpWidget(
      _wrap(
        CatchField.control(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Height',

          onOpenChanged: openChanges.add,
          onCancel: () {},
          onSubmit: () {},
          child: const Text('Height control'),
        ),
      ),
    );

    await tester.tap(find.text('Height'));
    await _pumpCatchFieldMotion(tester);
    expect(openChanges, <bool>[true]);

    await tester.tap(find.text('Cancel'));
    await _pumpCatchFieldMotion(tester);
    expect(openChanges, <bool>[true, false]);
  });

  _registerControlInteractionTests();

  testWidgets('CatchField renders label, helper text, changes, and errors', (
    tester,
  ) async {
    final formKey = GlobalKey<FormState>();
    var latestValue = '';

    await tester.pumpWidget(
      _wrap(
        Form(
          key: formKey,
          child: CatchField.input(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Event title',
            placeholder: 'Short and memorable',
            helperText: 'Shows on event cards',
            onValidate: (value) =>
                value == null || value.isEmpty ? "Title can't be empty" : null,
            onChanged: (value) => latestValue = value,
          ),
        ),
      ),
    );

    expect(find.text('Event title'), findsNothing);
    expect(find.text('Add event title'), findsOneWidget);
    expect(find.text('Short and memorable'), findsNothing);
    expect(find.text('Shows on event cards'), findsOneWidget);

    await tester.tap(find.byType(TextField));
    await tester.pump();
    await tester.pump(CatchMotion.base);
    expect(find.text('Event title'), findsOneWidget);
    expect(find.text('Short and memorable'), findsOneWidget);
    expect(find.text('Shows on event cards'), findsOneWidget);

    expect(formKey.currentState!.validate(), isFalse);
    await tester.pump();
    expect(find.text("Title can't be empty"), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'Sunrise Seawall 7K');
    await tester.pump();
    expect(latestValue, 'Sunrise Seawall 7K');
    expect(formKey.currentState!.validate(), isTrue);
  });

  testWidgets('CatchField exposes a keyboard done action by default', (
    tester,
  ) async {
    final controller = TextEditingController(text: 'Asha');
    addTearDown(controller.dispose);
    var submitted = '';

    await tester.pumpWidget(
      _wrap(
        CatchField.input(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Name',
          controller: controller,
          onSubmitted: (value) => submitted = value,
        ),
      ),
    );

    await tester.tap(find.byType(TextField));
    await tester.pump();

    final editableText = tester.widget<EditableText>(find.byType(EditableText));
    expect(editableText.textInputAction, TextInputAction.done);
    expect(editableText.focusNode.hasFocus, isTrue);

    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();

    expect(submitted, 'Asha');
    expect(editableText.focusNode.hasFocus, isFalse);
  });

  testWidgets('CatchField error renders once with danger label styling', (
    tester,
  ) async {
    const error = 'Use a six character invite code.';

    await tester.pumpWidget(
      _wrap(
        CatchField.input(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Invite code',
          initialValue: 'ABC',
          error: error,
        ),
      ),
    );

    expect(find.text(error), findsOneWidget);
    expect(find.byType(CatchControlSurface), findsNothing);

    final label = tester.widget<Text>(find.text('Invite code'));
    expect(label.style?.color, CatchTokens.editorialLight.danger);
  });

  testWidgets(
    'CatchField disables expansion motion when reduced motion is on',
    (tester) async {
      final controller = TextEditingController(text: 'Answer');
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        _wrap(
          MediaQuery(
            data: const MediaQueryData(disableAnimations: true),
            child: CatchField.inputActions(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Prompt',
              controller: controller,
              open: true,
              onOpenChanged: (_) {},
              meta: const Text('6 / 300'),
              onCancel: () {},
              onSubmit: () {},
            ),
          ),
        ),
      );

      final expansion = tester.widget<TweenAnimationBuilder<double>>(
        find.byKey(const ValueKey('catch-field-expansion')),
      );
      expect(expansion.duration, Duration.zero);
      final opacity = tester.widget<AnimatedOpacity>(
        find.byKey(const ValueKey('catch-field-control-opacity')),
      );
      expect(opacity.duration, Duration.zero);
      await tester.pump();
      final slide = tester.widget<Transform>(
        find.byKey(const ValueKey('catch-field-control-slide')),
      );
      expect(slide.transform.getTranslation().y, 0);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'CatchField.choices pins single, multi, disabled, and caller-owned selection',
    (tester) async {
      var selected = <String>{'Run'};
      var reports = 0;
      late StateSetter update;

      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) {
              update = setState;
              return CatchField<String>.choices(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Activities',
                values: const ['Run', 'Walk'],
                itemLabelBuilder: (value) => value,
                selected: selected,
                disclosureMode: CatchFieldMode.localExpanded,
                onSelectionChanged: (next) {
                  reports += 1;
                  setState(() => selected = next);
                },
              );
            },
          ),
        ),
      );

      await tester.tap(find.byKey(const ValueKey('catch-field-choice-Walk')));
      await tester.pump();
      expect(selected, {'Walk'});
      expect(reports, 1);

      update(() => selected = {'Run', 'Walk'});
      expect(selected, {'Run', 'Walk'});

      await tester.pumpWidget(
        _wrap(
          CatchField<String>.choices(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Locked activities',
            values: const ['Run', 'Walk'],
            itemLabelBuilder: (value) => value,
            selected: selected,
            mode: CatchChipMode.multiple,
            states: const <WidgetState>{
              WidgetState.disabled,
              WidgetState.focused,
            },
            disclosureMode: CatchFieldMode.localExpanded,
            onSelectionChanged: (_) => reports += 1,
          ),
        ),
      );
      final lockedChoice = tester.widget<CatchChip>(
        find.widgetWithText(CatchChip, 'Run'),
      );
      expect(lockedChoice.enabled, isFalse);
      expect(reports, 1);
    },
  );

  testWidgets(
    'CatchField.stepper pins valueLabelBuilder, bounds, and semantic labels',
    (tester) async {
      var value = 2;
      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) => CatchField.stepper(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Guests',
              value: value,
              min: 1,
              max: 3,
              valueLabelBuilder: (next) => '${next.toInt()} guests',
              decreaseSemanticLabel: 'Decrease guests',
              increaseSemanticLabel: 'Increase guests',
              disclosureMode: CatchFieldMode.localExpanded,
              onChanged: (next) => setState(() => value = next.toInt()),
            ),
          ),
        ),
      );

      expect(find.text('2 guests'), findsOneWidget);
      await tester.tap(find.bySemanticsLabel('Increase guests'));
      await tester.pump();
      expect(value, 3);
      expect(find.text('3 guests'), findsOneWidget);
      expect(find.bySemanticsLabel('Increase guests'), findsOneWidget);
    },
  );

  testWidgets('CatchField.stepper derives bounds and step from its contract', (
    tester,
  ) async {
    num value = 30;
    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchField.stepper(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Duration',
            contract:
                CatchContractConstraints.mobileFormStateEventDurationMinutes,
            value: value,
            decreaseSemanticLabel: 'Decrease duration',
            increaseSemanticLabel: 'Increase duration',
            disclosureMode: CatchFieldMode.localExpanded,
            onChanged: (next) => setState(() => value = next),
          ),
        ),
      ),
    );

    await tester.tap(find.bySemanticsLabel('Increase duration'));
    await tester.pump();
    expect(value, 45);

    final stepper = tester.widget<CatchStepper>(find.byType(CatchStepper));
    expect(stepper.min, 30);
    expect(stepper.max, 240);
    expect(stepper.step, 15);
  });

  testWidgets('CatchField Escape cancels an open editor', (tester) async {
    final controller = TextEditingController(text: 'Draft');
    final focusNode = FocusNode();
    addTearDown(controller.dispose);
    addTearDown(focusNode.dispose);
    var cancels = 0;
    await tester.pumpWidget(
      _wrap(
        CatchField.inputActions(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Bio',
          controller: controller,
          focusNode: focusNode,
          open: true,
          onOpenChanged: (_) {},
          onCancel: () => cancels += 1,
          onSubmit: () {},
        ),
      ),
    );

    await tester.pump();
    expect(focusNode.hasFocus, isTrue);
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await _pumpCatchFieldMotion(tester);
    expect(cancels, 1);
  });

  for (final scale in [1.3, 2.0]) {
    testWidgets('CatchField control remains usable at ${scale}x text', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 280,
            child: CatchField.control(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Preferred group size',
              body: 'Four people for a comfortable conversation',
              disclosureMode: CatchFieldMode.localExpanded,
              child: CatchStepper(
                value: 4,
                decreaseSemanticLabel: 'Decrease group size',
                increaseSemanticLabel: 'Increase group size',
                onChanged: (_) {},
              ),
            ),
          ),
          textScale: scale,
        ),
      );

      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('CatchField control lanes mirror in RTL', (tester) async {
    await tester.pumpWidget(
      _wrap(
        Directionality(
          textDirection: TextDirection.rtl,
          child: CatchStepper(
            value: 4,
            decreaseSemanticLabel: 'Decrease group size',
            increaseSemanticLabel: 'Increase group size',
            onChanged: (_) {},
          ),
        ),
      ),
    );

    expect(
      tester.getCenter(find.bySemanticsLabel('Decrease group size')).dx,
      greaterThan(
        tester.getCenter(find.bySemanticsLabel('Increase group size')).dx,
      ),
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

void _noop() {}
