import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/hosts/host_event_offer_use_cases.dart';
import 'package:widgetbook_workspace/hosts/host_response_review_use_cases.dart';

import '../../test/test_pump_helpers.dart';

void main() {
  for (final (name, builder) in <(String, WidgetBuilder)>[
    ('response route', responseReviewScreenPreview),
    ('application link', responseReviewApplicationPreview),
    ('detail sections', responseReviewSectionsPreview),
    ('contact actions', responseReviewContactsPreview),
    ('primary action', responseReviewPrimaryPreview),
    ('start review', responseReviewStartPreview),
    ('answer', responseReviewAnswerPreview),
    ('metadata', responseReviewMetadataPreview),
  ]) {
    testWidgets('$name preview renders both themes and large text', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(402, 874);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      for (final theme in [AppTheme.light, AppTheme.dark]) {
        for (final scale in [1.0, 2.0]) {
          await tester.pumpWidget(
            MaterialApp(
              theme: theme,
              home: MediaQuery(
                data: MediaQueryData(
                  textScaler: TextScaler.linear(scale),
                  disableAnimations: true,
                ),
                child: Scaffold(body: Builder(builder: builder)),
              ),
            ),
          );
          await pumpFeatureUi(tester);
          expect(tester.takeException(), isNull);
        }
      }
    });
  }

  testWidgets('prepared offer preview owns its theme during async setup', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Builder(builder: hostOfferPrepared),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Preparing offer'), findsNothing);
    expect(find.text('Preview offers'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
