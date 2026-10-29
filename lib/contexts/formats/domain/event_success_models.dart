import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/generated/structured_domain_copy.g.dart';

const eventSuccessLayerDevelopmentStatus =
    'live_wired_with_preview_lab_and_iterating';

@Deprecated('Use ActivityKind from lib/activity/domain/activity_taxonomy.dart.')
typedef EventActivityType = ActivityKind;

enum EventSocialIntensity {
  light(
    StructuredDomainCopy.eventSuccessSocialIntensityLightLabel,
    StructuredDomainCopy.eventSuccessSocialIntensityLightDescription,
  ),
  guided(
    StructuredDomainCopy.eventSuccessSocialIntensityGuidedLabel,
    StructuredDomainCopy.eventSuccessSocialIntensityGuidedDescription,
  ),
  structured(
    StructuredDomainCopy.eventSuccessSocialIntensityStructuredLabel,
    StructuredDomainCopy.eventSuccessSocialIntensityStructuredDescription,
  ),
  algorithmic(
    StructuredDomainCopy.eventSuccessSocialIntensityRevealLedLabel,
    StructuredDomainCopy.eventSuccessSocialIntensityRevealLedDescription,
  );

  const EventSocialIntensity(this.label, this.description);

  final String label;
  final String description;
}

enum EventSuccessStage {
  before(StructuredDomainCopy.eventSuccessStageBefore),
  arrival(StructuredDomainCopy.eventSuccessStageArrival),
  opening(StructuredDomainCopy.eventSuccessStageOpening),
  activity(StructuredDomainCopy.eventSuccessStageActivity),
  mixing(StructuredDomainCopy.eventSuccessStageMixing),
  closing(StructuredDomainCopy.eventSuccessStageClosing),
  after(StructuredDomainCopy.eventSuccessStageAfter),
  hostDebrief(StructuredDomainCopy.eventSuccessStageHostDebrief);

  const EventSuccessStage(this.label);

  final String label;
}

enum EventSuccessDurationShape { continuous, rounds, courses, segments }

enum EventSuccessModuleType {
  formatTemplate,
  crowdBalance,
  checkIn,
  firstHelloCheckIn,
  microPods,
  socialMissions,
  guidedRotations,
  liveReveal,
  compatibilityQuestionnaire,
  wingmanRequests,
  contextualOpeners,
  decomposedFeedback,
  hostAnalytics,
  safetyControls,
}

enum EventSuccessProductLayer {
  eventStructure(
    StructuredDomainCopy.eventSuccessLayerEventStructureLabel,
    StructuredDomainCopy.eventSuccessLayerEventStructureDescription,
  ),
  rosterAttendance(
    StructuredDomainCopy.eventSuccessLayerRosterAttendanceLabel,
    StructuredDomainCopy.eventSuccessLayerRosterAttendanceDescription,
  ),
  assignments(
    StructuredDomainCopy.eventSuccessLayerAssignmentsLabel,
    StructuredDomainCopy.eventSuccessLayerAssignmentsDescription,
  ),
  compatibility(
    StructuredDomainCopy.eventSuccessLayerCompatibilityLabel,
    StructuredDomainCopy.eventSuccessLayerCompatibilityDescription,
  ),
  liveReveal(
    StructuredDomainCopy.eventSuccessLayerLiveRevealLabel,
    StructuredDomainCopy.eventSuccessLayerLiveRevealDescription,
  ),
  conversation(
    StructuredDomainCopy.eventSuccessLayerConversationLabel,
    StructuredDomainCopy.eventSuccessLayerConversationDescription,
  ),
  hostFacilitation(
    StructuredDomainCopy.eventSuccessLayerHostFacilitationLabel,
    StructuredDomainCopy.eventSuccessLayerHostFacilitationDescription,
  ),
  hostCoach(
    StructuredDomainCopy.eventSuccessLayerHostCoachLabel,
    StructuredDomainCopy.eventSuccessLayerHostCoachDescription,
  ),
  safety(
    StructuredDomainCopy.eventSuccessLayerSafetyLabel,
    StructuredDomainCopy.eventSuccessLayerSafetyDescription,
  );

