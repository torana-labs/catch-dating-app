import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_mode_tile.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// The collection-mode decision itself: an expanded picker while the host is
/// choosing, then a collapsed summary tile whose tap (or Change action) reopens
/// the picker. Catch checkout stays visible but gated until provider
/// activation lands.
class HostOfferPaymentModeSection extends StatelessWidget {
  const HostOfferPaymentModeSection({
    super.key,
    required this.mode,
    required this.pickerExpanded,
    required this.editable,
    required this.checkoutAvailable,
    required this.first,
    required this.onSelected,
    required this.onExpandPicker,
  });

  final HostOfferPaymentMode? mode;
  final bool pickerExpanded;
  final bool editable;
  final bool checkoutAvailable;
  final bool first;
  final ValueChanged<HostOfferPaymentMode> onSelected;
  final VoidCallback onExpandPicker;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final mode = this.mode;
    if (mode == null || pickerExpanded) {
      return CatchSection.choiceGroup(
        first: first,
        title: l10n.hostOfferPaymentModeHeading,
        child: Column(
          children: [
            for (final candidate in HostOfferPaymentMode.values) ...[
              HostOfferPaymentModeTile(
                mode: candidate,
                selected: mode == candidate,
                editable: editable,
                checkoutAvailable: checkoutAvailable,
                onSelected: onSelected,
              ),
              if (candidate != HostOfferPaymentMode.manualInstructions)
                const SizedBox(height: CatchSpacing.s3),
            ],
          ],
        ),
      );
    }
    return CatchSection.fieldRows(
      first: first,
      title: l10n.hostOfferPaymentModeHeading,
      trailing: editable
          ? CatchButton.text(
              key: const ValueKey('offer-payment-mode-change'),
              label: l10n.hostOfferPaymentModeChange,
              onPressed: onExpandPicker,
            )
          : null,
      child: Padding(
        padding: const EdgeInsets.only(
          top: CatchFieldTokens.rowVerticalPadding,
        ),
        child: HostOfferPaymentModeTile(
          mode: mode,
          selected: true,
          editable: editable,
          checkoutAvailable: checkoutAvailable,
          onSelected: (_) => onExpandPicker(),
          summary: true,
        ),
      ),
    );
  }
}
