import 'package:catch_dating_app/contexts/payments/data/organizer_event_checkout.dart';
import 'package:catch_dating_app/kernel/country_markets.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Catch's own payment page for an organizer-routed booking. It shows the
/// server-quoted amount and refund deadline, then returns the method the guest
/// picks; Razorpay's secure checkout opens on that method alone.
class OrganizerPaymentMethodSheet extends StatelessWidget {
  const OrganizerPaymentMethodSheet({
    super.key,
    required this.amountPaise,
    required this.currency,
    this.refundDeadline,
  });

  final int amountPaise;
  final String currency;
  final DateTime? refundDeadline;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final deadline = refundDeadline;
    return CatchSheet.standard(
      title: l10n.paymentMethodSheetTitle(
        amount: formatMinorCurrency(amountPaise, currencyCode: currency),
      ),
      subtitle: deadline == null
          ? l10n.paymentMethodSheetSeller
          // copy:allow-inline(Joins two governed payment-page sentences)
          : '${l10n.paymentMethodSheetSeller} '
                '${l10n.paymentMethodSheetRefundBy(deadline: AppTimeFormatters.dateTime(deadline))}',
      footer: CatchText(
        l10n.paymentMethodSheetSecureNote,
        variant: CatchTextVariant.supporting,
      ),
      child: CatchSection.containedFieldGroups(
        groups: [
          CatchSectionFieldGroup(
            title: l10n.paymentMethodSheetUpiHeading,
            children: [
              for (final (value, title, icon) in [
                (
                  OrganizerPaymentMethod.googlePay,
                  l10n.paymentMethodGooglePay,
                  CatchIcons.mobile,
                ),
                (
                  OrganizerPaymentMethod.phonePe,
                  l10n.paymentMethodPhonePe,
                  CatchIcons.mobile,
                ),
                (
                  OrganizerPaymentMethod.paytm,
                  l10n.paymentMethodPaytm,
                  CatchIcons.mobile,
                ),
                (
                  OrganizerPaymentMethod.otherUpi,
                  l10n.paymentMethodOtherUpi,
                  CatchIcons.qrCode,
                ),
              ])
                CatchField.action(
                  copy: catchFieldCopy(l10n),
                  title: title,
                  titleMaxLines: 2,
                  icon: icon,
                  onTap: () => Navigator.of(context).pop(value),
                ),
            ],
          ),
          CatchSectionFieldGroup(
            title: l10n.paymentMethodSheetOtherHeading,
            children: [
              for (final (value, title, icon) in [
                (
                  OrganizerPaymentMethod.card,
                  l10n.paymentMethodCard,
                  CatchIcons.card,
                ),
                (
                  OrganizerPaymentMethod.netbanking,
                  l10n.paymentMethodNetbanking,
                  CatchIcons.wallet,
                ),
              ])
                CatchField.action(
                  copy: catchFieldCopy(l10n),
                  title: title,
                  titleMaxLines: 2,
                  icon: icon,
                  onTap: () => Navigator.of(context).pop(value),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
