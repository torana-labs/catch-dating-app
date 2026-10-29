import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_event_offer_preferences_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../test_pump_helpers.dart';
import 'event_controller_test_support.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  final hash = List.filled(64, 'a').join();

  EventOfferConfiguration offerConfiguration({int revision = 0}) => revision > 0
      ? const EventOfferConfiguration(
          organizerId: 'club-1',
          eventId: 'event-1',
          eventSourceRevision: 8,
          startsAtMillis: 1791043800000,
          nowMillis: 1790000000000,
          suggestedExpiresAtMillis: null,
          preferencesRevision: 1,
          preferences: null,
        )
      : EventOfferConfiguration.fromResponse({
          'organizerId': 'club-1',
          'eventId': 'event-1',
          'eventSourceRevision': 8,
          'startsAtMillis': 1791043800000,
          'nowMillis': 1790000000000,
          'suggestedExpiresAtMillis': null,
          'preferencesRevision': revision,
          'preferences': null,
          'paymentTerms': null,
        });

  ManagerEventSetupDefaults defaults({
    ManagerEventSetupPreferences preferences =
        const ManagerEventSetupPreferences(),
  }) => ManagerEventSetupDefaults(
    organizerId: 'club-1',
    cityId: 'in-mh-mumbai',
    marketId: 'in-mh-mumbai',
    timezone: 'Asia/Kolkata',
    organizerDefaultsRevision: 1,
    basicsReviewedHash: hash,
    preferencesRevision: 1,
    preferences: preferences,
    preferencesHash: hash,
    reviewedDefaultsHash: hash,
  );

  TestEventOfferPreferencesController offerController({
    int revision = 0,
    ManagerEventSetupPreferences? defaultPreferences,
    List<EventOfferPreferencesUpdateRequest>? writes,
    PreviewEventOfferPreferences? readPreview,
    String displayName = 'Saturday mixer',
  }) {
    final controller = TestEventOfferPreferencesController(
      userId: 'host-1',
      organizerId: 'club-1',
      eventId: 'event-1',
      displayName: displayName,
      readConfiguration: ({required organizerId, required eventId}) async =>
          offerConfiguration(
            revision: writes == null || writes.isEmpty
                ? revision
                : revision + 1,
          ),
      readDefaults: (_) async => defaults(
        preferences: defaultPreferences ?? const ManagerEventSetupPreferences(),
      ),
      readPreview: readPreview,
      write: (request) async {
        writes?.add(request);
        return EventOfferPreferencesReceipt(
          eventId: 'event-1',
          preferencesRevision: revision + 1,
          replayed: false,
        );
      },
    );
    controller.configuration = offerConfiguration(revision: revision);
    controller.defaults = defaults(
      preferences: defaultPreferences ?? const ManagerEventSetupPreferences(),
    );
    return controller;
  }

  Widget app(Widget child) => MaterialApp(
    theme: CatchTheme.light,
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: child,
  );

  testWidgets('settings provider rebinds for organizer, event, and actor', (
    tester,
  ) async {
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    var organizerId = 'club-1';
    var eventId = 'event-1';
    var uid = 'host-1';
    late StateSetter updateRoute;
    final bindings = <String>[];
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => accounts.stream),
          eventOfferPreferencesDependenciesProvider.overrideWithValue(
            EventOfferPreferencesDependencies(
              readConfiguration:
                  ({required organizerId, required eventId}) async {
                    bindings.add('$uid/$organizerId/$eventId');
                    throw StateError('Fixture read unavailable');
                  },
              readDefaults: (_) async =>
                  throw StateError('Fixture read unavailable'),
              write: (_) async => throw StateError('No save'),
            ),
          ),
        ],
        child: app(
          StatefulBuilder(
            builder: (context, setState) {
              updateRoute = setState;
              return HostEventOfferPreferencesScreen(
                organizerId: organizerId,
                eventId: eventId,
                onBack: () {},
              );
            },
          ),
        ),
      ),
    );
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(bindings, isEmpty);
    accounts.add(uid);
    await pumpFeatureUi(tester);
    expect(bindings, ['host-1/club-1/event-1']);
    updateRoute(() {
      organizerId = 'club-2';
      eventId = 'event-2';
    });
    await pumpFeatureUi(tester);
    expect(bindings.last, 'host-1/club-2/event-2');
    uid = 'host-2';
    accounts.add(uid);
    await pumpFeatureUi(tester);
    expect(bindings.last, 'host-2/club-2/event-2');
    expect(bindings.length, 3);
    expect(tester.takeException(), isNull);
  });

  testWidgets('fresh event shows mode choices and lists save blockers', (
    tester,
  ) async {
    final controller = offerController();
    addTearDown(controller.dispose);
    await tester.pumpWidget(
      app(testOfferPreferencesScreen(controller: controller, onBack: () {})),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Free admission'), findsOneWidget);
    expect(find.text('Payment page link'), findsOneWidget);
    expect(find.text('Manual instructions'), findsOneWidget);
    expect(find.text('CHOOSE HOW GUESTS PAY'), findsOneWidget);
    // Catch checkout stays gated until provider activation ships.
    final checkout = tester.widget<CatchChoiceTile>(
      find.byKey(const ValueKey('offer-payment-mode-catchCheckout')),
    );
    expect(checkout.onTap, isNull);
    expect(find.textContaining('Coming soon'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'payment page link asks for link and reuse confirmation before saving',
    (tester) async {
      tester.view.physicalSize = const Size(1080, 3200);
      tester.view.devicePixelRatio = 1;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      final writes = <EventOfferPreferencesUpdateRequest>[];
      var backed = false;
      final controller = offerController(writes: writes);
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        app(
          testOfferPreferencesScreen(
            controller: controller,
            onBack: () => backed = true,
          ),
        ),
      );
      await pumpFeatureUi(tester);

      await tester.tap(
        find.byKey(const ValueKey('offer-payment-mode-reusablePage')),
      );
      await pumpFeatureUi(tester);
      expect(
        find.byKey(const ValueKey('offer-payment-amount')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('offer-payment-page-url')),
        findsOneWidget,
      );
      expect(find.text('SET A TICKET PRICE'), findsOneWidget);

      await tester.enterText(
        find.byKey(const ValueKey('offer-payment-amount')),
        '1200',
      );
      await pumpFeatureUi(tester);
      expect(find.text('ADD THE PAYMENT PAGE LINK'), findsOneWidget);

      await tester.enterText(
        find.byKey(const ValueKey('offer-payment-page-url')),
        'https://rzp.io/l/saturday-social',
      );
      await pumpFeatureUi(tester);
      expect(find.text('CONFIRM THE PAGE CAN BE REUSED'), findsOneWidget);

      final reuseField = find.byKey(const ValueKey('offer-payment-page-reuse'));
      await tester.ensureVisible(reuseField);
      await pumpFeatureUi(tester);
      await tester.tap(
        find.descendant(
          of: reuseField,
          matching: find.byType(CatchToggleInput),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('SET OFFER VALIDITY'), findsOneWidget);

      await tester.tap(find.text('Offer valid for'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('24 h'));
      await pumpFeatureUi(tester);
      expect(find.text('CHOOSE HOW GUESTS PAY'), findsNothing);
      expect(find.textContaining('READY'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('offer-payment-setup-save')));
      await pumpFeatureUi(tester);
      expect(writes, hasLength(1));
      final intents = writes.single.intents;
      expect(intents.expectedAmountMinor.value, 120000);
      expect(
        intents.collectionPreference.value,
        EventCollectionPreference.reusablePage,
      );
      expect(intents.offerValidityMinutes.value, 1440);
      expect(
        intents.reusablePaymentPage.value?.url,
        'https://rzp.io/l/saturday-social',
      );
      expect(intents.reusablePaymentPage.value?.reusableForEvents, isTrue);
      expect(backed, isTrue);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('free admission hides payment fields and records a free offer', (
    tester,
  ) async {
    final writes = <EventOfferPreferencesUpdateRequest>[];
    var backed = false;
    final controller = offerController(
      writes: writes,
      defaultPreferences: const ManagerEventSetupPreferences(
        collectionPreference: EventCollectionPreference.manualInstructions,
        currency: 'INR',
        offerValidityMinutes: 1440,
        paymentInstructions: 'Pay at the door',
      ),
    );
    addTearDown(controller.dispose);
    await tester.pumpWidget(
      app(
        testOfferPreferencesScreen(
          controller: controller,
          onBack: () => backed = true,
        ),
      ),
    );
    await pumpFeatureUi(tester);
    // Organizer suggestions preselect manual collection on this event; the
    // mode picker collapses to the selected summary until "Change" re-opens it.
    expect(
      find.byKey(const ValueKey('offer-payment-instructions')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('offer-payment-mode-free')), findsNothing);

    await tester.tap(find.byKey(const ValueKey('offer-payment-mode-change')));
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(const ValueKey('offer-payment-mode-free')));
    await pumpFeatureUi(tester);
    expect(find.byKey(const ValueKey('offer-payment-amount')), findsNothing);
    expect(
      find.byKey(const ValueKey('offer-payment-instructions')),
      findsNothing,
    );
    expect(find.text('Nothing to confirm'), findsOneWidget);
    expect(find.textContaining('READY'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('offer-payment-setup-save')));
    await pumpFeatureUi(tester);
    expect(writes, hasLength(1));
    expect(writes.single.intents.expectedAmountMinor.value, 0);
    expect(
      writes.single.intents.collectionPreference.mode,
      EventSetupValueMode.clear,
    );
    expect(
      writes.single.intents.paymentInstructions.mode,
      EventSetupValueMode.clear,
    );
    expect(backed, isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('published preferences remain scrollable at 360px and 2x text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(720, 1280);
    tester.view.devicePixelRatio = 2;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    final controller = offerController(
      defaultPreferences: const ManagerEventSetupPreferences(
        collectionPreference: EventCollectionPreference.manualInstructions,
        currency: 'INR',
      ),
    );
    addTearDown(controller.dispose);
    await tester.pumpWidget(
      ProviderScope(
        child: app(
          MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(2)),
            child: testOfferPreferencesScreen(
              controller: controller,
              onBack: () {},
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Offer payments'), findsOneWidget);
    final amount = find.byKey(const ValueKey('offer-payment-amount'));
    await tester.ensureVisible(amount);
    await pumpFeatureUi(tester);
    expect(amount, findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
