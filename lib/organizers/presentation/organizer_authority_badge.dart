import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

String organizerTrustLabel(
  OrganizerTrustState state,
  AppLocalizations l10n,
) => switch (state) {
  OrganizerTrustState.crawledUnclaimed =>
    l10n.organizersAuthorityBadgeUnclaimed,
  OrganizerTrustState.sourceBacked => l10n.organizersAuthorityBadgeSourceBacked,
  OrganizerTrustState.claimPending => l10n.organizersAuthorityBadgeClaimPending,
  OrganizerTrustState.claimedUnverified => l10n.organizersAuthorityBadgeClaimed,
  OrganizerTrustState.firstParty => l10n.organizersAuthorityBadgeCatchOrganizer,
  OrganizerTrustState.ownerVerified =>
    l10n.organizersAuthorityBadgeOwnerVerified,
  OrganizerTrustState.suppressed => l10n.organizersAuthorityBadgeUnavailable,
};

class OrganizerAuthorityBadge extends StatelessWidget {
  const OrganizerAuthorityBadge({
    super.key,
    required this.state,
    this.size = CatchBadgeSize.sm,
  });

  final OrganizerTrustState state;
  final CatchBadgeSize size;

  @override
  Widget build(BuildContext context) {
    return CatchBadge.functional(
      key: ValueKey('organizer-authority-${state.name}'),
      label: organizerTrustLabel(state, context.l10n),
      tone: switch (state) {
        OrganizerTrustState.ownerVerified => CatchBadgeTone.success,
        OrganizerTrustState.firstParty => CatchBadgeTone.brand,
        OrganizerTrustState.claimPending => CatchBadgeTone.warning,
        OrganizerTrustState.suppressed => CatchBadgeTone.danger,
        OrganizerTrustState.crawledUnclaimed ||
        OrganizerTrustState.sourceBacked ||
        OrganizerTrustState.claimedUnverified => CatchBadgeTone.neutral,
      },
      size: size,
    );
  }
}
