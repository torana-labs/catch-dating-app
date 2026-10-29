import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_controller_test_support.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  setUpAll(loadCatchTestFonts);

  for (final layout in [
    (width: 360.0, height: 800.0, scale: 2.0),
    (width: 1280.0, height: 900.0, scale: 1.0),
  ]) {
    testWidgets(
      'preview then apply at ${layout.width}px and ${layout.scale}x text',
      (tester) async {
        tester.view.physicalSize = Size(layout.width, layout.height);
        tester.view.devicePixelRatio = 1;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });
        final hash = List.filled(64, 'a').join();
        PrivateEventPreferencesUpdateRequest? sent;
        final controller = TestPrivateEventPreferencesController(
          userId: 'host-1',
          organizerId: 'club-1',
          eventId: 'event-1',
          readEvent: ({required organizerId, required eventId}) async =>
              throw StateError('Test read unavailable'),
          readDefaults: (_) async => throw StateError('Test read unavailable'),
          readPreview: (request) async => EventOfferPreferencesPreview(
            request: request,
            current: null,
            candidate: PrivateEventPreferencesSnapshot(
              revision: 1,
              intents: request.intents,
              resolvedValues: {
                'expectedAmountMinor': 120000,
                'currency': 'INR',
                'collectionPreference': 'manualInstructions',
              },
              paymentTerms: const {},
            ),
          ),
          write: (request) async {
            sent = request;
            throw StateError('Response lost');
          },
        );
        controller.event = const PrivateEventBasicSummary(
          eventId: 'event-1',
          organizerId: 'club-1',
          setupRevision: 2,
          name: 'Saturday mixer',
          city: EventSetupCity(
            cityId: 'in-mh-mumbai',
            marketId: 'in-mh-mumbai',
          ),
          localDate: '2026-10-03',
          localStartTime: '19:00',
          timezone: 'Asia/Kolkata',
          startTimeMillis: 1791043800000,
          status: 'active',
          setupDefaults: {},
          detailsConfigured: false,
          eventPreferences: null,
          canEditBasics: true,
        );
        controller.defaults = ManagerEventSetupDefaults(
          organizerId: 'club-1',
          cityId: 'in-mh-mumbai',
          marketId: 'in-mh-mumbai',
          timezone: 'Asia/Kolkata',
          organizerDefaultsRevision: 1,
          basicsReviewedHash: hash,
          preferencesRevision: 1,
          preferences: const ManagerEventSetupPreferences(
            timezone: 'Asia/Kolkata',
            currency: 'INR',
            collectionPreference: EventCollectionPreference.manualInstructions,
          ),
          preferencesHash: hash,
          reviewedDefaultsHash: hash,
        );
        addTearDown(controller.dispose);
        await tester.pumpWidget(
          MaterialApp(
            theme: CatchTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: MediaQuery(
              data: MediaQueryData(textScaler: TextScaler.linear(layout.scale)),
              child: RepaintBoundary(
                key: const ValueKey('settings-capture'),
                child: controller.screen(onBack: () {}),
              ),
            ),
          ),
        );
        final field = find.byKey(
          const ValueKey('event-preference-expectedAmountMinor-null'),
        );
        await tester.ensureVisible(field);
        await pumpFeatureUi(tester);
        expect(tester.takeException(), isNull);
        final input = find.descendant(
          of: field,
          matching: find.byKey(const ValueKey('catch-field-text-entry')),
        );
        await tester.enterText(input, '120000');
        await tester.testTextInput.receiveAction(TextInputAction.done);
        await pumpFeatureUi(tester);
        expect(sent, isNull, reason: 'Editing alone must not write settings');
        await tester.drag(find.byType(ListView), const Offset(0, 5000));
        await pumpFeatureUi(tester);
        final preview = find.text('Preview changes and current defaults');
        await Scrollable.ensureVisible(tester.element(preview), alignment: 0.5);
        await pumpFeatureUi(tester);
        await _capture(tester, 'settings-draft-${layout.width}');
        await tester.tap(preview);
        await pumpFeatureUi(tester);
        expect(sent, isNull, reason: 'Preview is read-only');
        expect(controller.review, isNotNull, reason: '${controller.error}');
        final apply = find.text('Apply reviewed changes');
        await tester.scrollUntilVisible(
          apply,
          250,
          scrollable: find.descendant(
            of: find.byType(ListView),
            matching: find.byWidgetPredicate(
              (widget) =>
                  widget is Scrollable &&
                  widget.axisDirection == AxisDirection.down,
            ),
          ),
        );
        await Scrollable.ensureVisible(tester.element(apply), alignment: 0.5);
        await pumpFeatureUi(tester);
        await _capture(tester, 'settings-review-${layout.width}');
        await tester.tap(apply);
        await pumpFeatureUi(tester);
        expect(sent?.expectedSetupRevision, 2);
        expect(sent?.reviewedDefaultsHash, hash);
        expect(sent?.intents.expectedAmountMinor.value, 120000);
        expect(
          sent?.intents.collectionPreference.mode,
          EventSetupValueMode.inherit,
        );
        expect(controller.pending?.toJson(), sent?.toJson());
        expect(tester.takeException(), isNull);
      },
    );
  }
}

Future<void> _capture(WidgetTester tester, String name) async {
  const directory = String.fromEnvironment('RSVP_CAPTURE_DIRECTORY');
  if (directory.isEmpty) return;
  await tester.runAsync(() async {
    final boundary = tester.renderObject<RenderRepaintBoundary>(
      find.byKey(const ValueKey('settings-capture')),
    );
    final image = await boundary.toImage();
    try {
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      await Directory(directory).create(recursive: true);
      await File(
        '$directory/$name.png',
      ).writeAsBytes(bytes!.buffer.asUint8List());
    } finally {
      image.dispose();
    }
  });
}
