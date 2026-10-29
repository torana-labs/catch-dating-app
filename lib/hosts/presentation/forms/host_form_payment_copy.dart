import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:catch_dating_app/l10n/l10n.dart';

String hostFormPaymentStatusLabel(
  AppLocalizations l10n,
  HostFormPaymentStatus status,
) => switch (status) {
  HostFormPaymentStatus.creatingOrder => l10n.hostFormPaymentsCreatingOrder,
  HostFormPaymentStatus.orderUnknown => l10n.hostFormPaymentsOrderUnknown,
  HostFormPaymentStatus.checkoutReady => l10n.hostFormPaymentsCheckoutReady,
  HostFormPaymentStatus.verifying => l10n.hostFormPaymentsVerifying,
  HostFormPaymentStatus.captured => l10n.hostFormPaymentsCaptured,
  HostFormPaymentStatus.submitted => l10n.hostFormPaymentsSubmitted,
  HostFormPaymentStatus.failed => l10n.hostFormPaymentsFailed,
  HostFormPaymentStatus.expired => l10n.hostFormPaymentsExpired,
  HostFormPaymentStatus.refundPending => l10n.hostFormPaymentsRefundPending,
  HostFormPaymentStatus.refunded => l10n.hostFormPaymentsRefunded,
  HostFormPaymentStatus.reviewRequired => l10n.hostFormPaymentsReviewRequired,
};

String hostFormPaymentFilterLabel(
  AppLocalizations l10n,
  HostFormPaymentFilter filter,
) => switch (filter) {
  HostFormPaymentFilter.all => l10n.hostFormsFilterAll,
  HostFormPaymentFilter.pending => l10n.hostFormPaymentsPending,
  HostFormPaymentFilter.submitted => l10n.hostFormPaymentsSubmitted,
  HostFormPaymentFilter.refunds => l10n.hostFormPaymentsRefunds,
  HostFormPaymentFilter.attention => l10n.hostFormPaymentsAttention,
};

String hostFormPaymentStatusHelp(
  AppLocalizations l10n,
  HostFormPaymentStatus status,
) => switch (status) {
  HostFormPaymentStatus.creatingOrder ||
  HostFormPaymentStatus.orderUnknown ||
  HostFormPaymentStatus.checkoutReady ||
  HostFormPaymentStatus.verifying => l10n.hostFormPaymentsPendingHelp,
  HostFormPaymentStatus.captured => l10n.hostFormPaymentsCapturedHelp,
  HostFormPaymentStatus.submitted => l10n.hostFormPaymentsSubmittedHelp,
  HostFormPaymentStatus.failed => l10n.hostFormPaymentsFailedHelp,
  HostFormPaymentStatus.expired => l10n.hostFormPaymentsExpiredHelp,
  HostFormPaymentStatus.refundPending ||
  HostFormPaymentStatus.refunded => l10n.hostFormPaymentsRefundHelp,
  HostFormPaymentStatus.reviewRequired => l10n.hostFormPaymentsReviewHelp,
};

String hostFormPaymentAmount(int paise) =>
    '₹${paise ~/ 100}.${(paise % 100).toString().padLeft(2, '0')}';
