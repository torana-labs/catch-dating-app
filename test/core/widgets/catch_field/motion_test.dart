import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../test_pump_helpers.dart';

void main() {
  testWidgets('CatchField input omits AnimatedSize under reduced motion', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: Scaffold(
            body: CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Why Catch?',
              maxLines: 5,
            ),
          ),
        ),
      ),
    );

    expect(
      find.descendant(
        of: find.byType(CatchField),
        matching: find.byType(AnimatedSize),
      ),
      findsNothing,
    );
  });

  testWidgets('CatchField explicit-save expansion animates before focus', (
    tester,
  ) async {
    final controller = TextEditingController(text: 'Catch me if you can');
    final focusNode = FocusNode();
    addTearDown(controller.dispose);
    addTearDown(focusNode.dispose);
    var expanded = false;
    late void Function(bool value) setExpanded;

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) {
            setExpanded = (value) => setState(() => expanded = value);
            return Align(
              alignment: Alignment.topCenter,
              child: SizedBox(
                width: 360,
                child: CatchField.inputActions(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  icon: CatchIcons.quote,
                  title: 'A perfect event with me looks like...',
                  controller: controller,
                  focusNode: focusNode,
                  open: expanded,
                  onOpenChanged: setExpanded,
                  meta: const Text('19 / 300'),
                  actions: const Text('Change prompt'),
                  onCancel: () => setExpanded(false),
                  onSubmit: () {},
                ),
              ),
            );
          },
        ),
      ),
    );

    final field = find.byType(CatchField);
    final collapsedHeight = tester.getSize(field).height;
    final anchoredTop = tester.getTopLeft(field).dy;
    final inputElement = tester.element(find.byType(TextField));

    setExpanded(true);
    await tester.pump();
    expect(focusNode.hasFocus, isFalse);
    await tester.pump(
      Duration(milliseconds: CatchMotion.base.inMilliseconds ~/ 2),
    );
    expect(focusNode.hasFocus, isFalse);
    final midpointHeight = tester.getSize(field).height;
    expect(midpointHeight, greaterThan(collapsedHeight));
    expect(tester.element(find.byType(TextField)), same(inputElement));
    final midpointSlide = tester.widget<Transform>(
      find.byKey(const ValueKey('catch-field-control-slide')),
    );
    expect(midpointSlide.transform.getTranslation().y, inExclusiveRange(0, 8));

    await tester.pump(
      Duration(milliseconds: CatchMotion.base.inMilliseconds ~/ 2),
    );
    expect(focusNode.hasFocus, isFalse);
    await pumpFeatureUi(tester);
    expect(focusNode.hasFocus, isTrue);
    expect(tester.element(find.byType(TextField)), same(inputElement));
    final expandedHeight = tester.getSize(field).height;
    expect(midpointHeight, lessThan(expandedHeight));
    expect(tester.getTopLeft(field).dy, anchoredTop);

    setExpanded(false);
    await tester.pump();
    await tester.pump(
      Duration(milliseconds: CatchMotion.base.inMilliseconds ~/ 2),
    );
    final collapsingHeight = tester.getSize(field).height;
    expect(collapsingHeight, greaterThan(collapsedHeight));
    expect(collapsingHeight, lessThan(expandedHeight));

    await tester.pump(
      Duration(milliseconds: CatchMotion.base.inMilliseconds ~/ 2),
    );
    await tester.pump();
    expect(tester.getSize(field).height, collapsedHeight);
    expect(tester.getTopLeft(field).dy, anchoredTop);
    expect(tester.takeException(), isNull);
  });
}

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: AppTheme.light,
    home: Scaffold(body: Center(child: child)),
  );
}
