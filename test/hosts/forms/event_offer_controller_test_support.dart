import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_event_offer_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_form_admission_gateway.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_admission.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/forms/host_event_offer_controller.dart';
import 'package:catch_dating_app/hosts/forms/host_event_offer_workspace_controller.dart';
import 'package:catch_dating_app/hosts/forms/host_form_admission_controller.dart';
import 'package:catch_dating_app/hosts/forms/host_form_response_query_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/experimental/scope.dart';

class TestHostEventOfferController {
  TestHostEventOfferController(
    HostEventOfferGateway gateway, {
    HostOfferCommitOutbox? outbox,
    HostOfferMutationOutbox? mutationOutbox,
    String? accountId,
  }) {
    scope = (
      accountId: accountId ?? 'manager',
      organizerId: 'org',
      sourceId: Object(),
    );
    dependencies = HostEventOfferDependencies(
      gateway: gateway,
      outbox: outbox,
      mutationOutbox: mutationOutbox,
    );
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(scope.accountId)),
        hostEventOfferDependenciesProvider.overrideWithValue(dependencies),
      ],
    );
    container.listen(hostEventOfferControllerProvider(scope), (_, _) {});
  }
  late final HostEventOfferScope scope;
  late final HostEventOfferDependencies dependencies;
  late final ProviderContainer container;
  HostEventOfferController get notifier =>
      container.read(hostEventOfferControllerProvider(scope).notifier);
  HostOfferFlowView get view =>
      container.read(hostEventOfferControllerProvider(scope));
  void dispose() => container.dispose();
  Future<void> preview({
    required HostOfferBatchDraft draft,
    required DateTime now,
    required DateTime eventStartsAt,
  }) => notifier.preview(draft: draft, now: now, eventStartsAt: eventStartsAt);
  Future<void> commit(String id) => notifier.commit(id);
  Future<void> recoverPending({
    required String organizerId,
    required String eventId,
    bool Function()? isCurrent,
  }) => notifier.recoverPending(
    organizerId: organizerId,
    eventId: eventId,
    isCurrent: isCurrent,
  );
  Future<HostEventOffer> recordReference({
    required HostEventOffer offer,
    required String reference,
    required String requestId,
  }) => notifier.recordReference(
    offer: offer,
    reference: reference,
    requestId: requestId,
  );
  Future<HostEventOffer> reviewReference({
    required HostEventOffer offer,
    required HostManualPaymentStatus decision,
    required String note,
    required bool bankReceiptChecked,
    required String requestId,
  }) => notifier.reviewReference(
    offer: offer,
    decision: decision,
    note: note,
    bankReceiptChecked: bankReceiptChecked,
    requestId: requestId,
  );
}

