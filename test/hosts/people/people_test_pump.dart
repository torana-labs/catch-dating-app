import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// The phone the People boards are drawn on.
const peoplePhone = Size(390, 2400);

/// The window the People desktop board is drawn on.
const peopleDesktop = Size(1440, 900);

/// Pumps one provider-free People body inside a screen at [size].
Future<void> pumpPeopleBody(
  WidgetTester tester,
  Widget body, {
  Size size = peoplePhone,
  CatchDock? dock,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final expanded = size.width >= 1024;
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        child: CatchScreen(bodyScrolls: !expanded, body: body, dock: dock),
      ),
    ),
  );
  await tester.pump();
}
