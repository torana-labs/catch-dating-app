import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_communication_plan.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_timeline.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_contact_merge_review_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_applications_section.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_tab_bar.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_email_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_loading_state.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_memory_section.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_outreach_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_record_menu.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_timeline_section.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_whatsapp_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_whatsapp_thread_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

part 'host_customer_active_merges_section.dart';
part 'host_customer_detail_body.dart';
part 'host_customer_history_section.dart';
part 'host_customer_submissions_section.dart';

class HostCustomerDetailScreen extends ConsumerStatefulWidget {
  const HostCustomerDetailScreen({
    super.key,
    required this.organizerId,
    required this.contactId,
    this.initialDisplayName,
    this.embedded = false,
    this.onBack,
  });

  final String organizerId;
  final String contactId;
  final String? initialDisplayName;
  final bool embedded;
  final VoidCallback? onBack;

  @override
  ConsumerState<HostCustomerDetailScreen> createState() =>
      _HostCustomerDetailScreenState();
}

class _HostCustomerDetailScreenState
    extends ConsumerState<HostCustomerDetailScreen> {
  HostCustomerDetailView _selectedView = HostCustomerDetailView.overview;
  bool _openingConversation = false;
  bool _updatingCustomer = false;
  ({Object token, HostCustomerRemovalKey key, int epoch})? _removalOperation;
  int _removalEpoch = 0;
  GoRouter? _removalRouter;
  Uri? _removalRoute;

  @override
  void initState() {
    super.initState();
    ref.listenManual(uidProvider, (previous, next) {
      if (next.isLoading ||
          next.hasError ||
          previous?.asData?.value != next.asData?.value) {
        _invalidateRemovalScope();
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final router = GoRouter.maybeOf(context);
    if (identical(router, _removalRouter)) return;
    _removalRouter?.routerDelegate.removeListener(_removalRouteChanged);
    _removalRouter = router;
    _removalRoute = router?.state.uri;
    _invalidateRemovalScope();
    router?.routerDelegate.addListener(_removalRouteChanged);
  }

  void _removalRouteChanged() {
    final route = _removalRouter?.state.uri;
    if (route == _removalRoute) return;
    _removalRoute = route;
    _invalidateRemovalScope();
  }

  @override
  void didUpdateWidget(HostCustomerDetailScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.organizerId != widget.organizerId ||
        oldWidget.contactId != widget.contactId) {
      _invalidateRemovalScope();
    }
  }

  @override
  void dispose() {
    _invalidateRemovalScope();
    _removalRouter?.routerDelegate.removeListener(_removalRouteChanged);
    super.dispose();
  }

  void _invalidateRemovalScope() {
    _removalEpoch++;
    // Scope changes already rebuild or leave this surface. Release only the
    // local confirmation owner; the old target's keyed mutation stays pending.
    _removalOperation = null;
  }

  bool _ownsRemoval(int epoch, HostCustomerRemovalKey key) {
    if (!mounted || epoch != _removalEpoch) return false;
    final actor = ref.read(uidProvider);
    return !actor.isLoading &&
        !actor.hasError &&
        actor.asData?.value == key.actorUid &&
        ref.read(firebaseAuthProvider).currentUser?.uid == key.actorUid &&
        widget.organizerId == key.organizerId &&
        widget.contactId == key.contactId;
  }

  @override
  Widget build(BuildContext context) {
    final removalEpoch = _removalEpoch;
    final currentUid = catchAsyncStateFromAsyncValue(
      ref.watch(uidProvider),
    ).value;
    var removalPending = false;
    if (currentUid != null) {
      final key = (
        actorUid: currentUid,
        organizerId: widget.organizerId,
        contactId: widget.contactId,
      );
      final removalMutation = HostCustomersController.removeMutation(key);
      removalPending = ref.watch(removalMutation).isPending;
      _listenToRemovalMutationErrors([removalMutation]);
    }
    final updatingCustomer =
        _updatingCustomer || _removalOperation != null || removalPending;
    final detail = ref.watch(
      hostAudienceContactDetailProvider(widget.organizerId, widget.contactId),
    );
    final detailState = catchAsyncStateFromAsyncValue(detail);
    final communicationPlan = detailState.value == null
        ? null
        : ref.watch(
            hostCommunicationPlanProvider(widget.organizerId, widget.contactId),
          );
    final communicationPlanState = communicationPlan == null
        ? null
        : catchAsyncStateFromAsyncValue(communicationPlan);
    final initialDisplayName = widget.initialDisplayName?.trim();
    final displayName =
        detailState.value?.displayName ??
        (initialDisplayName?.isNotEmpty ?? false ? initialDisplayName : null) ??
        context.l10n.hostNavigationCustomers;
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.identity(
        identityName: displayName,
        identitySemanticLabel: displayName,
        navigation: CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
          onPressed: widget.onBack,
        ),
        actions: [
          if (detailState.value != null &&
              communicationPlanState
                      ?.value
                      ?.singleRecipient
                      .recommendedRouteId !=
                  null) ...[
            if (MediaQuery.textScalerOf(context).scale(1) <
                CatchRecordTokens.largeTextBreakpoint)
              CatchButton.text(
                key: const ValueKey('host-customer-message'),
                label: context.l10n.hostCustomersWhatsappMessage,
                onPressed: _openingConversation
                    ? null
                    : () => _messageCustomer(
                        detailState.value!,
                        communicationPlanState?.value,
                      ),
              ),
          ],
          if (detailState.value case final customer?)
            HostCustomerRecordMenu(
              enabled: !updatingCustomer && !_openingConversation,
              canMessage:
                  communicationPlanState
                      ?.value
                      ?.singleRecipient
                      .recommendedRouteId !=
                  null,
              onMessage: () =>
                  _messageCustomer(customer, communicationPlanState?.value),
              onLogOutreach: () => _logOutreach(customer),
              onRemove: () => _removeCustomer(
                customer,
                actorUid: currentUid,
                epoch: removalEpoch,
              ),
            ),
        ],
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      actions: HostCustomerDetailTabBar(
        selected: _selectedView,
        onChanged: (view) => setState(() => _selectedView = view),
      ),
      body: CatchRouteBody.fullBleed(
        child: CatchPageBody.screen(
          gutter: false,
          child: CatchAsyncBoundary<HostAudienceContactDetail>(
            value: detail,
            onRetry: () => ref.invalidate(
              hostAudienceContactDetailProvider(
                widget.organizerId,
                widget.contactId,
              ),
            ),
            initialLoadTimeout: null,
            loadingBuilder: (_) => CatchSkeleton.content(
              child: HostCustomerDetailBody.loading(
                organizerId: widget.organizerId,
                contactId: widget.contactId,
                displayName: displayName,
                manualTagLabel: context.l10n.hostCustomersManualTags,
                noteBody: context.l10n.hostCustomersMemoryHelp,
                currentUid: currentUid,
                selectedView: _selectedView,
                onOpenMemory: () => setState(
                  () => _selectedView = HostCustomerDetailView.memory,
                ),
              ),
            ),
            errorBuilder: (_, error, _, onBoundaryRetry) =>
                CatchLocalizedErrorState(
                  error,
                  context: AppErrorContext.customer,
                  onRetry: onBoundaryRetry,
                ),
            builder: (context, customer) => HostCustomerDetailBody(
              selectedView: _selectedView,
              onOpenMemory: () =>
                  setState(() => _selectedView = HostCustomerDetailView.memory),
              customer: customer,
              currentUid: currentUid,
              communicationPlan: communicationPlanState?.value,
              communicationPlanLoading:
                  communicationPlanState?.isLoading ?? true,
              communicationPlanFailed:
                  communicationPlanState?.hasError ?? false,
              messageActionInHeader:
                  communicationPlanState
                      ?.value
                      ?.singleRecipient
                      .recommendedRouteId !=
                  null,
              openingConversation: _openingConversation,
              updatingCustomer: updatingCustomer,
              onSaveDetails: ({required displayName, phoneE164, email}) =>
                  _saveCustomerDetails(
                    customer,
                    displayName: displayName,
                    phoneE164: phoneE164,
                    email: email,
                  ),
              onEditTags: () => _editTags(customer),
              onAddNote: () => _editNote(customer),
              onEditNote: (note) => _editNote(customer, note: note),
              onReviewDuplicates: _reviewDuplicates,
              onMessage: () =>
                  _messageCustomer(customer, communicationPlanState?.value),
              onRetryCommunicationPlan: _refreshCommunicationPlan,
              onMessagingEnabledChanged: (enabled) =>
                  _setMessagingEnabled(customer, enabled),
              onOpenFormResponse: _openFormResponse,
              onOpenApplication: _openApplication,
              onOpenContact: _openCustomerContact,
              onOpenRevenue: () => _openRevenue(customer),
              onCall: customer.phoneE164 == null
                  ? null
                  : () => _openCustomerContact(
                      Uri(scheme: 'tel', path: customer.phoneE164),
                    ),
              onEmail: customer.email == null
                  ? null
                  : () => _openCustomerContact(
                      Uri(scheme: 'mailto', path: customer.email),
                    ),
              onOpenEvent: _openEvent,
              onOpenCatchThread: _openCatchThread,
              onOpenWhatsappThread: _openWhatsappThread,
              onUndoMerge: _undoMerge,
            ),
          ),
        ),
      ),
    );
  }

  void _listenToRemovalMutationErrors(List<Mutation<void>> mutations) {
    for (final mutation in mutations) {
      ref.listen(mutation, (previous, current) {
        if (previous?.isPending != true || current is! MutationError) return;
        final operation = _removalOperation;
        if (operation == null ||
            operation.key != mutation.key ||
            !_ownsRemoval(operation.epoch, operation.key)) {
          return;
        }
        showCatchNoticeError(
          context,
          current.error,
          errorContext: AppErrorContext.customer,
        );
      });
    }
  }

  Future<void> _editTags(HostAudienceContactDetail customer) async {
    final updated = await showCatchBottomSheet<bool>(
      context: context,
      builder: (context) => HostCustomerTagsSheet(customer: customer),
    );
    if (!mounted || updated != true) return;
    ref.invalidate(hostCustomersDirectoryControllerProvider);
    _refreshDetail();
  }

  Future<void> _openRevenue(HostAudienceContactDetail customer) =>
      showCatchBottomSheet<void>(
        context: context,
        builder: (sheetContext) => HostCustomerRevenueList(
          customer: customer,
          onOpenEvent: (eventId) {
            Navigator.of(sheetContext).pop();
            _openEvent(eventId);
          },
        ),
      );

  Future<void> _editNote(
    HostAudienceContactDetail customer, {
    HostCustomerNote? note,
  }) async {
    final updated = await showCatchBottomSheet<bool>(
      context: context,
      builder: (context) =>
          HostCustomerNoteSheet(customer: customer, note: note),
    );
    if (!mounted || updated != true) return;
    _refreshDetail();
  }

  Future<void> _logOutreach(HostAudienceContactDetail customer) async {
    final recorded = await showCatchBottomSheet<bool>(
      context: context,
      builder: (context) => HostCustomerOutreachSheet(customer: customer),
    );
    if (!mounted || recorded != true) return;
    _refreshDetail();
  }

  void _refreshDetail() {
    ref.invalidate(
      hostAudienceContactDetailProvider(widget.organizerId, widget.contactId),
    );
    ref.invalidate(
      hostAudienceContactHistoryProvider(widget.organizerId, widget.contactId),
    );
    _refreshCommunicationPlan();
  }

  void _refreshCommunicationPlan() => ref.invalidate(
    hostCommunicationPlanProvider(widget.organizerId, widget.contactId),
  );

  Future<void> _reviewDuplicates() async {
    final changed = await showCatchBottomSheet<bool>(
      context: context,
      builder: (_) =>
          HostContactMergeReviewSheet(organizerId: widget.organizerId),
    );
    if (!mounted || changed != true) return;
    ref.invalidate(hostCustomersDirectoryControllerProvider);
    ref.invalidate(hostCrmSummaryProvider(widget.organizerId));
    _refreshDetail();
  }

  Future<void> _undoMerge(HostActiveContactMerge merge) async {
    final confirmed = await showCatchConfirmDialog(
      copy: catchDialogCopy(context.l10n),
      context: context,
      title: context.l10n.hostCustomersUndoMergeTitle,
      message: context.l10n.hostCustomersUndoMergeBody,
      confirmLabel: context.l10n.hostCustomersUndoMerge,
      danger: true,
    );
    if (confirmed != true || !mounted) return;
    try {
      await ref
          .read(hostCustomersControllerProvider)
          .unmergeCustomers(
            organizerId: widget.organizerId,
            mergeReceiptId: merge.mergeReceiptId,
          );
      if (!mounted) return;
      ref.invalidate(hostCustomersDirectoryControllerProvider);
      ref.invalidate(hostCrmSummaryProvider(widget.organizerId));
      _refreshDetail();
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.organizer,
        );
      }
    }
  }

  Future<void> _saveCustomerDetails(
    HostAudienceContactDetail customer, {
    required String displayName,
    String? phoneE164,
    String? email,
  }) async {
    await ref
        .read(hostCustomersControllerProvider)
        .mutateCustomer(
          organizerId: customer.organizerId,
          contactId: customer.contactId,
          expectedRevision: customer.revision,
          displayNameOverride: displayName == customer.sourceDisplayName
              ? null
              : displayName,
          clearDisplayNameOverride: displayName == customer.sourceDisplayName,
          phoneE164: phoneE164,
          updatePhoneE164: customer.contactDetailsEditable,
          email: email,
          updateEmail: customer.contactDetailsEditable,
        );
    if (!mounted) return;
    ref.invalidate(hostCustomersDirectoryControllerProvider);
    ref.invalidate(hostCrmSummaryProvider(widget.organizerId));
    _refreshDetail();
  }

  Future<void> _setMessagingEnabled(
    HostAudienceContactDetail customer,
    bool enabled,
  ) async {
    if (_updatingCustomer) return;
    setState(() => _updatingCustomer = true);
    try {
      await ref
          .read(hostCustomersControllerProvider)
          .mutateCustomer(
            organizerId: customer.organizerId,
            contactId: customer.contactId,
            expectedRevision: customer.revision,
            whatsappAdminSuppressed: !enabled,
          );
      if (!mounted) return;
      ref.invalidate(hostCustomersDirectoryControllerProvider);
      _refreshDetail();
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.organizer,
        );
      }
    } finally {
      if (mounted) setState(() => _updatingCustomer = false);
    }
  }

  Future<void> _removeCustomer(
    HostAudienceContactDetail customer, {
    required String? actorUid,
    required int epoch,
  }) async {
    if (_updatingCustomer || _removalOperation != null) return;
    final actor = ref.read(uidProvider);
    if (actor.isLoading ||
        actor.hasError ||
        actorUid == null ||
        actor.asData?.value != actorUid) {
      return;
    }
    final key = (
      actorUid: actorUid,
      organizerId: customer.organizerId,
      contactId: customer.contactId,
    );
    if (!_ownsRemoval(epoch, key)) return;
    final mutation = HostCustomersController.removeMutation(key);
    if (ref.read(mutation).isPending) return;
    final operation = Object();
    final onRemoved = widget.onBack;
    final route = ModalRoute.of(context);
    final router = _removalRouter;
    final container = ProviderScope.containerOf(context, listen: false);
    final auth = ref.read(firebaseAuthProvider);
    var sameActor = true;
    final actorLease = container.listen(uidProvider, (_, next) {
      if (next.isLoading ||
          next.hasError ||
          next.asData?.value != key.actorUid) {
        sameActor = false;
      }
    });
    setState(
      () => _removalOperation = (token: operation, key: key, epoch: epoch),
    );
    try {
      final confirmed = await showCatchConfirmDialog(
        copy: catchDialogCopy(context.l10n),
        context: context,
        title: context.l10n.hostsHostAudienceRemoveTitle,
        message: context.l10n.hostsHostAudienceRemoveBody,
        confirmLabel: context.l10n.hostsHostAudienceRemoveConfirm,
        danger: true,
      );
      if (confirmed != true || !_ownsRemoval(epoch, key)) return;
      if (ref.read(mutation).isPending) return;
      try {
        await mutation.run(
          ref,
          (tx) => tx
              .get(hostCustomersControllerProvider)
              .removeCustomer(key: key, expectedRevision: customer.revision),
        );
      } on Object {
        // The scoped mutation listener owns failure feedback. Stop here so a
        // rejected write cannot invalidate caches or navigate as success.
        return;
      }

      // Acknowledged writes still invalidate their captured cache after route
      // departure, but must not refresh data under a different signed-in actor.
      if (!actorLease.closed && sameActor) {
        final currentActor = actorLease.read();
        if (!currentActor.isLoading &&
            !currentActor.hasError &&
            currentActor.asData?.value == key.actorUid &&
            auth.currentUser?.uid == key.actorUid) {
          container.invalidate(hostCustomersDirectoryControllerProvider);
          container.invalidate(hostCrmSummaryProvider(key.organizerId));
          container.invalidate(
            hostCustomerSegmentCountProvider(
              HostCustomerSegmentCountRequest(
                organizerId: key.organizerId,
                filter: HostCustomerFilter.newToOrganizer,
              ),
            ),
          );
          container.invalidate(
            hostAudienceContactDetailProvider(key.organizerId, key.contactId),
          );
          container.invalidate(
            hostAudienceContactHistoryProvider(key.organizerId, key.contactId),
          );
          container.invalidate(
            hostCommunicationPlanProvider(key.organizerId, key.contactId),
          );
        }
      }
      if (!mounted || !_ownsRemoval(epoch, key)) return;
      showCatchNotice(
        context,
        context.l10n
            .hostsHostTeamManagementSectionSuccessmessageDisplaynameRemoved(
              displayName: customer.displayName,
            ),
        tone: CatchNoticeTone.success,
      );
      try {
        if (onRemoved != null) {
          onRemoved();
        } else if (route?.isCurrent == true && router != null) {
          if (router.canPop()) {
            router.pop();
          } else {
            router.goNamed(
              Routes.hostAudienceScreen.name,
              queryParameters: {'organizerId': key.organizerId},
            );
          }
        }
      } on Object catch (error, stackTrace) {
        FlutterError.reportError(
          FlutterErrorDetails(
            exception: error,
            stack: stackTrace,
            library: 'Host customer removal',
            context: ErrorDescription('navigating after acknowledged removal'),
          ),
        );
      }
    } finally {
      actorLease.close();
      if (mounted && identical(_removalOperation?.token, operation)) {
        setState(() => _removalOperation = null);
      }
    }
  }

  Future<void> _messageCustomer(
    HostAudienceContactDetail customer,
    HostCommunicationPlan? plan,
  ) async {
    final route = plan?.singleRecipient.recommendedRouteId;
    switch (route) {
      case HostCommunicationRouteId.catchChat:
        return _startConversation(customer);
      case HostCommunicationRouteId.personalWhatsappHandoff:
        return _openWhatsapp(customer);
      case HostCommunicationRouteId.personalEmailHandoff:
        return _openEmail(customer);
      case null:
      case HostCommunicationRouteId.organizerWhatsappCampaign:
      case HostCommunicationRouteId.catchWhatsapp:
      case HostCommunicationRouteId.catchEventAnnouncement:
      case HostCommunicationRouteId.organizerFollowerUpdate:
        return;
    }
  }

  void _openFormResponse(String responseId) {
    unawaited(
      context.pushNamed(
        Routes.hostFormResponseDetailScreen.name,
        pathParameters: {'responseId': responseId},
        queryParameters: {
          'organizerId': widget.organizerId,
          '_parentContactId': widget.contactId,
          ...?GoRouterState.of(
                    context,
                  ).uri.queryParameters['_parentAudienceId'] ==
                  null
              ? null
              : {
                  '_parentAudienceId': GoRouterState.of(
                    context,
                  ).uri.queryParameters['_parentAudienceId']!,
                },
        },
      ),
    );
  }

  void _openApplication(String applicationId) {
    unawaited(
      context.pushNamed(
        Routes.hostApplicationDetailScreen.name,
        pathParameters: {'applicationId': applicationId},
        queryParameters: {
          'organizerId': widget.organizerId,
          '_parentContactId': widget.contactId,
          ...?GoRouterState.of(
                    context,
                  ).uri.queryParameters['_parentAudienceId'] ==
                  null
              ? null
              : {
                  '_parentAudienceId': GoRouterState.of(
                    context,
                  ).uri.queryParameters['_parentAudienceId']!,
                },
        },
      ),
    );
  }

  Future<void> _openCustomerContact(Uri uri) async {
    try {
      final opened = await ref.read(externalLinkControllerProvider).open(uri);
      if (!opened && mounted) {
        showCatchNoticeError(
          context,
          StateError('Customer contact method could not be opened.'),
        );
      }
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }

  void _openEvent(String eventId) {
    unawaited(
      context.pushNamed(
        Routes.hostAppEventDetailScreen.name,
        pathParameters: {'organizerId': widget.organizerId, 'eventId': eventId},
      ),
    );
  }

  void _openCatchThread(String matchId) {
    unawaited(
      context.pushNamed(
        Routes.hostChatScreen.name,
        pathParameters: {'matchId': matchId},
      ),
    );
  }

  void _openWhatsappThread(String threadId) {
    unawaited(
      showCatchBottomSheet<void>(
        context: context,
        builder: (_) => HostWhatsappThreadSheet(
          organizerId: widget.organizerId,
          threadId: threadId,
        ),
      ),
    );
  }

  Future<void> _startConversation(HostAudienceContactDetail customer) async {
    if (_openingConversation) return;
    setState(() => _openingConversation = true);
    try {
      final matchId = await ref
          .read(hostCustomersControllerProvider)
          .startConversation(
            organizerId: widget.organizerId,
            contactId: widget.contactId,
          );
      if (mounted) {
        unawaited(
          context.pushNamed(
            Routes.hostChatScreen.name,
            pathParameters: {'matchId': matchId},
          ),
        );
      }
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.chat,
        );
      }
    } finally {
      if (mounted) setState(() => _openingConversation = false);
    }
  }

  Future<void> _openWhatsapp(HostAudienceContactDetail customer) =>
      showCatchBottomSheet<void>(
        context: context,
        builder: (_) => HostCustomerWhatsappHandoffSheet(customer: customer),
      );

  Future<void> _openEmail(HostAudienceContactDetail customer) =>
      showCatchBottomSheet<void>(
        context: context,
        builder: (_) => HostCustomerEmailHandoffSheet(customer: customer),
      );
}
