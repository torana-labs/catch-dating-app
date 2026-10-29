import 'package:catch_dating_app/clubs/shared/club_host_identity_row.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/organizers.dart';

enum ExploreOrganizerMembershipActionState {
  hidden,
  signInGate,
  follow,
  following,
}

ExploreOrganizerMembershipActionState exploreOrganizerMembershipActionState({
  required bool contentVisible,
  required bool authResolved,
  required String? uid,
  required bool isFollowing,
}) {
  if (!contentVisible || !authResolved) {
    return ExploreOrganizerMembershipActionState.hidden;
  }
  if (uid == null) {
    return ExploreOrganizerMembershipActionState.signInGate;
  }
  return isFollowing
      ? ExploreOrganizerMembershipActionState.following
      : ExploreOrganizerMembershipActionState.follow;
}

class ExploreClubCardState {
  const ExploreClubCardState({
    required this.memberCountLabel,
    required this.caption,
    required this.title,
    required this.supportingLabel,
    required this.ratingReviewLabel,
    required this.trustLabel,
    required this.hostEyebrow,
    required this.hostName,
    required this.hostAvatarUrl,
    required this.hasHostIdentity,
    required this.semanticLabel,
    required this.rowKicker,
    required this.tags,
  });

  factory ExploreClubCardState.from(
    Club club, {
    required AppLocalizations l10n,
  }) {
    final hasHostIdentity = club.displayHostProfiles.isNotEmpty;
    final hostEyebrow = l10n.exploreExploreScreenStateLabelHostedBy;
    final hostName = club.displayHostName;
    final ratingReviewLabel = l10n.exploreExploreScreenStateClubRatingReviews(
      rating: club.rating.toStringAsFixed(1),
      reviewCount: club.reviewCount,
    );
    final trustLabel = organizerTrustLabel(
      club.organizerAuthority.trustState,
      l10n,
    );
    return ExploreClubCardState(
      memberCountLabel: clubMemberCountLabel(club),
      caption:
          (club.nextEventLabel ??
                  l10n.exploreExploreScreenStateCaptionClubToKnow)
              .toUpperCase(),
      title: club.name,
      supportingLabel: _clubSupportingLabel(club, l10n),
      ratingReviewLabel: ratingReviewLabel,
      trustLabel: trustLabel,
      hostEyebrow: hostEyebrow,
      hostName: hostName,
      hostAvatarUrl: club.hostAvatarUrl,
      hasHostIdentity: hasHostIdentity,
      semanticLabel:
          '${l10n.exploreExploreScreenStateClubCardSemantics(title: club.name, caption: (club.nextEventLabel ?? l10n.exploreExploreScreenStateCaptionClubToKnow).toUpperCase(), supportingLabel: _clubSupportingLabel(club, l10n), memberCountLabel: clubMemberCountLabel(club), ratingReviewLabel: ratingReviewLabel)}, $trustLabel${hasHostIdentity ? ', $hostEyebrow $hostName' : ''}',
      rowKicker: l10n.exploreExploreScreenStateVisiblecopyClubToKnow,
      tags: visibleClubTags(club, limit: 2),
    );
  }

  final String memberCountLabel;
  final String caption;
  final String title;
  final String supportingLabel;
  final String ratingReviewLabel;
  final String trustLabel;
  final String hostEyebrow;
  final String hostName;
  final String? hostAvatarUrl;
  final bool hasHostIdentity;
  final String semanticLabel;
  final String rowKicker;
  final List<String> tags;
}

String _clubSupportingLabel(Club club, AppLocalizations l10n) {
  final nextEvent = club.nextEventLabel?.trim();
  if (nextEvent != null && nextEvent.isNotEmpty) {
    return l10n.exploreExploreScreenStateVisiblecopyNextNextevent(
      nextEvent: nextEvent,
    );
  }
  final area = club.area.trim();
  if (area.isNotEmpty) {
    return l10n.exploreExploreScreenStateVisiblecopyClubmembercountlabelArea(
      clubMemberCountLabel: clubMemberCountLabel(club),
      area: area,
    );
  }
  return clubMemberCountLabel(club);
}
