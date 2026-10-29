import 'package:catch_dating_app/host_memberships/domain/host_membership_event_facts.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Checkout upsell when a membership would make this event cheaper, free or
/// bookable at all.
class HostMembershipUpsellBanner extends StatelessWidget {
  const HostMembershipUpsellBanner({
    super.key,
    required this.offer,
    required this.onJoin,
  });

  final HostMembershipEventOffer offer;
  final VoidCallback onJoin;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final planPrice = hostMembershipIntervalPrice(
      l10n,
      offer.planPriceInPaise,
      offer.interval,
    );
    return CatchBanner(
      key: const ValueKey('host-membership-upsell'),
      icon: CatchIcons.membership,
      title: offer.unlocksAccess
          ? l10n.membershipsUpsellUnlockTitle
          : offer.makesEventFree
          ? l10n.membershipsUpsellFreeTitle
          : l10n.membershipsUpsellSaveTitle(
              price: hostMembershipPrice(offer.memberPriceInPaise),
            ),
      message: l10n.membershipsUpsellMessage(
        planName: offer.planName,
        planPrice: planPrice,
      ),
      actions: [
        CatchButton(
          label: l10n.membershipsUpsellAction,
          size: CatchButtonSize.md,
          onPressed: onJoin,
        ),
      ],
    );
  }
}
