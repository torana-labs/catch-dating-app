import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:catch_dating_app/hosts/forms/form_payment_labels.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One fee payment: what its status means, test-mode help, the amount and
/// any refund, when it started, changed, was captured and was submitted,
/// and the receipt and provider references (each with Copy), with Open
/// response when the payment belongs to one.
class HostFormPaymentSheet extends StatelessWidget {
  const HostFormPaymentSheet({
    super.key,
    required this.payment,
    required this.onOpenResponse,
    required this.onCopy,
  });

  final HostFormPaymentRecord payment;

  /// Opens the response the payment was made with; null hides it.
  final VoidCallback? onOpenResponse;

  /// Copies a reference for the host to paste elsewhere.
  final ValueChanged<String> onCopy;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final references = [
      (l10n.hostFormPaymentsReceipt, payment.receipt),
      if (payment.providerOrderId case final order?)
        (l10n.hostFormPaymentsOrderReference, order),
      if (payment.providerPaymentId case final id?)
        (l10n.hostFormPaymentsPaymentReference, id),
      if (payment.providerRefundId case final refund?)
        (l10n.hostFormPaymentsRefundReference, refund),
    ];
    return CatchSheet.standard(
      title: hostFormPaymentStatusText(l10n, payment.status),
      subtitle: hostFormPaymentStatusHelpText(l10n, payment.status),
      footer: payment.responseId != null && onOpenResponse != null
          ? CatchButton.sheet(
              key: const ValueKey<String>('host-form-payment-open-response'),
              label: l10n.hostFormPaymentsOpenResponse,
              role: CatchButtonEmphasis.alternative,
              onPressed: onOpenResponse,
            )
          : null,
      child: CatchStack(
        gap: CatchStackGap.g24,
        children: [
          if (payment.mode == HostFormPaymentMode.test)
            CatchNotice.inline(
              body: l10n.hostFormPaymentsTestHelp,
              tone: CatchNoticeTone.neutral,
            ),
          CatchSection(
            children: [
              CatchField.read(
                copy: copy,
                title: l10n.hostFormPaymentsAmount,
                body: hostFormPaymentAmountText(payment.amountPaise),
              ),
              if (payment.refundedAmountPaise > 0)
                CatchField.read(
                  copy: copy,
                  title: l10n.hostFormPaymentsRefundAmount,
                  body: hostFormPaymentAmountText(payment.refundedAmountPaise),
                ),
              for (final (title, at) in [
                (l10n.hostFormPaymentsStarted, payment.createdAt),
                (l10n.hostFormPaymentsUpdated, payment.updatedAt),
                if (payment.capturedAt case final captured?)
                  (l10n.hostFormPaymentsCapturedAt, captured),
                if (payment.submittedAt case final submitted?)
                  (l10n.hostFormPaymentsSubmittedAt, submitted),
              ])
                CatchField.read(
                  copy: copy,
                  title: title,
                  body: AppTimeFormatters.dateTime(at.toLocal()),
                  bodyMaxLines: 3,
                ),
            ],
          ),
          CatchSection(
            title: l10n.hostFormPaymentsReferences,
            children: [
              for (final (title, value) in references)
                CatchField.read(
                  copy: copy,
                  title: title,
                  body: value,
                  bodyMaxLines: 3,
                  secondaryAction: CatchFieldSecondaryAction.command(
                    label: l10n.hostFormsShareCopy,
                    icon: CatchIcons.copy,
                    onActivate: () => onCopy(value),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
