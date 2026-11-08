import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_admission.dart';
import 'package:catch_dating_app/hosts/forms/forms_controller.dart';
import 'package:catch_dating_app/hosts/forms/offer_body.dart';
import 'package:catch_dating_app/hosts/forms/offer_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_workspace_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_admission_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_manual_payment_review_controller.dart';
import 'package:catch_kernel/country_markets.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/clipboard.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/experimental/scope.dart';

/// Offering one person a place at an event.
///
/// Mounts the offer workspace for the signed-in manager and this response:
/// it lists the organizer's events, prepares the offer from the chosen
/// event's terms, sends it through the existing offer command, prepares the
/// WhatsApp message, records a manual payment check and lets the person in
/// through the existing admission command. The workspace is owned by this
/// route, so pending work is disposed with it.
class HostOfferScreen extends ConsumerStatefulWidget {
  const HostOfferScreen({
    super.key,
    required this.organizerId,
    required this.responseId,
    this.recipientLabel,
  });

  final String organizerId;
  final String responseId;

  /// The name from the answer the offer was opened from; fresh reads still
  /// decide whether this person can be offered.
  final String? recipientLabel;

  @override
  ConsumerState<HostOfferScreen> createState() => _HostOfferScreenState();
}

class _HostOfferScreenState extends ConsumerState<HostOfferScreen> {
  String? _accountId;
  bool _accountLost = false;

  @override
  Widget build(BuildContext context) {
    final account = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = account.isSettledData ? account.value : null;
    final liveUid = ref.watch(firebaseAuthProvider).currentUser?.uid;
    if (_accountId != null && (uid != _accountId || liveUid != _accountId)) {
      _accountLost = true;
    }
    final available = !_accountLost && uid != null && uid == liveUid;
    if (!available) {
      final l10n = context.l10n;
      return CatchRoot(
        child: CatchScreen(
          topBar: hostOfferTopBar(l10n, widget.recipientLabel),
          body: CatchPageBody(
            child: CatchEmptyState(
              icon: CatchIcons.people,
              title: l10n.hostFormsOfferUnavailable,
            ),
          ),
        ),
      );
    }
    _accountId = uid;
    final offers = (
      accountId: uid,
      organizerId: widget.organizerId,
      sourceId: widget.responseId,
    );
    ref.watch(hostEventOfferControllerProvider(offers));
    final scope = (
      offers: offers,
      query: null,
      responseId: widget.responseId,
      initialEventId: null,
      initialTargetId: null,
      initialTargetRevision: null,
    );
    final gateways = ref.read(hostOfferGatewaysProvider);
    final gateway = gateways.offers;
    return _HostOfferScope(
      scope: scope,
      recipient: widget.recipientLabel,
      dependencies: HostEventOfferWorkspaceDependencies(
        organizerId: widget.organizerId,
        accountId: uid,
        responseId: widget.responseId,
        offerScope: offers,
        listOffers: gateway.listOffers,
        getOffer: gateway.getOffer,
        prepareHandoff: gateway.prepareHandoff,
        copyMessage: (text) =>
            ref.read(clipboardControllerProvider).copyText(text),
        openHandoff: (uri) =>
            ref.read(externalLinkControllerProvider).openExternal(uri),
        targets: gateways.targets,
        getResponseDetail: (id) => ref.refresh(
          hostFormResponseDetailProvider(
            organizerId: widget.organizerId,
            responseId: id,
          ).future,
        ),
        isResponseReviewed: (detail) async {
          final id = detail.applicationId;
          if (id == null) return true;
          final application = await ref.refresh(
            hostApplicationDetailProvider(widget.organizerId, id).future,
          );
          return application.reviewStatus ==
                  HostApplicationReviewStatus.approved &&
              application.dataAccessState != 'revokedParticipantGrant';
        },
        openResponseForConversion: (id) => context.pushNamed<void>(
          Routes.hostResponseOfferReviewScreen.name,
          pathParameters: {'responseId': id},
          queryParameters: {
            ...GoRouterState.of(context).uri.queryParameters,
            'organizerId': widget.organizerId,
          },
        ),
        openEventSettings: (eventId) => context.pushNamed<void>(
          Routes.hostResponseOfferPreferencesScreen.name,
          pathParameters: {'eventId': eventId, 'responseId': widget.responseId},
          queryParameters: {
            ...GoRouterState.of(context).uri.queryParameters,
            'organizerId': widget.organizerId,
          },
        ),
        now: DateTime.now,
      ),
    );
  }
}

