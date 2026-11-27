import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _boxKey = ValueKey<String>('catch-field-input-box');

void main() {
  testWidgets('an empty input draws its label above a bordered box', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField.input(
          copy: _copy,
          title: 'Name',
          inputHint: 'Tuesday trivia night',
        ),
      ),
    );

    expect(find.text('Name'), findsOneWidget);
    expect(find.text('Add Name'), findsNothing);
    expect(find.text('Tuesday trivia night'), findsOneWidget);

    final box = find.byKey(_boxKey);
    expect(box, findsOneWidget);
    final boxRect = tester.getRect(box);
    expect(boxRect.height, CatchFieldTokens.boxMinHeight);
    expect(
      tester.getBottomLeft(find.text('Name')).dy + CatchFieldTokens.boxLabelGap,
      closeTo(boxRect.top, 0.5),
    );
    expect(boxRect.contains(tester.getCenter(find.byType(TextField))), isTrue);

    final decoration = _decoration(tester);
    final border = decoration.border! as Border;
    expect(border.top.color, CatchTokens.light.fieldLine);
    expect(border.top.width, CatchFieldTokens.boxBorderWidth);
    expect(
      decoration.borderRadius,
      BorderRadius.circular(CatchFieldTokens.boxRadius),
    );
    expect(decoration.color, CatchTokens.light.ground);

    final label = tester.widget<Text>(find.text('Name'));
    expect(label.style?.fontSize, 14);
    expect(label.style?.fontWeight, FontWeight.w600);
    expect(label.style?.color, CatchTokens.light.ink);
  });

  testWidgets('an optional label fits a narrow lane at double text', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(2)),
          child: Align(
            alignment: AlignmentDirectional.topStart,
            child: SizedBox(
              width: 143,
              child: CatchField.input(
                copy: _copy,
                title: 'Price per place',
                titleMaxLines: 2,
                labelMode: CatchFieldLabelTextMode.optional,
              ),
            ),
          ),
        ),
      ),
    );

    // The name keeps its room; the qualifier shortens instead of overflowing.
    expect(tester.takeException(), isNull);
    expect(find.text('Price per place'), findsOneWidget);
  });

  testWidgets('focus draws the border in ink and an error in danger', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(CatchField.input(copy: _copy, title: 'Name')),
    );

    await tester.tap(find.byType(TextField));
    await tester.pumpAndSettle();
    expect(_borderColor(tester), CatchTokens.light.ink);

    await tester.pumpWidget(
      _wrap(
        CatchField.input(copy: _copy, title: 'Name', error: 'Name the event.'),
      ),
    );
    await tester.pumpAndSettle();
    expect(_borderColor(tester), CatchTokens.light.danger);
    expect(
      tester.getTopLeft(find.text('Name the event.')).dy,
      greaterThan(tester.getRect(find.byKey(_boxKey)).bottom),
    );
  });

  testWidgets('a multiline input pads its box and keeps the canvas line', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField.input(
          copy: _copy,
          title: 'What is it like?',
          minLines: 3,
          maxLines: 5,
        ),
      ),
    );

    final box = tester.widget<AnimatedContainer>(find.byKey(_boxKey));
    expect(
      box.padding,
      const EdgeInsets.symmetric(
        horizontal: CatchFieldTokens.boxHorizontalPadding,
        vertical: CatchFieldTokens.boxMultilineVerticalPadding,
      ),
    );
    final editable = tester.widget<EditableText>(find.byType(EditableText));
    expect(
      editable.style.fontSize! * editable.style.height!,
      closeTo(CatchFieldTokens.boxMultilineLineExtent, 0.01),
    );
  });

  testWidgets('clear and leading slots sit inside the box', (tester) async {
    await tester.pumpWidget(
      _wrap(
        CatchField.input(
          copy: _copy,
          title: 'Venue',
          initialValue: 'Harbour hall',
          leading: Icon(CatchIcons.location),
          showClearButton: true,
        ),
      ),
    );

    final boxRect = tester.getRect(find.byKey(_boxKey));
    expect(
      boxRect.contains(tester.getCenter(find.byIcon(CatchIcons.location))),
      isTrue,
    );
    expect(
      boxRect.contains(tester.getCenter(find.byTooltip('Clear Venue'))),
      isTrue,
    );
  });

  testWidgets('field sections leave out dividers and bands around boxes', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchSection.fieldRows(
          children: [
            CatchField.input(copy: _copy, title: 'Name'),
            CatchField.input(copy: _copy, title: 'Venue'),
          ],
        ),
      ),
    );
    final inputDividers = find.byType(CatchDivider).evaluate().length;

    await tester.pumpWidget(
      _wrap(
        CatchSection.fieldRows(
          children: [
            CatchField.read(copy: _copy, title: 'Name', body: 'Trivia'),
            CatchField.read(copy: _copy, title: 'Venue', body: 'Harbour'),
          ],
        ),
      ),
    );
    final readDividers = find.byType(CatchDivider).evaluate().length;
    expect(inputDividers, readDividers - 1);

    await tester.pumpWidget(
      _wrap(
        CatchSection.fieldRows(
          children: [CatchField.input(copy: _copy, title: 'Name')],
        ),
      ),
    );
    await tester.tap(find.byType(TextField));
    await tester.pumpAndSettle();
    expect(
      find.byKey(const ValueKey('catch-field-active-overlay')),
      findsNothing,
    );
    expect(find.byKey(CatchField.pressOverlayKey), findsNothing);
  });

  testWidgets('the box fill follows the ground it sits on', (tester) async {
    await tester.pumpWidget(
      _wrap(CatchField.input(copy: _copy, title: 'Name'), dark: true),
    );
    expect(_decoration(tester).color, CatchTokens.dark.ground);
    expect(_borderColor(tester), CatchTokens.dark.fieldLine);

    await tester.pumpWidget(
      _wrap(
        CatchRootScope(
          data: const CatchRootScopeData(
            theme: CatchThemeMode.day,
            sizeClass: CatchWindowSize.compact,
            ground: CatchGround.tile,
          ),
          child: CatchField.input(copy: _copy, title: 'Name'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(_decoration(tester).color, CatchTokens.light.nested);

    await tester.pumpWidget(
      _wrap(
        CatchRootScope(
          data: const CatchRootScopeData(
            theme: CatchThemeMode.night,
            sizeClass: CatchWindowSize.compact,
            ground: CatchGround.nightTile,
          ),
          child: CatchField.input(copy: _copy, title: 'Name'),
        ),
        dark: true,
      ),
    );
    await tester.pumpAndSettle();
    expect(_decoration(tester).color, CatchTokens.dark.nested);
  });

  testWidgets('explicit-save and bare inputs keep their own chrome', (
    tester,
  ) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);
    await tester.pumpWidget(
      _wrap(
        Column(
          children: [
            CatchField.input(
              copy: _copy,
              title: 'Message',
              labelMode: CatchFieldLabelTextMode.hidden,
              variant: CatchFieldVariant.bare,
            ),
            CatchField.inputActions(
              copy: _copy,
              title: 'Prompt',
              controller: controller,
              open: false,
              onOpenChanged: (_) {},
              onCancel: () {},
              onSubmit: () {},
            ),
          ],
        ),
      ),
    );

    expect(find.byKey(_boxKey), findsNothing);
  });
}

BoxDecoration _decoration(WidgetTester tester) =>
    tester.widget<AnimatedContainer>(find.byKey(_boxKey)).decoration!
        as BoxDecoration;

Color _borderColor(WidgetTester tester) =>
    (_decoration(tester).border! as Border).top.color;

Widget _wrap(Widget child, {bool dark = false}) => MaterialApp(
  theme: dark ? CatchTheme.dark : CatchTheme.light,
  home: Scaffold(
    body: Padding(padding: const EdgeInsets.all(CatchSpacing.s5), child: child),
  ),
);

String _label(String value) => value;
String _nullableLabel(String? value) => value == null ? '' : 'Clear $value';
String _length(String label, int length) => '$label $length';
const _copy = CatchFieldCopy(
  label: CatchFieldLabelTextCopy(
    optionalLabel: 'Optional',
    optionalSuffix: ' Optional',
    optionalSemantics: _label,
  ),
  validation: CatchFormValidationCopy(
    requiredMessage: _label,
    minLengthMessage: _length,
    maxLengthMessage: _length,
    patternMessage: _label,
  ),
  cancelLabel: 'Cancel',
  doneLabel: 'Done',
  savingLabel: 'Saving',
  savingSemanticLabel: 'Saving',
  savedSemanticLabel: 'Saved',
  emptyValueText: _label,
  selectPlaceholder: _nullableLabel,
  clearTooltip: _nullableLabel,
);
