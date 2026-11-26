import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_grid.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_membership_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_setup_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/hosts/programmes/lodging/host_programme_lodging_use_cases.dart';

void main() {
  final cases = <(Type, WidgetBuilder)>[
    (HostProgrammeLodgingScreen, hostProgrammeLodgingScreenUseCase),
    (HostProgrammeLodgingBody, hostProgrammeLodgingBodyUseCase),
    (HostProgrammeLodgingGrid, hostProgrammeLodgingGridUseCase),
    (
      HostProgrammeLodgingMembershipBody,
      hostProgrammeLodgingMembershipBodyUseCase,
    ),
    (HostProgrammeLodgingSetupBody, hostProgrammeLodgingSetupBodyUseCase),
  ];

  for (final (type, builder) in cases) {
    for (final size in const [Size(390, 1600), Size(1440, 1100)]) {
      testWidgets('$type use case renders at ${size.width}', (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = size;
        addTearDown(tester.view.reset);
        for (final theme in [AppTheme.light, AppTheme.dark]) {
          await tester.pumpWidget(
            MaterialApp(
              theme: theme,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              home: Builder(builder: builder),
            ),
          );
          await tester.pump();
          await tester.pump();
          expect(tester.takeException(), isNull);
          expect(find.byType(type), findsOneWidget);
        }
        await tester.pumpWidget(const SizedBox.shrink());
      });
    }
  }
}