/// The offer's top bar: Offer a place, to whom, and Close.
CatchTopBar hostOfferTopBar(AppLocalizations l10n, String? recipient) =>
    CatchTopBar(
      variant: CatchTopBarVariant.tool,
      title: l10n.hostFormsOfferTitle,
      kicker: recipient == null ? null : l10n.hostFormsOfferTo(name: recipient),
      back: CatchTopBarBack(label: l10n.hostFormsClose, close: true),
    );

/// Owns the offer workspace for this route: the workspace and its
/// dependencies are overridden here, so pending work is disposed with it.
class _HostOfferScope extends StatelessWidget {
  const _HostOfferScope({
    required this.scope,
    required this.dependencies,
    this.recipient,
  });

  final HostEventOfferWorkspaceScope scope;
  final HostEventOfferWorkspaceDependencies dependencies;
  final String? recipient;

  @override
  Widget build(BuildContext context) => ProviderScope(
    overrides: [
      hostEventOfferWorkspaceControllerProvider.overrideWith2(
        (_) => HostEventOfferWorkspaceController(),
      ),
      hostEventOfferWorkspaceDependenciesProvider.overrideWith(
        (ref, _) => dependencies,
      ),
    ],
    child: _HostOfferFrame(
      key: ValueKey(scope),
      scope: scope,
      recipient: recipient,
    ),
  );
}

/// The offer frame inside the route's workspace scope: it watches the
/// workspace, the payment check and the admission, and draws the screen.
@Dependencies([HostEventOfferWorkspaceController])
class _HostOfferFrame extends ConsumerStatefulWidget {
  const _HostOfferFrame({super.key, required this.scope, this.recipient});

  final HostEventOfferWorkspaceScope scope;
  final String? recipient;

  @override
  ConsumerState<_HostOfferFrame> createState() => _HostOfferFrameState();
}

class _HostOfferFrameState extends ConsumerState<_HostOfferFrame> {
  String _reference = '';
  String _manualNote = '';
  bool _bankChecked = false;

  HostEventOfferWorkspaceController get _workspace => ref.read(
    hostEventOfferWorkspaceControllerProvider(widget.scope).notifier,
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(_workspace.start());
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final scope = widget.scope;
    final topBar = hostOfferTopBar(l10n, widget.recipient);
    final ws = ref.watch(hostEventOfferWorkspaceControllerProvider(scope));
    final offer = ws.selectedOffer;
    final manualApplies = offer != null && _manualApplies(offer);
    final manualScope =
        manualApplies &&
            ws.referenceRequestId != null &&
            ws.reviewRequestId != null
        ? (
            offers: scope.offers,
            offer: offer,
            referenceRequestId: ws.referenceRequestId!,
            reviewRequestId: ws.reviewRequestId!,
          )
        : null;
    final manual = manualScope == null
        ? null
        : ref.watch(hostManualPaymentReviewControllerProvider(manualScope));
    if (manualScope != null) {
      ref.listen(hostManualPaymentReviewControllerProvider(manualScope), (
        previous,
        next,
      ) {
        final updated = next.updatedOffer;
        if (updated != null && updated != previous?.updatedOffer) {
          _workspace.manualUpdated(updated);
        }
      });
    }
    final responseId = ws.selectedResponseId;
    final accountId = scope.offers.accountId;
    final session =
        offer != null &&
            offer.effectiveStatus == HostOfferStatus.offered &&
            responseId != null &&
            accountId != null
        ? hostFormAdmissionSession(
            accountId,
            HostFormAdmissionScope.fromOffer(offer, responseId: responseId),
          )
        : null;
    final admission = session == null
        ? null
        : ref.watch(hostFormAdmissionControllerProvider(session));
    final state = _state(l10n, ws, manual, admission);
    return CatchRoot(
      child: CatchScreen(
        topBar: topBar,
        body: HostOfferBody(
          state: state,
          bankChecked: _bankChecked,
          onChoose: (event) {
            final target = ws.events
                .where((target) => target.eventId == event.id)
                .firstOrNull;
            if (target != null) unawaited(_workspace.choose(target));
          },
          onLoadMoreEvents: () => unawaited(_workspace.loadEvents()),
          onAddToPeople: (id) => unawaited(_workspace.returnForConversion(id)),
          onOpenSettings: () => unawaited(_workspace.openSettings()),
          onPersonalLink: _workspace.setPersonalLink,
          onOpenExisting: (item) => unawaited(_workspace.selectExisting(item)),
          onPrepareMessage: () =>
              unawaited(_workspace.prepareSelectedHandoff()),
          onOpenWhatsapp: () => unawaited(_workspace.openPreparedWhatsapp()),
          onCopyMessage: () => unawaited(_workspace.copyPreparedHandoff()),
          onReference: (value) => setState(() => _reference = value),
          onManualNote: (value) => _manualNote = value,
          onBankChecked: (value) => setState(() => _bankChecked = value),
          onAdmit: session == null
              ? () {}
              : () => unawaited(_admit(session, state.selected?.admission)),
          onRetry: () => unawaited(_workspace.retry()),
        ),
        dock: _dock(l10n, ws, state, manualScope, manual),
      ),
    );
  }

