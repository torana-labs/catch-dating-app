import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_publication_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_event_offer_preferences_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_private_event_basics_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_private_event_listing_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_content_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_create_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_details_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_details_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_preferences_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_setup_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_private_event_setup_inventory_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_target_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations/host_manager_event_setup_preferences_section.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import 'event_editor_preview.dart';
import 'operations/fixtures.dart';
import 'operations/preview.dart';

@widgetbook.UseCase(
  name: 'Required private basics',
  type: PrivateEventCreateScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget privateEventCreateScreenPreview(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'PrivateEventCreateScreen',
      contractId: 'screen.host.event.private.basics',
      children: [
        WidgetbookPageStateCard(
          label: 'first save',
          child: WidgetbookHostDeviceFrame(
            child: ProviderScope(
              child: PrivateEventCreateScreen(
                club: widgetbookClub,
                promptForDraftsOnStart: false,
                create:
                    ({
                      required organizerId,
                      required requestId,
                      required basics,
                    }) => Future<PrivateEventCreateReceipt>.error(
                      StateError('Preview does not submit events'),
                    ),
              ),
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Saved private event setup',
  type: PrivateEventSetupScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget privateEventSetupScreenPreview(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'PrivateEventSetupScreen',
      contractId: 'screen.host.event.private.setup',
      children: [
        WidgetbookPageStateCard(
          label: 'private with optional capabilities',
          child: WidgetbookHostDeviceFrame(
            child: PrivateEventSetupScreen(
              club: widgetbookClub,
              receipt: const PrivateEventCreateReceipt(
                eventId: 'preview-private-event',
                setupRevision: 1,
                replayed: false,
              ),
              name: 'Saturday mixer',
              date: DateTime(2026, 10, 3),
              start: const TimeOfDay(hour: 19, minute: 0),
              cityLabel: 'Mumbai',
              pendingRosterFileName: 'guests.csv',
              onClose: () => Navigator.of(context).maybePop(),
            ),
          ),
        ),
      ],
    );

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
  name: 'Private event payment preferences',
  type: PrivateEventPreferencesScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget privateEventPreferencesScreenPreview(BuildContext context) {
  final hash = List.filled(64, 'a').join();
  final event = PrivateEventBasicSummary(
    eventId: 'preview-private-event',
    organizerId: 'preview-club',
    setupRevision: 1,
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
  );
  final defaults = ManagerEventSetupDefaults(
    organizerId: 'preview-club',
    cityId: 'in-mh-mumbai',
    marketId: 'in-mh-mumbai',
    timezone: 'Asia/Kolkata',
    organizerDefaultsRevision: 1,
    basicsReviewedHash: hash,
    preferencesRevision: 1,
    preferences: const ManagerEventSetupPreferences(
      timezone: 'Asia/Kolkata',
      offerValidityMinutes: 1440,
      collectionPreference: EventCollectionPreference.manualInstructions,
      currency: 'INR',
      paymentInstructions: 'Pay after your place is offered.',
    ),
    preferencesHash: hash,
    reviewedDefaultsHash: hash,
  );
  return WidgetbookPageCatalogFrame(
    title: 'PrivateEventPreferencesScreen',
    contractId: 'screen.host.event.private.preferences',
    children: [
      WidgetbookPageStateCard(
        label: 'manager read; payment activation separate',
        child: WidgetbookHostDeviceFrame(
          child: eventPreferencesPreview(
            EventPreferencesEditorState(event: event, defaults: defaults),
            onBack: () => Navigator.of(context).maybePop(),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Saved private event details',
  type: PrivateEventDetailsScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget privateEventDetailsScreenPreview(BuildContext context) =>
    _privateEventDetailsPreview(context);

@widgetbook.UseCase(
  name: 'Optional itinerary and artwork',
  type: PrivateEventContentSection,
  path: '[P1 product surfaces]/Host operations',
)
Widget privateEventContentSectionPreview(BuildContext context) =>
    _privateEventDetailsPreview(context, contentOnly: true);

Widget _privateEventDetailsPreview(
  BuildContext context, {
  bool contentOnly = false,
}) {
  final hash = List.filled(64, 'a').join();
  const scope = (
    userId: 'preview-host',
    organizerId: 'preview-club',
    eventId: 'preview-private-event',
  );
  final event = const PrivateEventBasicSummary(
    eventId: 'preview-private-event',
    organizerId: 'preview-club',
    setupRevision: 1,
    name: 'Saturday mixer',
    city: EventSetupCity(cityId: 'in-mh-mumbai', marketId: 'in-mh-mumbai'),
    localDate: '2026-10-03',
    localStartTime: '19:00',
    timezone: 'Asia/Kolkata',
    startTimeMillis: 1791043800000,
    status: 'active',
    setupDefaults: {},
    detailsConfigured: false,
    eventPreferences: null,
  );
  final defaults = ManagerEventSetupDefaults(
    organizerId: 'preview-club',
    cityId: 'in-mh-mumbai',
    marketId: 'in-mh-mumbai',
    timezone: 'Asia/Kolkata',
    organizerDefaultsRevision: 1,
    basicsReviewedHash: hash,
    preferencesRevision: 1,
    preferences: const ManagerEventSetupPreferences(usualDurationMinutes: 90),
    preferencesHash: hash,
    reviewedDefaultsHash: hash,
  );
  return WidgetbookPageCatalogFrame(
    title: 'PrivateEventDetailsScreen',
    contractId: 'screen.host.event.private.details',
    children: [
      WidgetbookPageStateCard(
        label: 'saved event with optional detail suggestions',
        child: WidgetbookHostDeviceFrame(
          child: ProviderScope(
            overrides: [
              uidProvider.overrideWith((ref) => Stream.value(scope.userId)),
              privateEventDetailsDependenciesProvider.overrideWithValue(
                PrivateEventDetailsDependencies(
                  readEvent: ({required organizerId, required eventId}) async =>
                      event,
                  readDefaults: (_) async => defaults,
                  write: (_) async =>
                      throw StateError('Preview does not submit details'),
                ),
              ),
              privateEventDetailsControllerProvider(scope).overrideWith(
                () => _PreviewPrivateEventDetailsController(event, defaults),
              ),
            ],
            child: contentOnly
                ? Consumer(
                    builder: (context, ref, child) {
                      final provider = privateEventDetailsControllerProvider(
                        scope,
                      );
                      return Scaffold(
                        body: SingleChildScrollView(
                          child: PrivateEventContentSection(
                            state: ref.watch(provider),
                            controller: ref.read(provider.notifier),
                          ),
                        ),
                      );
                    },
                  )
                : PrivateEventDetailsScreen(
                    scope: scope,
                    onBack: () => Navigator.of(context).maybePop(),
                  ),
          ),
        ),
      ),
    ],
  );
}

class _PreviewPrivateEventDetailsController
    extends PrivateEventDetailsController {
  _PreviewPrivateEventDetailsController(this._event, this._defaults);

  final PrivateEventBasicSummary _event;
  final ManagerEventSetupDefaults _defaults;

  @override
  PrivateEventDetailsState build(PrivateEventDetailsScope scope) =>
      super.build(scope).copyWith(event: _event, defaults: _defaults);
}

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
  name: 'Private event manager inventory',
  type: HostPrivateEventSetupInventorySection,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostPrivateEventSetupInventorySectionPreview(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'HostPrivateEventSetupInventorySection',
      contractId: 'section.host.event.private.inventory',
      children: [
        WidgetbookPageStateCard(
          label: 'upcoming saved private event',
          child: WidgetbookHostDeviceFrame(
            child: Scaffold(
              body: SingleChildScrollView(
                child: HostPrivateEventSetupInventorySection(
                  organizerId: 'preview-club',
                  read:
                      ({
                        required organizerId,
                        required limit,
                        cursor,
                        scope,
                      }) async =>
                          scope != null &&
                              scope != PrivateEventSetupScope.upcoming
                          ? const PrivateEventSetupInventoryPage(
                              events: [],
                              nextCursor: null,
                            )
                          : const PrivateEventSetupInventoryPage(
                              events: [
                                PrivateEventSetupInventoryItem(
                                  eventId: 'preview-private-event',
                                  name: 'Saturday mixer',
                                  city: EventSetupCity(
                                    cityId: 'in-mh-mumbai',
                                    marketId: 'in-mh-mumbai',
                                  ),
                                  localDate: '2026-10-03',
                                  localStartTime: '19:00',
                                  timezone: 'Asia/Kolkata',
                                  startTimeMillis: 1791043800000,
                                  setupRevision: 2,
                                  detailsConfigured: false,
                                ),
                              ],
                              nextCursor: null,
                            ),
                  openSaved: (_) async {},
                ),
              ),
            ),
          ),
        ),
      ],
    );

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

@widgetbook.UseCase(
  name: 'Private listing and admission terms',
  type: HostPrivateEventListingSection,
  path: '[P1 product surfaces]/Host operations',
)
Widget privateEventListingPreview(BuildContext context) =>
    privateEventDetailsScreenPreview(context);

@widgetbook.UseCase(
  name: 'Listing requirements before publishing',
  type: EventPublicationScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget eventPublicationPrivatePreview(BuildContext context) =>
    const _PublicationPreview(published: false);

@widgetbook.UseCase(
  name: 'Published listing controls',
  type: EventPublicationScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget eventPublicationPublishedPreview(BuildContext context) =>
    const _PublicationPreview(published: true);

class _PublicationPreview extends StatefulWidget {
  const _PublicationPreview({required this.published});
  final bool published;
  @override
  State<_PublicationPreview> createState() => _PublicationPreviewState();
}

class _PublicationPreviewState extends State<_PublicationPreview> {
  PrivateEventBasicSummary get event => PrivateEventBasicSummary(
    eventId: 'preview-event',
    organizerId: 'preview-club',
    setupRevision: 1,
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
    detailsConfigured: widget.published,
    eventPreferences: null,
    publicationState: widget.published ? 'published' : 'private',
    publicationReadiness: EventPublicationReadiness(
      canPublish: widget.published,
      missing: widget.published
          ? const []
          : const ['venue', 'description', 'admissionTerms'],
    ),
  );

  @override
  Widget build(BuildContext context) => WidgetbookHostDeviceFrame(
    child: eventPublicationPreview(
      event,
      onBack: () => Navigator.of(context).maybePop(),
      onEditDetails: widget.published ? null : () {},
    ),
  );
}

@widgetbook.UseCase(
  name: 'First-save basics fields',
  type: HostPrivateEventBasicsSection,
  path: '[P1 product surfaces]/Host operations',
)
Widget privateEventBasicsSectionPreview(BuildContext context) =>
    privateEventCreateScreenPreview(context);
