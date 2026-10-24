import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_payment_record.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostFormPaymentDetailSheet extends StatelessWidget {
  const HostFormPaymentDetailSheet({
    super.key,
    required this.payment,
    required this.onOpenResponse,
  });
  final HostFormPaymentRecord payment;
  final VoidCallback? onOpenResponse;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    return CatchSheet.standard(
      title: hostFormPaymentStatusLabel(l10n, payment.status),
      footer: payment.responseId != null && onOpenResponse != null
          ? CatchButton.sheet(
              label: l10n.hostFormPaymentsOpenResponse,
              role: CatchButtonEmphasis.alternative,
              onPressed: onOpenResponse,
            )
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchText(
            hostFormPaymentStatusHelp(l10n, payment.status),
            variant: CatchTextVariant.supporting,
          ),
          if (payment.mode == HostFormPaymentMode.test) ...[
            gapH16,
            CatchText(
              l10n.hostFormPaymentsTestHelp,
              variant: CatchTextVariant.supporting,
            ),
          ],
          gapH24,
          CatchSection.fieldRows(
            children: [
              CatchField.read(
                copy: copy,
                title: l10n.hostFormPaymentsAmount,
                body: hostFormPaymentAmount(payment.amountPaise),
              ),
              if (payment.refundedAmountPaise > 0)
                CatchField.read(
                  copy: copy,
                  title: l10n.hostFormPaymentsRefundAmount,
                  body: hostFormPaymentAmount(payment.refundedAmountPaise),
                ),
              for (final entry in [
                (l10n.hostFormPaymentsStarted, payment.createdAt),
                (l10n.hostFormPaymentsUpdated, payment.updatedAt),
                if (payment.capturedAt != null)
                  (l10n.hostFormPaymentsCapturedAt, payment.capturedAt!),
                if (payment.submittedAt != null)
                  (l10n.hostFormPaymentsSubmittedAt, payment.submittedAt!),
              ])
                CatchField.read(
                  copy: copy,
                  title: entry.$1,
                  body: AppTimeFormatters.dateTime(entry.$2.toLocal()),
                  bodyMaxLines: 3,
                ),
            ],
          ),
          gapH24,
          CatchSection.divided(
            title: l10n.hostFormPaymentsReferences,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final entry in [
                  (l10n.hostFormPaymentsReceipt, payment.receipt),
                  if (payment.providerOrderId != null)
                    (
                      l10n.hostFormPaymentsOrderReference,
                      payment.providerOrderId!,
                    ),
                  if (payment.providerPaymentId != null)
                    (
                      l10n.hostFormPaymentsPaymentReference,
                      payment.providerPaymentId!,
                    ),
                  if (payment.providerRefundId != null)
                    (
                      l10n.hostFormPaymentsRefundReference,
                      payment.providerRefundId!,
                    ),
                ]) ...[
                  CatchText(entry.$1, variant: CatchTextVariant.supporting),
                  gapH8,
                  SelectableText(entry.$2),
                  gapH16,
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
