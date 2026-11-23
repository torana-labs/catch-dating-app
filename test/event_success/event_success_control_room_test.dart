import 'package:catch_dating_app/hosts/live/live_screen.dart';
import 'package:catch_dating_app/pages/live_room/event_success_room_map.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import '../ui_captures/catalog/screen_capture_catalog.dart'
    show findScreenCapture;

void main() {
  testWidgets(
    'a seated night opens the rebuilt console, whose Room shows the seat map',
    (tester) async {
      tester.view.physicalSize = const Size(430, 2400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final fixture = findScreenCapture('host_live_room_workspace');
      await tester.pumpWidget(
        ProviderScope(
          overrides: [...fixture.providerOverrides],
          child: MaterialApp(
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(body: Builder(builder: fixture.builder)),
          ),
        ),
      );
      // A saved room layout opens the rebuilt console.
      await pumpUntilFound(tester, find.byType(HostLiveScreen));
      await pumpUntilFound(tester, find.text('Room'));
      await tester.tap(find.text('Room'));
      await pumpUntilFound(tester, find.byType(EventSuccessRoomMap));
      await tester.pump();
      final map = tester.widget<EventSuccessRoomMap>(
        find.byType(EventSuccessRoomMap),
      );
      expect(map.assignments, isNotEmpty);
      expect(map.onReassign, isNotNull);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await fixture.cleanup?.call(tester);
    },
  );
}
