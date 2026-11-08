import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_configuration_reads.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_setup_page_body.dart';
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
    eventOfferConfigurationProvider(
      organizerId: previewEventScope.organizerId,
      eventId: previewEventScope.eventId,
    ).overrideWith((ref) => Stream.value(state.configuration!)),
    managerEventSetupDefaultsViewProvider(
      previewEventScope.organizerId,
    ).overrideWith(
      (ref) =>
          Stream.value(ManagerEventSetupDefaultsView.complete(state.defaults!)),
    ),
    eventOfferPreferencesDependenciesProvider.overrideWithValue(
      EventOfferPreferencesDependencies(
        write: (_) async =>
            throw StateError('Preview does not submit settings'),
      ),
    ),
    eventOfferPreferencesControllerProvider(
      previewEventScope,
    ).overrideWith(() => _PublishedPreferencesPreview(state)),
  ],
  child: HostOfferPaymentSetupPageBody(
    scope: previewEventScope,
    eventName: state.eventName,
    onBack: onBack,
  ),
);

class _PublishedPreferencesPreview extends EventOfferPreferencesController {
  _PublishedPreferencesPreview(this._initial);
  final EventPreferencesEditorState _initial;
  @override
  EventPreferencesEditorState build(EventEditorScope scope) {
    super.build(scope);
    return _initial;
  }
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
