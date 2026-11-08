import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const plannerPhone = Size(390, 2400);
const plannerDesktop = Size(1440, 900);

/// Pumps one provider-free planner body inside a screen at [size].
Future<void> pumpPlannerBody(
  WidgetTester tester,
  Widget body, {
  Size size = plannerPhone,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(child: CatchScreen(bodyScrolls: false, body: body)),
    ),
  );
  await tester.pump();
}
