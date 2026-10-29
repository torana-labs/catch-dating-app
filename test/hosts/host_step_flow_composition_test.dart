import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_route_loading_screen.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('event editor loading uses the canonical step-flow surface', (
    tester,
  ) async {
    await _pump(tester, const HostCreateEventRouteLoadingScreen());

    expect(find.byType(CatchScaffold), findsOneWidget);
    expect(find.text('Event basics'), findsOneWidget);
  });
}

Future<void> _pump(WidgetTester tester, Widget child) {
  return tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: child,
    ),
  );
}
