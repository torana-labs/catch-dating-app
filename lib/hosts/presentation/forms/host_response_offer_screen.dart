import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/clipboard.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/hosts/data/forms/host_event_offer_gateway.dart';
import 'package:catch_dating_app/hosts/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/hosts/data/host_application_repository.dart';
import 'package:catch_dating_app/hosts/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_admission.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_workspace_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_admission_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_query_capability.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Shared continuation for one response or a reviewed query selection.
/// The originating page stays mounted; save/cancel returns to the same context.
class HostResponseOfferScreen extends ConsumerStatefulWidget {
  const HostResponseOfferScreen({
    super.key,
    required this.organizerId,
    this.responseId,
    this.recipientLabel,
    this.queryController,
  }) : assert((responseId == null) != (queryController == null));
  const HostResponseOfferScreen.query({
    super.key,
    required this.organizerId,
    this.queryController,
  }) : responseId = null,
       recipientLabel = null;
  final String organizerId;
  final String? responseId;

  /// Display context from the originating review; fresh reads still decide
  /// whether this response can receive an offer.
  final String? recipientLabel;
  final HostResponseQueryController? queryController;
  @override
  ConsumerState<HostResponseOfferScreen> createState() =>
      _HostResponseOfferScreenState();
}

class _HostResponseOfferScreenState
    extends ConsumerState<HostResponseOfferScreen> {
  HostEventOfferScope? _offerScope;
  String? _accountId;
  bool _accountLost = false;
  HostOfferEventTarget? _created;
  bool _creating = false;
  final _primaryAction = ValueNotifier<Widget?>(null);
  Widget? _pendingAction;
  bool _actionUpdateScheduled = false;

  bool _current(String accountId) =>
      mounted &&
      !_accountLost &&
      _accountId == accountId &&
      ref.read(uidProvider).asData?.value == accountId &&
      ref.read(firebaseAuthProvider).currentUser?.uid == accountId;

  @override
  void dispose() {
    _primaryAction.dispose();
    super.dispose();
  }

  Future<void> _createEvent() async {
    final account = _accountId;
    final selection = widget.queryController?.selectionIntent;
    if (_creating || account == null || !_current(account)) {
      return;
    }
    setState(() => _creating = true);
    try {
      final eventId = await context.pushNamed<String>(
        Routes.hostCreateEventScreen.name,
        pathParameters: {'clubId': widget.organizerId},
        extra: const HostCreateEventRouteArguments(
          returnToResponsesOnSave: true,
        ),
      );
      if (eventId == null || !_current(account)) return;
      if (widget.queryController case final query?) {
        if (selection == null ||
            !await query.revalidateSelection(
              ids: selection.ids,
              resultHash: selection.resultHash,
            )) {
          throw StateError('Response selection changed.');
        }
      }
      final summary = await PrivateEventSetupRepository(
        ref.read(firebaseFunctionsProvider),
      ).get(organizerId: widget.organizerId, eventId: eventId);
      if (!_current(account)) return;
      if (summary.organizerId != widget.organizerId ||
          summary.eventId != eventId ||
          summary.status != 'active') {
        throw StateError('Event changed.');
      }
      final current = widget.queryController?.selectionIntent;
      if (selection != null &&
          (current?.resultHash != selection.resultHash ||
              current!.ids.join('\u0000') != selection.ids.join('\u0000'))) {
        throw StateError('Response selection changed.');
      }
      setState(
        () => _created = HostOfferEventTarget(
          eventId: summary.eventId,
          name: summary.name,
          startTime: DateTime.fromMillisecondsSinceEpoch(
            summary.startTimeMillis,
          ),
          timezone: summary.timezone,
          publicationState: 'private',
          setupRevision: summary.setupRevision,
        ),
      );
    } on Object catch (error) {
      if (mounted && _current(account)) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.event,
        );
      }
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  Future<void> _settings(String eventId) async {
    final account = _accountId;
    if (account == null || !_current(account)) return;
    final queryFormId = GoRouterState.of(context).pathParameters['formId'];
    await context.pushNamed<void>(
      widget.responseId == null
          ? Routes.hostResponseQueryOfferPreferencesScreen.name
          : Routes.hostResponseOfferPreferencesScreen.name,
      pathParameters: {
        'eventId': eventId,
        if (widget.responseId != null)
          'responseId': widget.responseId!
        else
          'formId': queryFormId!,
      },
      queryParameters: {
        ...GoRouterState.of(context).uri.queryParameters,
        'organizerId': widget.organizerId,
      },
      extra: widget.queryController,
    );
  }

  HostFormAdmissionSession _admission(
    HostEventOffer offer,
    String responseId,
  ) => hostFormAdmissionSession(
    _accountId!,
    HostFormAdmissionScope.fromOffer(offer, responseId: responseId),
  );

  @override
  Widget build(BuildContext context) {
    if (widget.responseId == null && widget.queryController == null) {
      return CatchRouteScaffold(
        topBarBuilder: (_, _) => CatchTopBar.route(
          title: context.l10n.hostResponseOfferEvent,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchEmptyState(
            title: context.l10n.coreCatchFieldVisiblecopySelect,
          ),
        ),
      );
    }
    final account = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = account.isSettledData ? account.value : null;
    final liveUid = ref.watch(firebaseAuthProvider).currentUser?.uid;
    if (_accountId != null && (uid != _accountId || liveUid != _accountId)) {
      _accountLost = true;
      _offerScope = null;
    }
    final available = !_accountLost && uid != null && uid == liveUid;
    if (available) {
      _accountId = uid;
      _offerScope = (
        accountId: uid,
        organizerId: widget.organizerId,
        sourceId: widget.queryController ?? widget.responseId!,
      );
      ref.watch(hostEventOfferControllerProvider(_offerScope!));
    }
    final gateway = available
        ? CallableHostEventOfferGateway(ref.read(firebaseFunctionsProvider))
        : null;
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.hostResponseOfferEvent,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      footer: available
          ? ValueListenableBuilder<Widget?>(
              valueListenable: _primaryAction,
              builder: (_, action, _) => action ?? const SizedBox.shrink(),
            )
          : null,
      body: CatchRouteBody.standardSections(
        sections: [
          CatchSectionListItem(
            child: !available
                ? CatchText(
                    context.l10n.hostEventOfferUnavailable,
                    variant: CatchTextVariant.supporting,
                  )
                : HostEventOfferWorkspaceSection(
                    organizerId: widget.organizerId,
                    accountId: _accountId,
                    responseId: widget.responseId,
                    recipientLabel: widget.recipientLabel,
                    queryController: widget.queryController,
                    offerScope: _offerScope!,
                    initiallyReviewSelection: true,
                    initialEventTarget: _created,
                    onCreateEvent: _creating ? null : _createEvent,
                    listOffers: gateway!.listOffers,
                    getOffer: gateway.getOffer,
                    prepareHandoff: gateway.prepareHandoff,
                    copyMessage: (text) =>
                        ref.read(clipboardControllerProvider).copyText(text),
                    openHandoff: (uri) => ref
                        .read(externalLinkControllerProvider)
                        .openExternal(uri),
                    targets: CallableHostOfferEventTargetsGateway(
                      ref.read(firebaseFunctionsProvider),
                    ),
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
                        hostApplicationDetailProvider(
                          widget.organizerId,
                          id,
                        ).future,
                      );
                      return application.reviewStatus ==
                              HostApplicationReviewStatus.approved &&
                          application.dataAccessState !=
                              'revokedParticipantGrant';
                    },
                    openResponseForConversion: (id) async {
                      await context.pushNamed<void>(
                        Routes.hostResponseOfferReviewScreen.name,
                        pathParameters: {'responseId': id},
                        queryParameters: {
                          ...GoRouterState.of(context).uri.queryParameters,
                          'organizerId': widget.organizerId,
                          if (widget.queryController != null)
                            '_parentQueryFormId': GoRouterState.of(
                              context,
                            ).pathParameters['formId']!,
                        },
                        extra: widget.queryController,
                      );
                    },
                    openEventSettings: _settings,
                    admissionSession: _admission,
                    copy: hostEventOfferWorkspaceCopy(context.l10n),
                    now: DateTime.now,
                    layoutBuilder: (body, action) {
                      _publishAction(action);
                      return body;
                    },
                  ),
          ),
        ],
      ),
    );
  }

  // Publish only the footer after the content build. Its listenable rebuilds
  // the footer alone, so changing an action never remounts the workspace or
  // feeds a parent-build loop. Coalesce updates before the next frame.
  void _publishAction(Widget? action) {
    _pendingAction = action;
    if (!_actionUpdateScheduled) {
      _actionUpdateScheduled = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _actionUpdateScheduled = false;
        if (mounted && !_accountLost) _primaryAction.value = _pendingAction;
      });
    }
  }
}