// This fixture owns a ProviderContainer with both workspace families overridden.
@Dependencies([HostEventOfferWorkspaceController])
class TestHostEventOfferWorkspaceController {
  TestHostEventOfferWorkspaceController({
    required String organizerId,
    required String? accountId,
    HostResponseQueryController? queryController,
    String? responseId,
    required TestHostEventOfferController offerController,
    required Future<Map<String, Object?>> Function({
      required String organizerId,
      required String eventId,
      String? afterOfferId,
    })
    listOffers,
    required Future<HostEventOffer> Function({
      required String organizerId,
      required String eventId,
      required String contactId,
    })
    getOffer,
    required Future<HostOfferHandoff> Function({required HostEventOffer offer})
    prepareHandoff,
    required Future<void> Function(String text) copyMessage,
    required Future<bool> Function(Uri uri) openHandoff,
    required HostOfferEventTargetsGateway targets,
    required Future<HostFormResponseDetail> Function(String responseId)
    getResponseDetail,
    Future<bool> Function(HostFormResponseDetail)? isResponseReviewed,
    required Future<void> Function(String responseId) openResponseForConversion,
    required Future<void> Function(String eventId) openEventSettings,
    required DateTime Function() now,
    String? initialEventId,
    HostOfferEventTarget? initialEventTarget,
  }) {
    scope = (
      offers: offerController.scope,
      query: queryController,
      responseId: responseId,
      initialEventId: initialEventId,
      initialTargetId: initialEventTarget?.eventId,
      initialTargetRevision: initialEventTarget?.setupRevision,
    );
    container = ProviderContainer(
      parent: offerController.container,
      overrides: [
        hostEventOfferWorkspaceControllerProvider.overrideWith2(
          (_) => HostEventOfferWorkspaceController(),
        ),
        hostEventOfferWorkspaceDependenciesProvider.overrideWith(
          (ref, scope) => HostEventOfferWorkspaceDependencies(
            organizerId: organizerId,
            accountId: accountId,
            queryController: queryController,
            responseId: responseId,
            offerScope: offerController.scope,
            watchOffers: offersWatchFrom(listOffers),
            watchOffer: offerWatchFrom(getOffer),
            prepareHandoff: prepareHandoff,
            copyMessage: copyMessage,
            openHandoff: openHandoff,
            targets: targets,
            getResponseDetail: getResponseDetail,
            isResponseReviewed: isResponseReviewed,
            openResponseForConversion: openResponseForConversion,
            openEventSettings: openEventSettings,
            now: now,
            initialEventId: initialEventId,
            initialEventTarget: initialEventTarget,
          ),
        ),
      ],
    );
    container.listen(hostEventOfferWorkspaceControllerProvider(scope), (
      _,
      next,
    ) {
      _last = next;
    });
    _last = container.read(hostEventOfferWorkspaceControllerProvider(scope));
  }
  late HostEventOfferWorkspaceState _last;
  late final HostEventOfferWorkspaceScope scope;
  late final ProviderContainer container;
  HostEventOfferWorkspaceState? _disposedSnapshot;
  HostEventOfferWorkspaceController get notifier =>
      container.read(hostEventOfferWorkspaceControllerProvider(scope).notifier);
  HostEventOfferWorkspaceState get snapshot =>
      _disposedSnapshot ??
      container.read(hostEventOfferWorkspaceControllerProvider(scope));
  void dispose() {
    if (_disposedSnapshot != null) return;
    _disposedSnapshot = _last;
    container.dispose();
  }

  void addListener(VoidCallback callback) {
    container.listen(
      hostEventOfferWorkspaceControllerProvider(scope),
      (_, _) => callback(),
    );
  }

  bool get loading => snapshot.loading;
  bool get hasUnresolvedCommand => snapshot.hasUnresolvedCommand;
  HostOfferWorkspaceStage get stage => snapshot.stage;
  bool get preparing => snapshot.preparing;
  bool get canCancelPreparation => snapshot.canCancelPreparation;
  bool get hasError => snapshot.hasError;
  bool get selectionStale => snapshot.selectionStale;
  List<String> get ids => snapshot.ids;
  List<HostOfferEventTarget> get events => snapshot.events;
  String? get nextEventCursor => snapshot.nextEventCursor;
  HostOfferEventTarget? get event => snapshot.event;
  HostOfferEventConfiguration? get configuration => snapshot.configuration;
  List<HostFormResponseDetail> get details => snapshot.details;
  List<HostFormResponseDetail> get missingContacts => snapshot.missingContacts;
  HostOfferBatchDraft? get draft => snapshot.draft;
  String? get commitRequestId => snapshot.commitRequestId;
  List<Map<String, Object?>> get offers => snapshot.offers;
  HostEventOffer? get selectedOffer => snapshot.selectedOffer;
  String? get selectedResponseId => snapshot.selectedResponseId;
  HostOfferHandoff? get handoff => snapshot.handoff;
  String? get referenceRequestId => snapshot.referenceRequestId;
  String? get reviewRequestId => snapshot.reviewRequestId;
  bool get messageCopied => snapshot.messageCopied;
  bool get handoffOpenFailed => snapshot.handoffOpenFailed;
  bool get personalMode => snapshot.personalMode;
  Future<void> start() => notifier.start();
  Future<void> loadEvents() => notifier.loadEvents();
  Future<void> previewPersonal() => notifier.previewPersonal();
  Future<void> openSettings() => notifier.openSettings();
  Future<void> retry() => notifier.retry();
  Future<void> refreshOffers() => notifier.refreshOffers();
  Future<void> prepareSelectedHandoff() => notifier.prepareSelectedHandoff();
  Future<void> copyPreparedHandoff() => notifier.copyPreparedHandoff();
  Future<void> openPreparedWhatsapp() => notifier.openPreparedWhatsapp();
  void cancelPreparation() => notifier.cancelPreparation();
  void changeEvent() => notifier.changeEvent();
  void closeExisting() => notifier.closeExisting();
  Future<void> choose(HostOfferEventTarget event) => notifier.choose(event);
  Future<void> returnForConversion(String id) =>
      notifier.returnForConversion(id);
  Future<void> selectExisting(Map<String, Object?> item) =>
      notifier.selectExisting(item);
  void manualUpdated(HostEventOffer offer) => notifier.manualUpdated(offer);
  void setPersonalLink(String id, String value) =>
      notifier.setPersonalLink(id, value);
}