  const EventSuccessProductLayer(this.label, this.description);

  final String label;
  final String description;
}

enum EventRecommendationPriority { critical, high, medium, low }

class EventCapacityGuidance {
  const EventCapacityGuidance({
    required this.min,
    required this.max,
    required this.rationale,
  }) : assert(min > 0),
       assert(max >= min);

  final int min;
  final int max;
  final String rationale;

  bool contains(int attendeeCount) =>
      attendeeCount >= min && attendeeCount <= max;
}

class EventSuccessModule {
  const EventSuccessModule({
    required this.id,
    required this.title,
    required this.type,
    required this.productLayer,
    required this.stage,
    required this.attendeePromise,
    required this.hostPromise,
    this.hostConfigurable = true,
    this.enabledByDefault = true,
    this.requiresLivePhoneUse = false,
    this.recommendedFor = const {},
    this.setupSteps = const [],
    this.riskControls = const [],
  });

  final String id;
  final String title;
  final EventSuccessModuleType type;
  final EventSuccessProductLayer productLayer;
  final EventSuccessStage stage;
  final String attendeePromise;
  final String hostPromise;
  final bool hostConfigurable;
  final bool enabledByDefault;
  final bool requiresLivePhoneUse;
  final Set<ActivityKind> recommendedFor;
  final List<String> setupSteps;
  final List<String> riskControls;

  bool supports(ActivityKind activityType) =>
      recommendedFor.isEmpty || recommendedFor.contains(activityType);
}

class EventRunOfShowStep {
  const EventRunOfShowStep({
    required this.stage,
    required this.title,
    required this.hostInstruction,
    required this.attendeeExperience,
    required this.durationMinutes,
    this.moduleIds = const [],
  }) : assert(durationMinutes > 0);

  final EventSuccessStage stage;
  final String title;
  final String hostInstruction;
  final String attendeeExperience;
  final int durationMinutes;
  final List<String> moduleIds;
}

class EventSuccessMetric {
  const EventSuccessMetric({
    required this.id,
    required this.label,
    required this.description,
    required this.target,
  });

  final String id;
  final String label;
  final String description;
  final String target;
}

class EventSuccessPlaybook {
  const EventSuccessPlaybook({
    required this.id,
    required this.title,
    required this.activityType,
    required this.socialIntensity,
    required this.durationShape,
    required this.summary,
    required this.attendeePromise,
    required this.hostPromise,
    required this.capacity,
    required this.modules,
    required this.runOfShow,
    required this.metrics,
    required this.antiPatterns,
    required this.iterationQuestions,
    required this.wiringNotes,
  });

  final String id;
  final String title;
  final ActivityKind activityType;
  final EventSocialIntensity socialIntensity;
  final EventSuccessDurationShape durationShape;
  final String summary;
  final String attendeePromise;
  final String hostPromise;
  final EventCapacityGuidance capacity;
  final List<EventSuccessModule> modules;
  final List<EventRunOfShowStep> runOfShow;
  final List<EventSuccessMetric> metrics;
  final List<String> antiPatterns;
  final List<String> iterationQuestions;
  final List<String> wiringNotes;

  Set<String> get moduleIds => modules.map((module) => module.id).toSet();

  Set<String> get nonConfigurableModuleIds => modules
      .where((module) => !module.hostConfigurable)
      .map((module) => module.id)
      .toSet();

  /// Resolves the effective module selection without mutating persisted data.
  ///
  /// Legacy documents can omit modules that are now platform-owned. Read
  /// projections and new write boundaries both use this helper so those
  /// modules behave as enabled while the stored legacy document stays intact.
  /// Existing ids are preserved as-is so the compatibility projection never
  /// silently disables an older plan whose playbook catalog has since moved.
  Set<String> effectiveModuleSelection(Iterable<String> selectedModuleIds) => {
    ...selectedModuleIds,
    ...nonConfigurableModuleIds,
  };

