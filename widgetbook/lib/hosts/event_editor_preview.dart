import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_publication_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_publication_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_setup_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_preferences_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const previewEventScope = (
  userId: 'preview-host',
  organizerId: 'preview-club',
  eventId: 'preview-event',
);
const previewOfferScope = (
  accountId: 'manager_demo',
  organizerId: 'org_demo',
  sourceId: 'preview',
);

Widget eventPreferencesPreview(
  EventPreferencesEditorState state, {
  required VoidCallback onBack,
}) => ProviderScope(
  overrides: [
    uidProvider.overrideWith((ref) => Stream.value(previewEventScope.userId)),
    if (state.published) ...[
      eventOfferPreferencesDependenciesProvider.overrideWithValue(
        EventOfferPreferencesDependencies(
          readConfiguration: ({required organizerId, required eventId}) async =>
              state.configuration!,
          readDefaults: (_) async => state.defaults!,
          write: (_) async =>
              throw StateError('Preview does not submit settings'),
        ),
      ),
      eventOfferPreferencesControllerProvider(
        previewEventScope,
      ).overrideWith(() => _PublishedPreferencesPreview(state)),
    ] else ...[
      privateEventPreferencesDependenciesProvider.overrideWithValue(
        PrivateEventPreferencesDependencies(
          readEvent: ({required organizerId, required eventId}) async =>
              state.event!,
          readDefaults: (_) async => state.defaults!,
          write: (_) async =>
              throw StateError('Preview does not submit settings'),
        ),
      ),
      privateEventPreferencesControllerProvider(
        previewEventScope,
      ).overrideWith(() => _PrivatePreferencesPreview(state)),
    ],
  ],
  child: state.published
      ? HostOfferPaymentSetupPageBody(
          scope: previewEventScope,
          eventName: state.eventName,
          onBack: onBack,
        )
      : PrivateEventPreferencesScreen(scope: previewEventScope, onBack: onBack),
);

class _PrivatePreferencesPreview extends PrivateEventPreferencesController {
  _PrivatePreferencesPreview(this._initial);
  final EventPreferencesEditorState _initial;
  @override
  EventPreferencesEditorState build(EventEditorScope scope) {
    super.build(scope);
    return _initial;
  }
}

class _PublishedPreferencesPreview extends EventOfferPreferencesController {
  _PublishedPreferencesPreview(this._initial);
  final EventPreferencesEditorState _initial;
  @override
  EventPreferencesEditorState build(EventEditorScope scope) {
    super.build(scope);
    return _initial;
  }
}

Widget eventPublicationPreview(
  PrivateEventBasicSummary event, {
  required VoidCallback onBack,
  VoidCallback? onEditDetails,
}) => ProviderScope(
  overrides: [
    uidProvider.overrideWith((ref) => Stream.value(previewEventScope.userId)),
    eventPublicationDependenciesProvider.overrideWithValue(
      EventPublicationDependencies(
        read: ({required organizerId, required eventId}) async => event,
        write: (_) async =>
            throw StateError('Preview does not change publication'),
      ),
    ),
    eventPublicationControllerProvider(
      previewEventScope,
    ).overrideWith(() => _PublicationPreviewController(event)),
  ],
  child: EventPublicationScreen(
    scope: previewEventScope,
    onBack: onBack,
    onEditDetails: onEditDetails,
  ),
);

class _PublicationPreviewController extends EventPublicationController {
  _PublicationPreviewController(this._event);
  final PrivateEventBasicSummary _event;
  @override
  EventPublicationState build(EventEditorScope scope) =>
      super.build(scope).copyWith(event: _event);
}

Widget eventOfferPreview(HostEventOfferGateway gateway, Widget child) =>
    ProviderScope(
      overrides: [
        uidProvider.overrideWith(
          (ref) => Stream.value(previewOfferScope.accountId),
        ),
        hostEventOfferDependenciesProvider.overrideWithValue(
          HostEventOfferDependencies(gateway: gateway),
        ),
      ],
      child: child,
    );
