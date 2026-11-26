import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_body.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('a save the phone could not confirm waits above the defaults '
      'with Retry, and nothing else changes until it goes through', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final saved = <ManagerEventSetupPreferences>[];
    var retries = 0;
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: CatchRoot(
          child: CatchScreen(
            bodyScrolls: false,
            body: HostEventDefaultsBody(
              state: const HostEventDefaultsState(
                status: HostEventDefaultsStatus.ready,
                preferences: ManagerEventSetupPreferences(
                  refundPolicy: 'flexible',
                ),
              ),
              onCollection: (_) {},
              onChange: saved.add,
              onRetryUpdate: () => retries++,
              onEdit: () {},
              onEditPolicy: () {},
              onRetry: () {},
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Previous defaults save unresolved'), findsOneWidget);
    await tester.tap(find.text('No refunds'));
    expect(saved, isEmpty);
    await tester.tap(find.text('Retry previous defaults save'));
    expect(retries, 1);
  });
}