  bool get hasLivePhoneUse =>
      modules.any((module) => module.requiresLivePhoneUse);

  Map<EventSuccessStage, List<EventRunOfShowStep>> get runOfShowByStage {
    final grouped = <EventSuccessStage, List<EventRunOfShowStep>>{};
    for (final step in runOfShow) {
      grouped.putIfAbsent(step.stage, () => <EventRunOfShowStep>[]).add(step);
    }
    return grouped;
  }

  Map<EventSuccessProductLayer, List<EventSuccessModule>>
  get modulesByProductLayer {
    final grouped = <EventSuccessProductLayer, List<EventSuccessModule>>{};
    for (final layer in EventSuccessProductLayer.values) {
      final modulesForLayer = modules
          .where((module) => module.productLayer == layer)
          .toList(growable: false);
      if (modulesForLayer.isNotEmpty) grouped[layer] = modulesForLayer;
    }
    return grouped;
  }
}

class EventSuccessHostFunnel {
  const EventSuccessHostFunnel({
    required this.inviteLinkCount,
    required this.inviteOpenCount,
    required this.totalDemandCount,
    required this.requestCount,
    required this.pendingRequestCount,
    required this.approvedRequestCount,
    required this.declinedRequestCount,
    required this.directSignupCount,
    required this.waitlistJoinCount,
    required this.waitlistOfferCount,
    required this.waitlistOfferActiveCount,
    required this.waitlistOfferAcceptedCount,
    required this.waitlistOfferDeclinedCount,
    required this.waitlistOfferExpiredCount,
    required this.checkoutStartedCount,
    required this.paymentPendingCount,
    required this.paymentCompletedCount,
    required this.paymentFailedCount,
    required this.paymentRefundedCount,
    required this.bookedCount,
    required this.checkedInCount,
    required this.noShowCount,
    required this.catchSentCount,
    required this.attendeesWhoCaughtSomeone,
    required this.mutualMatchCount,
    required this.chatStartedCount,
    required this.repeatAttendeeCount,
  }) : assert(inviteLinkCount >= 0),
       assert(inviteOpenCount >= 0),
       assert(totalDemandCount >= 0),
       assert(requestCount >= 0),
       assert(pendingRequestCount >= 0),
       assert(approvedRequestCount >= 0),
       assert(declinedRequestCount >= 0),
       assert(directSignupCount >= 0),
       assert(waitlistJoinCount >= 0),
       assert(waitlistOfferCount >= 0),
       assert(waitlistOfferActiveCount >= 0),
       assert(waitlistOfferAcceptedCount >= 0),
       assert(waitlistOfferDeclinedCount >= 0),
       assert(waitlistOfferExpiredCount >= 0),
       assert(checkoutStartedCount >= 0),
       assert(paymentPendingCount >= 0),
       assert(paymentCompletedCount >= 0),
       assert(paymentFailedCount >= 0),
       assert(paymentRefundedCount >= 0),
       assert(bookedCount >= 0),
       assert(checkedInCount >= 0),
       assert(noShowCount >= 0),
       assert(catchSentCount >= 0),
       assert(attendeesWhoCaughtSomeone >= 0),
       assert(mutualMatchCount >= 0),
       assert(chatStartedCount >= 0),
       assert(repeatAttendeeCount >= 0);

