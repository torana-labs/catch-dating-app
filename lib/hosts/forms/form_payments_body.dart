import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:catch_dating_app/hosts/forms/form_payment_labels.dart';
import 'package:catch_dating_app/hosts/forms/form_payments_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// A form's fee payments in board order: what the list holds, the status
/// filter with Refresh, one row per payment (amount, live or test, status
/// and when it started), then Load more.
class HostFormPaymentsBody extends StatelessWidget {
  const HostFormPaymentsBody({
    super.key,
    required this.state,
    required this.onFilter,
    required this.onRefresh,
    required this.onOpen,
    required this.onLoadMore,
  });

  final HostFormPaymentsViewState state;
  final ValueChanged<HostFormPaymentFilter> onFilter;
  final VoidCallback onRefresh;
  final ValueChanged<HostFormPaymentRecord> onOpen;
  final VoidCallback onLoadMore;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final filtered = state.filter != HostFormPaymentFilter.all;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(l10n.hostFormPaymentsHelp, tone: CatchTextTone.secondary),
        CatchPageTabBar<HostFormPaymentFilter>.segmented(
          key: const ValueKey<String>('host-form-payments-filter'),
          selected: state.filter,
          size: CatchPageTabBarSize.sm,
          fill: false,
          label: l10n.hostFormPaymentsTitle,
          options: [
            for (final filter in HostFormPaymentFilter.values)
              CatchOption(
                value: filter,
                label: hostFormPaymentFilterText(l10n, filter),
              ),
          ],
          onChanged: onFilter,
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          children: [
            CatchChip.filter(
              key: const ValueKey<String>('host-form-payments-refresh'),
              label: l10n.hostFormPaymentsRefresh,
              leading: CatchIcon(CatchIcons.refresh),
              size: CatchChipSize.sm,
              onPressed: state.loading || state.refreshing ? null : onRefresh,
            ),
          ],
        ),
        if (state.loading)
          CatchSkeleton.content(
            child: CatchSection(
              children: [
                for (var row = 0; row < _placeholderRows; row++)
                  CatchIndexRow(
                    title: hostFormPaymentAmountText(0),
                    subtitle: l10n.hostFormPaymentsPending,
                    onTap: null,
                    density: CatchIndexRowSize.compact,
                  ),
              ],
            ),
          )
        else if (state.items.isEmpty)
          CatchEmptyState(
            key: const ValueKey<String>('host-form-payments-empty'),
            icon: CatchIcons.receipt,
            title: filtered
                ? l10n.hostFormPaymentsNoMatches
                : l10n.hostFormPaymentsEmpty,
            message: filtered
                ? l10n.hostFormPaymentsNoMatchesBody
                : l10n.hostFormPaymentsEmptyBody,
          )
        else
          CatchSection(
            children: [
              for (final payment in state.items)
                CatchIndexRow(
                  key: ValueKey<String>(
                    'host-form-payment-${payment.paymentId}',
                  ),
                  title:
                      '${hostFormPaymentAmountText(payment.amountPaise)} · '
                      '${payment.mode == HostFormPaymentMode.test ? l10n.hostFormPaymentTest : l10n.hostFormPaymentLive}',
                  titleMaxLines: 3,
                  subtitle: hostFormPaymentStatusText(l10n, payment.status),
                  meta: AppTimeFormatters.dateTime(payment.createdAt.toLocal()),
                  onTap: () => onOpen(payment),
                  density: CatchIndexRowSize.compact,
                  chevron: true,
                ),
            ],
          ),
        if (state.hasMore && state.items.isNotEmpty)
          CatchButton(
            key: const ValueKey<String>('host-form-payments-more'),
            label: l10n.hostFormsLoadMore,
            variant: CatchButtonVariant.secondary,
            status: state.loadingMore
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            fullWidth: true,
            onPressed: state.loadingMore ? null : onLoadMore,
          ),
        if (state.loadMoreError != null)
          CatchNotice.inline(
            body: l10n.hostFormsLoadMoreFailed,
            tone: CatchNoticeTone.danger,
            action: CatchNoticeAction(
              label: l10n.hostFormsTryAgain,
              onPressed: onLoadMore,
            ),
          ),
      ],
    );
  }

  static const _placeholderRows = 3;
}