  HostOfferState _state(
    AppLocalizations l10n,
    HostEventOfferWorkspaceState ws,
    HostManualPaymentReviewState? manual,
    HostFormAdmissionState? admission,
  ) {
    String? nameOf(String? contactId) => ws.details
        .where((detail) => detail.contactId == contactId)
        .firstOrNull
        ?.response
        .identity
        .primaryLabel;
    final event = ws.event;
    final configuration = ws.configuration;
    final draft = ws.draft;
    final selected = ws.selectedOffer;
    final flow = ws.offerFlow;
    final sameDraft = draft != null && identical(flow.draft, draft);
    final HostOfferStage stage;
    if (event == null) {
      stage = ws.events.isEmpty && ws.loading
          ? HostOfferStage.loading
          : HostOfferStage.events;
    } else if (ws.preparing) {
      stage = HostOfferStage.loading;
    } else if (ws.missingContacts.isNotEmpty) {
      stage = HostOfferStage.needsContact;
    } else if (configuration != null &&
        configuration.suggestedExpiresAt == null) {
      stage = HostOfferStage.needsSettings;
    } else if (selected != null) {
      stage = HostOfferStage.selected;
    } else if (draft != null && ws.commitRequestId != null) {
      stage = HostOfferStage.review;
    } else if (ws.personalMode && configuration != null) {
      stage = HostOfferStage.personalLinks;
    } else if (ws.offers.isNotEmpty) {
      stage = HostOfferStage.existing;
    } else {
      stage = ws.loading ? HostOfferStage.loading : HostOfferStage.events;
    }
    final terms = configuration?.paymentTerms;
    final amountMinor = terms?['expectedAmountMinor'];
    final currency = terms?['currency'];
    final handoff = ws.handoff;
    return HostOfferState(
      stage: stage,
      recipient: widget.recipient,
      events: [for (final target in ws.events) _event(target)],
      canLoadMoreEvents: ws.nextEventCursor != null && event == null,
      event: event == null ? null : _event(event),
      missing: [
        for (final detail in ws.missingContacts)
          HostOfferPerson(
            id: detail.response.responseId,
            name: detail.response.identity.primaryLabel,
          ),
      ],
      personal: [
        for (final detail in ws.details)
          if (detail.contactId case final contactId?)
            HostOfferPerson(
              id: contactId,
              name: detail.response.identity.primaryLabel,
            ),
      ],
      recipients: [
        for (final row in draft?.rows ?? const <HostOfferRow>[])
          nameOf(row.contactId) ?? l10n.hostFormsAnonymous,
      ],
      amount: amountMinor == 0
          ? l10n.hostFormsOfferFree
          : amountMinor is int && currency is String
          ? formatMinorCurrency(amountMinor, currencyCode: currency)
          : null,
      expiresAt: draft?.rows.firstOrNull?.expiresAt,
      sent: sameDraft && flow.status == HostOfferFlowStatus.committed,
      sendFailed: sameDraft && flow.status == HostOfferFlowStatus.failure,
      existing: [
        for (final item in ws.offers)
          HostOfferExisting(
            item: item,
            name: nameOf(item['contactId'] as String?),
            status: HostOfferStatus.values
                .where((status) => status.name == item['effectiveStatus'])
                .firstOrNull,
          ),
      ],
      selected: selected == null
          ? null
          : HostOfferSelected(
              name: nameOf(selected.contactId),
              status: selected.effectiveStatus,
              expiresAt: selected.expiresAt,
              message: handoff?.kind == 'prepared'
                  ? handoff?.editableText
                  : null,
              blocked: handoff?.kind == 'blocked',
              copied: ws.messageCopied,
              openFailed: ws.handoffOpenFailed,
              canOpenWhatsapp: handoff?.whatsappUrl != null,
              manual: _manualApplies(selected)
                  ? HostOfferManual(
                      status: selected.manualPayment.status,
                      reference: selected.manualPayment.evidenceReference,
                      failed:
                          manual?.error != null ||
                          manual?.pendingMutation != null,
                      busy: manual?.busy ?? true,
                    )
                  : null,
              admission: admission == null
                  ? null
                  : HostOfferAdmission(
                      phase: admission.receipt != null
                          ? HostOfferAdmissionPhase.done
                          : admission.pending != null
                          ? (admission.pending!.needsReview
                                ? HostOfferAdmissionPhase.again
                                : HostOfferAdmissionPhase.saved)
                          : admission.preview?.canCommit == true
                          ? (admission.preview!.seatAlreadyOccupied == true
                                ? HostOfferAdmissionPhase.keep
                                : HostOfferAdmissionPhase.ready)
                          : HostOfferAdmissionPhase.check,
                      blocker: admission.preview?.blocker,
                      failed: admission.error != null,
                      busy: admission.busy,
                    ),
            ),
      busy: ws.loading,
      canCancel: ws.canCancelPreparation,
      failed: ws.error != null,
      stale: ws.selectionStale,
      canRetry: !ws.hasUnresolvedCommand,
    );
  }

