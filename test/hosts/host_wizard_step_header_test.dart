import 'package:catch_dating_app/hosts/presentation/widgets/host_wizard_step_header.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _app(Widget child) => MaterialApp(
  theme: AppTheme.light,
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: Scaffold(body: child),
);

void main() {
  testWidgets('club wizard keeps nullable context and one-based progress', (
    tester,
  ) async {
    await tester.pumpWidget(
      _app(
        const HostWizardStepHeader(
          title: 'Club basics',
          subtitle: null,
          currentStep: 0,
          totalSteps: 4,
        ),
      ),
    );

    expect(find.text('Club basics'), findsOneWidget);
    expect(find.text('STEP 1 OF 4'), findsOneWidget);
    expect(
      tester.widget<CatchStepHeader>(find.byType(CatchStepHeader)).step,
      1,
    );
    expect(find.byIcon(CatchIcons.close), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('event review hides progress and keeps the close action', (
    tester,
  ) async {
    var closes = 0;
    await tester.pumpWidget(
      _app(
        HostWizardStepHeader(
          title: 'Review event',
          subtitle: 'The club',
          currentStep: 4,
          totalSteps: 5,
          isReviewing: true,
          onClose: () => closes++,
          onStepOverview: () => fail('Review must hide the step overview'),
        ),
      ),
    );

    expect(find.text('Review event'), findsOneWidget);
    expect(find.text('The club'), findsOneWidget);
    expect(find.textContaining('STEP'), findsNothing);
    expect(
      tester.widget<CatchStepHeader>(find.byType(CatchStepHeader)).step,
      isNull,
    );
    await tester.tap(find.byIcon(CatchIcons.close));
    expect(closes, 1);
    expect(tester.takeException(), isNull);
  });
}
