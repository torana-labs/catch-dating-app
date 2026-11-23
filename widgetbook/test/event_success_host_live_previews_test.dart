import 'package:catch_dating_app/event_success/presentation/host_components/event_success_compatibility_section.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/event_success/host_live_components_use_cases.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    for (final (builder, type, count) in <(WidgetBuilder, Type, int)>[
      (
        eventSuccessStrictCompatibilitySignalHostCard,
        EventSuccessCompatibilitySection,
        1,
      ),
    ]) {
      testWidgets('$type mounts at text scale $scale', (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(860, 2400);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        for (final theme in [AppTheme.light, AppTheme.dark]) {
          await tester.pumpWidget(
            MaterialApp(
              theme: theme,
              localizationsDelegates: const [
                AppLocalizations.delegate,
                ...GlobalMaterialLocalizations.delegates,
              ],
              supportedLocales: AppLocalizations.supportedLocales,
              home: Scaffold(
                body: Builder(
                  builder: (context) => MediaQuery(
                    data: MediaQuery.of(context).copyWith(
                      textScaler: TextScaler.linear(scale),
                      disableAnimations: true,
                    ),
                    child: TickerMode(
                      enabled: false,
                      child: Builder(builder: builder),
                    ),
                  ),
                ),
              ),
            ),
          );
          await pumpFeatureUi(tester);
          expect(tester.takeException(), isNull);
          expect(find.byType(type), findsNWidgets(count));
          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pump();
        }
      });
    }
  }
}
