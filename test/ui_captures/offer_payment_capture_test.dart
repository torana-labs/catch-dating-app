import 'dart:io';

import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../hosts/event_controller_test_support.dart';
import '../test_pump_helpers.dart';
import 'support/capture_device.dart';
import 'support/capture_pump.dart';

// Temporary visual-capture harness for the offer payment setup step.
// Runs the real screen inside the capture pump and writes PNGs to
// artifacts/ui-captures/offer_payment_setup. Not a shipped test.

const _out = String.fromEnvironment('OFFER_PAYMENT_CAPTURE_OUTPUT');
final _hash = List.filled(64, 'a').join();

EventOfferConfiguration _config() => EventOfferConfiguration.fromResponse({
  'organizerId': 'club-1',
  'eventId': 'event-1',
  'eventSourceRevision': 8,
  // 2026-10-03 19:00 IST-ish; validity clamps the resolved expiry row.
  'startsAtMillis': 1791043800000,
  'nowMillis': 1790000000000,
  'suggestedExpiresAtMillis': null,
  'preferencesRevision': 0,
  'preferences': null,
  'paymentTerms': null,
});

ManagerEventSetupDefaults _defaults({
  ManagerEventSetupPreferences preferences =
      const ManagerEventSetupPreferences(),
}) => ManagerEventSetupDefaults(
  organizerId: 'club-1',
  cityId: 'in-mh-mumbai',
  marketId: 'in-mh-mumbai',
  timezone: 'Asia/Kolkata',
  organizerDefaultsRevision: 1,
  basicsReviewedHash: _hash,
  preferencesRevision: 1,
  preferences: preferences,
  preferencesHash: _hash,
  reviewedDefaultsHash: _hash,
);

TestEventOfferPreferencesController _controller({
  ManagerEventSetupPreferences? defaultPreferences,
  bool withPreview = false,
}) {
  final controller = TestEventOfferPreferencesController(
    userId: 'host-1',
    organizerId: 'club-1',
    eventId: 'event-1',
    displayName: 'Saturday Social',
    readConfiguration: ({required organizerId, required eventId}) async =>
        _config(),
    readDefaults: (_) async => _defaults(
      preferences: defaultPreferences ?? const ManagerEventSetupPreferences(),
    ),
    readPreview: withPreview
        ? (request) async => EventOfferPreferencesPreview(
            request: request,
            current: null,
            candidate: PrivateEventPreferencesSnapshot(
              revision: 1,
              intents: request.intents,
              resolvedValues: const {
                'expectedAmountMinor': 120000,
                'currency': 'INR',
                'collectionPreference': 'reusablePage',
                'reusablePaymentPage': {
                  'url': 'https://rzp.io/l/saturday-social',
                },
                'offerValidityMinutes': 1440,
                'offerMessageTemplate':
                    'Can\'t wait to meet you — see you Saturday!',
              },
              paymentTerms: const {},
            ),
          )
        : null,
    write: (_) async => const EventOfferPreferencesReceipt(
      eventId: 'event-1',
      preferencesRevision: 1,
      replayed: false,
    ),
  );
  controller.configuration = _config();
  controller.defaults = _defaults(
    preferences: defaultPreferences ?? const ManagerEventSetupPreferences(),
  );
  return controller;
}

Widget _screen(TestEventOfferPreferencesController controller) =>
    testOfferPreferencesScreen(controller: controller, onBack: () {});

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await pumpFeatureUi(tester);
  await tester.tap(finder);
  await pumpFeatureUi(tester);
}

Future<void> _enter(WidgetTester tester, String key, String text) async {
  final finder = find.byKey(ValueKey(key));
  await tester.ensureVisible(finder);
  await pumpFeatureUi(tester);
  await tester.enterText(finder, text);
  await pumpFeatureUi(tester);
}

/// inputActions rows stage text only after the drawer's Done commit.
Future<void> _enterCommitted(
  WidgetTester tester,
  String key,
  String text,
) async {
  await _tap(tester, find.byKey(ValueKey(key)));
  final editor = find.descendant(
    of: find.byKey(ValueKey(key)),
    matching: find.byType(EditableText),
  );
  await tester.ensureVisible(editor);
  await pumpFeatureUi(tester);
  await tester.enterText(editor, text);
  await pumpFeatureUi(tester);
  await _tap(tester, find.byKey(const ValueKey('catch-field-done')));
}

/// Validity chips live in a collapsible field whose open state depends on
/// which field was last touched. Scroll the field into view first; the chip
/// may then exist only inside its Offstage drawer, so expand only when the
/// on-stage finder still comes up empty.
Future<void> _pickValidity(WidgetTester tester, String label) async {
  final fieldLabel = find.text('Offer valid for');
  await tester.ensureVisible(fieldLabel);
  await pumpFeatureUi(tester);
  if (find.text(label).evaluate().isEmpty) {
    await _tap(tester, fieldLabel);
  }
  await tester.ensureVisible(find.text(label));
  await pumpFeatureUi(tester);
  await tester.tap(find.text(label));
  await pumpFeatureUi(tester);
}

