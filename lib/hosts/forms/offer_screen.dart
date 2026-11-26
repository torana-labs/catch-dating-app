import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_view.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_view_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_admission.dart';
import 'package:catch_dating_app/hosts/create/create_route_screen.dart';
import 'package:catch_dating_app/hosts/forms/forms_controller.dart';
import 'package:catch_dating_app/hosts/forms/offer_body.dart';
import 'package:catch_dating_app/hosts/forms/offer_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_workspace_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_admission_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_manual_payment_review_controller.dart';
import 'package:catch_kernel/country_markets.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/clipboard.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/experimental/scope.dart';

part 'offer_frame.dart';

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
    required String this.responseId,
    this.recipientLabel,
  }) : formId = null,
       query = null;

  /// Offering the people chosen in a response query: one offer each, for
  /// up to 25 people, on the same event. Opened without its query (a typed
  /// link), it says offers are not available.
  const HostOfferScreen.query({
    super.key,
    required this.organizerId,
    required String this.formId,
    required this.query,
  }) : responseId = null,
       recipientLabel = null;

  final String organizerId;
  final String? responseId;

  /// The form whose answers were queried, for a selection.
  final String? formId;

  /// The query whose chosen answers the offer goes to.
  final HostResponseQueryController? query;

  /// The name from the answer the offer was opened from; fresh reads still
  /// decide whether this person can be offered.
  final String? recipientLabel;

  @override
  ConsumerState<HostOfferScreen> createState() => _HostOfferScreenState();
}

class _HostOfferScreenState extends ConsumerState<HostOfferScreen> {
  String? _accountId;
  bool _accountLost = false;

  /// An event made from this offer, offered as soon as it is ready.
  HostOfferEventTarget? _created;
  bool _creating = false;

  bool _current(String accountId) =>
      mounted &&
      !_accountLost &&
      _accountId == accountId &&
      ref.read(uidProvider).asData?.value == accountId &&
      ref.read(firebaseAuthProvider).currentUser?.uid == accountId;

  /// Makes a new event, waits for its setup to be written, checks it is
  /// still this organizer's active event and (for a selection) that the
  /// chosen answers did not change, then offers it.
  Future<void> _createEvent() async {
    final account = _accountId;
    final query = widget.query;
    final selection = query?.selectionIntent;
    if (_creating || account == null || !_current(account)) return;
    final setupViews = ref.read(hostEventSetupViewReadsProvider);
    _creating = true;
    try {
      final eventId = await context.pushNamed<String>(
        Routes.hostCreateEventScreen.name,
        pathParameters: {'organizerId': widget.organizerId},
        extra: const HostCreateEventRouteArguments(
          returnToResponsesOnSave: true,
        ),
      );
      if (eventId == null || !_current(account)) return;
      if (query != null &&
          (selection == null ||
              !await query.revalidateSelection(
                ids: selection.ids,
                resultHash: selection.resultHash,
              ))) {
        throw StateError('Response selection changed.');
      }
      // The server writes the new event's setup view just after create.
      final summary = await firstCompleteSetupView(
        setupViews.watch(organizerId: widget.organizerId, eventId: eventId),
      );
      if (!_current(account)) return;
      if (summary.organizerId != widget.organizerId ||
          summary.eventId != eventId ||
          summary.status != 'active') {
        throw StateError('Event changed.');
      }
      final current = query?.selectionIntent;
      if (selection != null &&
          (current?.resultHash != selection.resultHash ||
              current!.ids.join('\u0000') != selection.ids.join('\u0000'))) {
        throw StateError('Response selection changed.');
      }
      final created = HostOfferEventTarget(
        eventId: summary.eventId,
        name: summary.name,
        startTime: DateTime.fromMillisecondsSinceEpoch(summary.startTimeMillis),
        timezone: summary.timezone,
        publicationState: 'private',
        setupRevision: summary.setupRevision,
      );
      if (mounted) setState(() => _created = created);
    } on Object catch (error) {
      if (mounted && _current(account)) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.event,
        );
      }
    } finally {
      _creating = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final account = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = account.isSettledData ? account.value : null;
    final liveUid = ref.watch(firebaseAuthProvider).currentUser?.uid;
    if (_accountId != null && (uid != _accountId || liveUid != _accountId)) {
      _accountLost = true;
    }
    final available =
        !_accountLost &&
        uid != null &&
        uid == liveUid &&
        (widget.responseId != null || widget.query != null);
    if (!available) {
      final l10n = context.l10n;
      return CatchRoot(
        child: CatchScreen(
          topBar: hostOfferTopBar(
            l10n,
            widget.recipientLabel,
            count: widget.query?.selectionIntent?.ids.length,
          ),
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
    final query = widget.query;
    final offers = (
      accountId: uid,
      organizerId: widget.organizerId,
      sourceId: query ?? widget.responseId!,
    );
    ref.watch(hostEventOfferControllerProvider(offers));
    final created = _created;
    final scope = (
      offers: offers,
      query: query,
      responseId: widget.responseId,
      initialEventId: created?.eventId,
      initialTargetId: created?.eventId,
      initialTargetRevision: created?.setupRevision,
    );
    final gateways = ref.read(hostOfferGatewaysProvider);
    final gateway = gateways.offers;
    final reads = gateways.reads;
    return _HostOfferScope(
      scope: scope,
      recipient: widget.recipientLabel,
      onCreateEvent: _createEvent,
      creatingEvent: _creating,
      dependencies: HostEventOfferWorkspaceDependencies(
        organizerId: widget.organizerId,
        accountId: uid,
        queryController: query,
        initialEventTarget: created,
        responseId: widget.responseId,
        offerScope: offers,
        watchOffers: reads.watchOffers,
        watchOffer: reads.watchOffer,
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
          // The review is a listener on the application's read model:
          // hold it open for this read, whichever screen opened the offer.
          final review = hostApplicationDetailProvider(widget.organizerId, id);
          final open = ref.listenManual(review, (_, _) {});
          try {
            final application = await ref.read(review.future);
            return application.reviewStatus ==
                    HostApplicationReviewStatus.approved &&
                application.dataAccessState != 'revokedParticipantGrant';
          } finally {
            open.close();
          }
        },
        openResponseForConversion: (id) => context.pushNamed<void>(
          Routes.hostResponseOfferReviewScreen.name,
          pathParameters: {'responseId': id},
          queryParameters: {
            ...GoRouterState.of(context).uri.queryParameters,
            'organizerId': widget.organizerId,
            if (query != null) '_parentQueryFormId': widget.formId!,
          },
          extra: query,
        ),
        openEventSettings: (eventId) => context.pushNamed<void>(
          query == null
              ? Routes.hostResponseOfferPreferencesScreen.name
              : Routes.hostResponseQueryOfferPreferencesScreen.name,
          pathParameters: {
            'eventId': eventId,
            if (query == null)
              'responseId': widget.responseId!
            else
              'formId': widget.formId!,
          },
          queryParameters: {
            ...GoRouterState.of(context).uri.queryParameters,
            'organizerId': widget.organizerId,
          },
          extra: query,
        ),
        now: DateTime.now,
      ),
    );
  }
}

/// The offer's top bar: Offer a place, to whom (or to how many people),
/// and Close.
CatchTopBar hostOfferTopBar(
  AppLocalizations l10n,
  String? recipient, {
  int? count,
}) => CatchTopBar(
  variant: CatchTopBarVariant.tool,
  title: l10n.hostFormsOfferTitle,
  kicker: recipient != null
      ? l10n.hostFormsOfferTo(name: recipient)
      : count != null
      ? l10n.hostEventOfferChooseForRecipients(count: count)
      : null,
  back: CatchTopBarBack(label: l10n.hostFormsClose, close: true),
);

/// Owns the offer workspace for this route: the workspace and its
/// dependencies are overridden here, so pending work is disposed with it.
class _HostOfferScope extends StatelessWidget {
  const _HostOfferScope({
    required this.scope,
    required this.dependencies,
    required this.onCreateEvent,
    required this.creatingEvent,
    this.recipient,
  });

  final HostEventOfferWorkspaceScope scope;
  final HostEventOfferWorkspaceDependencies dependencies;
  final VoidCallback onCreateEvent;
  final bool creatingEvent;
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
      onCreateEvent: onCreateEvent,
      creatingEvent: creatingEvent,
    ),
  );
}

