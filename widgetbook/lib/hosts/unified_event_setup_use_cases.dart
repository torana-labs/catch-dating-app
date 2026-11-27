import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/hosts/create/private_event_preferences_controller.dart';
import 'package:catch_dating_app/hosts/forms/event_offer_preferences_controller.dart';
import 'package:catch_dating_app/hosts/forms/offer_settings_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import 'event_editor_preview.dart';
import 'operations/preview.dart';

@widgetbook.UseCase(
  name: 'Published event offer preferences',
  type: HostOfferSettingsScreen,
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
    title: 'HostOfferSettingsScreen',
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
