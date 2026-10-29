import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_confirmation_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_details_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_mode_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_mode_tile.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_review_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_setup_page_body.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import 'event_editor_preview.dart';
import 'operations/preview.dart';

@widgetbook.UseCase(
  name: 'Offer payment collection modes',
  type: HostOfferPaymentModeTile,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostOfferPaymentModeTilePreview(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'HostOfferPaymentModeTile',
      contractId: 'tile.host.event.offer.payment.mode',
      children: [
        WidgetbookPageStateCard(
          label: 'picker options',
          child: WidgetbookHostDeviceFrame(
            child: Scaffold(
              body: ListView(
                padding: const EdgeInsets.all(CatchSpacing.s4),
                children: [
                  for (final mode in HostOfferPaymentMode.values) ...[
                    HostOfferPaymentModeTile(
                      mode: mode,
                      selected: mode == HostOfferPaymentMode.free,
                      editable: true,
                      checkoutAvailable: false,
                      onSelected: (_) {},
                    ),
                    const SizedBox(height: CatchSpacing.s3),
                  ],
                ],
              ),
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'collapsed summary reopens picker',
          child: WidgetbookHostDeviceFrame(
            child: Scaffold(
              body: Padding(
                padding: const EdgeInsets.all(CatchSpacing.s4),
                child: HostOfferPaymentModeTile(
                  mode: HostOfferPaymentMode.personalRequest,
                  selected: true,
                  editable: true,
                  checkoutAvailable: false,
                  onSelected: (_) {},
                  summary: true,
                ),
              ),
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Offer payment mode section',
  type: HostOfferPaymentModeSection,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostOfferPaymentModeSectionPreview(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'HostOfferPaymentModeSection',
      contractId: 'section.host.event.offer.payment.mode',
      children: [
        WidgetbookPageStateCard(
          label: 'expanded picker',
          child: WidgetbookHostDeviceFrame(
            child: Scaffold(
              body: SingleChildScrollView(
                child: HostOfferPaymentModeSection(
                  mode: null,
                  pickerExpanded: true,
                  editable: true,
                  checkoutAvailable: false,
                  first: true,
                  onSelected: (_) {},
                  onExpandPicker: () {},
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
                child: HostOfferPaymentModeSection(
                  mode: HostOfferPaymentMode.reusablePage,
                  pickerExpanded: false,
                  editable: true,
                  checkoutAvailable: false,
                  first: true,
                  onSelected: (_) {},
                  onExpandPicker: () {},
                ),
              ),
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Offer payment details',
  type: HostOfferPaymentDetailsSection,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostOfferPaymentDetailsSectionPreview(BuildContext context) {
  Widget card(String label, HostOfferPaymentMode mode) =>
      WidgetbookPageStateCard(
        label: label,
        child: WidgetbookHostDeviceFrame(
          child: Scaffold(
            body: SingleChildScrollView(
              child: HostOfferPaymentDetailsSection(
                mode: mode,
                editable: true,
                amountController: TextEditingController(text: '1200'),
                currencyController: TextEditingController(text: 'INR'),
                customValidityController: TextEditingController(),
                pageUrlController: TextEditingController(
                  text: 'https://pay.catch.app/p/saturday-mixer',
                ),
                instructionsController: TextEditingController(
                  text: 'UPI to saturdaymixer@okhdfc',
                ),
                messageController: TextEditingController(),
                validityCustom: false,
                validityMinutes: 1440,
                reuseAttested: true,
                resolvedExpiryMillis: 1791043800000,
                openEditor: null,
                instructionsError: null,
                onFieldChanged: () {},
                onValiditySelected: ({required custom, minutes}) {},
                onValidityMinutesChanged: (_) {},
                onReuseAttestedChanged: (_) {},
                onInstructionsOpenChanged: (_) {},
                onInstructionsCancel: () {},
                onInstructionsSubmit: () {},
                onInstructionsChanged: (_) {},
                onMessageOpenChanged: (_) {},
                onMessageCancel: () {},
                onMessageSubmit: () {},
              ),
            ),
          ),
        ),
      );
  return WidgetbookPageCatalogFrame(
    title: 'HostOfferPaymentDetailsSection',
    contractId: 'section.host.event.offer.payment.details',
    children: [
      card('manual instructions', HostOfferPaymentMode.manualInstructions),
      card('reusable page', HostOfferPaymentMode.reusablePage),
      card('free offer', HostOfferPaymentMode.free),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Offer payment confirmation contract',
  type: HostOfferPaymentConfirmationSection,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostOfferPaymentConfirmationSectionPreview(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'HostOfferPaymentConfirmationSection',
      contractId: 'section.host.event.offer.payment.confirmation',
      children: [
        for (final mode in HostOfferPaymentMode.values)
          WidgetbookPageStateCard(
            label: mode.name,
            child: WidgetbookHostDeviceFrame(
              child: Scaffold(
                body: SingleChildScrollView(
                  child: HostOfferPaymentConfirmationSection(mode: mode),
                ),
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Offer payment review sheet',
  type: HostOfferPaymentReviewSheet,
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
    title: 'HostOfferPaymentReviewSheet',
    contractId: 'sheet.host.event.offer.payment.review',
    children: [
      WidgetbookPageStateCard(
        label: 'changed terms',
        child: WidgetbookHostDeviceFrame(
          child: Scaffold(
            body: HostOfferPaymentReviewSheet(
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
  type: HostOfferPaymentSetupPageBody,
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
    title: 'HostOfferPaymentSetupPageBody',
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
