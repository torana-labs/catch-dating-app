import 'package:catch_dating_app/hosts/presentation/widgets/host_event_roster_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final width in [390.0, 1440.0]) {
    testWidgets('ordinary roster pane exposes content and commands at $width', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = Size(width, 1000);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      var closed = false;
      var messaged = false;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: MediaQuery(
            data: MediaQueryData(
              size: Size(width, 1000),
              textScaler: const TextScaler.linear(1.5),
            ),
            child: HostEventRosterSection(
              bookedCount: 3,
              onClose: () => closed = true,
              onMessageGuests: () => messaged = true,
              child: ListView(children: const [Text('Roster content')]),
            ),
          ),
        ),
      );
      await tester.pump();
      expect(find.text('Roster content'), findsOneWidget);
      expect(find.text('3 booked guests'), findsOneWidget);
      await tester.tap(find.byTooltip('Message guests'));
      await tester.pump();
      expect(messaged, isTrue);
      await tester.tap(find.byTooltip('Close guest roster'));
      await tester.pump();
      expect(closed, isTrue);
      expect(tester.takeException(), isNull);
    });
  }
}
