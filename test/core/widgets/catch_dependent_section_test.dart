import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';

final _copy = catchFieldCopy(AppLocalizationsEn());
const _control = ValueKey('dependency-control');
const _dependent = ValueKey('dependency-child');

Widget _host(Widget child, {bool dark = false, double scale = 1}) =>
    MaterialApp(
      theme: dark ? CatchTheme.dark : CatchTheme.light,
      home: Scaffold(
        body: MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(scale)),
          child: Align(
            alignment: Alignment.topLeft,
            child: SizedBox(
              width: 390,
              child: SingleChildScrollView(
                child: Padding(padding: const EdgeInsets.all(20), child: child),
              ),
            ),
          ),
        ),
      ),
    );

CatchField _decision({bool enabled = true, ValueChanged<bool>? onChanged}) =>
    CatchField.toggle(
      key: _control,
      copy: _copy,
      title: 'Reserve places for pairs',
      emphasis: CatchFieldEmphasis.title,
      titleMaxLines: 4,
      body: 'Keep part of the capacity available for people booking together.',
      bodyMaxLines: 8,
      value: enabled,
      contractExemption: 'Fixture models a local configuration decision.',
      onChanged: onChanged ?? (_) {},
    );

void main() {
  setUpAll(loadCatchTestFonts);
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('attached geometry dark=$dark scale=$scale', (tester) async {
        var activated = 0;
        await tester.pumpWidget(
          _host(
            CatchSection.dependentFieldRows(
              leading: _decision(),
              footer: const Text('All remaining places stay available.'),
              children: [
                CatchField.navigate(
                  key: _dependent,
                  content: CatchRecordLayout(
                    title:
                        'Maximum places reserved for people booking together',
                    icon: CatchIcons.people,
                    facts: const ['Four places out of twenty'],
                  ),
                  onActivate: () => activated++,
                ),
              ],
            ),
            dark: dark,
            scale: scale,
          ),
        );
        await pumpFeatureUi(tester);
        expect(find.byType(CatchSectionSurface), findsOneWidget);
        expect(find.byKey(CatchSectionSurface.rowGroupClipKey), findsOneWidget);
        expect(find.byType(CatchDivider), findsNothing);
        final control = tester.getRect(find.byKey(_control));
        final child = tester.getRect(find.byKey(_dependent));
        expect(control.bottom, child.top);
        expect(child.left, control.left);
        expect(child.right, control.right);
        final tint = find
            .ancestor(
              of: find.byKey(_dependent),
              matching: find.byType(ColoredBox),
            )
            .first;
        final tokens = CatchTokens.of(tester.element(find.byKey(_dependent)));
        expect(tester.widget<ColoredBox>(tint).color, tokens.bg);
        expect(tokens.bg, isNot(tokens.surface));
        expect(tester.getRect(tint).top, control.bottom);
        for (final paragraph in tester.renderObjectList<RenderParagraph>(
          find.byType(RichText),
        )) {
          expect(
            paragraph.didExceedMaxLines,
            isFalse,
            reason: paragraph.text.toPlainText(),
          );
        }
        await tester.ensureVisible(find.byKey(_dependent));
        await pumpFeatureUi(tester);
        final target = tester.getRect(find.byKey(_dependent));
        await tester.tapAt(Offset(target.left + 2, target.center.dy));
        await pumpFeatureUi(tester);
        await tester.tapAt(Offset(target.right - 2, target.center.dy));
        await pumpFeatureUi(tester);
        expect(activated, 2);
        final pointer = await tester.createGesture(
          kind: PointerDeviceKind.mouse,
        );
        await pointer.addPointer(location: target.center);
        await pumpFeatureUi(tester);
        final overlay = find.descendant(
          of: find.byKey(_dependent),
          matching: find.byKey(CatchField.pressOverlayKey),
        );
        expect(tester.getRect(overlay), target);
        final paint =
            tester.widget<AnimatedContainer>(overlay).decoration!
                as BoxDecoration;
        expect(paint.borderRadius, BorderRadius.zero);
        final clip = tester.widget<ClipRRect>(
          find.byKey(CatchSectionSurface.rowGroupClipKey),
        );
        expect(
          clip.borderRadius,
          BorderRadius.circular(CatchFieldTokens.sectionRadius),
        );
        await pointer.removePointer();
        expect(tester.takeException(), isNull);
      });
    }
  }

  testWidgets(
    'inactive branch removes validation and semantics but retains draft',
    (tester) async {
      final controller = TextEditingController(text: 'retained');
      final form = GlobalKey<FormState>();
      var enabled = true;
      var validations = 0;
      late StateSetter rebuild;
      final semantics = tester.ensureSemantics();
      await tester.pumpWidget(
        _host(
          StatefulBuilder(
            builder: (context, setState) {
              rebuild = setState;
              return Form(
                key: form,
                child: CatchSection.dependentFieldRows(
                  leading: _decision(
                    enabled: enabled,
                    onChanged: (value) => setState(() => enabled = value),
                  ),
                  children: [
                    if (enabled)
                      CatchField.input(
                        key: _dependent,
                        copy: _copy,
                        title: 'Reserved places',
                        controller: controller,
                        contractExemption:
                            'Fixture checks applicability validation.',
                        onValidate: (_) {
                          validations++;
                          return 'Invalid draft';
                        },
                      ),
                  ],
                ),
              );
            },
          ),
        ),
      );
      expect(form.currentState!.validate(), isFalse);
      expect(validations, greaterThan(0));
      validations = 0;
      rebuild(() => enabled = false);
      await pumpFeatureUi(tester);
      expect(find.byKey(_dependent), findsNothing);
      expect(find.bySemanticsLabel('Reserved places'), findsNothing);
      expect(form.currentState!.validate(), isTrue);
      expect(validations, 0);
      expect(controller.text, 'retained');
      rebuild(() => enabled = true);
      await pumpFeatureUi(tester);
      expect(find.byKey(_dependent), findsOneWidget);
      expect(controller.text, 'retained');
      expect(form.currentState!.validate(), isFalse);
      semantics.dispose();
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    },
  );

  testWidgets('no dependents leaves only the decision and one perimeter', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        CatchSection.dependentFieldRows(leading: _decision(enabled: false)),
      ),
    );
    expect(find.byType(CatchSectionSurface), findsOneWidget);
    expect(find.byType(CatchField), findsOneWidget);
    expect(find.byType(CatchDivider), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
