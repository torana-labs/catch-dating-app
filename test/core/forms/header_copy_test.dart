import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _app(Widget child, {double scale = 1}) => MaterialApp(
  theme: CatchTheme.light,
  home: Builder(
    builder: (context) => MediaQuery(
      data: MediaQuery.of(
        context,
      ).copyWith(textScaler: TextScaler.linear(scale)),
      child: Scaffold(body: child),
    ),
  ),
);

void main() {
  test('app formatters preserve full and compact catalog counters', () {
    final l10n = AppLocalizationsEn();
    expect(
      catchStepHeaderLabelBuilder(l10n)(2, 5),
      l10n.coreCatchStepFlowHeaderTextStepClampedstepOfTotal(
        clampedStep: 2,
        total: 5,
      ),
    );
    expect(
      catchStepHeaderCompactLabelBuilder(l10n)(2, 5),
      l10n.coreCatchStepFlowHeaderTextCompactStepClampedstepTotal(
        clampedStep: 2,
        total: 5,
      ),
    );
  });

  for (final scale in [1.0, 2.0]) {
    testWidgets(
      'caller counter copy preserves progress and semantics at $scale',
      (tester) async {
        var selected = false;
        await tester.pumpWidget(
          _app(
            CatchStepHeader(
              title: 'Location',
              step: 9,
              total: 3,
              showBack: false,
              stepLabelBuilder: (step, total) => 'ÉTAPE $step SUR $total',
              compactStepLabelBuilder: (step, total) => '$step/$total',
              onStepOverview: () => selected = true,
            ),
            scale: scale,
          ),
        );

        final visible = scale == 1 ? 'ÉTAPE 3 SUR 3' : '3/3';
        expect(find.text(visible), findsOneWidget);
        expect(find.bySemanticsLabel('ÉTAPE 3 SUR 3'), findsOneWidget);
        expect(
          tester
              .widget<FractionallySizedBox>(
                find.descendant(
                  of: find.byType(CatchStepHeader),
                  matching: find.byType(FractionallySizedBox),
                ),
              )
              .widthFactor,
          1,
        );
        await tester.tap(find.text(visible));
        expect(selected, isTrue);
      },
    );
  }

  testWidgets('a header without progress never requests counter copy', (
    tester,
  ) async {
    String unexpectedCounter(int step, int total) =>
        throw StateError('A non-progress header has no counter.');
    await tester.pumpWidget(
      _app(
        CatchStepHeader(
          title: 'Finished',
          showBack: false,
          stepLabelBuilder: unexpectedCounter,
          compactStepLabelBuilder: unexpectedCounter,
        ),
      ),
    );
    expect(find.text('Finished'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  for (final interactive in [false, true]) {
    testWidgets('identity label follows caller and interaction $interactive', (
      tester,
    ) async {
      var opened = false;
      await tester.pumpWidget(
        _app(
          CatchTopBar.identity(
            identityName: 'Camille',
            identitySemanticLabel: 'Ouvrir le profil de Camille',
            onIdentityTap: interactive ? () => opened = true : null,
            navigation: const CatchTopBarNavigation(
              mode: CatchTopBarNavigationMode.none,
            ),
          ),
        ),
      );
      expect(find.text('Camille'), findsOneWidget);
      expect(
        find.bySemanticsLabel(RegExp('Ouvrir le profil de Camille')),
        interactive ? findsOneWidget : findsNothing,
      );
      if (interactive) {
        await tester.tap(find.text('Camille'));
        expect(opened, isTrue);
      }
    });
  }
}
