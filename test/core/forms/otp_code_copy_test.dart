import 'package:catch_l10n/generated/app_localizations_en.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _app(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(body: child),
);

void main() {
  testWidgets(
    'visible code follows controller edits without a parent rebuild',
    (tester) async {
      final controller = TextEditingController(text: '12');
      addTearDown(controller.dispose);
      var callbacks = 0;
      await tester.pumpWidget(
        _app(
          CatchCodeInput(
            semanticsLabel: 'One-time code',
            controller: controller,
            onChanged: (_) => callbacks++,
            onSubmitted: (_) {},
          ),
        ),
      );
      expect(find.text('1'), findsOneWidget);
      controller.text = '34';
      await tester.pump();
      expect(find.text('1'), findsNothing);
      expect(find.text('3'), findsOneWidget);
      expect(find.text('4'), findsOneWidget);
      expect(callbacks, 0);
      controller.clear();
      await tester.pump();
      expect(find.text('3'), findsNothing);
      expect(find.byType(CatchCodeCaretIndicator), findsOneWidget);
    },
  );

  testWidgets('replacing the controller detaches the old code source', (
    tester,
  ) async {
    final old = TextEditingController(text: '12');
    final current = TextEditingController(text: '34');
    addTearDown(old.dispose);
    addTearDown(current.dispose);
    Widget frame(TextEditingController controller) => _app(
      CatchCodeInput(
        semanticsLabel: 'One-time code',
        controller: controller,
        onChanged: (_) {},
        onSubmitted: (_) {},
      ),
    );
    await tester.pumpWidget(frame(old));
    await tester.pumpWidget(frame(current));
    old.text = '56';
    current.text = '78';
    await tester.pump();
    expect(find.text('3'), findsNothing);
    expect(find.text('5'), findsNothing);
    expect(find.text('7'), findsOneWidget);
    expect(find.text('8'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    old.clear();
    current.clear();
    expect(tester.takeException(), isNull);
  });

  test('the app catalog preserves the existing OTP accessibility label', () {
    expect(
      AppLocalizationsEn().coreCatchOtpCodeFieldSemanticLabel,
      'One-time code',
    );
  });

  testWidgets(
    'caller label leaves paste, contract length and autofill intact',
    (tester) async {
      final controller = TextEditingController();
      addTearDown(controller.dispose);
      String? changed;
      String? submitted;
      await tester.pumpWidget(
        _app(
          StatefulBuilder(
            builder: (context, setState) => CatchCodeInput(
              semanticsLabel: 'Code à usage unique',
              inputKey: const ValueKey('otp-input'),
              contract: const CatchContractFieldConstraints(
                path: 'test.code',
                valueTypes: ['string'],
                minLength: 4,
                maxLength: 4,
              ),
              length: 6,
              controller: controller,
              autofocus: true,
              onChanged: (value) => setState(() => changed = value),
              onSubmitted: (value) => submitted = value,
            ),
          ),
        ),
      );

      expect(find.bySemanticsLabel('Code à usage unique'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('otp-input')),
        '1a2b3456',
      );
      await tester.pump();
      expect(changed, '1234');
      expect(controller.text, '1234');
      expect(find.byType(CatchCodeDigitSurface), findsNWidgets(4));
      expect(find.byKey(const ValueKey('otp_digit_3')), findsOneWidget);
      expect(find.byKey(const ValueKey('otp_digit_4')), findsNothing);
      expect(tester.widget<TextField>(find.byType(TextField)).autofillHints, [
        AutofillHints.oneTimeCode,
      ]);
      await tester.testTextInput.receiveAction(TextInputAction.done);
      expect(submitted, '1234');
    },
  );

  testWidgets(
    'new accessibility copy preserves controller and digit identities',
    (tester) async {
      final controller = TextEditingController(text: '12');
      addTearDown(controller.dispose);
      var label = 'One-time code';
      late StateSetter rebuild;
      await tester.pumpWidget(
        _app(
          StatefulBuilder(
            builder: (context, setState) {
              rebuild = setState;
              return CatchCodeInput(
                semanticsLabel: label,
                controller: controller,
                onChanged: (_) => setState(() {}),
                onSubmitted: (_) {},
              );
            },
          ),
        ),
      );
      final firstDigit = tester.element(
        find.byKey(const ValueKey('otp_digit_0')),
      );
      rebuild(() => label = 'Code à usage unique');
      await tester.pump();
      final spokenLabel = tester
          .getSemantics(find.byType(CatchCodeInput))
          .label;
      expect(spokenLabel, startsWith('Code à usage unique'));
      expect(spokenLabel, isNot(contains('One-time code')));
      expect(controller.text, '12');
      expect(
        tester.element(find.byKey(const ValueKey('otp_digit_0'))),
        same(firstDigit),
      );
    },
  );
}
