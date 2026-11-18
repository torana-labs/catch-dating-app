import 'package:catch_dating_app/contexts/forms/data/forms/host_event_offer_gateway.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_event_offer_reads.dart';
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

/// Granting or revoking an applicant's community membership, keyed by
/// application id.
final hostFormMembershipMutation = Mutation<void>();

/// What an offer reads and commits through: offer and event listeners and
/// Firestore reads, and the offer commands' callables.
typedef HostOfferGateways = ({
  CallableHostEventOfferGateway offers,
  HostEventOfferReads reads,
  HostOfferEventTargetsGateway targets,
});

/// The offer gateways over the signed-in app's Firebase clients.
@riverpod
HostOfferGateways hostOfferGateways(Ref ref) {
  final reads = ref.watch(hostEventOfferReadsProvider);
  return (
    offers: CallableHostEventOfferGateway(
      ref.watch(firebaseFunctionsProvider),
      reads: reads,
    ),
    reads: reads,
    targets: ref.watch(hostOfferEventTargetsGatewayProvider),
  );
}
