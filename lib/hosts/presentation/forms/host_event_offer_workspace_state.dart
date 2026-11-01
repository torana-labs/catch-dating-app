part of 'host_event_offer_workspace_controller.dart';

enum HostOfferWorkspaceStage {
  idle,
  loadingEvents,
  preparingOffer,
  loadingOffer,
  preparingMessage,
}

typedef HostEventOfferWorkspaceScope = ({
  HostEventOfferScope offers,
  HostResponseQueryController? query,
  String? responseId,
  String? initialEventId,
  String? initialTargetId,
  int? initialTargetRevision,
});
@Riverpod(dependencies: [])
HostEventOfferWorkspaceDependencies hostEventOfferWorkspaceDependencies(
  // ignore: catch_ui_lints/catch_arch_provider_free_boundary -- route-scoped dependency seam; it only throws until the route overrides it
  Ref ref,
  HostEventOfferWorkspaceScope scope,
) => throw StateError(
  'Offer workspace dependencies must be supplied by its route.',
);

class HostEventOfferWorkspaceDependencies {
  HostEventOfferWorkspaceDependencies({
    required this.organizerId,
    required this.accountId,
    this.queryController,
    this.responseId,
    required this.offerScope,
    required this.listOffers,
    required this.getOffer,
    required this.prepareHandoff,
    required this.copyMessage,
    required this.openHandoff,
    required this.targets,
    required this.getResponseDetail,
    this.isResponseReviewed,
    required this.openResponseForConversion,
    required this.openEventSettings,
    required this.now,
    this.initialEventId,
    this.initialEventTarget,
  }) : assert((queryController == null) != (responseId == null));

  final String organizerId;
  final String? accountId;
  final HostResponseQueryController? queryController;
  final String? responseId;
  final HostEventOfferScope offerScope;
  final Future<Map<String, Object?>> Function({
    required String organizerId,
    required String eventId,
    String? afterOfferId,
  })
  listOffers;
  final Future<HostEventOffer> Function({
    required String organizerId,
    required String eventId,
    required String contactId,
  })
  getOffer;
  final Future<HostOfferHandoff> Function({required HostEventOffer offer})
  prepareHandoff;
  final Future<void> Function(String text) copyMessage;
  final Future<bool> Function(Uri uri) openHandoff;
  final HostOfferEventTargetsGateway targets;
  final Future<HostFormResponseDetail> Function(String responseId)
  getResponseDetail;
  final Future<bool> Function(HostFormResponseDetail)? isResponseReviewed;
  final Future<void> Function(String responseId) openResponseForConversion;
  final Future<void> Function(String eventId) openEventSettings;
  final DateTime Function() now;
  final String? initialEventId;

  /// A newly saved event read back through the manager-only setup projection.
  /// The configuration read in [_choose] still checks current event authority.
  final HostOfferEventTarget? initialEventTarget;
}

@freezed
abstract class HostEventOfferWorkspaceState
    with _$HostEventOfferWorkspaceState {
  const HostEventOfferWorkspaceState._();
  const factory HostEventOfferWorkspaceState({
    @Default(false) bool busy,
    @Default(HostOfferWorkspaceStage.idle) HostOfferWorkspaceStage stage,
    @Default(false) bool recoveringPending,
    @Default(false) bool refreshTargetOnRetry,
    Object? error,
    @Default(false) bool selectionStale,
    @Default([]) List<String> ids,
    String? resultHash,
    @Default([]) List<HostOfferEventTarget> events,
    String? nextEventCursor,
    HostOfferEventTarget? event,
    HostOfferEventConfiguration? configuration,
    @Default([]) List<HostFormResponseDetail> details,
    @Default([]) List<HostFormResponseDetail> missingContacts,
    @Default({}) Map<String, String> personalLinks,
    HostOfferBatchDraft? draft,
    String? commitRequestId,
    @Default([]) List<Map<String, Object?>> offers,
    String? nextOfferCursor,
    String? refreshedReceiptId,
    HostEventOffer? selectedOffer,
    HostOfferHandoff? handoff,
    String? referenceRequestId,
    String? reviewRequestId,
    @Default(false) bool messageCopied,
    @Default(false) bool handoffOpenFailed,
    @Default(HostOfferFlowView(status: HostOfferFlowStatus.idle))
    HostOfferFlowView offerFlow,
    @Default(true) bool actorAvailable,
  }) = _HostEventOfferWorkspaceState;
  bool get loading =>
      busy ||
      offerFlow.status == HostOfferFlowStatus.previewing ||
      offerFlow.status == HostOfferFlowStatus.committing;
  bool get hasUnresolvedCommand =>
      offerFlow.pendingRequestId != null &&
      offerFlow.status != HostOfferFlowStatus.committed;
  bool get preparing => stage == HostOfferWorkspaceStage.preparingOffer;
  bool get canCancelPreparation =>
      actorAvailable &&
      preparing &&
      !recoveringPending &&
      !hasUnresolvedCommand &&
      offerFlow.status != HostOfferFlowStatus.previewing &&
      offerFlow.status != HostOfferFlowStatus.committing;
  bool get hasError => error != null;
  bool get personalMode =>
      configuration?.paymentTerms?['preferredCollection'] == 'personalRequest';
  String? get selectedResponseId =>
      HostOfferWorkspacePolicy.selectedResponseId(selectedOffer, details);
}
