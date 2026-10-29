import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_private_event_listing_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_details_screen.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../test_pump_helpers.dart';
import 'private_event_details_test_support.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  for (final actionKind in [
    'duration',
    'notes',
    'custom-label',
    'map',
    'map-failure',
    'terms',
    'reconciliation',
    'discarding',
  ]) {
    final mapSelection = actionKind.startsWith('map');
    final termsSelection = actionKind == 'terms';
    final reconciliation =
        actionKind == 'reconciliation' || actionKind == 'discarding';
    testWidgets('narrow 2x details sends actual $actionKind', (tester) async {
      tester.view.physicalSize = const Size(720, 1280);
      tester.view.devicePixelRatio = 2;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      final hash = List.filled(64, 'a').join();
      PrivateEventDetailsUpdateRequest? sent;
      final controller = createDetailsController(
        userId: 'host-1',
        organizerId: 'club-1',
        eventId: 'event-1',
        readEvent: ({required organizerId, required eventId}) async =>
            throw StateError('Test read unavailable'),
        readDefaults: (_) async => throw StateError('Test read unavailable'),
        write: (request) async {
          sent = request;
          throw StateError('Response lost');
        },
      );
      controller.event = PrivateEventBasicSummary(
        eventId: 'event-1',
        organizerId: 'club-1',
        setupRevision: 2,
        name: 'Saturday mixer',
        city: const EventSetupCity(
          cityId: 'in-mh-mumbai',
          marketId: 'in-mh-mumbai',
        ),
        localDate: '2026-10-03',
        localStartTime: '19:00',
        timezone: 'Asia/Kolkata',
        startTimeMillis: 1791043800000,
        status: 'active',
        setupDefaults: const {},
        detailsConfigured: false,
        eventPreferences: null,
        eventDetails: actionKind == 'notes'
            ? const PrivateEventDetailsSnapshot(
                meetingLocation: EventMeetingLocation(
                  name: 'Town Hall',
                  latitude: 19.2,
                  longitude: 72.9,
                  notes: 'Side gate',
                  address: 'Main Street',
                ),
              )
            : actionKind == 'custom-label'
            ? const PrivateEventDetailsSnapshot(
                eventFormat: EventFormatSnapshot(
                  activityKind: ActivityKind.openActivity,
                  interactionModel: EventInteractionModel.openFormat,
                  customActivityLabel: 'Board games',
                ),
              )
            : const PrivateEventDetailsSnapshot(),
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
          usualDurationMinutes: 90,
        ),
        preferencesHash: hash,
        reviewedDefaultsHash: hash,
      );
      if (reconciliation) {
        controller.pending = PrivateEventDetailsUpdateRequest(
          organizerId: 'club-1',
          eventId: 'event-1',
          requestId: 'reconcile-one',
          expectedSetupRevision: 2,
          reviewedDefaultsHash: hash,
          details: const PrivateEventDetailsPatch(
            admissionTerms: PrivateEventAdmissionTerms(
              capacityLimit: 20,
              priceInPaise: 0,
              currency: 'INR',
              cancellationPolicyId: 'notApplicable',
            ),
          ),
        );
        if (actionKind == 'discarding') {
          controller.pending = controller.pending!.withDiscard(true);
        }
        controller.reconciliationProgress =
            const PrivateSeatReconciliationProgress(
              eventId: 'event-1',
              phase: 'scan',
              scannedRows: 25,
            );
      }
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: controller.container,
          child: MaterialApp(
            theme: CatchTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: MediaQuery(
              data: const MediaQueryData(textScaler: TextScaler.linear(2)),
              child: termsSelection
                  ? Scaffold(
                      body: ListView(
                        children: [
                          HostPrivateEventListingSection(
                            state: controller.snapshot,
                            controller: controller.notifier,
                          ),
                        ],
                      ),
                    )
                  : PrivateEventDetailsScreen(
                      scope: controller.scope,
                      onBack: () {},
                      pickLocation: (_) async {
                        if (actionKind == 'map-failure') {
                          throw StateError(
                            'Picker diagnostic must stay private',
                          );
                        }
                        return const EventMeetingLocation(
                          name: 'Test Town Hall',
                          latitude: 19.2,
                          longitude: 72.9,
                        );
                      },
                    ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(tester.takeException(), isNull);
      if (reconciliation) {
        final action = find.text(
          actionKind == 'discarding'
              ? 'Continue discarding change'
              : 'Continue checking guests',
        );
        await ensureCentered(tester, action);
        await pumpFeatureUi(tester);
        expect(action.hitTestable(), findsOneWidget);
        expect(controller.canEdit, isFalse);
        expect(tester.takeException(), isNull);
        return;
      }
      if (termsSelection) {
        expect(find.text('Save capacity and price'), findsNothing);
        Future<void> enter(String title, String value) async {
          final field = find.byWidgetPredicate(
            (widget) => widget is CatchField && widget.title == title,
          );
          await ensureCentered(tester, field);
          await tester.tap(field);
          await pumpFeatureUi(tester);
          final input = find
              .descendant(of: field, matching: find.byType(EditableText))
              .first;
          await tester.enterText(input, value);
          await pumpFeatureUi(tester);
        }

        await enter('Capacity', '12');
        await enter('Base price (INR)', '500.25');
        FocusManager.instance.primaryFocus?.unfocus();
        tester.testTextInput.hide();
        await pumpFeatureUi(tester);
        final save = find.text('Save capacity and price');
        await ensureCentered(tester, save);
        await pumpFeatureUi(tester);
        await tester.tap(save.hitTestable());
        await pumpFeatureUi(tester);
        expect(sent?.details.admissionTerms?.priceInPaise, 50025);
        expect(sent?.details.admissionTerms?.capacityLimit, 12);
        expect(sent?.details.admissionTerms?.cancellationPolicyId, 'standard');
        expect(controller.pending, isNotNull);
        expect(tester.takeException(), isNull);
        return;
      }
      if (actionKind == 'notes' || actionKind == 'custom-label') {
        final field = find.byKey(
          ValueKey(
            actionKind == 'notes'
                ? 'private-directions-2'
                : 'private-format-label-2',
          ),
        );
        await ensureCentered(tester, field);
        await tester.tap(field);
        await pumpFeatureUi(tester);
        final input = find.descendant(
          of: field,
          matching: find.byType(EditableText),
        );
        await tester.enterText(input, '');
        await tester.testTextInput.receiveAction(TextInputAction.done);
        await pumpFeatureUi(tester);
        expect(sent, isNotNull);
        if (actionKind == 'notes') {
          expect(sent!.details.meetingLocation!.notes, isNull);
          expect(sent!.details.meetingLocation!.address, 'Main Street');
        } else {
          expect(sent!.details.eventFormat!.value!.customActivityLabel, isNull);
        }
        expect(tester.takeException(), isNull);
        return;
      }
      final action = find.text(
        mapSelection ? 'Choose meeting place on map' : 'Use suggested duration',
      );
      await ensureCentered(tester, action);
      await tester.pump();
      expect(action.hitTestable(), findsOneWidget);
      await tester.tap(action.hitTestable());
      await pumpFeatureUi(tester);
      if (actionKind == 'map-failure') {
        expect(controller.error, isA<AppException>());
        expect(sent, isNull);
        expect(controller.pending, isNull);
        expect(find.text('Picker diagnostic must stay private'), findsNothing);
        expect(tester.takeException(), isNull);
        return;
      }
      if (mapSelection) {
        expect(sent?.details.meetingLocation?.latitude, 19.2);
        expect(sent?.details.meetingLocation?.longitude, 72.9);
        expect(sent?.details.venue, isNull);
      } else {
        expect(sent?.details.toJson(), {
          'durationMinutes': {'mode': 'inherit'},
        });
      }
      expect(sent?.reviewedDefaultsHash, hash);
      expect(controller.pending, isNotNull);
      expect(tester.takeException(), isNull);
    });
  }
}
