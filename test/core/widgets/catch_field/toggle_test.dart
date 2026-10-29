import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'test_support.dart';

void main() {
  testWidgets(
    'CatchField choice toggle and stepper atoms activate from hardware keys',
    (tester) async {
      final previousHighlightStrategy = FocusManager.instance.highlightStrategy;
      FocusManager.instance.highlightStrategy =
          FocusHighlightStrategy.alwaysTraditional;
      addTearDown(
        () =>
            FocusManager.instance.highlightStrategy = previousHighlightStrategy,
      );
      var selected = <String>{'English'};
      var height = 168;
      var visible = false;

      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CatchField<String>.choices(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Languages',
                  values: const ['English', 'Hindi'],
                  itemLabelBuilder: (value) => value,
                  selected: selected,
                  mode: CatchChipMode.multiple,
                  disclosureMode: CatchFieldMode.localExpanded,
                  onSelectionChanged: (next) => setState(() => selected = next),
                  onCancel: () {},
                  onSubmit: () {},
                ),
                CatchField.stepper(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Height',
                  value: height,
                  min: 160,
                  max: 180,
                  disclosureMode: CatchFieldMode.localExpanded,
                  decreaseSemanticLabel: 'Decrease height',
                  increaseSemanticLabel: 'Increase height',
                  onChanged: (next) => setState(() => height = next.toInt()),
                  onCancel: () {},
                  onSubmit: () {},
                ),
                CatchField.toggle(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Show my pace',
                  value: visible,
                  onChanged: (next) => setState(() => visible = next),
                ),
              ],
            ),
          ),
        ),
      );

      final chip = find.byKey(const ValueKey('catch-field-choice-Hindi'));
      Focus.of(tester.element(find.text('Hindi'))).requestFocus();
      await tester.pump();
      final chipDecoration =
          tester
                  .widget<AnimatedContainer>(
                    find.descendant(
                      of: chip,
                      matching: find.byType(AnimatedContainer),
                    ),
                  )
                  .foregroundDecoration
              as BoxDecoration;
      expect(chipDecoration.border?.top.width, CatchFieldTokens.focusRingWidth);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump();
      expect(selected, {'English', 'Hindi'});

      final stepperOutline = find.byKey(
        const ValueKey('catch-field-stepper-Increase height-focus-outline'),
      );
      Focus.of(tester.element(stepperOutline)).requestFocus();
      await tester.pump();
      expect(
        find.descendant(
          of: stepperOutline,
          matching: find.byWidgetPredicate(
            (widget) =>
                widget is CustomPaint &&
                widget.painter.runtimeType.toString() ==
                    '_CatchFieldFocusPainter',
          ),
        ),
        findsOneWidget,
      );
      expect(
        tester.getSize(stepperOutline),
        Size.square(CatchStepperRepeatButton.hitExtent),
      );
      expect(
        tester.getSize(
          find.byKey(
            const ValueKey('catch-field-stepper-Increase height-visual'),
          ),
        ),
        const Size.square(CatchFieldTokens.stepperVisualExtent),
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump();
      expect(height, 169);

      final toggleFinder = find.byKey(const ValueKey('catch-field-toggle'));
      final toggleRectBeforeFocus = tester.getRect(toggleFinder);
      Focus.of(tester.element(toggleFinder)).requestFocus();
      await tester.pump();
      final focusDecoration =
          tester
                  .widget<DecoratedBox>(
                    find.byKey(
                      const ValueKey('catch-field-toggle-focus-outline'),
                    ),
                  )
                  .decoration
              as BoxDecoration;
      expect(
        focusDecoration.border?.top.width,
        CatchFieldTokens.focusRingWidth,
      );
      expect(tester.getRect(toggleFinder), toggleRectBeforeFocus);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump();
      expect(visible, isTrue);
    },
  );

  testWidgets('CatchField control blank space does not toggle its row', (
    tester,
  ) async {
    final openChanges = <bool>[];

    await tester.pumpWidget(
      _wrap(
        CatchField.control(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Height',
          disclosureMode: CatchFieldMode.localExpanded,
          onOpenChanged: openChanges.add,

          onCancel: () {},
          onSubmit: () {},
          child: const SizedBox(height: 80, child: Text('Height control')),
        ),
      ),
    );

    final barrierRect = tester.getRect(
      find.byKey(const ValueKey('catch-field-control-tap-barrier')),
    );
    await tester.tapAt(Offset(barrierRect.left + 4, barrierRect.top + 60));
    await _pumpCatchFieldMotion(tester);

    expect(openChanges, isEmpty);
    expect(find.text('Height control'), findsOneWidget);
  });

  testWidgets('CatchField control keyboard events do not toggle its row', (
    tester,
  ) async {
    final controlFocus = FocusNode();
    addTearDown(controlFocus.dispose);
    final openChanges = <bool>[];

    await tester.pumpWidget(
      _wrap(
        CatchField.control(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Height',
          disclosureMode: CatchFieldMode.controlledExpanded,
          onOpenChanged: openChanges.add,
          child: Focus(
            focusNode: controlFocus,
            child: const SizedBox(height: 44, child: Text('Height control')),
          ),
        ),
      ),
    );

    controlFocus.requestFocus();
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    await _pumpCatchFieldMotion(tester);

    expect(openChanges, isEmpty);
    expect(find.text('Height control'), findsOneWidget);
  });

  testWidgets(
    'CatchField.toggle pins value, callback, disabled semantics, and tone',
    (tester) async {
      var value = false;
      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CatchField.toggle(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Show pace',
                  body: 'Visible on your profile',
                  value: value,
                  emphasis: CatchFieldEmphasis.title,
                  tone: CatchFieldTone.danger,
                  onChanged: (next) => setState(() => value = next),
                ),
                CatchField.toggle(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Locked preference',
                  value: true,
                  onChanged: null,
                ),
              ],
            ),
          ),
        ),
      );

      Semantics toggleSemantics(String label) => tester.widget<Semantics>(
        find
            .byWidgetPredicate(
              (widget) =>
                  widget is Semantics &&
                  widget.properties.label == label &&
                  widget.properties.toggled != null,
            )
            .first,
      );

      expect(toggleSemantics('Show pace').properties.toggled, isFalse);
      await tester.tap(find.text('Show pace'));
      await tester.pump();
      expect(value, isTrue);
      expect(toggleSemantics('Show pace').properties.toggled, isTrue);

      final title = tester.widget<Text>(find.text('Show pace'));
      expect(title.style?.color, CatchTokens.editorialLight.danger);
      expect(toggleSemantics('Locked preference').properties.enabled, isFalse);
    },
  );

  testWidgets('CatchField.toggle renders helper and badge slots', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField.toggle(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Live guide',
          body: 'Enable the run-of-show companion.',
          helperText: 'You can change this before the event.',
          badgeLabel: 'Recommended',
          badgeTone: CatchBadgeTone.success,
          value: true,
          onChanged: null,
        ),
      ),
    );

    expect(find.text('You can change this before the event.'), findsOneWidget);
    final badge = tester.widget<CatchBadge>(
      find.widgetWithText(CatchBadge, 'Recommended'),
    );
    expect(badge.tone, CatchBadgeTone.success);
  });

  for (final scale in [1.3, 2.0]) {
    testWidgets('CatchField toggle remains usable at ${scale}x text', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 280,
            child: CatchField.toggle(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Show running pace on my public event profile',
              body: 'Visible to other participants before the event.',
              value: true,
              onChanged: null,
            ),
          ),
          textScale: scale,
        ),
      );

      expect(tester.takeException(), isNull);
      expectMinimumAccessibleTarget(
        tester,
        find.byWidgetPredicate(
          (widget) =>
              widget is Semantics &&
              widget.properties.label ==
                  'Show running pace on my public event profile' &&
              widget.properties.toggled != null,
        ),
      );
    });
  }

  testWidgets('CatchField toggle lanes mirror in RTL', (tester) async {
    await tester.pumpWidget(
      _wrap(
        Directionality(
          textDirection: TextDirection.rtl,
          child: SizedBox(
            width: 280,
            child: CatchField.toggle(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Show pace',
              value: true,
              onChanged: null,
            ),
          ),
        ),
      ),
    );

    expect(
      tester.getCenter(find.byType(CatchToggleInput)).dx,
      lessThan(tester.getCenter(find.text('Show pace')).dx),
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
