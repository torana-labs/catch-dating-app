import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/hosts/forms/offer_settings_editor.dart';
import 'package:catch_dating_app/hosts/forms/offer_settings_section.dart';
import 'package:catch_dating_app/hosts/forms/offer_settings_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import 'event_editor_preview.dart';
import 'operations/preview.dart';

@widgetbook.UseCase(
  name: 'Offer payment mode section',
  type: HostOfferSettingsModeSection,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostOfferPaymentModeSectionPreview(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'HostOfferSettingsModeSection',
      contractId: 'section.host.event.offer.payment.mode',
      children: [
        WidgetbookPageStateCard(
          label: 'expanded picker',
          child: WidgetbookHostDeviceFrame(
            child: Scaffold(
              body: SingleChildScrollView(
                child: HostOfferSettingsModeSection(
                  mode: null,
                  expanded: true,
                  editable: true,
                  checkoutAvailable: false,
                  onSelected: (_) {},
                  onChange: () {},
                ),
              ),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'selected summary',
          child: WidgetbookHostDeviceFrame(
            child: Scaffold(
              body: SingleChildScrollView(
                child: HostOfferSettingsModeSection(
                  mode: HostOfferSettingsMode.reusablePage,
                  expanded: false,
                  editable: true,
                  checkoutAvailable: false,
                  onSelected: (_) {},
                  onChange: () {},
                ),
              ),
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Offer payment details',
  type: HostOfferSettingsDetailsSection,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostOfferPaymentDetailsSectionPreview(BuildContext context) {
  Widget card(String label, HostOfferSettingsMode mode) =>
      WidgetbookPageStateCard(
        label: label,
        child: WidgetbookHostDeviceFrame(
          child: Scaffold(
            body: SingleChildScrollView(
              child: HostOfferSettingsDetailsSection(
                mode: mode,
                editable: true,
                amount: TextEditingController(text: '1200'),
                currency: TextEditingController(text: 'INR'),
                customValidity: TextEditingController(),
                pageUrl: TextEditingController(
                  text: 'https://pay.catch.app/p/saturday-mixer',
                ),
                instructions: TextEditingController(
                  text: 'UPI to saturdaymixer@okhdfc',
                ),
                message: TextEditingController(),
                validityCustom: false,
                validityMinutes: 1440,
                reuseAttested: true,
                expiryMillis: 1791043800000,
                openEditor: null,
                instructionsError: null,
                onFieldChanged: () {},
                onValidity: ({required custom, minutes}) {},
                onValidityMinutes: (_) {},
                onReuseAttested: (_) {},
                onInstructionsOpen: (_) {},
                onInstructionsCancel: () {},
                onInstructionsSubmit: () {},
                onInstructionsChanged: (_) {},
                onMessageOpen: (_) {},
                onMessageCancel: () {},
                onMessageSubmit: () {},
              ),
            ),
          ),
        ),
      );
  return WidgetbookPageCatalogFrame(
    title: 'HostOfferSettingsDetailsSection',
    contractId: 'section.host.event.offer.payment.details',
    children: [
      card('manual instructions', HostOfferSettingsMode.manualInstructions),
      card('reusable page', HostOfferSettingsMode.reusablePage),
      card('free offer', HostOfferSettingsMode.free),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Offer payment confirmation contract',
  type: HostOfferSettingsConfirmationNotice,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostOfferPaymentConfirmationSectionPreview(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'HostOfferSettingsConfirmationNotice',
      contractId: 'section.host.event.offer.payment.confirmation',
      children: [
        for (final mode in HostOfferSettingsMode.values)
          WidgetbookPageStateCard(
            label: mode.name,
            child: WidgetbookHostDeviceFrame(
              child: Scaffold(
                body: SingleChildScrollView(
                  child: HostOfferSettingsConfirmationNotice(mode: mode),
                ),
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Offer payment review sheet',
  type: HostOfferSettingsReviewSheet,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostOfferPaymentReviewSheetPreview(BuildContext context) {
  final hash = List.filled(64, 'a').join();
  const current = PrivateEventPreferencesSnapshot(
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
  );
  const candidate = PrivateEventPreferencesSnapshot(
    revision: 2,
    intents: PrivateEventPreferenceIntents(),
    resolvedValues: {
      'expectedAmountMinor': 150000,
      'collectionPreference': 'personalRequest',
      'currency': 'INR',
      'offerValidityMinutes': 2880,
    },
    paymentTerms: {},
  );
  return WidgetbookPageCatalogFrame(
    title: 'HostOfferSettingsReviewSheet',
    contractId: 'sheet.host.event.offer.payment.review',
    children: [
      WidgetbookPageStateCard(
        label: 'changed terms',
        child: WidgetbookHostDeviceFrame(
          child: Scaffold(
            body: HostOfferSettingsReviewSheet(
              review: EventOfferPreferencesPreview(
                request: EventOfferPreferencesUpdateRequest(
                  organizerId: 'preview-club',
                  eventId: 'preview-published-event',
                  requestId: 'preview-request-1',
                  expectedEventSourceRevision: 8,
                  expectedPreferencesRevision: 1,
                  reviewedDefaultsHash: hash,
                  intents: const PrivateEventPreferenceIntents(),
                ),
                current: current,
                candidate: candidate,
              ),
              summary: '₹1,500 · personal request · 48h',
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Offer payment setup step',
  type: HostOfferSettingsEditor,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostOfferPaymentSetupPageBodyPreview(BuildContext context) {
  final hash = List.filled(64, 'a').join();
  EventPreferencesEditorState controller({
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
      preferencesRevision: preferences?.revision ?? 0,
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
            child: eventPreferencesPreview(controller, onBack: () {}),
          ),
        ),
      );

  return WidgetbookPageCatalogFrame(
    title: 'HostOfferSettingsEditor',
    contractId: 'page.host.event.offer.payment.setup',
    children: [
      card('fresh event; picker open', controller()),
      card(
        'saved manual instructions',
        controller(
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
    ],
  );
}