  static const empty = EventSuccessHostFunnel(
    inviteLinkCount: 0,
    inviteOpenCount: 0,
    totalDemandCount: 0,
    requestCount: 0,
    pendingRequestCount: 0,
    approvedRequestCount: 0,
    declinedRequestCount: 0,
    directSignupCount: 0,
    waitlistJoinCount: 0,
    waitlistOfferCount: 0,
    waitlistOfferActiveCount: 0,
    waitlistOfferAcceptedCount: 0,
    waitlistOfferDeclinedCount: 0,
    waitlistOfferExpiredCount: 0,
    checkoutStartedCount: 0,
    paymentPendingCount: 0,
    paymentCompletedCount: 0,
    paymentFailedCount: 0,
    paymentRefundedCount: 0,
    bookedCount: 0,
    checkedInCount: 0,
    noShowCount: 0,
    catchSentCount: 0,
    attendeesWhoCaughtSomeone: 0,
    mutualMatchCount: 0,
    chatStartedCount: 0,
    repeatAttendeeCount: 0,
  );

  final int inviteLinkCount;
  final int inviteOpenCount;
  final int totalDemandCount;
  final int requestCount;
  final int pendingRequestCount;
  final int approvedRequestCount;
  final int declinedRequestCount;
  final int directSignupCount;
  final int waitlistJoinCount;
  final int waitlistOfferCount;
  final int waitlistOfferActiveCount;
  final int waitlistOfferAcceptedCount;
  final int waitlistOfferDeclinedCount;
  final int waitlistOfferExpiredCount;
  final int checkoutStartedCount;
  final int paymentPendingCount;
  final int paymentCompletedCount;
  final int paymentFailedCount;
  final int paymentRefundedCount;
  final int bookedCount;
  final int checkedInCount;
  final int noShowCount;
  final int catchSentCount;
  final int attendeesWhoCaughtSomeone;
  final int mutualMatchCount;
  final int chatStartedCount;
  final int repeatAttendeeCount;

  int get activeWaitlistDropCount =>
      waitlistOfferActiveCount + waitlistOfferExpiredCount;

  double get demandConversionRate =>
      _rate(bookedCount, totalDemandCount > 0 ? totalDemandCount : bookedCount);

  double get requestApprovalRate => _rate(approvedRequestCount, requestCount);

  double get waitlistOfferAcceptanceRate =>
      _rate(waitlistOfferAcceptedCount, waitlistOfferCount);

  double get paymentCompletionRate =>
      _rate(paymentCompletedCount, checkoutStartedCount);

  double get attendanceRate => _rate(checkedInCount, bookedCount);

  double get connectionRate => _rate(attendeesWhoCaughtSomeone, checkedInCount);

  double get repeatAttendeeRate => _rate(repeatAttendeeCount, bookedCount);

  double get noShowRate => _rate(noShowCount, bookedCount);
}

double _rate(int numerator, int denominator) {
  if (denominator <= 0) return 0;
  return (numerator / denominator).clamp(0, 1);
}

class EventSuccessScorecard {
  const EventSuccessScorecard({
    required this.bookedCount,
    required this.checkedInCount,
    required this.attendeesWhoMetTwoPlusPeople,
    required this.mutualMatchCount,
    required this.chatStartedCount,
    required this.averageWelcomeRating,
    required this.averageStructureRating,
    required this.safetyIncidentCount,
    this.catchSentCount = 0,
    this.attendeesWhoCaughtSomeone = 0,
    this.catchRecipientCount = 0,
    this.catchRate = 0,
    this.feedbackResponseCount = 0,
    this.assignmentParticipantCount = 0,
    this.assignmentOptOutCount = 0,
    this.wingmanRequestCount = 0,
    this.conversationGraphResponseCount = 0,
    this.conversationGraphSkippedCount = 0,
    this.conversationCount = 0,
    this.attendeesWithTwoPlusConversations = 0,
    this.conversationExcludedAttendeeCount = 0,
    this.assignedConversationCount = 0,
    this.assignedConversationOpportunityCount = 0,
    this.funnel = EventSuccessHostFunnel.empty,
  }) : assert(bookedCount >= 0),
       assert(checkedInCount >= 0),
       assert(attendeesWhoMetTwoPlusPeople >= 0),
       assert(mutualMatchCount >= 0),
       assert(chatStartedCount >= 0),
       assert(averageWelcomeRating >= 0 && averageWelcomeRating <= 5),
       assert(averageStructureRating >= 0 && averageStructureRating <= 5),
       assert(safetyIncidentCount >= 0),
       assert(catchSentCount >= 0),
       assert(attendeesWhoCaughtSomeone >= 0),
       assert(catchRecipientCount >= 0),
       assert(catchRate >= 0 && catchRate <= 1),
       assert(feedbackResponseCount >= 0),
       assert(assignmentParticipantCount >= 0),
       assert(assignmentOptOutCount >= 0),
       assert(wingmanRequestCount >= 0),
       assert(conversationGraphResponseCount >= 0),
       assert(conversationGraphSkippedCount >= 0),
       assert(conversationCount >= 0),
       assert(attendeesWithTwoPlusConversations >= 0),
       assert(conversationExcludedAttendeeCount >= 0),
       assert(assignedConversationCount >= 0),
       assert(assignedConversationOpportunityCount >= 0);

