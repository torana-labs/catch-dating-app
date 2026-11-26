import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_body.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_details_body.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// The text and number event defaults editor. These carry the old organiser
/// workspace's manager preferences section tests onto its redesigned home.
void main() {
  test('defaults can set and clear without public serialization', () {
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
    final publicOrganizerJson = const OrganizerHostDefaults(
      timezone: 'Asia/Kolkata',
      revision: 7,
    ).toJson();
    for (final key in [
      'eventSetup',
      'paymentInstructions',
      'reusablePaymentPage',
      'timezone',
      'revision',
    ]) {
      expect(publicOrganizerJson.keys, isNot(contains(key)));
    }
    final serverRead = OrganizerHostDefaults.fromJson({
      ...publicOrganizerJson,
      'timezone': 'Asia/Kolkata',
      'revision': 7,
    });
    expect(serverRead.timezone, 'Asia/Kolkata');
    expect(serverRead.revision, 7);
  });

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

  testWidgets('a new reusable page needs explicit host confirmation', (
    tester,
  ) async {
    final saved = <ManagerEventSetupPreferences>[];
    await _pump(tester, onChange: saved.add);
    final input = await _entry(tester, 'event-defaults-payment-page-null');
    await tester.enterText(input, 'https://example.com/pay');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await pumpFeatureUi(tester);
    expect(find.text('Confirm reusable payment page'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await pumpFeatureUi(tester);
    expect(saved, isEmpty);

    await tester.enterText(input, 'https://example.com/pay');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Confirm reusable page'));
    await pumpFeatureUi(tester);
    expect(saved.single.reusablePaymentPage?.url, 'https://example.com/pay');
    expect(saved.single.reusablePaymentPage?.reusableForEvents, isTrue);
  });

  testWidgets('text defaults save trimmed, and a bad currency is refused', (
    tester,
  ) async {
    final saved = <ManagerEventSetupPreferences>[];
    await _pump(tester, onChange: saved.add);
    final currency = await _entry(tester, 'event-defaults-currency-null');
    await tester.enterText(currency, 'R1');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await pumpFeatureUi(tester);
    expect(saved, isEmpty);
    await tester.enterText(currency, 'inr');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await pumpFeatureUi(tester);
    expect(saved.last.currency, 'INR');

    final instructions = await _entry(
      tester,
      'event-defaults-instructions-null',
    );
    await tester.enterText(instructions, '  Pay at the door  ');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await pumpFeatureUi(tester);
    expect(saved.last.paymentInstructions, 'Pay at the door');
  });

  testWidgets('set defaults can go back to choosing on each event', (
    tester,
  ) async {
    final saved = <ManagerEventSetupPreferences>[];
    await _pump(
      tester,
      preferences: const ManagerEventSetupPreferences(
        usualDurationMinutes: 90,
        offerValidityMinutes: 60,
        preferredVenueId: 'venue-1',
        collectionPreference: EventCollectionPreference.catchCheckout,
      ),
      onChange: saved.add,
    );
    expect(find.text('90 min'), findsOneWidget);
    for (final key in [
      'event-defaults-clear-duration',
      'event-defaults-clear-venue',
      'event-defaults-clear-validity',
      'event-defaults-clear-collection',
    ]) {
      await tester.ensureVisible(find.byKey(ValueKey<String>(key)));
      await tester.tap(find.byKey(ValueKey<String>(key)));
      await tester.pump();
    }
    expect(saved[0].usualDurationMinutes, isNull);
    expect(saved[1].preferredVenueId, isNull);
    expect(saved[2].offerValidityMinutes, isNull);
    expect(saved[3].collectionPreference, isNull);
  });

  testWidgets('without a save handler the defaults are read-only', (
    tester,
  ) async {
    await _pump(
      tester,
      preferences: const ManagerEventSetupPreferences(usualDurationMinutes: 90),
    );
    final clear = tester.widget<CatchField>(
      find.byKey(const ValueKey<String>('event-defaults-clear-duration')),
    );
    expect(clear.onTap, isNull);
    expect(tester.takeException(), isNull);
  });

  testWidgets('the editor stays scrollable at 360px and 2x text', (
    tester,
  ) async {
    await _pump(tester, size: const Size(360, 800), textScale: 2);
    await tester.ensureVisible(find.text('Reusable organizer payment page'));
    await pumpFeatureUi(tester);
    expect(find.text('Reusable organizer payment page'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('event defaults open the editor and the event policy', (
    tester,
  ) async {
    var edits = 0;
    var policy = 0;
    tester.view.physicalSize = const Size(390, 3200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      _app(
        CatchRoot(
          child: CatchScreen(
            bodyScrolls: false,
            body: HostEventDefaultsBody(
              state: const HostEventDefaultsState(
                status: HostEventDefaultsStatus.ready,
                preferences: ManagerEventSetupPreferences(),
              ),
              onCollection: (_) {},
              onEdit: () => edits++,
              onEditPolicy: () => policy++,
              onRetry: () {},
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.ensureVisible(find.text('Payment page'));
    await tester.tap(find.text('Payment page'));
    expect(edits, 1);
    await tester.ensureVisible(find.text('Admission'));
    await tester.tap(find.text('Admission'));
    expect(policy, 1);
  });
}

Widget _app(Widget home, {double textScale = 1}) => MaterialApp(
  theme: CatchTheme.light,
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(
      context,
    ).copyWith(textScaler: TextScaler.linear(textScale)),
    child: child!,
  ),
  home: home,
);

Future<void> _pump(
  WidgetTester tester, {
  ManagerEventSetupPreferences preferences =
      const ManagerEventSetupPreferences(),
  ValueChanged<ManagerEventSetupPreferences>? onChange,
  Size size = const Size(390, 2400),
  double textScale = 1,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    _app(
      CatchRoot(
        child: CatchScreen(
          bodyScrolls: false,
          body: HostEventDefaultsDetailsBody(
            state: HostEventDefaultsState(
              status: HostEventDefaultsStatus.ready,
              preferences: preferences,
            ),
            onChange: onChange,
            onRetry: () {},
          ),
        ),
      ),
      textScale: textScale,
    ),
  );
  await tester.pump();
}

Future<Finder> _entry(WidgetTester tester, String key) async {
  final field = find.byKey(ValueKey<String>(key));
  await tester.ensureVisible(field);
  return find.descendant(
    of: field,
    matching: find.byKey(const ValueKey('catch-field-text-entry')),
  );
}
