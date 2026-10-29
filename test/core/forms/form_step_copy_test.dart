import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

const _items = [
  CatchFormStepReviewItem(
    index: 0,
    title: 'Basics',
    status: CatchFormStepListStatus.complete,
  ),
  CatchFormStepReviewItem(
    index: 1,
    title: 'Location',
    status: CatchFormStepListStatus.needsInformation,
  ),
  CatchFormStepReviewItem(
    index: 2,
    title: 'Notes',
    status: CatchFormStepListStatus.optional,
  ),
];

String _statusLabel(CatchFormStepListStatus status) => switch (status) {
  CatchFormStepListStatus.complete => 'Terminé',
  CatchFormStepListStatus.needsInformation => 'À compléter',
  CatchFormStepListStatus.optional => 'Facultatif',
};

Widget _app(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(body: child),
);

void main() {
  test('app status formatter preserves the catalog labels', () {
    final l10n = AppLocalizationsEn();
    final label = catchFormStepStatusLabelBuilder(l10n);
    expect(
      label(CatchFormStepListStatus.complete),
      l10n.hostsWizardStatusComplete,
    );
    expect(
      label(CatchFormStepListStatus.needsInformation),
      l10n.hostsWizardStatusNeedsInformation,
    );
    expect(
      label(CatchFormStepListStatus.optional),
      l10n.hostsWizardStatusOptional,
    );
  });

  testWidgets('overview renders caller labels and keeps section selection', (
    tester,
  ) async {
    int? selected;
    await tester.pumpWidget(
      _app(
        CatchFormStepList(
          fieldCopy: catchFieldCopy(AppLocalizationsEn()),
          items: _items,
          statusLabelBuilder: _statusLabel,
          onStepSelected: (index) => selected = index,
        ),
      ),
    );

    expect(find.text('TERMINÉ'), findsOneWidget);
    expect(find.text('À COMPLÉTER'), findsOneWidget);
    expect(find.text('FACULTATIF'), findsOneWidget);
    expect(find.text('COMPLETE'), findsNothing);
    await tester.tap(find.text('Location'));
    expect(selected, 1);
  });

  testWidgets('review body forwards labels and its selection callback', (
    tester,
  ) async {
    int? selected;
    await tester.pumpWidget(
      _app(
        CatchFormReviewPageBody(
          fieldCopy: catchFieldCopy(AppLocalizationsEn()),
          message: 'Review your details.',
          items: _items,
          statusLabelBuilder: _statusLabel,
          onStepSelected: (index) => selected = index,
        ),
      ),
    );

    expect(find.text('À COMPLÉTER'), findsOneWidget);
    await tester.tap(find.text('Notes'));
    expect(selected, 2);
  });

  testWidgets('overview sheet keeps caller copy and returns the chosen step', (
    tester,
  ) async {
    int? selected;
    await tester.pumpWidget(
      _app(
        Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              selected = await showCatchFormStepSheet(
                fieldCopy: catchFieldCopy(AppLocalizationsEn()),
                context: context,
                title: 'Sections',
                subtitle: 'Choose a section.',
                items: _items,
                statusLabelBuilder: _statusLabel,
              );
            },
            child: const Text('Open overview'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open overview'));
    await pumpFeatureUi(tester);
    expect(find.text('TERMINÉ'), findsOneWidget);
    await tester.tap(find.text('Location'));
    await pumpFeatureUi(tester);
    expect(selected, 1);
    expect(find.byType(CatchFormStepList), findsNothing);
  });
}