  final int bookedCount;
  final int checkedInCount;
  final int attendeesWhoMetTwoPlusPeople;
  final int mutualMatchCount;
  final int chatStartedCount;
  final double averageWelcomeRating;
  final double averageStructureRating;
  final int safetyIncidentCount;
  final int catchSentCount;
  final int attendeesWhoCaughtSomeone;
  final int catchRecipientCount;
  final double catchRate;
  final int feedbackResponseCount;
  final int assignmentParticipantCount;
  final int assignmentOptOutCount;
  final int wingmanRequestCount;
  final int conversationGraphResponseCount;
  final int conversationGraphSkippedCount;
  final int conversationCount;
  final int attendeesWithTwoPlusConversations;
  final int conversationExcludedAttendeeCount;
  final int assignedConversationCount;
  final int assignedConversationOpportunityCount;
  final EventSuccessHostFunnel funnel;

  EventSuccessScorecard copyWith({
    int? bookedCount,
    int? checkedInCount,
    int? attendeesWhoMetTwoPlusPeople,
    int? mutualMatchCount,
    int? chatStartedCount,
    double? averageWelcomeRating,
    double? averageStructureRating,
    int? safetyIncidentCount,
    int? catchSentCount,
    int? attendeesWhoCaughtSomeone,
    int? catchRecipientCount,
    double? catchRate,
    int? feedbackResponseCount,
    int? assignmentParticipantCount,
    int? assignmentOptOutCount,
    int? wingmanRequestCount,
    int? conversationGraphResponseCount,
    int? conversationGraphSkippedCount,
    int? conversationCount,
    int? attendeesWithTwoPlusConversations,
    int? conversationExcludedAttendeeCount,
    int? assignedConversationCount,
    int? assignedConversationOpportunityCount,
    EventSuccessHostFunnel? funnel,
  }) {
    return EventSuccessScorecard(
      bookedCount: bookedCount ?? this.bookedCount,
      checkedInCount: checkedInCount ?? this.checkedInCount,
      attendeesWhoMetTwoPlusPeople:
          attendeesWhoMetTwoPlusPeople ?? this.attendeesWhoMetTwoPlusPeople,
      mutualMatchCount: mutualMatchCount ?? this.mutualMatchCount,
      chatStartedCount: chatStartedCount ?? this.chatStartedCount,
      averageWelcomeRating: averageWelcomeRating ?? this.averageWelcomeRating,
      averageStructureRating:
          averageStructureRating ?? this.averageStructureRating,
      safetyIncidentCount: safetyIncidentCount ?? this.safetyIncidentCount,
      catchSentCount: catchSentCount ?? this.catchSentCount,
      attendeesWhoCaughtSomeone:
          attendeesWhoCaughtSomeone ?? this.attendeesWhoCaughtSomeone,
      catchRecipientCount: catchRecipientCount ?? this.catchRecipientCount,
      catchRate: catchRate ?? this.catchRate,
      feedbackResponseCount:
          feedbackResponseCount ?? this.feedbackResponseCount,
      assignmentParticipantCount:
          assignmentParticipantCount ?? this.assignmentParticipantCount,
      assignmentOptOutCount:
          assignmentOptOutCount ?? this.assignmentOptOutCount,
      wingmanRequestCount: wingmanRequestCount ?? this.wingmanRequestCount,
      conversationGraphResponseCount:
          conversationGraphResponseCount ?? this.conversationGraphResponseCount,
      conversationGraphSkippedCount:
          conversationGraphSkippedCount ?? this.conversationGraphSkippedCount,
      conversationCount: conversationCount ?? this.conversationCount,
      attendeesWithTwoPlusConversations:
          attendeesWithTwoPlusConversations ??
          this.attendeesWithTwoPlusConversations,
      conversationExcludedAttendeeCount:
          conversationExcludedAttendeeCount ??
          this.conversationExcludedAttendeeCount,
      assignedConversationCount:
          assignedConversationCount ?? this.assignedConversationCount,
      assignedConversationOpportunityCount:
          assignedConversationOpportunityCount ??
          this.assignedConversationOpportunityCount,
      funnel: funnel ?? this.funnel,
    );
  }