  CatchDock _dock(
    AppLocalizations l10n,
    HostEventOfferWorkspaceState ws,
    HostOfferState state,
    HostManualPaymentReviewScope? manualScope,
    HostManualPaymentReviewState? manual,
  ) {
    final cancel = CatchDockAction(
      label: state.canCancel
          ? l10n.hostFormsOfferStop
          : l10n.hostFormsOfferCancel,
      onPressed: state.canCancel
          ? _workspace.cancelPreparation
          : () => Navigator.of(context).maybePop(),
    );
    final selected = state.selected;
    final payment = selected?.manual;
    if (manualScope != null && manual != null && payment != null) {
      final controller = ref.read(
        hostManualPaymentReviewControllerProvider(manualScope).notifier,
      );
      final busy =
          manual.busy || manual.checkingPending || !manual.actorAvailable;
      if (manual.pendingMutation != null) {
        return CatchDock(
          primary: CatchDockAction(
            label: l10n.hostFormsTryAgain,
            loading: busy,
            onPressed: busy ? null : () => unawaited(controller.retry()),
          ),
        );
      }
      switch (payment.status) {
        case HostManualPaymentStatus.none:
          return CatchDock(
            primary: CatchDockAction(
              label: l10n.hostFormsOfferPaymentRecord,
              loading: busy,
              onPressed: busy || _reference.trim().isEmpty
                  ? null
                  : () => unawaited(controller.recordReference(_reference)),
            ),
          );
        case HostManualPaymentStatus.evidenceSubmitted:
          final deciding = busy || manual.pendingDecision != null;
          return CatchDock(
            primary: CatchDockAction(
              label: l10n.hostFormsOfferPaymentAttest,
              loading: busy,
              onPressed: deciding || !_bankChecked
                  ? null
                  : () => unawaited(
                      controller.review(
                        decision: HostManualPaymentStatus.hostAttestedReceived,
                        note: _manualNote,
                        bankReceiptChecked: _bankChecked,
                      ),
                    ),
            ),
            secondary: CatchDockAction(
              label: l10n.hostFormsOfferPaymentReject,
              onPressed: deciding
                  ? null
                  : () => unawaited(
                      controller.review(
                        decision: HostManualPaymentStatus.rejected,
                        note: _manualNote,
                        bankReceiptChecked: _bankChecked,
                      ),
                    ),
            ),
          );
        case HostManualPaymentStatus.hostAttestedReceived ||
            HostManualPaymentStatus.rejected:
          break;
      }
    }
    switch (state.stage) {
      case HostOfferStage.review:
        return CatchDock(
          primary: CatchDockAction(
            label: l10n.hostFormsOfferSend,
            loading: ws.loading,
            onPressed: ws.loading || state.sent ? null : () => _send(ws),
          ),
          secondary: cancel,
        );
      case HostOfferStage.personalLinks:
        return CatchDock(
          primary: CatchDockAction(
            label: l10n.hostFormsOfferNext,
            loading: ws.loading,
            onPressed: ws.loading
                ? null
                : () => unawaited(_workspace.previewPersonal()),
          ),
          secondary: cancel,
        );
      case HostOfferStage.selected:
        return CatchDock(
          primary: CatchDockAction(
            label: l10n.hostFormsOfferDone,
            onPressed: () => Navigator.of(context).maybePop(),
          ),
        );
      case HostOfferStage.loading ||
          HostOfferStage.events ||
          HostOfferStage.needsContact ||
          HostOfferStage.needsSettings ||
          HostOfferStage.existing:
        return CatchDock(
          primary: CatchDockAction(label: l10n.hostFormsOfferSend),
          secondary: cancel,
        );
    }
  }