Future<void> _fillReusablePage(WidgetTester tester) async {
  await _tap(
    tester,
    find.byKey(const ValueKey('offer-payment-mode-reusablePage')),
  );
  await _enter(tester, 'offer-payment-amount', '1200');
  await _enter(
    tester,
    'offer-payment-page-url',
    'https://rzp.io/l/saturday-social',
  );
  final reuse = find.byKey(const ValueKey('offer-payment-page-reuse'));
  await tester.ensureVisible(reuse);
  await pumpFeatureUi(tester);
  await tester.tap(
    find.descendant(of: reuse, matching: find.byType(CatchToggleInput)),
  );
  await pumpFeatureUi(tester);
  await _pickValidity(tester, '24 h');
  await _enterCommitted(
    tester,
    'offer-payment-message',
    'Can\'t wait to meet you — see you Saturday!',
  );
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  final out = Directory(_out);

  testWidgets('capture offer payment setup states', (tester) async {
    if (_out.isEmpty) return;
    await captureCatchWidget(
      tester,
      id: '01_fresh',
      outputDirectory: out,
      device: CaptureDevice.reviewTall,
      builder: (_) => _screen(_controller()),
    );

    final page = _controller();
    await captureCatchWidget(
      tester,
      id: '02_payment_page',
      outputDirectory: out,
      device: CaptureDevice.reviewTall,
      builder: (_) => _screen(page),
      drive: _fillReusablePage,
    );

    final manual = _controller();
    await captureCatchWidget(
      tester,
      id: '03_manual_instructions',
      outputDirectory: out,
      device: CaptureDevice.reviewTall,
      builder: (_) => _screen(manual),
      drive: (tester) async {
        await _tap(
          tester,
          find.byKey(const ValueKey('offer-payment-mode-manualInstructions')),
        );
        await _enter(tester, 'offer-payment-amount', '850');
        await _enterCommitted(
          tester,
          'offer-payment-instructions',
          'UPI: saturdaysocial@okhdfc or pay cash at the door. '
              'Send the UPI reference when you pay.',
        );
        await _pickValidity(tester, '48 h');
      },
    );

    final request = _controller();
    await captureCatchWidget(
      tester,
      id: '04_personal_request',
      outputDirectory: out,
      device: CaptureDevice.reviewTall,
      builder: (_) => _screen(request),
      drive: (tester) async {
        await _tap(
          tester,
          find.byKey(const ValueKey('offer-payment-mode-personalRequest')),
        );
        await _enter(tester, 'offer-payment-amount', '1200');
        await _pickValidity(tester, '72 h');
      },
    );

    final free = _controller(
      defaultPreferences: const ManagerEventSetupPreferences(
        collectionPreference: EventCollectionPreference.manualInstructions,
        currency: 'INR',
        offerValidityMinutes: 1440,
        paymentInstructions: 'Pay at the door',
      ),
    );
    await captureCatchWidget(
      tester,
      id: '05_free',
      outputDirectory: out,
      device: CaptureDevice.reviewTall,
      builder: (_) => _screen(free),
      drive: (tester) async {
        await _tap(
          tester,
          find.byKey(const ValueKey('offer-payment-mode-change')),
        );
        await _tap(
          tester,
          find.byKey(const ValueKey('offer-payment-mode-free')),
        );
      },
    );

    final editor = _controller();
    await captureCatchWidget(
      tester,
      id: '07_message_editor',
      outputDirectory: out,
      device: CaptureDevice.reviewTall,
      builder: (_) => _screen(editor),
      drive: (tester) async {
        await _tap(
          tester,
          find.byKey(const ValueKey('offer-payment-mode-reusablePage')),
        );
        await _tap(tester, find.byKey(const ValueKey('offer-payment-message')));
        final editor = find.descendant(
          of: find.byKey(const ValueKey('offer-payment-message')),
          matching: find.byType(EditableText),
        );
        await tester.ensureVisible(editor);
        await pumpFeatureUi(tester);
        await tester.enterText(
          editor,
          'Can\'t wait to meet you — see you Saturday!',
        );
        await pumpFeatureUi(tester);
      },
    );

    final review = _controller(withPreview: true);
    await captureCatchWidget(
      tester,
      id: '06_review_sheet',
      outputDirectory: out,
      includeOverlays: true,
      builder: (_) => _screen(review),
      drive: (tester) async {
        await _fillReusablePage(tester);
        await _tap(
          tester,
          find.byKey(const ValueKey('offer-payment-setup-save')),
        );
      },
    );
  });
}
