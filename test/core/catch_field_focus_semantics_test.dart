import 'dart:ui' show SemanticsAction;

import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets('reduced-motion disclosure closes safely during widget update', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final focus = FocusNode();
    try {
      await tester.pumpWidget(_disclosure(open: true, childFocus: focus));
      focus.requestFocus();
      await tester.pump();
      expect(focus.hasFocus, isTrue);
      expect(find.text('Choose guest'), findsOneWidget);

      await tester.pumpWidget(_disclosure(open: false, childFocus: focus));
      expect(tester.takeException(), isNull);
      await tester.pump();
      expect(focus.hasFocus, isFalse);
      expect(find.text('Choose guest'), findsNothing);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(_disclosure(open: true, childFocus: focus));
      await tester.pump();
      expect(find.text('Choose guest'), findsOneWidget);
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      expect(tester.takeException(), isNull);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      focus.dispose();
      semantics.dispose();
    }
  });

  testWidgets('disclosure completion after removal cannot rebuild the field', (
    tester,
  ) async {
    await tester.pumpWidget(_disclosure(open: true, reducedMotion: false));
    await tester.pumpWidget(_disclosure(open: false, reducedMotion: false));
    final completion = tester
        .widget<TweenAnimationBuilder<double>>(
          find.byKey(const ValueKey('catch-field-expansion')),
        )
        .onEnd!;
    await tester.pumpWidget(const SizedBox.shrink());
    expect(completion, returnsNormally);
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  testWidgets('empty row input exposes one labeled native tap action', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final controller = TextEditingController();
    final focus = FocusNode();
    try {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Arrival date',
              labelMode: CatchFieldLabelTextMode.optional,
              controller: controller,
              focusNode: focus,
            ),
          ),
        ),
      );
      await tester.pump();
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      final input = tester.getSemantics(find.byType(TextField));
      expect(input.label, 'Add arrival date, optional');
      expect(input.flagsCollection.isTextField, isTrue);
      expect(input.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      tester.binding.renderViews.single.owner!.semanticsOwner!.performAction(
        input.id,
        SemanticsAction.tap,
      );
      await tester.pump();
      expect(focus.hasFocus, isTrue);
      await tester.enterText(find.byType(TextField), '2026-10-05');
      expect(controller.text, '2026-10-05');
      focus.unfocus();
      await tester.pump();
      await tester.tap(find.byType(CatchField));
      await tester.pump();
      expect(focus.hasFocus, isTrue);
      expect(tester.takeException(), isNull);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      focus.dispose();
      controller.dispose();
      semantics.dispose();
    }
  });

  testWidgets('custom read-only row retains its accessible activation', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final controller = TextEditingController(text: 'Choose a date');
    var activations = 0;
    try {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Arrival date',
              controller: controller,
              inputMode: CatchTextInputMode.readOnlyWithoutSelection,
              onTap: () => activations++,
            ),
          ),
        ),
      );
      await tester.pump();
      final row = tester.getSemantics(find.text('Arrival date'));
      expect(row.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      tester.binding.renderViews.single.owner!.semanticsOwner!.performAction(
        row.id,
        SemanticsAction.tap,
      );
      await tester.pump();
      expect(activations, 1);
      expect(controller.text, 'Choose a date');
      expect(tester.takeException(), isNull);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
      semantics.dispose();
    }
  });

  testWidgets('disabling a focused input retains native field semantics', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final controller = TextEditingController(text: '1997-01-01');
    final focus = FocusNode();
    var enabled = true;
    late StateSetter update;
    try {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                update = setState;
                return CatchField.input(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Birthday',
                  controller: controller,
                  focusNode: focus,
                  suffixText: 'Age 29',
                  states: enabled ? {} : {WidgetState.disabled},
                );
              },
            ),
          ),
        ),
      );

      focus.requestFocus();
      await pumpFeatureUi(tester);
      expect(focus.hasFocus, isTrue);
      var input = tester.getSemantics(find.byType(TextField));
      expect(input.label, contains('Birthday'));
      expect(input.value, '1997-01-01');
      expect(input.flagsCollection.isTextField, isTrue);
      expect(
        input.getSemanticsData().hasAction(SemanticsAction.setText),
        isTrue,
      );

      update(() => enabled = false);
      await pumpFeatureUi(tester);
      expect(tester.takeException(), isNull);
      expect(focus.hasFocus, isFalse);
      input = tester.getSemantics(find.byType(TextField));
      expect(input.label, contains('Birthday'));
      expect(input.value, '1997-01-01');
      expect(input.flagsCollection.isTextField, isTrue);
      expect(
        input.getSemanticsData().hasAction(SemanticsAction.setText),
        isFalse,
      );

      update(() => enabled = true);
      await pumpFeatureUi(tester);
      focus.requestFocus();
      await pumpFeatureUi(tester);
      expect(focus.hasFocus, isTrue);
      expect(tester.takeException(), isNull);
      input = tester.getSemantics(find.byType(TextField));
      expect(input.value, '1997-01-01');
      expect(
        input.getSemanticsData().hasAction(SemanticsAction.setText),
        isTrue,
      );
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      focus.dispose();
      controller.dispose();
      semantics.dispose();
    }
  });

  testWidgets('explicit-save disclosure retains its accessible open action', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final controller = TextEditingController(text: 'Draft');
    final focus = FocusNode();
    var open = false;
    var changes = 0;
    try {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) => CatchField.inputActions(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Prompt',
                controller: controller,
                focusNode: focus,
                open: open,
                onOpenChanged: (value) {
                  changes++;
                  setState(() => open = value);
                },
                onCancel: () => setState(() => open = false),
                onSubmit: () {},
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      final disclosure = tester.getSemantics(find.text('Prompt'));
      expect(disclosure.label, contains('Prompt'));
      expect(
        disclosure.getSemanticsData().hasAction(SemanticsAction.tap),
        isTrue,
      );
      tester.binding.renderViews.single.owner!.semanticsOwner!.performAction(
        disclosure.id,
        SemanticsAction.tap,
      );
      await pumpFeatureUi(tester);
      expect(open, isTrue);
      expect(changes, 1);
      expect(focus.hasFocus, isTrue);
      expect(find.byType(TextField), findsOneWidget);
      expect(tester.takeException(), isNull);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
      focus.dispose();
      controller.dispose();
      semantics.dispose();
    }
  });

  testWidgets('external focus node remains caller-owned', (tester) async {
    final controller = TextEditingController();
    final focusNode = FocusNode();
    addTearDown(controller.dispose);
    addTearDown(focusNode.dispose);

    await _pumpField(tester, controller: controller, focusNode: focusNode);
    await tester.tap(find.byType(TextField));
    await tester.pump();
    expect(focusNode.hasFocus, isTrue);

    await tester.pumpWidget(const SizedBox.shrink());

    expect(() => focusNode.addListener(() {}), returnsNormally);
    expect(() => focusNode.requestFocus(), returnsNormally);
  });

  testWidgets('submission unfocuses by default', (tester) async {
    final controller = TextEditingController(text: 'Value');
    final focusNode = FocusNode();
    addTearDown(controller.dispose);
    addTearDown(focusNode.dispose);
    var submissions = 0;

    await _pumpField(
      tester,
      controller: controller,
      focusNode: focusNode,
      onSubmitted: (_) => submissions++,
    );
    await tester.tap(find.byType(TextField));
    await tester.pump();
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();

    expect(submissions, 1);
    expect(focusNode.hasFocus, isFalse);
  });

  testWidgets('onEditingComplete retains focus before submission', (
    tester,
  ) async {
    final controller = TextEditingController(text: 'Value');
    final focusNode = FocusNode();
    addTearDown(controller.dispose);
    addTearDown(focusNode.dispose);
    final events = <String>[];

    await _pumpField(
      tester,
      controller: controller,
      focusNode: focusNode,
      onEditingComplete: () => events.add('complete'),
      onSubmitted: (_) => events.add('submit'),
    );
    await tester.tap(find.byType(TextField));
    await tester.pump();
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();

    expect(events, ['complete', 'submit']);
    expect(focusNode.hasFocus, isTrue);
  });

  for (final mode in [
    CatchFieldLabelTextMode.hidden,
    CatchFieldLabelTextMode.hiddenOptional,
  ]) {
    testWidgets('${mode.name} merges into one native editable semantics node', (
      tester,
    ) async {
      final controller = TextEditingController();
      final focusNode = FocusNode();
      final semantics = tester.ensureSemantics();
      addTearDown(controller.dispose);
      addTearDown(focusNode.dispose);

      await _pumpField(
        tester,
        controller: controller,
        focusNode: focusNode,
        labelMode: mode,
      );

      final editableNode = tester.getSemantics(find.byType(TextField));
      expect(editableNode.flagsCollection.isTextField, isTrue);
      final label = mode == CatchFieldLabelTextMode.hiddenOptional
          ? catchFieldCopy(
              AppLocalizationsEn(),
            ).label.optionalSemantics('Message')
          : 'Message';
      expect(editableNode.label, label);
      expect(find.text('Message'), findsNothing);
      expect(
        editableNode.getSemanticsData().hasAction(SemanticsAction.tap),
        isTrue,
      );
      expect(find.bySemanticsLabel(label), findsOne);
      semantics.dispose();
    });
  }

  testWidgets(
    'empty optional input exposes one Add semantic and restores its field label on focus',
    (tester) async {
      final semantics = tester.ensureSemantics();
      final controller = TextEditingController();
      final focusNode = FocusNode();
      addTearDown(controller.dispose);
      addTearDown(focusNode.dispose);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Job title',
              controller: controller,
              focusNode: focusNode,
              labelMode: CatchFieldLabelTextMode.optional,
            ),
          ),
        ),
      );

      expect(
        tester.getSemantics(find.byType(TextField)).label,
        'Add job title, optional',
      );
      expect(find.bySemanticsLabel('Add job title, optional'), findsOneWidget);

      await tester.tap(find.byType(TextField));
      await tester.pump();
      await tester.pump(CatchMotion.fast);

      expect(focusNode.hasFocus, isTrue);
      expect(tester.getSemantics(find.byType(TextField)).label, 'Job title');
      expect(find.bySemanticsLabel('Add job title, optional'), findsNothing);
      semantics.dispose();
    },
  );

  testWidgets('direct inputs contribute one keyboard focus stop each', (
    tester,
  ) async {
    final firstController = TextEditingController();
    final secondController = TextEditingController();
    final firstFocus = FocusNode();
    final secondFocus = FocusNode();
    addTearDown(firstController.dispose);
    addTearDown(secondController.dispose);
    addTearDown(firstFocus.dispose);
    addTearDown(secondFocus.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Column(
            children: [
              CatchField.input(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'First field',
                controller: firstController,
                focusNode: firstFocus,
              ),
              CatchField.input(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Second field',
                controller: secondController,
                focusNode: secondFocus,
              ),
            ],
          ),
        ),
      ),
    );

    final scope = FocusScope.of(tester.element(find.byType(Scaffold)));
    expect(scope.nextFocus(), isTrue);
    await tester.pump();
    expect(firstFocus.hasPrimaryFocus, isTrue);

    expect(scope.nextFocus(), isTrue);
    await tester.pump();
    expect(secondFocus.hasPrimaryFocus, isTrue);
  });

  testWidgets(
    'toggle rows contribute one keyboard focus stop and switch node',
    (tester) async {
      final before = FocusNode(debugLabel: 'before toggle');
      final after = FocusNode(debugLabel: 'after toggle');
      final semantics = tester.ensureSemantics();
      addTearDown(before.dispose);
      addTearDown(after.dispose);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Column(
              children: [
                TextButton(
                  focusNode: before,
                  onPressed: () {},
                  child: const Text('Before'),
                ),
                CatchField.toggle(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Show my pace',
                  value: true,
                  onChanged: (_) {},
                ),
                TextButton(
                  focusNode: after,
                  onPressed: () {},
                  child: const Text('After'),
                ),
              ],
            ),
          ),
        ),
      );

      before.requestFocus();
      await tester.pump();
      final scope = FocusScope.of(tester.element(find.byType(Scaffold)));
      expect(scope.nextFocus(), isTrue);
      await tester.pump();
      expect(before.hasFocus, isFalse);
      expect(after.hasFocus, isFalse);
      expect(find.bySemanticsLabel('Show my pace'), findsOneWidget);

      expect(scope.nextFocus(), isTrue);
      await tester.pump();
      expect(after.hasPrimaryFocus, isTrue);
      semantics.dispose();
    },
  );

  testWidgets('rounded press chrome transfers to one rounded active outline', (
    tester,
  ) async {
    final controller = TextEditingController();
    final focusNode = FocusNode();
    addTearDown(controller.dispose);
    addTearDown(focusNode.dispose);

    await _pumpField(tester, controller: controller, focusNode: focusNode);

    BoxDecoration overlayDecoration(Key key) =>
        tester.widget<AnimatedContainer>(find.byKey(key)).decoration
            as BoxDecoration;
    BoxDecoration pressedDecoration() =>
        overlayDecoration(CatchField.pressOverlayKey);
    BoxDecoration activeDecoration() =>
        overlayDecoration(const ValueKey<String>('catch-field-active-overlay'));

    expect(pressedDecoration().border, isNull);
    expect(
      pressedDecoration().borderRadius,
      BorderRadius.circular(CatchFieldTokens.tileRadius),
    );
    expect(pressedDecoration().color, Colors.transparent);
    expect(activeDecoration().border, isNull);
    expect(
      activeDecoration().borderRadius,
      BorderRadius.circular(CatchFieldTokens.tileRadius),
    );
    final gesture = await tester.startGesture(
      tester.getCenter(find.byType(CatchField)),
    );
    await tester.pump();

    expect(
      pressedDecoration().border,
      CatchBorder.resolve(
        CatchTokens.editorialLight,
        CatchBorderRole.boundary,
      ).all,
    );
    expect(
      pressedDecoration().borderRadius,
      BorderRadius.circular(CatchFieldTokens.tileRadius),
    );
    expect(pressedDecoration().color, isNot(equals(Colors.transparent)));
    expect(activeDecoration().border, isNull);
    expect(focusNode.hasFocus, isFalse);
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 100));
    expect(
      pressedDecoration().border,
      CatchBorder.resolve(
        CatchTokens.editorialLight,
        CatchBorderRole.boundary,
      ).all,
    );
    expect(pressedDecoration().color, isNot(equals(Colors.transparent)));

    await gesture.up();
    await tester.pump();

    // The pressed layer keeps the shared stroke through the tap frame so
    // focus activation cannot introduce a transparent flash.
    expect(
      pressedDecoration().border,
      CatchBorder.resolve(
        CatchTokens.editorialLight,
        CatchBorderRole.boundary,
      ).all,
    );
    expect(activeDecoration().border, isNull);

    await tester.pump();

    expect(pressedDecoration().border, isNull);
    expect(activeDecoration().border, isNotNull);
    expect(
      activeDecoration().borderRadius,
      BorderRadius.circular(CatchFieldTokens.tileRadius),
    );
    expect(activeDecoration().boxShadow, isNotEmpty);
    expect(focusNode.hasFocus, isTrue);
    expect(tester.testTextInput.isVisible, isTrue);

    final activeGesture = await tester.startGesture(
      tester.getCenter(find.byType(CatchField)),
    );
    await tester.pump();

    expect(
      pressedDecoration().border,
      CatchBorder.resolve(
        CatchTokens.editorialLight,
        CatchBorderRole.boundary,
      ).all,
    );
    expect(activeDecoration().border, isNull);
    expect(pressedDecoration().borderRadius, activeDecoration().borderRadius);

    await activeGesture.up();
    await tester.pump();
  });

  testWidgets('full-bleed keyboard focus paints one inset perimeter', (
    tester,
  ) async {
    final previousHighlightStrategy = FocusManager.instance.highlightStrategy;
    FocusManager.instance.highlightStrategy =
        FocusHighlightStrategy.alwaysTraditional;
    addTearDown(
      () => FocusManager.instance.highlightStrategy = previousHighlightStrategy,
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SizedBox(
            width: 390,
            child: CatchSectionList.panes(
              body: CatchPageBody.screen(
                variant: CatchPageBodyVariant.fixed,
                pt: 0,
                pb: 0,
                child: CatchSection.fieldRows(
                  first: true,
                  children: [
                    CatchField.nav(
                      copy: catchFieldCopy(AppLocalizationsEn()),
                      title: 'Reminder timing',
                      onTap: () {},
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );

    final scope = FocusScope.of(tester.element(find.byType(Scaffold)));
    expect(scope.nextFocus(), isTrue);
    await tester.pump();

    final overlayFinder = find.byKey(
      const ValueKey<String>('catch-field-active-overlay'),
    );
    final overlay = tester.widget<AnimatedContainer>(overlayFinder);
    final decoration = overlay.decoration! as BoxDecoration;
    final overlayRect = tester.getRect(overlayFinder);

    expect(
      decoration.border,
      CatchBorder.resolve(
        CatchTokens.editorialLight,
        CatchBorderRole.focus,
      ).all,
    );
    expect(decoration.borderRadius, BorderRadius.zero);
    expect(decoration.boxShadow, isEmpty);
    expect(overlayRect.left, 0);
    expect(overlayRect.right, 390);
  });

  testWidgets(
    'non-text disclosure label becomes primary only after the opening gesture',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CatchField.control(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Religion',
              body: 'Christian',
              labelMode: CatchFieldLabelTextMode.optional,
              child: const SizedBox(height: 80),
            ),
          ),
        ),
      );

      Color? labelColor() =>
          tester.widget<Text>(find.text('Religion')).style?.color;

      expect(labelColor(), CatchTokens.editorialLight.ink2);

      final gesture = await tester.startGesture(
        tester.getCenter(find.text('Religion')),
      );
      await tester.pump();

      expect(labelColor(), CatchTokens.editorialLight.ink2);

      await gesture.up();
      await tester.pump();

      expect(labelColor(), CatchTokens.editorialLight.ink);
      expect(
        tester.widget<Text>(find.text(' · Optional')).style?.color,
        CatchTokens.editorialLight.ink3,
      );

      await tester.tap(find.text('Religion'));
      await tester.pump();

      expect(labelColor(), CatchTokens.editorialLight.ink2);
    },
  );

  testWidgets(
    'choice factory inherits the semantic active label color in dark mode',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark,
          home: Scaffold(
            body: CatchField<String>.choices(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Languages',
              values: const ['English', 'Hindi'],
              itemLabelBuilder: (value) => value,
              selected: const {'English'},
              onSelectionChanged: (_) {},
              mode: CatchChipMode.multiple,
              disclosureMode: CatchFieldMode.localExpanded,
            ),
          ),
        ),
      );

      expect(
        tester.widget<Text>(find.text('Languages')).style?.color,
        CatchTokens.editorialDark.ink,
      );
    },
  );

  testWidgets('select label inherits the root focus color resolver', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CatchField<String>.select(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'City',
            values: const ['Indore', 'Mumbai'],
            itemLabelBuilder: (value) => value,
            value: 'Indore',
            onChanged: (_) {},
          ),
        ),
      ),
    );

    Text label() => tester.widget<Text>(find.text('City'));
    expect(label().style?.color, CatchTokens.editorialLight.ink2);

    await tester.tap(find.text('City'));
    await tester.pump();

    expect(label().style?.color, CatchTokens.editorialLight.ink);
  });

  testWidgets('expanded error label keeps danger precedence', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CatchField.control(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Religion',
            body: 'Christian',
            error: 'Choose a religion',
            child: const SizedBox(height: 80),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Religion'));
    await tester.pump();

    expect(
      tester.widget<Text>(find.text('Religion')).style?.color,
      CatchTokens.editorialLight.danger,
    );
  });

  testWidgets('one disclosure gesture opens and focuses explicit text input', (
    tester,
  ) async {
    final controller = TextEditingController(text: 'Draft');
    final focusNode = FocusNode();
    addTearDown(controller.dispose);
    addTearDown(focusNode.dispose);
    var open = false;
    var openChanges = 0;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => CatchField.inputActions(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Prompt',
              controller: controller,
              focusNode: focusNode,
              open: open,
              onOpenChanged: (value) {
                openChanges++;
                setState(() => open = value);
              },
              onCancel: () => setState(() => open = false),
              onSubmit: () {},
            ),
          ),
        ),
      ),
    );

    final gesture = await tester.startGesture(
      tester.getCenter(find.text('Prompt')),
    );
    await tester.pump();
    expect(open, isFalse);
    expect(focusNode.hasFocus, isFalse);

    await gesture.up();
    await tester.pump();

    expect(open, isTrue);
    expect(openChanges, 1);
    expect(focusNode.hasFocus, isFalse);
    expect(tester.testTextInput.isVisible, isFalse);

    await pumpFeatureUi(tester);

    expect(focusNode.hasFocus, isTrue);
    expect(tester.testTextInput.isVisible, isTrue);

    await tester.tap(find.byType(TextField));
    await tester.pump();
    expect(open, isTrue);
    expect(openChanges, 1);
    expect(focusNode.hasFocus, isTrue);
  });

  testWidgets(
    'one gesture cancels the previous field and focuses the next field',
    (tester) async {
      final firstController = TextEditingController(text: 'First value');
      final secondController = TextEditingController(text: 'Second value');
      final firstFocus = FocusNode();
      final secondFocus = FocusNode();
      addTearDown(firstController.dispose);
      addTearDown(secondController.dispose);
      addTearDown(firstFocus.dispose);
      addTearDown(secondFocus.dispose);
      var firstOpen = true;
      var secondOpen = false;
      var firstCancels = 0;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) => Column(
                children: [
                  CatchField.inputActions(
                    copy: catchFieldCopy(AppLocalizationsEn()),
                    title: 'First field',
                    controller: firstController,
                    focusNode: firstFocus,
                    open: firstOpen,
                    onOpenChanged: (value) {
                      setState(() => firstOpen = value);
                    },
                    onCancel: () {
                      firstCancels++;
                      setState(() => firstOpen = false);
                    },
                    onSubmit: () {},
                  ),
                  CatchField.inputActions(
                    copy: catchFieldCopy(AppLocalizationsEn()),
                    title: 'Second field',
                    controller: secondController,
                    focusNode: secondFocus,
                    open: secondOpen,
                    onOpenChanged: (value) {
                      setState(() => secondOpen = value);
                    },
                    onCancel: () => setState(() => secondOpen = false),
                    onSubmit: () {},
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      expect(firstFocus.hasFocus, isTrue);

      final gesture = await tester.startGesture(
        tester.getCenter(find.text('Second field')),
      );
      await tester.pump();

      expect(firstOpen, isTrue);
      expect(secondOpen, isFalse);
      expect(firstCancels, 0);
      expect(firstFocus.hasFocus, isTrue);

      await gesture.up();
      await tester.pump();

      expect(firstOpen, isFalse);
      expect(secondOpen, isTrue);
      expect(firstCancels, 1);
      expect(secondFocus.hasFocus, isFalse);

      await pumpFeatureUi(tester);

      expect(secondFocus.hasFocus, isTrue);
      expect(tester.testTextInput.isVisible, isTrue);
    },
  );

  testWidgets('onBlur fires once with the latest input value', (tester) async {
    final controller = TextEditingController();
    final focusNode = FocusNode();
    final blurredValues = <String>[];
    addTearDown(controller.dispose);
    addTearDown(focusNode.dispose);

    await _pumpField(
      tester,
      controller: controller,
      focusNode: focusNode,
      onBlur: blurredValues.add,
    );
    await tester.tap(find.byType(TextField));
    await tester.pump();
    await tester.enterText(find.byType(TextField), 'Latest value');
    await tester.tapAt(const Offset(4, 4));
    await tester.pump();

    expect(blurredValues, <String>['Latest value']);
  });
}

Future<void> _pumpField(
  WidgetTester tester, {
  required TextEditingController controller,
  required FocusNode focusNode,
  VoidCallback? onEditingComplete,
  CatchFieldLabelTextMode labelMode = CatchFieldLabelTextMode.hidden,
  ValueChanged<String>? onSubmitted,
  ValueChanged<String>? onBlur,
}) {
  return tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(
        body: Center(
          child: CatchField.input(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Message',
            labelMode: labelMode,
            inputHint: 'Message…',
            controller: controller,
            focusNode: focusNode,
            onEditingComplete: onEditingComplete,
            textInputAction: TextInputAction.done,
            variant: CatchFieldVariant.bare,
            onSubmitted: onSubmitted,
            onBlur: onBlur,
          ),
        ),
      ),
    ),
  );
}

Widget _disclosure({
  required bool open,
  bool reducedMotion = true,
  FocusNode? childFocus,
}) => MaterialApp(
  theme: AppTheme.dark,
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context).copyWith(
      disableAnimations: reducedMotion,
      textScaler: const TextScaler.linear(2),
    ),
    child: child!,
  ),
  home: Scaffold(
    body: CatchField.control(
      key: const ValueKey('disclosure-lifecycle'),
      copy: catchFieldCopy(AppLocalizationsEn()),
      title: 'Guest name',
      disclosureMode: open
          ? CatchFieldMode.controlledExpanded
          : CatchFieldMode.controlledCollapsed,
      onOpenChanged: (_) {},
      child: TextButton(
        focusNode: childFocus,
        onPressed: () {},
        child: const Text('Choose guest'),
      ),
    ),
  ),
);
