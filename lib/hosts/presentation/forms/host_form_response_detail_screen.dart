import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/hosts/data/host_application_repository.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_conversion.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_payment_record.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_context.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_copy.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_applications_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_detail_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_review_detail.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

part 'host_response_answer_section.dart';
part 'host_response_detail_section.dart';

/// Ephemeral route context for continuing through one filtered response queue.
class HostResponseReviewQueue {
  const HostResponseReviewQueue({
    required this.request,
    required this.entryId,
    required this.index,
  });

  final HostFormResponseListRequest request;
  final String entryId;
  final int index;

  int targetIndex(
    List<HostFormInboxEntry> entries,
    int direction, {
    bool hasMore = true,
  }) {
    final current = entries.indexWhere((entry) => entry.entryId == entryId);
    if (current >= 0) return current + direction;
    final target = index + (direction > 0 ? 0 : -1);
    if (direction < 0 && !hasMore && target >= entries.length) {
      return entries.length - 1;
    }
    return target;
  }
}

/// One detail surface for submitted forms and imported application records.
class HostFormResponseDetailScreen extends ConsumerStatefulWidget {
  const HostFormResponseDetailScreen({
    super.key,
    required this.organizerId,
    required String this.responseId,
    this.queue,
    this.returnToOffer = false,
  }) : applicationId = null;
  const HostFormResponseDetailScreen.application({
    super.key,
    required this.organizerId,
    required String this.applicationId,
    this.queue,
    this.returnToOffer = false,
  }) : responseId = null;
  final String organizerId;
  final String? responseId;
  final String? applicationId;
  final HostResponseReviewQueue? queue;
  final bool returnToOffer;
  @override
  ConsumerState<HostFormResponseDetailScreen> createState() =>
      _HostFormResponseDetailScreenState();
}

