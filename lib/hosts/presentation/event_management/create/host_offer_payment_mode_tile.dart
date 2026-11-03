import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// How this event collects offer payments. Free offers carry no collection;
/// each paid mode changes both the required fields and who confirms payment.
enum HostOfferPaymentMode {
  free,
  catchCheckout,
  reusablePage,
  personalRequest,
  manualInstructions,
}

String hostOfferPaymentModeTitle(
  AppLocalizations l10n,
  HostOfferPaymentMode mode,
) => switch (mode) {
  HostOfferPaymentMode.free => l10n.hostEventOfferFree,
  HostOfferPaymentMode.catchCheckout => l10n.hostsEventDefaultsCatchCheckout,
  HostOfferPaymentMode.reusablePage => l10n.hostOfferPaymentModePage,
  HostOfferPaymentMode.personalRequest =>
    l10n.hostsEventDefaultsPersonalRequest,
  HostOfferPaymentMode.manualInstructions =>
    l10n.hostsEventDefaultsManualInstructions,
};

String hostOfferPaymentModeBody(
  AppLocalizations l10n,
  HostOfferPaymentMode mode,
) => switch (mode) {
  HostOfferPaymentMode.free => l10n.hostOfferPaymentModeFreeBody,
  HostOfferPaymentMode.catchCheckout => l10n.hostOfferPaymentModeCheckoutBody,
  HostOfferPaymentMode.reusablePage => l10n.hostOfferPaymentModePageBody,
  HostOfferPaymentMode.personalRequest => l10n.hostOfferPaymentModeRequestBody,
  HostOfferPaymentMode.manualInstructions =>
    l10n.hostOfferPaymentModeManualBody,
};

/// One collection-mode option. Catch checkout stays visible but disabled until
/// verified provider activation lands; the rest stage on tap.
class HostOfferPaymentModeTile extends StatelessWidget {
  const HostOfferPaymentModeTile({
    super.key,
    required this.mode,
    required this.selected,
    required this.editable,
    required this.checkoutAvailable,
    required this.onSelected,
    this.summary = false,
  });

  final HostOfferPaymentMode mode;
  final bool selected;
  final bool editable;
  final bool checkoutAvailable;
  final ValueChanged<HostOfferPaymentMode> onSelected;

  /// Collapsed summary of the selected mode; a tap re-opens the picker rather
  /// than re-selecting, so the checkout gate does not apply.
  final bool summary;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final gated =
        mode == HostOfferPaymentMode.catchCheckout && !checkoutAvailable;
    return Semantics(
      selected: selected,
      inMutuallyExclusiveGroup: true,
      child: CatchChoiceTile(
        key: ValueKey('offer-payment-mode-${mode.name}'),
        title: gated
            ? '${hostOfferPaymentModeTitle(l10n, mode)} · '
                  '${l10n.hostOfferPaymentComingSoon}'
            : hostOfferPaymentModeTitle(l10n, mode),
        subtitle: hostOfferPaymentModeBody(l10n, mode),
        selected: selected,
        contractExemption: 'Offer collection mode, staged locally.',
        onTap: editable && (summary || !gated) ? () => onSelected(mode) : null,
      ),
    );
  }
}
