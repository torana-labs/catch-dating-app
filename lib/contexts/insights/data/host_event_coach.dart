import 'package:catch_dating_app/contexts/formats/formats.dart';

/// Whether an event report's coach figures can show.
enum HostEventCoachStatus {
  /// At least the group-size floor of guests checked in.
  ready,

  /// Fewer guests checked in than the floor, so no figures came back.
  withheld,
}

/// The post-event coach block on one event's report (`eventCoach` in the
/// `getHostAnalytics` response): the event's scorecard when at least the
/// group-size floor of guests checked in, or only why it is withheld.
class HostEventCoach {
  const HostEventCoach({
    required this.status,
    required this.groupSizeFloor,
    this.caption,
    this.scorecard,
  });

  /// Null for a response with no coach block (no scorecard yet, or a
  /// report that is not for one event).
  static HostEventCoach? fromCallableData(Object? data) {
    if (data is! Map) return null;
    final status = HostEventCoachStatus.values
        .where((value) => value.name == data['status'])
        .firstOrNull;
    if (status == null) return null;
    final scorecard = data['scorecard'];
    return HostEventCoach(
      status: status,
      groupSizeFloor: _count(data['groupSizeFloor']),
      caption: data['caption'] is String ? data['caption'] as String : null,
      scorecard: status == HostEventCoachStatus.ready && scorecard is Map
          ? eventSuccessScorecardFromMap(scorecard)
          : null,
    );
  }

  final HostEventCoachStatus status;
  final int groupSizeFloor;

  /// The server's line for a withheld block.
  final String? caption;
  final EventSuccessScorecard? scorecard;
}

/// The scorecard aggregates in a coach block.
EventSuccessScorecard eventSuccessScorecardFromMap(Map<dynamic, dynamic> map) {
  final conversationGraph = map['conversationGraph'] is Map
      ? map['conversationGraph'] as Map
      : const <String, Object?>{};
  return EventSuccessScorecard(
    bookedCount: _count(map['bookedCount']),
    checkedInCount: _count(map['checkedInCount']),
    attendeesWhoMetTwoPlusPeople: _count(map['attendeesWhoMetTwoPlusPeople']),
    catchSentCount: _count(map['catchSentCount']),
    attendeesWhoCaughtSomeone: _count(map['attendeesWhoCaughtSomeone']),
    catchRecipientCount: _count(map['catchRecipientCount']),
    catchRate: _clamp(map['catchRate'], 1),
    mutualMatchCount: _count(map['mutualMatchCount']),
    chatStartedCount: _count(map['chatStartedCount']),
    averageWelcomeRating: _clamp(map['averageWelcomeRating'], 5),
    averageStructureRating: _clamp(map['averageStructureRating'], 5),
    safetyIncidentCount: _count(map['safetyIncidentCount']),
    feedbackResponseCount: _count(map['feedbackCount']),
    conversationGraphResponseCount: _count(conversationGraph['responseCount']),
    conversationGraphSkippedCount: _count(conversationGraph['skippedCount']),
    conversationCount: _count(conversationGraph['conversationCount']),
    attendeesWithTwoPlusConversations: _count(
      conversationGraph['attendeesWithTwoPlusConversations'],
    ),
    conversationExcludedAttendeeCount: _count(
      conversationGraph['excludedAttendeeCount'],
    ),
    assignedConversationCount: _count(
      conversationGraph['assignedConversationCount'],
    ),
    assignedConversationOpportunityCount: _count(
      conversationGraph['assignedOpportunityCount'],
    ),
    funnel: _funnelFromMap(map['funnel']),
  );
}

EventSuccessHostFunnel _funnelFromMap(Object? value) {
  final map = value is Map ? value : const <String, Object?>{};
  return EventSuccessHostFunnel(
    inviteLinkCount: _count(map['inviteLinkCount']),
    inviteOpenCount: _count(map['inviteOpenCount']),
    totalDemandCount: _count(map['totalDemandCount']),
    requestCount: _count(map['requestCount']),
    pendingRequestCount: _count(map['pendingRequestCount']),
    approvedRequestCount: _count(map['approvedRequestCount']),
    declinedRequestCount: _count(map['declinedRequestCount']),
    directSignupCount: _count(map['directSignupCount']),
    waitlistJoinCount: _count(map['waitlistJoinCount']),
    waitlistOfferCount: _count(map['waitlistOfferCount']),
    waitlistOfferActiveCount: _count(map['waitlistOfferActiveCount']),
    waitlistOfferAcceptedCount: _count(map['waitlistOfferAcceptedCount']),
    waitlistOfferDeclinedCount: _count(map['waitlistOfferDeclinedCount']),
    waitlistOfferExpiredCount: _count(map['waitlistOfferExpiredCount']),
    checkoutStartedCount: _count(map['checkoutStartedCount']),
    paymentPendingCount: _count(map['paymentPendingCount']),
    paymentCompletedCount: _count(map['paymentCompletedCount']),
    paymentFailedCount: _count(map['paymentFailedCount']),
    paymentRefundedCount: _count(map['paymentRefundedCount']),
    bookedCount: _count(map['bookedCount']),
    checkedInCount: _count(map['checkedInCount']),
    noShowCount: _count(map['noShowCount']),
    catchSentCount: _count(map['catchSentCount']),
    attendeesWhoCaughtSomeone: _count(map['attendeesWhoCaughtSomeone']),
    mutualMatchCount: _count(map['mutualMatchCount']),
    chatStartedCount: _count(map['chatStartedCount']),
    repeatAttendeeCount: _count(map['repeatAttendeeCount']),
  );
}

int _count(Object? value) =>
    value is num && value.isFinite && value > 0 ? value.toInt() : 0;

double _clamp(Object? value, double max) => value is num && value.isFinite
    ? value.toDouble().clamp(0, max).toDouble()
    : 0;
