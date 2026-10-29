// GENERATED CODE - DO NOT EDIT.
// Source: copy/structured_domain_copy_en.json and tool/copy/templates/structured_domain_copy/coach.dart.template

import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';

class EventSuccessCoach {
  const EventSuccessCoach();

  EventSuccessBrief analyze({
    required EventSuccessPlaybook playbook,
    required EventSuccessScorecard scorecard,
  }) {
    final recommendations = <EventSuccessRecommendation>[];
    final strengths = <String>[];

    if (scorecard.safetyIncidentCount > 0) {
      recommendations.add(
        const EventSuccessRecommendation(
          id: 'safety_first',
          title: 'Review comfort and safety before the next event',
          rationale:
              'Safety incidents should block optimization work until the host has a clear escalation and prevention plan.',
          priority: EventRecommendationPriority.critical,
          stage: EventSuccessStage.before,
          moduleIds: ['safety_controls', 'host_analytics'],
        ),
      );
    }

    if (scorecard.checkInRate < 0.85) {
      recommendations.add(
        const EventSuccessRecommendation(
          id: 'tighten_check_in',
          title: 'Tighten arrival and attendance capture',
          rationale:
              'Low check-in makes assignments, reviews, and host coaching less trustworthy.',
          priority: EventRecommendationPriority.high,
          stage: EventSuccessStage.arrival,
          moduleIds: ['qr_check_in'],
        ),
      );
    } else {
      strengths.add(
        'Arrival data is reliable enough for matching and reports.',
      );
    }

    if (scorecard.funnel.pendingRequestCount > 0) {
      recommendations.add(
        const EventSuccessRecommendation(
          id: 'clear_request_backlog',
          title: 'Decide pending requests before demand goes cold',
          rationale:
              'Request-to-join works only if people hear back while the event still feels timely.',
          priority: EventRecommendationPriority.high,
          stage: EventSuccessStage.before,
          moduleIds: ['host_analytics'],
        ),
      );
    }

    if (scorecard.funnel.waitlistOfferCount > 0 &&
        scorecard.funnel.waitlistOfferAcceptanceRate < 0.5) {
      recommendations.add(
        const EventSuccessRecommendation(
          id: 'tighten_waitlist_offer_timing',
          title: 'Make waitlist offers easier to accept',
          rationale:
              'Offers are being sent, but not enough people are converting. Shorter expiry windows and clearer arrival expectations usually help.',
          priority: EventRecommendationPriority.medium,
          stage: EventSuccessStage.before,
          moduleIds: ['host_analytics'],
        ),
      );
    }

    if (scorecard.funnel.repeatAttendeeRate >= 0.25) {
      strengths.add('A meaningful share of attendees came back.');
    }

    if (scorecard.introCoverageRate < 0.7) {
      recommendations.add(
        EventSuccessRecommendation(
          id: 'increase_intro_coverage',
          title: 'Create more social permission during the event',
          rationale: playbook.activityType.isMovementHeavy
              ? 'Movement-heavy events need light pods and cooldown prompts instead of phone-heavy live tasks.'
              : 'Stationary events can use teams, rotations, or prompts to reduce approach anxiety.',
          priority: EventRecommendationPriority.high,
          stage: EventSuccessStage.mixing,
          moduleIds: const ['micro_pods', 'social_missions'],
        ),
      );
    } else {
      strengths.add('Most attendees met multiple people.');
    }

    if (scorecard.assignmentCoverageRate >= 0.8) {
      strengths.add('Assignments reached most active attendees.');
    } else if (scorecard.checkedInCount >= 4) {
      recommendations.add(
        const EventSuccessRecommendation(
          id: 'refresh_assignment_coverage',
          title: 'Refresh assignments from the live roster',
          rationale:
              'Low assignment coverage means attendees may be missing the structured moments that make the event feel intentional.',
          priority: EventRecommendationPriority.high,
          stage: EventSuccessStage.activity,
          moduleIds: ['micro_pods', 'guided_rotations'],
        ),
      );
    }

    if (scorecard.assignmentOptOutRate >= 0.25) {
      recommendations.add(
        const EventSuccessRecommendation(
          id: 'reduce_assignment_pressure',
          title: 'Make structured participation feel easier to opt into',
          rationale:
              'A high opt-out rate usually means pods or rotations need clearer framing, shorter rounds, or softer host facilitation.',
          priority: EventRecommendationPriority.medium,
          stage: EventSuccessStage.opening,
          moduleIds: ['host_script', 'guided_rotations', 'micro_pods'],
        ),
      );
    }

    if (scorecard.wingmanRequestCount > 0) {
      strengths.add(
        'Some attendees trusted the host enough to ask for help live.',
      );
    }

    if (scorecard.wingmanRequestRate >= 0.12) {
      recommendations.add(
        const EventSuccessRecommendation(
          id: 'use_wingman_signal_live',
          title: 'Use wingman requests before the final reveal',
          rationale:
              'Host-visible help requests are strongest while the room is still live, before attendees lose momentum.',
          priority: EventRecommendationPriority.medium,
          stage: EventSuccessStage.activity,
          moduleIds: ['wingman_requests', 'guided_rotations'],
        ),
      );
    }

    if (scorecard.mutualMatchCount > 0 && scorecard.chatStartRate < 0.6) {
      recommendations.add(
        const EventSuccessRecommendation(
          id: 'improve_first_message',
          title: 'Give matches event-specific openers',
          rationale:
              'Matches are forming, but chat is not starting reliably. Shared event context should make the first message easier.',
          priority: EventRecommendationPriority.medium,
          stage: EventSuccessStage.after,
          moduleIds: ['contextual_openers'],
        ),
      );
    } else if (scorecard.mutualMatchCount > 0) {
      strengths.add('Mutual matches are converting into chat starts.');
    }

    if (scorecard.averageWelcomeRating < 4.0) {
      recommendations.add(
        const EventSuccessRecommendation(
          id: 'improve_host_welcome',
          title: 'Make the host opening clearer and warmer',
          rationale:
              'A weak welcome can make attendees feel like strangers sharing space instead of participants in the same event.',
          priority: EventRecommendationPriority.medium,
          stage: EventSuccessStage.opening,
          moduleIds: ['host_script'],
        ),
      );
    }

    if (scorecard.averageStructureRating < 3.8) {
      recommendations.add(
        const EventSuccessRecommendation(
          id: 'right_size_structure',
          title: 'Adjust the amount of live structure',
          rationale:
              'Structure should create permission to connect without making the event feel controlled or artificial.',
          priority: EventRecommendationPriority.medium,
          stage: EventSuccessStage.activity,
          moduleIds: ['host_script', 'decomposed_feedback'],
        ),
      );
    }

    if (scorecard.feedbackResponseRate >= 0.4) {
      strengths.add('Feedback response is strong enough to trust the report.');
    } else if (scorecard.checkedInCount >= 5) {
      recommendations.add(
        const EventSuccessRecommendation(
          id: 'increase_feedback_response',
          title: 'Ask for feedback while the event is still fresh',
          rationale:
              'A thin feedback sample makes the coach less reliable. Prompting checked-in attendees sooner gives the host a clearer read.',
          priority: EventRecommendationPriority.low,
          stage: EventSuccessStage.after,
          moduleIds: ['decomposed_feedback', 'host_analytics'],
        ),
      );
    }

    return EventSuccessBrief(
      scorecard: scorecard,
      recommendations: _sortRecommendations(recommendations),
      strengths: strengths,
    );
  }

