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

class ExploreOrganizerCardState {
  const ExploreOrganizerCardState({
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

  factory ExploreOrganizerCardState.from(
    Organizer organizer, {
    required AppLocalizations l10n,
  }) {
    final hasHostIdentity = organizer.displayHostProfiles.isNotEmpty;
    final hostEyebrow = l10n.exploreExploreScreenStateLabelHostedBy;
    final hostName = organizer.displayHostName;
    final ratingReviewLabel = l10n
        .exploreExploreScreenStateOrganizerRatingReviews(
          rating: organizer.rating.toStringAsFixed(1),
          reviewCount: organizer.reviewCount,
        );
    final trustLabel = organizerTrustLabel(
      organizer.organizerAuthority.trustState,
      l10n,
    );
    return ExploreOrganizerCardState(
      memberCountLabel: organizerMemberCountLabel(organizer),
      caption:
          (organizer.nextEventLabel ??
                  l10n.exploreExploreScreenStateCaptionOrganizerToKnow)
              .toUpperCase(),
      title: organizer.name,
      supportingLabel: _organizerSupportingLabel(organizer, l10n),
      ratingReviewLabel: ratingReviewLabel,
      trustLabel: trustLabel,
      hostEyebrow: hostEyebrow,
      hostName: hostName,
      hostAvatarUrl: organizer.hostAvatarUrl,
      hasHostIdentity: hasHostIdentity,
      semanticLabel:
          '${l10n.exploreExploreScreenStateOrganizerCardSemantics(title: organizer.name, caption: (organizer.nextEventLabel ?? l10n.exploreExploreScreenStateCaptionOrganizerToKnow).toUpperCase(), supportingLabel: _organizerSupportingLabel(organizer, l10n), memberCountLabel: organizerMemberCountLabel(organizer), ratingReviewLabel: ratingReviewLabel)}, $trustLabel${hasHostIdentity ? ', $hostEyebrow $hostName' : ''}',
      rowKicker: l10n.exploreExploreScreenStateVisiblecopyOrganizerToKnow,
      tags: visibleOrganizerTags(organizer, limit: 2),
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

String _organizerSupportingLabel(Organizer organizer, AppLocalizations l10n) {
  final nextEvent = organizer.nextEventLabel?.trim();
  if (nextEvent != null && nextEvent.isNotEmpty) {
    return l10n.exploreExploreScreenStateVisiblecopyNextNextevent(
      nextEvent: nextEvent,
    );
  }
  final area = organizer.area.trim();
  if (area.isNotEmpty) {
    return l10n
        .exploreExploreScreenStateVisiblecopyOrganizermembercountlabelArea(
          organizerMemberCountLabel: organizerMemberCountLabel(organizer),
          area: area,
        );
  }
  return organizerMemberCountLabel(organizer);
}
