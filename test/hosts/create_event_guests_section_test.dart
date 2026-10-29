import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/create_event_guests_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  for (final source in ['', 'https://lu.ma/dinner', 'http://lu.ma/dinner']) {
    testWidgets('optional booking details remain toggleable: $source', (
      tester,
    ) async {
      final url = TextEditingController(text: source);
      final id = TextEditingController();
      addTearDown(url.dispose);
      addTearDown(id.dispose);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: SingleChildScrollView(
              child: CreateEventGuestsSection(
                externalEventUrlController: url,
                externalEventIdController: id,
                autovalidateMode: AutovalidateMode.always,
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      final expanded = source.startsWith('http:');
      expect(
        find.byKey(CreateEventFormKeys.externalEventUrl),
        expanded ? findsOneWidget : findsNothing,
      );
      final toggle = find.byKey(
        const ValueKey('host.create_event.booking_details'),
      );
      await tester.ensureVisible(toggle);
      await tester.tap(toggle);
      await pumpFeatureUi(tester);
      expect(
        find.byKey(CreateEventFormKeys.externalEventUrl),
        expanded ? findsNothing : findsOneWidget,
      );
    });
  }
}
