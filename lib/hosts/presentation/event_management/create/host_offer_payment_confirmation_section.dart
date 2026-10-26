import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_mode_tile.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Per-mode confirmation contract: how a paid (or free) offer actually
/// resolves before the host saves. Copy follows the selected mode so the
/// claim about confirmation is honest for the collection path chosen.
class HostOfferPaymentConfirmationSection extends StatelessWidget {
  const HostOfferPaymentConfirmationSection({super.key, required this.mode});

  final HostOfferPaymentMode mode;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final (title, body, icon, tone) = switch (mode) {
      HostOfferPaymentMode.free => (
        l10n.hostOfferPaymentConfirmFreeTitle,
        l10n.hostOfferPaymentConfirmFreeBody,
        CatchIcons.ticket,
        CatchNoticeTone.success,
      ),
      HostOfferPaymentMode.catchCheckout => (
        l10n.hostOfferPaymentConfirmAutoTitle,
        l10n.hostOfferPaymentConfirmAutoBody,
        CatchIcons.verified,
        CatchNoticeTone.success,
      ),
      HostOfferPaymentMode.reusablePage => (
        l10n.hostOfferPaymentConfirmManualTitle,
        l10n.hostOfferPaymentConfirmPageBody,
        CatchIcons.taskDone,
        CatchNoticeTone.warning,
      ),
      HostOfferPaymentMode.personalRequest => (
        l10n.hostOfferPaymentConfirmManualTitle,
        l10n.hostOfferPaymentConfirmRequestBody,
        CatchIcons.taskDone,
        CatchNoticeTone.warning,
      ),
      _ => (
        l10n.hostOfferPaymentConfirmManualTitle,
        l10n.hostOfferPaymentConfirmManualBody,
        CatchIcons.taskDone,
        CatchNoticeTone.warning,
      ),
    };
    return CatchSection.content(
      title: l10n.hostOfferPaymentConfirmationHeading,
      child: CatchNotice(
        dismissLabel: l10n.coreCatchNoticeTooltipDismiss,
        notice: CatchNoticeData(
          id: 'offer-payment-confirmation',
          title: title,
          message: body,
          icon: icon,
          tone: tone,
          duration: null,
          dismissible: false,
        ),
      ),
    );
  }
}