class TestHostFormAdmissionController {
  TestHostFormAdmissionController({
    required String accountId,
    required HostFormAdmissionScope scope,
    required HostFormAdmissionGateway gateway,
    required JournalHostFormAdmissionOutbox outbox,
    required String? Function() currentAccountId,
  }) {
    session = hostFormAdmissionSession(accountId, scope);
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(accountId)),
        hostFormAdmissionDependenciesProvider.overrideWithValue(
          HostFormAdmissionDependencies(
            gateway: gateway,
            outbox: outbox,
            currentAccountId: currentAccountId,
          ),
        ),
      ],
    );
    container.listen(hostFormAdmissionControllerProvider(session), (_, _) {});
  }
  late final HostFormAdmissionSession session;
  late final ProviderContainer container;
  HostFormAdmissionController get notifier =>
      container.read(hostFormAdmissionControllerProvider(session).notifier);
  HostFormAdmissionState get snapshot =>
      container.read(hostFormAdmissionControllerProvider(session));
  HostFormAdmissionPreview? get preview => snapshot.preview;
  PendingFormAdmission? get pending => snapshot.pending;
  HostFormAdmissionReceipt? get receipt => snapshot.receipt;
  Object? get error => snapshot.error;
  bool get busy => snapshot.busy;
  Future<void> review() => notifier.review();
  Future<void> confirm() => notifier.confirm();
  Future<void> reviewAgain() => notifier.reviewAgain();
  void dispose() => container.dispose();
}

/// A listener over a one-shot offer list fake: it delivers the fake's items
/// once, as the offers listener's first value.
HostEventOffersWatch offersWatchFrom(
  Future<Map<String, Object?>> Function({
    required String organizerId,
    required String eventId,
    String? afterOfferId,
  })
  listOffers,
) =>
    ({required organizerId, required eventId, required contactIds}) =>
        Stream.fromFuture(
          listOffers(organizerId: organizerId, eventId: eventId),
        ).map((response) {
          final items = response['items'];
          if (items is! List) {
            throw const FormatException('Offer list is invalid.');
          }
          return [
            for (final item in items) (item as Map).cast<String, Object?>(),
          ];
        });

/// A listener over a one-shot offer detail fake.
HostEventOfferWatch offerWatchFrom(
  Future<HostEventOffer> Function({
    required String organizerId,
    required String eventId,
    required String contactId,
  })
  getOffer,
) =>
    ({required organizerId, required eventId, required contactId}) =>
        Stream.fromFuture(
          getOffer(
            organizerId: organizerId,
            eventId: eventId,
            contactId: contactId,
          ),
        );