/// The offer frame inside the route's workspace scope: it watches the
/// workspace, the payment check and the admission, and draws the screen.
@Dependencies([HostEventOfferWorkspaceController])
class _HostOfferFrame extends ConsumerStatefulWidget {
  const _HostOfferFrame({
    super.key,
    required this.scope,
    required this.onCreateEvent,
    required this.creatingEvent,
    this.recipient,
  });

  final HostEventOfferWorkspaceScope scope;
  final VoidCallback onCreateEvent;
  final bool creatingEvent;
  final String? recipient;

  @override
  ConsumerState<_HostOfferFrame> createState() => _HostOfferFrameState();
}

class _HostOfferFrameState extends ConsumerState<_HostOfferFrame> {
  String _reference = '';
  String _manualNote = '';
  bool _bankChecked = false;

  /// The admission session already checked on open, so a new session (a
  /// new offer revision) is checked again once.
  HostFormAdmissionSession? _checked;

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
    final topBar = hostOfferTopBar(
      l10n,
      widget.recipient,
      count: scope.query?.selectionIntent?.ids.length,
    );
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
    // An offered person's place is checked as soon as their offer opens.
    if (session != null &&
        session != _checked &&
        admission != null &&
        !admission.busy &&
        admission.preview == null &&
        admission.pending == null &&
        admission.receipt == null) {
      _checked = session;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        unawaited(
          ref
              .read(hostFormAdmissionControllerProvider(session).notifier)
              .review(),
        );
      });
    }
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
          onChangeEvent: _workspace.changeEvent,
          onCreateEvent: widget.onCreateEvent,
          onRefreshOffers: () => unawaited(_workspace.refreshOffers()),
          onCloseExisting: _workspace.closeExisting,
        ),
        dock: _dock(l10n, ws, state, manualScope, manual),
      ),
    );
  }

  /// Checks the ready offer with the server, without sending it.
  Future<void> _preview(HostEventOfferWorkspaceState ws) async {
    final draft = ws.draft;
    final configuration = ws.configuration;
    if (draft == null || configuration == null) return;
    await ref
        .read(hostEventOfferControllerProvider(widget.scope.offers).notifier)
        .preview(
          draft: draft,
          now: DateTime.now(),
          eventStartsAt: configuration.startsAt,
        );
  }

  /// Sends the checked offer under its saved request id; a failed send
  /// retries with the same id.
  Future<void> _commit(HostEventOfferWorkspaceState ws) async {
    final requestId = ws.commitRequestId;
    if (requestId == null) return;
    await ref
        .read(hostEventOfferControllerProvider(widget.scope.offers).notifier)
        .commit(requestId);
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