class _HostFormResponseDetailScreenState
    extends ConsumerState<HostFormResponseDetailScreen> {
  final _note = TextEditingController();
  HostFormConversionKind? _converting;
  bool _saving = false;
  bool _navigating = false;
  int? _noteRevision;
  bool get _busy => _saving || _converting != null || _navigating;
  HostResponseReviewKey get _key => (
    organizerId: widget.organizerId,
    responseId: widget.responseId,
    applicationId: widget.applicationId,
  );
  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  void _reload() {
    final loaded = ref
        .read(hostResponseReviewDetailProvider(_key))
        .asData
        ?.value;
    final responseId =
        widget.responseId ??
        loaded?.response?.response.responseId ??
        (widget.applicationId == null
            ? null
            : ref
                  .read(
                    hostApplicationDetailProvider(
                      widget.organizerId,
                      widget.applicationId!,
                    ),
                  )
                  .asData
                  ?.value
                  .sourceResponseId);
    final applicationId =
        widget.applicationId ??
        loaded?.application?.applicationId ??
        (responseId == null
            ? null
            : ref
                  .read(
                    hostFormResponseDetailProvider(
                      organizerId: widget.organizerId,
                      responseId: responseId,
                    ),
                  )
                  .asData
                  ?.value
                  .applicationId);
    if (responseId != null) {
      ref.invalidate(
        hostFormResponseDetailProvider(
          organizerId: widget.organizerId,
          responseId: responseId,
        ),
      );
    }
    if (applicationId != null) {
      ref.invalidate(
        hostApplicationDetailProvider(widget.organizerId, applicationId),
      );
    }
    ref.invalidate(hostResponseReviewDetailProvider(_key));
    ref.invalidate(hostFormResponsesControllerProvider);
    ref.invalidate(hostApplicationsDirectoryControllerProvider);
  }

  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(hostResponseReviewDetailProvider(_key));
    final loaded = catchAsyncStateFromAsyncValue(detail).value;
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: loaded?.displayName ?? context.l10n.hostAudienceResponseTitle,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      footer: loaded == null
          ? null
          : HostResponsePrimaryAction(
              value: loaded,
              busy: _busy,
              saving: _saving,
              converting: _converting != null,
              onReview: _review,
              onOpenPerson: _openPerson,
              onConvert: _reviewConversion,
              offerActionLabel: widget.returnToOffer
                  ? context.l10n.hostResponseContinueOffer
                  : null,
              onOfferEvent: () => _offerEvent(loaded),
            ),
      body: CatchRouteBody.standard(
        child: CatchAsyncBoundary<HostResponseReviewDetail>(
          value: detail,
          onRetry: _reload,
          initialLoadTimeout: null,
          errorContext: AppErrorContext.formResponses,
          builder: (context, value) {
            final application = value.application;
            if (application != null && _noteRevision != application.revision) {
              _noteRevision = application.revision;
              _note.text = application.reviewNote ?? '';
            }
            final queue = widget.queue;
            final queued = queue == null
                ? null
                : ref.watch(hostFormResponsesControllerProvider(queue.request));
            final queueState = queued == null
                ? null
                : catchAsyncStateFromAsyncValue(queued);
            final entries = queueState?.value?.inboxEntries;
            final canLoadMore = queueState?.value?.canLoadMore ?? false;
            final previous = entries == null || queue == null
                ? -1
                : queue.targetIndex(entries, -1, hasMore: canLoadMore);
            final next = entries == null || queue == null
                ? -1
                : queue.targetIndex(entries, 1);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (queue != null) ...[
                  Row(
                    children: [
                      Expanded(
                        child: CatchButton(
                          label: context.l10n.hostsWizardPrevious,
                          variant: CatchButtonVariant.secondary,
                          onPressed: !_busy && !_navigating && previous >= 0
                              ? () => _navigateQueue(-1)
                              : null,
                        ),
                      ),
                      gapW12,
                      Expanded(
                        child: CatchButton(
                          label: context.l10n.hostsStepperFooterLabelNext,
                          variant: CatchButtonVariant.secondary,
                          onPressed:
                              !_busy &&
                                  !_navigating &&
                                  next >= 0 &&
                                  (entries != null &&
                                      (next < entries.length || canLoadMore))
                              ? () => _navigateQueue(1)
                              : null,
                        ),
                      ),
                    ],
                  ),
                  if (queueState?.error != null ||
                      queueState?.value?.loadMoreError != null)
                    CatchButton.command(
                      label: context.l10n.sharedActionTryAgain,
                      onPressed: () => ref.invalidate(
                        hostFormResponsesControllerProvider(queue.request),
                      ),
                    ),
                  gapH16,
                ],
                HostResponseDetailSection(
                  value: value,
                  organizerId: widget.organizerId,
                  note: _note,
                  busy: _busy,
                  saving: _saving,
                  onReview: _review,
                  onOpenPerson: _openPerson,
                  onConvert: _reviewConversion,
                  onOpenAsset: _openAsset,
                  onContact: _openContact,
                  onOpenPayment: _openPayment,
                  onChooseEvent: !widget.returnToOffer
                      ? () => _offerEvent(value)
                      : null,
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  void _openPerson(String id) => context.pushNamed(
    Routes.hostCustomerDetailScreen.name,
    pathParameters: {'contactId': id},
    queryParameters: {'organizerId': widget.organizerId},
  );

  Future<void> _navigateQueue(int direction) async {
    final queue = widget.queue;
    if (queue == null || _busy || _navigating) return;
    setState(() => _navigating = true);
    try {
      final provider = hostFormResponsesControllerProvider(queue.request);
      var current = await ref.read(provider.future);
      var target = queue.targetIndex(
        current.inboxEntries,
        direction,
        hasMore: current.canLoadMore,
      );
      for (
        var pages = 0;
        target >= current.inboxEntries.length &&
            current.canLoadMore &&
            pages < 10;
        pages++
      ) {
        await ref.read(provider.notifier).loadMore();
        final refreshed = catchAsyncStateFromAsyncValue(
          ref.read(provider),
        ).value;
        if (refreshed == null) break;
        current = refreshed;
        if (current.loadMoreError != null) break;
        target = queue.targetIndex(
          current.inboxEntries,
          direction,
          hasMore: current.canLoadMore,
        );
      }
      if (!mounted || target < 0 || target >= current.inboxEntries.length) {
        return;
      }
      final entry = current.inboxEntries[target];
      final nextQueue = HostResponseReviewQueue(
        request: queue.request,
        entryId: entry.entryId,
        index: target,
      );
      if (entry.application case final application?) {
        context.pushReplacementNamed(
          Routes.hostApplicationDetailScreen.name,
          pathParameters: {'applicationId': application.applicationId},
          queryParameters: {'organizerId': widget.organizerId},
          extra: nextQueue,
        );
      } else if (entry.response case final response?) {
        context.pushReplacementNamed(
          Routes.hostFormResponseDetailScreen.name,
          pathParameters: {'responseId': response.responseId},
          queryParameters: {'organizerId': widget.organizerId},
          extra: nextQueue,
        );
      }
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.formResponses,
        );
      }
    } finally {
      if (mounted) setState(() => _navigating = false);
    }
  }

  Future<void> _openPayment(HostFormPaymentRecord payment) =>
      showCatchBottomSheet<void>(
        context: context,
        builder: (_) =>
            HostFormPaymentDetailSheet(payment: payment, onOpenResponse: null),
      );

  Future<void> _review(
    HostApplicationDetail application,
    HostApplicationReviewStatus status,
  ) async {
    setState(() => _saving = true);
    try {
      await ref
          .read(hostApplicationsControllerProvider)
          .reviewApplication(
            organizerId: widget.organizerId,
            applicationId: application.applicationId,
            expectedRevision: application.revision,
            reviewStatus: status,
            reviewNote: _note.text,
          );
      _reload();
      if (mounted) {
        showCatchNotice(context, context.l10n.hostApplicationReviewUpdated);
      }
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.applications,
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _openContact(Uri uri) async {
    try {
      final opened = await ref.read(externalLinkControllerProvider).open(uri);
      if (!opened && mounted) {
        showCatchNoticeError(
          context,
          StateError(context.l10n.hostFormResponseNotProvided),
        );
      }
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }

  Future<void> _openAsset(HostFormAssetDownload asset) async {
    try {
      final opened = await ref
          .read(externalLinkControllerProvider)
          .open(Uri.parse(asset.downloadUrl));
      if (!opened && mounted) {
        showCatchNoticeError(
          context,
          StateError(
            context.l10n.hostFormResponseDownloadFile(fileName: asset.fileName),
          ),
        );
      }
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }

  Future<void> _reviewConversion(
    HostFormResponseDetail detail,
    HostFormConversionKind kind,
  ) async {
    // Legacy attendee conversion is retained server-side for old clients only.
    // Every event action in this UI uses the reviewed offer/admission flow.
    if (kind == HostFormConversionKind.eventAttendeeProposal) return;
    setState(() => _converting = kind);
    try {
      final controller = ref.read(hostFormsControllerProvider);
      final preview = await controller.previewConversion(
        organizerId: widget.organizerId,
        responseId: detail.response.responseId,
        kind: kind,
      );
      if (!mounted) return;
      final confirmed = await _showConversionPreview(preview);
      if (confirmed != true || !mounted) return;
      await controller.convertResponse(
        organizerId: widget.organizerId,
        responseId: detail.response.responseId,
        kind: kind,
        requestId: 'conversion_${DateTime.now().microsecondsSinceEpoch}',
      );
      if (!mounted) return;
      _reload();
      showCatchNotice(context, context.l10n.hostFormConversionComplete);
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    } finally {
      if (mounted) setState(() => _converting = null);
    }
  }

  Future<bool?> _showConversionPreview(HostFormConversionPreview preview) =>
      showDialog<bool>(
        context: context,
        builder: (dialogContext) => CatchDialog(
          title: context.l10n.hostFormConversionReviewTitle,
          actions: [
            CatchButton(
              label: context.l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
              variant: CatchButtonVariant.ghost,
              onPressed: () => Navigator.of(dialogContext).pop(false),
            ),
            CatchButton(
              label: preview.allowed
                  ? context.l10n.hostFormConversionConfirm
                  : context.l10n.hostFormConversionUnavailable,
              onPressed: preview.allowed
                  ? () => Navigator.of(dialogContext).pop(true)
                  : null,
            ),
          ],
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 420),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CatchText(
                    context.l10n.hostFormConversionReviewBody,
                    variant: CatchTextVariant.supporting,
                    color: CatchTokens.of(context).ink2,
                  ),
                  if (preview.existingResultId != null) ...[
                    gapH12,
                    CatchText(
                      context.l10n.hostFormConversionExisting,
                      variant: CatchTextVariant.supporting,
                      color: CatchTokens.of(context).warning,
                    ),
                  ],
                  if (preview.warnings.isNotEmpty) ...[
                    gapH12,
                    for (final warning in preview.warnings)
                      Padding(
                        padding: CatchInsets.detailInlineRowBottomGap,
                        child: CatchText(
                          warning,
                          variant: CatchTextVariant.supporting,
                          color: CatchTokens.of(context).warning,
                        ),
                      ),
                  ],
                  gapH16,
                  CatchSection.containedFieldRows(
                    children: [
                      for (final field in preview.fields)
                        CatchField.read(
                          copy: catchFieldCopy(context.l10n),
                          title: field.label,
                          titleMaxLines: 2,
                          valueMaxLines: 4,
                          valueText:
                              field.value?.toString() ??
                              context.l10n.hostFormResponseNotProvided,
                          body: field.conflict,
                          bodyMaxLines: 4,
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      );

  Future<void> _offerEvent(HostResponseReviewDetail detail) async {
    if (_busy || !detail.canChooseEvent) {
      return;
    }
    if (widget.returnToOffer) {
      Navigator.of(context).pop();
      return;
    }
    await context.pushNamed<void>(
      Routes.hostResponseOfferScreen.name,
      pathParameters: {'responseId': detail.response!.response.responseId},
      queryParameters: {
        ...GoRouterState.of(context).uri.queryParameters,
        'organizerId': widget.organizerId,
        'recipientLabel': detail.response!.response.identity.primaryLabel,
      },
    );
    if (mounted) _reload();
  }
}