  /// Previews the ready offer when it has not been checked, then commits it
  /// under its saved request id.
  Future<void> _send(HostEventOfferWorkspaceState ws) async {
    final draft = ws.draft;
    final requestId = ws.commitRequestId;
    final configuration = ws.configuration;
    if (draft == null || requestId == null || configuration == null) return;
    final provider = hostEventOfferControllerProvider(widget.scope.offers);
    final offers = ref.read(provider.notifier);
    var view = ref.read(provider);
    bool ready(HostOfferFlowView view) =>
        identical(view.draft, draft) &&
        (view.canCommit ||
            view.status == HostOfferFlowStatus.failure &&
                view.pendingRequestId == requestId);
    if (!ready(view)) {
      await offers.preview(
        draft: draft,
        now: DateTime.now(),
        eventStartsAt: configuration.startsAt,
      );
      if (!mounted) return;
      view = ref.read(provider);
      if (!ready(view)) return;
    }
    await offers.commit(requestId);
  }

  Future<void> _admit(
    HostFormAdmissionSession session,
    HostOfferAdmission? admission,
  ) async {
    final controller = ref.read(
      hostFormAdmissionControllerProvider(session).notifier,
    );
    switch (admission?.phase) {
      case HostOfferAdmissionPhase.again:
        await controller.reviewAgain();
      case HostOfferAdmissionPhase.saved ||
          HostOfferAdmissionPhase.ready ||
          HostOfferAdmissionPhase.keep:
        await controller.confirm();
        if (!mounted) return;
        if (ref.read(hostFormAdmissionControllerProvider(session)).receipt !=
            null) {
          await _workspace.refreshOffers();
        }
      case HostOfferAdmissionPhase.check ||
          HostOfferAdmissionPhase.done ||
          null:
        await controller.review();
    }
  }

  static HostOfferEvent _event(HostOfferEventTarget target) => HostOfferEvent(
    id: target.eventId,
    name: target.name,
    startsAt: target.startTime,
  );

  static bool _manualApplies(HostEventOffer offer) {
    final payment = offer.paymentSnapshot;
    return offer.effectiveStatus == HostOfferStatus.offered &&
        payment != null &&
        payment.expectedAmountMinor > 0 &&
        const {
          'manualInstructions',
          'reusablePage',
          'personalRequest',
        }.contains(payment.collectionMode);
  }
}
