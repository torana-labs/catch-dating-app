import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_event_offer_preferences_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_target_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations/host_manager_event_setup_preferences_section.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import 'event_editor_preview.dart';
import 'operations/preview.dart';

@widgetbook.UseCase(
  name: 'Manager-only future event preferences',
  type: HostManagerEventSetupPreferencesSection,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostManagerEventSetupPreferencesSectionPreview(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'HostManagerEventSetupPreferencesSection',
      contractId: 'section.host.event.manager-preferences',
      children: [
        WidgetbookPageStateCard(
          label: 'authorized read, save unavailable',
          child: WidgetbookHostDeviceFrame(
            child: Scaffold(
              body: SingleChildScrollView(
                child: HostManagerEventSetupPreferencesSection(
                  preferences: const ManagerEventSetupPreferences(
                    usualDurationMinutes: 90,
                    offerValidityMinutes: 1440,
                    collectionPreference:
                        EventCollectionPreference.manualInstructions,
                    currency: 'INR',
                    paymentInstructions: 'Pay after your place is offered.',
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Published event offer preferences',
  type: HostEventOfferPreferencesScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostEventOfferPreferencesScreenPreview(BuildContext context) {
  final hash = List.filled(64, 'a').join();
  EventPreferencesEditorState controller({
    required int preferencesRevision,
    PrivateEventPreferencesSnapshot? preferences,
    ManagerEventSetupPreferences defaultPreferences =
        const ManagerEventSetupPreferences(),
  }) {
    final configuration = EventOfferConfiguration(
      organizerId: 'preview-club',
      eventId: 'preview-published-event',
      eventSourceRevision: 8,
      startsAtMillis: 1791043800000,
      nowMillis: 1790000000000,
      suggestedExpiresAtMillis: null,
      preferencesRevision: preferencesRevision,
      preferences: preferences,
    );
    final defaults = ManagerEventSetupDefaults(
      organizerId: 'preview-club',
      cityId: 'in-mh-mumbai',
      marketId: 'in-mh-mumbai',
      timezone: 'Asia/Kolkata',
      organizerDefaultsRevision: 1,
      basicsReviewedHash: hash,
      preferencesRevision: 1,
      preferences: defaultPreferences,
      preferencesHash: hash,
      reviewedDefaultsHash: hash,
    );
    return EventPreferencesEditorState(
      configuration: configuration,
      defaults: defaults,
      published: true,
      displayName: 'Saturday mixer',
    );
  }

  Widget card(String label, EventPreferencesEditorState controller) =>
      WidgetbookPageStateCard(
        label: label,
        child: WidgetbookHostDeviceFrame(
          child: ProviderScope(
            child: eventPreferencesPreview(
              controller,
              onBack: () => Navigator.of(context).maybePop(),
            ),
          ),
        ),
      );

  return WidgetbookPageCatalogFrame(
    title: 'HostEventOfferPreferencesScreen',
    contractId: 'screen.host.event.published.preferences',
    children: [
      card(
        'organizer suggestion; price missing',
        controller(
          preferencesRevision: 0,
          defaultPreferences: const ManagerEventSetupPreferences(
            timezone: 'Asia/Kolkata',
            currency: 'INR',
            offerValidityMinutes: 1440,
            collectionPreference: EventCollectionPreference.manualInstructions,
          ),
        ),
      ),
      card(
        'saved manual instructions; ready',
        controller(
          preferencesRevision: 1,
          preferences: const PrivateEventPreferencesSnapshot(
            revision: 1,
            intents: PrivateEventPreferenceIntents(),
            resolvedValues: {
              'expectedAmountMinor': 120000,
              'collectionPreference': 'manualInstructions',
              'currency': 'INR',
              'offerValidityMinutes': 1440,
              'paymentInstructions': 'UPI to saturdaymixer@okhdfc',
            },
            paymentTerms: {},
          ),
        ),
      ),
      card(
        'fresh event; nothing chosen yet',
        controller(preferencesRevision: 0),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Reusable or fixed event intake',
  type: HostFormTargetSection,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormTargetSectionPreview(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'HostFormTargetSection',
      contractId: 'section.host.form.event-target',
      children: [
        for (final unavailable in [false, true])
          WidgetbookPageStateCard(
            label: unavailable
                ? 'unavailable event retained'
                : 'reusable intake',
            child: WidgetbookHostDeviceFrame(
              child: _FormTargetFixture(unavailable: unavailable),
            ),
          ),
      ],
    );

class _FormTargetFixture extends StatefulWidget {
  const _FormTargetFixture({required this.unavailable});
  final bool unavailable;

  @override
  State<_FormTargetFixture> createState() => _FormTargetFixtureState();
}

class _FormTargetFixtureState extends State<_FormTargetFixture> {
  late HostFormDefinition _definition = HostFormDefinition.fromMap({
    'defaultTargetKind': widget.unavailable ? 'event' : 'organizer',
    'defaultTargetId': widget.unavailable ? 'previous-event' : null,
  });
  late final _editor = _FormTargetPreviewEditor((kind, eventId) {
    setState(
      () => _definition = _definition.withTarget(kind: kind, eventId: eventId),
    );
  });
  final _auth = _FormTargetPreviewAuth();

  @override
  Widget build(BuildContext context) => ProviderScope(
    overrides: [
      uidProvider.overrideWithValue(const AsyncData<String?>('preview-host')),
      firebaseAuthProvider.overrideWithValue(_auth),
    ],
    child: Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: HostFormTargetSection(
          organizerId: 'preview-organizer',
          definition: _definition,
          notifier: _editor,
          accountId: 'preview-host',
          enableEventTargetSettings: true,
          hasPublishedVersion: true,
        ),
      ),
    ),
  );
}

class _FormTargetPreviewEditor extends HostFormEditorController {
  _FormTargetPreviewEditor(this._changed);
  final void Function(HostFormTargetKind, String?) _changed;

  @override
  Future<HostOfferEventTargetPage> listTargetEvents({String? cursor}) async =>
      HostOfferEventTargetPage([
        HostOfferEventTarget(
          eventId: 'saturday-mixer',
          name: 'Saturday mixer · Mumbai',
          startTime: DateTime.utc(2026, 10, 3, 13, 30),
          timezone: 'Asia/Kolkata',
          publicationState: 'private',
          setupRevision: 1,
        ),
      ], null);

  @override
  void updateTarget({
    required HostFormTargetKind kind,
    required String accountId,
    String? eventId,
  }) => _changed(kind, eventId);
}

class _FormTargetPreviewAuth implements FirebaseAuth {
  @override
  User get currentUser => _FormTargetPreviewUser();

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FormTargetPreviewUser implements User {
  @override
  String get uid => 'preview-host';

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
