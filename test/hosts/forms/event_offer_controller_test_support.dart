import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_form_admission_gateway.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_admission.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_review_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_workspace_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_workspace_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_admission_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_admission_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
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
            listOffers: listOffers,
            getOffer: getOffer,
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
  String? get nextOfferCursor => snapshot.nextOfferCursor;
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
  Future<void> fetchMoreOffers() => notifier.fetchMoreOffers();
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

class TestHostEventOfferWorkspaceSection extends StatelessWidget {
  const TestHostEventOfferWorkspaceSection({
    super.key,
    required this.organizerId,
    required this.accountId,
    this.queryController,
    this.responseId,
    this.recipientLabel,
    required this.offerController,
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
    required this.copy,
    required this.now,
    this.initiallyReviewSelection = false,
    this.initialEventId,
    this.initialEventTarget,
    this.onCreateEvent,
    this.admissionSession,
    this.layoutBuilder,
  });

  final Widget Function(Widget body, Widget? primaryAction)? layoutBuilder;
  final String organizerId;
  final String? accountId;
  final HostResponseQueryController? queryController;
  final String? responseId;
  final String? recipientLabel;
  final TestHostEventOfferController offerController;
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
  final HostEventOfferWorkspaceCopy copy;
  final DateTime Function() now;
  final bool initiallyReviewSelection;
  final String? initialEventId;
  final HostOfferEventTarget? initialEventTarget;

  /// Starts the manager's inline event creation route. The parent owns the
  /// return: a saved event comes back through [initialEventTarget] and this
  /// selection is revalidated before any offer is drafted. Null keeps the
  /// create action hidden while private event setup stays release gated.
  final Future<void> Function()? onCreateEvent;
  final HostFormAdmissionSession Function(
    HostEventOffer offer,
    String responseId,
  )?
  admissionSession;

  @override
  Widget build(BuildContext context) => UncontrolledProviderScope(
    container: offerController.container,
    child: HostEventOfferWorkspaceSection(
      organizerId: organizerId,
      accountId: accountId,
      queryController: queryController,
      responseId: responseId,
      recipientLabel: recipientLabel,
      offerScope: offerController.scope,
      listOffers: listOffers,
      getOffer: getOffer,
      prepareHandoff: prepareHandoff,
      copyMessage: copyMessage,
      openHandoff: openHandoff,
      targets: targets,
      getResponseDetail: getResponseDetail,
      isResponseReviewed: isResponseReviewed,
      openResponseForConversion: openResponseForConversion,
      openEventSettings: openEventSettings,
      copy: copy,
      now: now,
      initiallyReviewSelection: initiallyReviewSelection,
      initialEventId: initialEventId,
      initialEventTarget: initialEventTarget,
      onCreateEvent: onCreateEvent,
      admissionSession: admissionSession,
      layoutBuilder: layoutBuilder,
    ),
  );
}

class TestHostEventOfferReviewSection extends StatelessWidget {
  const TestHostEventOfferReviewSection({
    super.key,
    required this.controller,
    required this.draft,
    required this.eventTitle,
    required this.contactLabel,
    required this.eventStartsAt,
    required this.now,
    required this.commitRequestId,
    required this.copy,
    this.amountLabel,
    this.showEvent = true,
    this.layoutBuilder,
  });

  final TestHostEventOfferController controller;
  final HostOfferBatchDraft draft;
  final String eventTitle;
  final String Function(String contactId) contactLabel;
  final DateTime eventStartsAt;
  final DateTime Function() now;
  final String commitRequestId;
  final HostEventOfferReviewCopy copy;
  final String? amountLabel;
  final bool showEvent;
  final Widget Function(Widget body, Widget? primaryAction)? layoutBuilder;

  @override
  Widget build(BuildContext context) => UncontrolledProviderScope(
    container: controller.container,
    child: HostEventOfferReviewSection(
      scope: controller.scope,
      draft: draft,
      eventTitle: eventTitle,
      contactLabel: contactLabel,
      eventStartsAt: eventStartsAt,
      now: now,
      commitRequestId: commitRequestId,
      copy: copy,
      amountLabel: amountLabel,
      showEvent: showEvent,
      layoutBuilder: layoutBuilder,
    ),
  );
}

class TestHostManualPaymentReviewSection extends StatelessWidget {
  const TestHostManualPaymentReviewSection({
    super.key,
    required this.controller,
    required this.offer,
    required this.copy,
    required this.referenceRequestId,
    required this.reviewRequestId,
    required this.onUpdated,
    this.layoutBuilder,
  });

  final TestHostEventOfferController controller;
  final HostEventOffer offer;
  final HostEventOfferReviewCopy copy;
  final String referenceRequestId;
  final String reviewRequestId;
  final ValueChanged<HostEventOffer> onUpdated;
  final Widget Function(Widget body, Widget? primaryAction)? layoutBuilder;

  @override
  Widget build(BuildContext context) => UncontrolledProviderScope(
    container: controller.container,
    child: HostManualPaymentReviewSection(
      scope: controller.scope,
      offer: offer,
      copy: copy,
      referenceRequestId: referenceRequestId,
      reviewRequestId: reviewRequestId,
      onUpdated: onUpdated,
      layoutBuilder: layoutBuilder,
    ),
  );
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

class TestHostFormAdmissionSection extends StatefulWidget {
  const TestHostFormAdmissionSection({
    super.key,
    required this.createController,
    required this.onAdmitted,
  });
  final TestHostFormAdmissionController Function() createController;
  final Future<void> Function() onAdmitted;
  @override
  State<TestHostFormAdmissionSection> createState() =>
      _TestHostFormAdmissionSectionState();
}

class _TestHostFormAdmissionSectionState
    extends State<TestHostFormAdmissionSection> {
  late final controller = widget.createController();
  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => UncontrolledProviderScope(
    container: controller.container,
    child: HostFormAdmissionSection(
      session: controller.session,
      onAdmitted: widget.onAdmitted,
    ),
  );
}
