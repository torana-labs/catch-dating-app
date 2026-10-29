import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations/host_manager_event_setup_preferences_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  test(
    'manager preferences can set and clear without public serialization',
    () {
      const original = ManagerEventSetupPreferences(
        timezone: 'Asia/Kolkata',
        usualDurationMinutes: 90,
        offerValidityMinutes: 1440,
        collectionPreference: EventCollectionPreference.reusablePage,
        currency: 'INR',
        offerMessageTemplate: 'Review this event',
        paymentInstructions: 'Pay after approval',
        reusablePaymentPage: ReusableOrganizerPaymentPage(
          'https://example.com/pay',
          reusableForEvents: true,
        ),
      );
      final cleared = original.copyWith(
        collectionPreference: null,
        paymentInstructions: null,
        reusablePaymentPage: null,
      );
      expect(cleared.usualDurationMinutes, 90);
      expect(cleared.timezone, 'Asia/Kolkata');
      expect(cleared.collectionPreference, isNull);
      expect(cleared.paymentInstructions, isNull);
      expect(cleared.reusablePaymentPage, isNull);
      expect(original.reusablePaymentPage!.reusableForEvents, isTrue);
      final publicOrganizerJson = const ClubHostDefaults(
        timezone: 'Asia/Kolkata',
        revision: 7,
      ).toJson();
      expect(publicOrganizerJson.keys, isNot(contains('eventSetup')));
      expect(publicOrganizerJson.keys, isNot(contains('paymentInstructions')));
      expect(publicOrganizerJson.keys, isNot(contains('reusablePaymentPage')));
      expect(publicOrganizerJson.keys, isNot(contains('timezone')));
      expect(publicOrganizerJson.keys, isNot(contains('revision')));
      final serverRead = ClubHostDefaults.fromJson({
        ...publicOrganizerJson,
        'timezone': 'Asia/Kolkata',
        'revision': 7,
      });
      expect(serverRead.timezone, 'Asia/Kolkata');
      expect(serverRead.revision, 7);
    },
  );

  test('reusable payment pages require canonical public HTTPS URLs', () {
    expect(isCanonicalPublicPaymentPageUrl('https://example.com/pay'), isTrue);
    for (final value in [
      'http://example.com/pay',
      'https://user:pass@example.com/pay',
      'https://localhost/pay',
      'https://127.0.0.1/pay',
      'https://[::1]/pay',
      'https://example.local/pay',
      'https://example.com:8443/pay',
      'https://example.com/pay#private',
      'https://example.com/pay ',
      'https://example.com/${List.filled(2049, 'a').join()}',
    ]) {
      expect(isCanonicalPublicPaymentPageUrl(value), isFalse, reason: value);
    }
  });

  testWidgets('new reusable page needs explicit Host confirmation', (
    tester,
  ) async {
    ManagerEventSetupPreferences value = const ManagerEventSetupPreferences();
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: SingleChildScrollView(
            child: StatefulBuilder(
              builder: (context, setState) =>
                  HostManagerEventSetupPreferencesSection(
                    preferences: value,
                    onChanged: (next) => setState(() => value = next),
                  ),
            ),
          ),
        ),
      ),
    );
    final field = find.byKey(const ValueKey('manager-reusable-page-null'));
    await tester.ensureVisible(field);
    final input = find.descendant(
      of: field,
      matching: find.byKey(const ValueKey('catch-field-text-entry')),
    );
    await tester.enterText(input, 'https://example.com/pay');
    expect(value.reusablePaymentPage, isNull);
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await pumpFeatureUi(tester);
    expect(find.text('Confirm reusable payment page'), findsOneWidget);
    expect(value.reusablePaymentPage, isNull);
    await tester.tap(find.text('Cancel'));
    await pumpFeatureUi(tester);
    expect(value.reusablePaymentPage, isNull);
  });

  testWidgets(
    'manager-only editor labels suggestions and disables unsaved controls',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const Scaffold(
            body: SingleChildScrollView(
              child: HostManagerEventSetupPreferencesSection(
                preferences: ManagerEventSetupPreferences(
                  usualDurationMinutes: 90,
                  collectionPreference: EventCollectionPreference.catchCheckout,
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      expect(find.text('Usual duration'), findsOneWidget);
      expect(find.text('Preferred collection method'), findsOneWidget);
      expect(find.textContaining('A preference only'), findsOneWidget);
      expect(find.text('90 min'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('manager preferences remain scrollable at 360px and 2x text', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(360, 800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const MediaQuery(
          data: MediaQueryData(
            size: Size(360, 800),
            textScaler: TextScaler.linear(2),
          ),
          child: Scaffold(
            body: SingleChildScrollView(
              child: HostManagerEventSetupPreferencesSection(
                preferences: ManagerEventSetupPreferences(),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.ensureVisible(find.text('Reusable organizer payment page'));
    await pumpFeatureUi(tester);
    expect(find.text('Reusable organizer payment page'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
