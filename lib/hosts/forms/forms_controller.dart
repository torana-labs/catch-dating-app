import 'package:catch_dating_app/contexts/forms/data/event_offer_configuration_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_event_offer_gateway.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'forms_controller.g.dart';

/// Making a form from a template. The screens watch it for pending and run
/// the existing create command through it.
final hostFormCreateMutation = Mutation<HostFormEditor>();

/// Reviewing an application (let in, not now), keyed by application id so
/// each row shows its own pending state.
final hostFormReviewMutation = Mutation<void>();

/// Adding a response's person to People, keyed by response id.
final hostFormConversionMutation = Mutation<void>();

/// The callable gateways an offer reads and commits through.
typedef HostOfferGateways = ({
  CallableHostEventOfferGateway offers,
  CallableHostOfferEventTargetsGateway targets,
});

/// The offer gateways over the signed-in app's Functions client.
@riverpod
HostOfferGateways hostOfferGateways(Ref ref) {
  final functions = ref.watch(firebaseFunctionsProvider);
  return (
    offers: CallableHostEventOfferGateway(functions),
    targets: CallableHostOfferEventTargetsGateway(
      functions,
      configurations: ref.watch(eventOfferConfigurationReadsProvider),
    ),
  );
}
