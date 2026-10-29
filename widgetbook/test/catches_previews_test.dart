import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_body.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/catches/catalog/profile_sections.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    for (final (name, builder, type, count)
        in <(String, WidgetBuilder, Type, int)>[
          ('running profile', profileRunningStates, ProfileRunningSection, 1),
        ]) {
      testWidgets('$name preview fits its content at text scale $scale', (
        tester,
      ) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(1000, 2000);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        for (final theme in [AppTheme.light, AppTheme.dark]) {
          await tester.pumpWidget(
            MaterialApp(
              theme: theme,
              home: MediaQuery(
                data: MediaQueryData(
                  textScaler: TextScaler.linear(scale),
                  disableAnimations: true,
                ),
                child: TickerMode(
                  enabled: false,
                  child: Builder(builder: builder),
                ),
              ),
            ),
          );
          await tester.pump();
          expect(tester.takeException(), isNull);
          expect(find.byType(type), findsNWidgets(count));
        }
      });
    }
  }
}