  List<EventSuccessRecommendation> _sortRecommendations(
    List<EventSuccessRecommendation> recommendations,
  ) {
    final sorted = [...recommendations];
    sorted.sort(
      (a, b) => _priorityRank(a.priority).compareTo(_priorityRank(b.priority)),
    );
    return sorted;
  }

  int _priorityRank(EventRecommendationPriority priority) => switch (priority) {
    EventRecommendationPriority.critical => 0,
    EventRecommendationPriority.high => 1,
    EventRecommendationPriority.medium => 2,
    EventRecommendationPriority.low => 3,
  };
}

abstract final class EventSuccessSampleScorecards {
  static const strongSocialRun = EventSuccessScorecard(
    bookedCount: 28,
    checkedInCount: 25,
    attendeesWhoMetTwoPlusPeople: 19,
    mutualMatchCount: 4,
    chatStartedCount: 3,
    averageWelcomeRating: 4.4,
    averageStructureRating: 4.1,
    safetyIncidentCount: 0,
    catchSentCount: 14,
    attendeesWhoCaughtSomeone: 11,
    catchRecipientCount: 12,
    catchRate: 0.44,
    feedbackResponseCount: 12,
    assignmentParticipantCount: 23,
    assignmentOptOutCount: 2,
    wingmanRequestCount: 1,
  );

  static const needsStructure = EventSuccessScorecard(
    bookedCount: 34,
    checkedInCount: 23,
    attendeesWhoMetTwoPlusPeople: 9,
    mutualMatchCount: 1,
    chatStartedCount: 0,
    averageWelcomeRating: 3.6,
    averageStructureRating: 3.1,
    safetyIncidentCount: 0,
    catchSentCount: 5,
    attendeesWhoCaughtSomeone: 4,
    catchRecipientCount: 5,
    catchRate: 0.174,
    feedbackResponseCount: 4,
    assignmentParticipantCount: 10,
    assignmentOptOutCount: 8,
    wingmanRequestCount: 3,
  );

  static const safetyReviewRequired = EventSuccessScorecard(
    bookedCount: 30,
    checkedInCount: 27,
    attendeesWhoMetTwoPlusPeople: 20,
    mutualMatchCount: 4,
    chatStartedCount: 4,
    averageWelcomeRating: 4.0,
    averageStructureRating: 4.0,
    safetyIncidentCount: 1,
    catchSentCount: 10,
    attendeesWhoCaughtSomeone: 9,
    catchRecipientCount: 10,
    catchRate: 0.333,
    feedbackResponseCount: 10,
    assignmentParticipantCount: 24,
    assignmentOptOutCount: 1,
  );
}

EventSuccessBrief sampleEventSuccessBrief() =>
    const EventSuccessCoach().analyze(
      playbook: EventSuccessPlaybookLibrary.socialRun,
      scorecard: EventSuccessSampleScorecards.needsStructure,
    );