  double get checkInRate => _rate(checkedInCount, bookedCount);

  double get introCoverageRate =>
      _rate(attendeesWhoMetTwoPlusPeople, checkedInCount);

  double get mutualMatchRate => _rate(mutualMatchCount, checkedInCount);

  double get chatStartRate => _rate(chatStartedCount, mutualMatchCount);

  double get caughtSomeoneRate => catchRate > 0
      ? catchRate
      : _rate(attendeesWhoCaughtSomeone, checkedInCount);

  double get feedbackResponseRate =>
      _rate(feedbackResponseCount, checkedInCount);

  double get assignmentCoverageRate =>
      _rate(assignmentParticipantCount, _activeAttendeeDenominator);

  double get assignmentOptOutRate =>
      _rate(assignmentOptOutCount, _activeAttendeeDenominator);

  double get wingmanRequestRate => _rate(wingmanRequestCount, checkedInCount);

  double get conversationGraphResponseRate =>
      _rate(conversationGraphResponseCount, checkedInCount);

  double get assignedConversationRate =>
      _rate(assignedConversationCount, assignedConversationOpportunityCount);

  double get experienceScore {
    final safetyPenalty = safetyIncidentCount > 0 ? 0.18 : 0.0;
    final raw =
        (checkInRate * 0.16) +
        (introCoverageRate * 0.28) +
        (mutualMatchRate * 0.18) +
        (chatStartRate * 0.14) +
        ((averageWelcomeRating / 5) * 0.12) +
        ((averageStructureRating / 5) * 0.12) -
        safetyPenalty;
    return raw.clamp(0, 1);
  }

  int get _activeAttendeeDenominator =>
      checkedInCount > 0 ? checkedInCount : bookedCount;

  static double _rate(int numerator, int denominator) {
    if (denominator <= 0) return 0;
    return (numerator / denominator).clamp(0, 1);
  }
}

class EventSuccessRecommendation {
  const EventSuccessRecommendation({
    required this.id,
    required this.title,
    required this.rationale,
    required this.priority,
    required this.stage,
    this.moduleIds = const [],
  });

  final String id;
  final String title;
  final String rationale;
  final EventRecommendationPriority priority;
  final EventSuccessStage stage;
  final List<String> moduleIds;
}

class EventSuccessBrief {
  const EventSuccessBrief({
    required this.scorecard,
    required this.recommendations,
    required this.strengths,
  });

  final EventSuccessScorecard scorecard;
  final List<EventSuccessRecommendation> recommendations;
  final List<String> strengths;
}
