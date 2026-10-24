import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_payment_record.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_detail_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payments_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class HostFormPaymentsSectionList extends ConsumerStatefulWidget {
  const HostFormPaymentsSectionList({
    super.key,
    required this.organizerId,
    required this.formId,
  });
  final String organizerId;
  final String formId;
  @override
  ConsumerState<HostFormPaymentsSectionList> createState() =>
      _HostFormPaymentsSectionListState();
}

class _HostFormPaymentsSectionListState
    extends ConsumerState<HostFormPaymentsSectionList> {
  HostFormPaymentFilter _filter = HostFormPaymentFilter.all;
  @override
  void didUpdateWidget(covariant HostFormPaymentsSectionList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.organizerId != widget.organizerId ||
        oldWidget.formId != widget.formId) {
      _filter = HostFormPaymentFilter.all;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final provider = hostFormPaymentsControllerProvider(
      widget.organizerId,
      widget.formId,
      _filter,
    );
    final payments = ref.watch(provider);
    final asyncState = catchAsyncStateFromAsyncValue(payments);
    return SliverMainAxisGroup(
      slivers: [
        SliverToBoxAdapter(
          child: CatchSection.content(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CatchText(
                  l10n.hostFormPaymentsHelp,
                  variant: CatchTextVariant.supporting,
                ),
                gapH16,
                CatchChoiceInput<HostFormPaymentFilter>.segmented(
                  options: [
                    for (final filter in HostFormPaymentFilter.values)
                      CatchOption(
                        value: filter,
                        label: hostFormPaymentFilterLabel(l10n, filter),
                      ),
                  ],
                  selected: _filter,
                  onChanged: (value) => setState(() => _filter = value),
                  scrollable: true,
                  showDivider: false,
                  variant: CatchChoiceInputVariant.summary,
                  contractExemption:
                      'Read-only payment status filters map to listOrganizerFormPayments statuses; not editable form data.',
                ),
                CatchButton.command(
                  label: l10n.hostFormPaymentsRefresh,
                  leading: Icon(CatchIcons.refreshRounded),
                  onPressed: (asyncState.isLoading || asyncState.isRefreshing)
                      ? null
                      : () => ref.invalidate(provider),
                ),
              ],
            ),
          ),
        ),
        CatchAsyncBoundary<HostFormPaymentsState>.sliver(
          value: payments,
          onRetry: () => ref.invalidate(provider),
          errorContext: AppErrorContext.forms,
          builder: (context, state) {
            if (state.items.isEmpty) {
              return CatchSliverEmptyState(
                icon: CatchIcons.receiptLongOutlined,
                title: _filter == HostFormPaymentFilter.all
                    ? l10n.hostFormPaymentsEmpty
                    : l10n.hostFormPaymentsNoMatches,
                message: _filter == HostFormPaymentFilter.all
                    ? l10n.hostFormPaymentsEmptyBody
                    : l10n.hostFormPaymentsNoMatchesBody,
              );
            }
            return SliverMainAxisGroup(
              slivers: [
                CatchSection.sliverRows(
                  itemCount: state.items.length,
                  indexForKeyBuilder: (key) {
                    final index = state.items.indexWhere(
                      (item) => key == ValueKey(item.paymentId),
                    );
                    return index < 0 ? null : index;
                  },
                  itemBuilder: (context, index) {
                    final payment = state.items[index];
                    return CatchField.nav(
                      key: ValueKey(payment.paymentId),
                      copy: catchFieldCopy(l10n),
                      title:
                          '${hostFormPaymentAmount(payment.amountPaise)} · ${payment.mode == HostFormPaymentMode.test ? l10n.hostFormPaymentTest : l10n.hostFormPaymentLive}',
                      titleMaxLines: 3,
                      body:
                          '${hostFormPaymentStatusLabel(l10n, payment.status)}\n${AppTimeFormatters.dateTime(payment.createdAt.toLocal())}',
                      bodyMaxLines: 5,
                      emphasis: CatchFieldEmphasis.title,
                      onTap: () => _openPayment(payment),
                    );
                  },
                ),
                if (state.nextCursor != null)
                  CatchPageBody.sliver(
                    child: SliverToBoxAdapter(
                      child: CatchButton(
                        label: l10n.hostFormsLoadMore,
                        variant: CatchButtonVariant.secondary,
                        fullWidth: true,
                        status: state.loadingMore
                            ? CatchButtonStatus.loading
                            : CatchButtonStatus.idle,
                        onPressed: state.loadingMore
                            ? null
                            : () => ref.read(provider.notifier).loadMore(),
                      ),
                    ),
                  ),
                if (state.loadMoreError case final error?)
                  CatchLocalizedSliverErrorState(
                    error,
                    context: AppErrorContext.forms,
                    fillRemaining: false,
                    onRetry: () => ref.read(provider.notifier).loadMore(),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }

  Future<void> _openPayment(HostFormPaymentRecord payment) async {
    final responseId = await showCatchBottomSheet<String>(
      context: context,
      builder: (sheetContext) => HostFormPaymentDetailSheet(
        payment: payment,
        onOpenResponse: payment.responseId == null
            ? null
            : () => Navigator.of(sheetContext).pop(payment.responseId),
      ),
    );
    if (responseId == null || !mounted) return;
    await context.pushNamed(
      Routes.hostFormResponseDetailScreen.name,
      pathParameters: {'responseId': responseId},
      queryParameters: {'organizerId': widget.organizerId},
    );
  }
}
