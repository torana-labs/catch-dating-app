// GENERATED CODE - DO NOT EDIT.
// Source: copy/structured_domain_copy_en.json and tool/copy/templates/structured_domain_copy/library.dart.template

import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks/metrics.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks/modules.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';

abstract final class EventSuccessPlaybookLibrary {
  static const socialRun = EventSuccessPlaybook(
    id: 'social_run_light',
    title: 'Social Event Lite',
    activityType: ActivityKind.socialRun,
    socialIntensity: EventSocialIntensity.light,
    durationShape: EventSuccessDurationShape.segments,
    summary:
        'An event-first format that adds arrival structure, pace pods, optional prompts, and post-event Catches follow-up.',
    attendeePromise:
        'You can run naturally, meet people at your pace, and follow up privately afterward.',
    hostPromise:
        'Use check-in, pace pods, and a short cooldown prompt without turning the event into speed dating.',
    capacity: EventCapacityGuidance(
      min: 8,
      max: 36,
      rationale: 'Large enough for choice, small enough for pace groups.',
    ),
    modules: [
      EventSuccessModuleCatalog.crowdBalance,
      EventSuccessModuleCatalog.checkIn,
      EventSuccessModuleCatalog.firstHelloCheckIn,
      EventSuccessModuleCatalog.hostScript,
      EventSuccessModuleCatalog.microPods,
      EventSuccessModuleCatalog.compatibilityQuestionnaire,
      EventSuccessModuleCatalog.socialMissions,
      EventSuccessModuleCatalog.wingmanRequests,
      EventSuccessModuleCatalog.contextualOpeners,
      EventSuccessModuleCatalog.decomposedFeedback,
      EventSuccessModuleCatalog.hostAnalytics,
      EventSuccessModuleCatalog.safetyControls,
    ],
    runOfShow: [
      EventRunOfShowStep(
        stage: EventSuccessStage.arrival,
        title: 'Check in and pace sort',
        durationMinutes: 10,
        hostInstruction: 'Scan arrivals and confirm pace groups.',
        attendeeExperience: 'Arrive, check in, and see your pace pod.',
        moduleIds: ['qr_check_in', 'micro_pods'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.opening,
        title: 'Two-minute welcome',
        durationMinutes: 2,
        hostInstruction: 'Name the route, safety note, and social permission.',
        attendeeExperience:
            'Know what is happening and that talking is welcome.',
        moduleIds: ['host_script', 'safety_controls'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.activity,
        title: 'Run in pace pods',
        durationMinutes: 35,
        hostInstruction: 'Keep pods visible and avoid mid-event phone use.',
        attendeeExperience: 'Event with a small group that matches your pace.',
        moduleIds: ['micro_pods'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.mixing,
        title: 'Cooldown social mission',
        durationMinutes: 12,
        hostInstruction:
            'Offer one optional prompt before coffee or dispersal.',
        attendeeExperience: 'Get a natural reason to speak to one more person.',
        moduleIds: ['social_missions'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.closing,
        title: 'Host-help last call',
        durationMinutes: 3,
        hostInstruction:
            'Invite checked-in attendees to ask for help with one natural introduction.',
        attendeeExperience:
            'Ask the host for help while there is still time to be introduced.',
        moduleIds: ['wingman_requests'],
      ),
    ],
    metrics: EventSuccessMetricCatalog.core,
    antiPatterns: [
      'Do not interrupt the actual event with phone-heavy prompts.',
      'Do not make one-to-one romantic pairing the headline for beginner events.',
      'Do not publish attendee interest unless it is mutual.',
    ],
    iterationQuestions: [
      'Did pace pods improve first conversations?',
      'Did cooldown prompts feel useful or awkward?',
      'Did host-help requests create useful live introductions?',
    ],
    wiringNotes: [
      'Could reuse booking and attendance once approved.',
      'Should not change current event booking until check-in behavior is validated.',
    ],
  );

  static const pickleball = EventSuccessPlaybook(
    id: 'pickleball_rotations',
    title: 'Pickleball Partner Rotations',
    activityType: ActivityKind.pickleball,
    socialIntensity: EventSocialIntensity.structured,
    durationShape: EventSuccessDurationShape.rounds,
    summary:
        'A court-based mixer with rotating partners, skill-aware teams, and a post-game interest loop.',
    attendeePromise:
        'Play real games while meeting multiple partners without awkward logistics.',
    hostPromise:
        'The app handles pairings, sit-outs, timing, and post-event matching context.',
    capacity: EventCapacityGuidance(
      min: 12,
      max: 32,
      rationale: 'Works best with enough players for court rotation variety.',
    ),
    modules: [
      EventSuccessModuleCatalog.crowdBalance,
      EventSuccessModuleCatalog.checkIn,
      EventSuccessModuleCatalog.firstHelloCheckIn,
      EventSuccessModuleCatalog.hostScript,
      EventSuccessModuleCatalog.compatibilityQuestionnaire,
      EventSuccessModuleCatalog.guidedRotations,
      EventSuccessModuleCatalog.liveReveal,
      EventSuccessModuleCatalog.socialMissions,
      EventSuccessModuleCatalog.wingmanRequests,
      EventSuccessModuleCatalog.contextualOpeners,
      EventSuccessModuleCatalog.decomposedFeedback,
      EventSuccessModuleCatalog.hostAnalytics,
      EventSuccessModuleCatalog.safetyControls,
    ],
    runOfShow: [
      EventRunOfShowStep(
        stage: EventSuccessStage.arrival,
        title: 'Check in and skill confirm',
        durationMinutes: 10,
        hostInstruction: 'Confirm courts, arrivals, and beginner support.',
        attendeeExperience: 'Know your first court and partner.',
        moduleIds: ['qr_check_in', 'guided_rotations'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.opening,
        title: 'Rules and first rotation',
        durationMinutes: 5,
        hostInstruction: 'Explain rotation timing and sportsmanship norms.',
        attendeeExperience: 'Start with a clear partner assignment.',
        moduleIds: ['host_script', 'safety_controls', 'live_reveal'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.activity,
        title: 'Timed partner rounds',
        durationMinutes: 50,
        hostInstruction: 'Advance rotations and handle sit-outs fairly.',
        attendeeExperience:
            'Play with several people at a matched skill level.',
        moduleIds: ['guided_rotations', 'live_reveal'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.closing,
        title: 'Final rally and wrap',
        durationMinutes: 8,
        hostInstruction: 'Close with a low-pressure social prompt.',
        attendeeExperience: 'Get one more chance to talk off court.',
        moduleIds: ['social_missions'],
      ),
    ],
    metrics: EventSuccessMetricCatalog.core,
    antiPatterns: [
      'Do not strand beginners in repeated sit-outs.',
      'Do not let rotation logistics consume the social energy.',
    ],
    iterationQuestions: [
      'Were rotations fair across skill levels?',
      'Did people remember enough names to follow up?',
    ],
    wiringNotes: [
      'Needs an activity-specific rotation engine before production routing.',
    ],
  );

  static const pubQuiz = EventSuccessPlaybook(
    id: 'pub_quiz_team_mixer',
    title: 'Pub Quiz Team Mixer',
    activityType: ActivityKind.pubQuiz,
    socialIntensity: EventSocialIntensity.guided,
    durationShape: EventSuccessDurationShape.rounds,
    summary:
        'A team-based format that uses role prompts and team reshuffles to make conversation easy.',
    attendeePromise:
        'You have teammates, prompts, and trivia as a reason to talk.',
    hostPromise:
        'Balance teams, avoid friend clumps, and measure whether teams actually mixed.',
    capacity: EventCapacityGuidance(
      min: 16,
      max: 60,
      rationale: 'Team formats need enough people for variety but can scale.',
    ),
    modules: [
      EventSuccessModuleCatalog.crowdBalance,
      EventSuccessModuleCatalog.checkIn,
      EventSuccessModuleCatalog.firstHelloCheckIn,
      EventSuccessModuleCatalog.hostScript,
      EventSuccessModuleCatalog.microPods,
      EventSuccessModuleCatalog.compatibilityQuestionnaire,
      EventSuccessModuleCatalog.liveReveal,
      EventSuccessModuleCatalog.socialMissions,
      EventSuccessModuleCatalog.wingmanRequests,
      EventSuccessModuleCatalog.contextualOpeners,
      EventSuccessModuleCatalog.decomposedFeedback,
      EventSuccessModuleCatalog.hostAnalytics,
      EventSuccessModuleCatalog.safetyControls,
    ],
    runOfShow: [
      EventRunOfShowStep(
        stage: EventSuccessStage.arrival,
        title: 'Check in and team assignment',
        durationMinutes: 12,
        hostInstruction:
            'Assign mixed teams and name one lightweight role per person.',
        attendeeExperience: 'Join a table with a reason to contribute.',
        moduleIds: ['qr_check_in', 'live_reveal'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.activity,
        title: 'Quiz rounds with role prompts',
        durationMinutes: 60,
        hostInstruction: 'Use prompts between rounds, not during questions.',
        attendeeExperience: 'Talk through trivia without forced dating rounds.',
        moduleIds: ['social_missions'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.closing,
        title: 'Host-help last call',
        durationMinutes: 4,
        hostInstruction:
            'Offer to help with one introduction before people leave.',
        attendeeExperience:
            'Ask the host for help while the room is still together.',
        moduleIds: ['wingman_requests'],
      ),
    ],
    metrics: EventSuccessMetricCatalog.core,
    antiPatterns: [
      'Do not let existing friend groups sit together unchanged.',
      'Do not over-script conversation during the actual game.',
    ],
    iterationQuestions: [
      'Did team assignment reduce awkward arrivals?',
      'Were people willing to follow up across tables?',
    ],
    wiringNotes: [
      'Can launch as a host-only playbook before full team assignment automation.',
    ],
  );

  static const dinner = EventSuccessPlaybook(
    id: 'dinner_table_mixer',
    title: 'Dinner Table Mixer',
    activityType: ActivityKind.dinner,
    socialIntensity: EventSocialIntensity.structured,
    durationShape: EventSuccessDurationShape.courses,
    summary:
        'A seated format that uses table assignments, optional course changes, prompts, and a private follow-up loop.',
    attendeePromise:
        'You know where to sit, who to start with, and how to follow up without public pressure.',
    hostPromise:
        'Balance tables, reveal seating moments, and keep conversation moving without over-facilitating dinner.',
    capacity: EventCapacityGuidance(
      min: 12,
      max: 48,
      rationale: 'Table formats need enough mix while staying host-manageable.',
    ),
    modules: [
      EventSuccessModuleCatalog.crowdBalance,
      EventSuccessModuleCatalog.checkIn,
      EventSuccessModuleCatalog.firstHelloCheckIn,
      EventSuccessModuleCatalog.hostScript,
      EventSuccessModuleCatalog.compatibilityQuestionnaire,
      EventSuccessModuleCatalog.guidedRotations,
      EventSuccessModuleCatalog.liveReveal,
      EventSuccessModuleCatalog.socialMissions,
      EventSuccessModuleCatalog.wingmanRequests,
      EventSuccessModuleCatalog.contextualOpeners,
      EventSuccessModuleCatalog.decomposedFeedback,
      EventSuccessModuleCatalog.hostAnalytics,
      EventSuccessModuleCatalog.safetyControls,
    ],
    runOfShow: [
      EventRunOfShowStep(
        stage: EventSuccessStage.arrival,
        title: 'Check in and seating reveal',
        durationMinutes: 12,
        hostInstruction:
            'Confirm arrivals and send attendees to their first table.',
        attendeeExperience: 'Know the first table and who to start with.',
        moduleIds: ['qr_check_in', 'live_reveal'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.opening,
        title: 'Welcome and table prompt',
        durationMinutes: 4,
        hostInstruction: 'Set the tone and give one easy table prompt.',
        attendeeExperience: 'Have a natural first line at the table.',
        moduleIds: ['host_script', 'social_missions', 'safety_controls'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.activity,
        title: 'Course or seat change',
        durationMinutes: 30,
        hostInstruction:
            'Only rotate when the dinner format has a planned course or seat-change moment.',
        attendeeExperience: 'Meet a new table without managing logistics.',
        moduleIds: ['guided_rotations', 'live_reveal'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.closing,
        title: 'Wrap and host help',
        durationMinutes: 5,
        hostInstruction:
            'Offer help with one introduction before people leave the table format.',
        attendeeExperience:
            'Ask the host for help with a natural introduction before leaving.',
        moduleIds: ['wingman_requests'],
      ),
    ],
    metrics: EventSuccessMetricCatalog.core,
    antiPatterns: [
      'Do not make people move tables without a clear course or transition.',
      'Do not expose compatibility answers to hosts or tablemates.',
      'Do not make the table plan feel like a verdict on chemistry.',
    ],
    iterationQuestions: [
      'Did the seating plan create balanced conversation?',
      'Did table changes feel energizing or disruptive?',
      'Did attendees follow up after the dinner?',
    ],
    wiringNotes: [
      'Table assignment generation should eventually become a dedicated assignment engine; V1 can use host-reviewed structure and reveal controls.',
    ],
  );

  static const hostLedSocial = EventSuccessPlaybook(
    id: 'host_led_social',
    title: 'Host-led Social',
    activityType: ActivityKind.openActivity,
    socialIntensity: EventSocialIntensity.light,
    durationShape: EventSuccessDurationShape.continuous,
    summary:
        'A simple wrapper for classes, bar crawls, open activities, and host-led formats where the activity stays primary.',
    attendeePromise:
        'The event stays natural, with enough structure to arrive, talk, and follow up.',
    hostPromise:
        'Use check-in, a short script, prompts, wingman requests, feedback, and coaching without forcing rotations.',
    capacity: EventCapacityGuidance(
      min: 6,
      max: 80,
      rationale: 'Flexible formats need light defaults that can scale.',
    ),
    modules: [
      EventSuccessModuleCatalog.crowdBalance,
      EventSuccessModuleCatalog.checkIn,
      EventSuccessModuleCatalog.firstHelloCheckIn,
      EventSuccessModuleCatalog.hostScript,
      EventSuccessModuleCatalog.compatibilityQuestionnaire,
      EventSuccessModuleCatalog.microPods,
      EventSuccessModuleCatalog.socialMissions,
      EventSuccessModuleCatalog.guidedRotations,
      EventSuccessModuleCatalog.liveReveal,
      EventSuccessModuleCatalog.wingmanRequests,
      EventSuccessModuleCatalog.contextualOpeners,
      EventSuccessModuleCatalog.decomposedFeedback,
      EventSuccessModuleCatalog.hostAnalytics,
      EventSuccessModuleCatalog.safetyControls,
    ],
    runOfShow: [
      EventRunOfShowStep(
        stage: EventSuccessStage.arrival,
        title: 'Check in',
        durationMinutes: 10,
        hostInstruction: 'Confirm arrivals and keep the room easy to enter.',
        attendeeExperience: 'Arrive and know the host has you checked in.',
        moduleIds: ['qr_check_in'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.opening,
        title: 'Welcome',
        durationMinutes: 3,
        hostInstruction:
            'Explain the format, safety expectations, and social permission.',
        attendeeExperience:
            'Know what is happening and that talking is welcome.',
        moduleIds: ['host_script', 'safety_controls'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.mixing,
        title: 'Prompted pause',
        durationMinutes: 8,
        hostInstruction:
            'Use one prompt at a natural pause, not during the core activity.',
        attendeeExperience:
            'Get one easy reason to start another conversation.',
        moduleIds: ['social_missions'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.closing,
        title: 'Host-help last call',
        durationMinutes: 3,
        hostInstruction:
            'Offer to help attendees make one introduction before the room disperses.',
        attendeeExperience:
            'Ask the host for help with a specific person from the event.',
        moduleIds: ['wingman_requests'],
      ),
    ],
    metrics: EventSuccessMetricCatalog.core,
    antiPatterns: [
      'Do not add phone-heavy mechanics to class or open formats by default.',
      'Do not imply compatibility scoring is part of every activity.',
      'Do not show assignment controls unless the host opts into structure.',
    ],
    iterationQuestions: [
      'Did the host script make the format clearer?',
      'Did prompts feel natural at the pause points?',
      'Did host-help requests create more live introductions?',
    ],
    wiringNotes: [
      'This playbook is the fallback for activities whose default flow keeps everyone together.',
    ],
  );

  static const algorithmicMixer = EventSuccessPlaybook(
    id: 'algorithmic_mixer_reveal',
    title: 'Singles Mixer',
    activityType: ActivityKind.singlesMixer,
    socialIntensity: EventSocialIntensity.algorithmic,
    durationShape: EventSuccessDurationShape.rounds,
    summary:
        'A mixer format with short questions, clues, reveal moments, host help, and explanations.',
    attendeePromise:
        'The event has a shared ritual, but chemistry is still yours to judge.',
    hostPromise:
        'Create a memorable reveal flow while measuring whether the structure actually improved outcomes.',
    capacity: EventCapacityGuidance(
      min: 20,
      max: 80,
      rationale:
          'Needs enough density for matching but not so many that reveal loses intimacy.',
    ),
    modules: [
      EventSuccessModuleCatalog.crowdBalance,
      EventSuccessModuleCatalog.checkIn,
      EventSuccessModuleCatalog.firstHelloCheckIn,
      EventSuccessModuleCatalog.hostScript,
      EventSuccessModuleCatalog.compatibilityQuestionnaire,
      EventSuccessModuleCatalog.guidedRotations,
      EventSuccessModuleCatalog.liveReveal,
      EventSuccessModuleCatalog.socialMissions,
      EventSuccessModuleCatalog.wingmanRequests,
      EventSuccessModuleCatalog.contextualOpeners,
      EventSuccessModuleCatalog.decomposedFeedback,
      EventSuccessModuleCatalog.hostAnalytics,
      EventSuccessModuleCatalog.safetyControls,
    ],
    runOfShow: [
      EventRunOfShowStep(
        stage: EventSuccessStage.before,
        title: 'Quick questions',
        durationMinutes: 4,
        hostInstruction:
            'Use questions that set up conversation, not permanence.',
        attendeeExperience: 'Answer a few prompts before arrival.',
        moduleIds: ['compatibility_questionnaire'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.arrival,
        title: 'Check in and clue card',
        durationMinutes: 12,
        hostInstruction: 'Confirm attendance and issue first clue.',
        attendeeExperience: 'Enter with a playful search prompt.',
        moduleIds: ['qr_check_in', 'compatibility_questionnaire'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.mixing,
        title: 'Rounds and reveal',
        durationMinutes: 45,
        hostInstruction: 'Run two or three rounds before any match reveal.',
        attendeeExperience: 'Meet people before seeing suggested matches.',
        moduleIds: ['guided_rotations', 'live_reveal', 'social_missions'],
      ),
      EventRunOfShowStep(
        stage: EventSuccessStage.closing,
        title: 'Host-help and openers',
        durationMinutes: 5,
        hostInstruction:
            'Use compatibility as conversation context and offer help with one introduction.',
        attendeeExperience:
            'Ask for host help while the room is live, then use shared context after matching.',
        moduleIds: ['wingman_requests'],
      ),
    ],
    metrics: EventSuccessMetricCatalog.core,
    antiPatterns: [
      'Do not sell compatibility as a guarantee of spark.',
      'Do not reveal too early; people should meet before match framing.',
      'Do not make phone use dominate the room.',
    ],
    iterationQuestions: [
      'Did the reveal create energy or pressure?',
      'Did questionnaire answers improve conversations?',
      'Did matches chat at a higher rate than non-reveal formats?',
    ],
    wiringNotes: [
      'Keep this behind WIP until consent, privacy, and explanation copy are approved.',
    ],
  );

  static const all = <EventSuccessPlaybook>[
    socialRun,
    pickleball,
    pubQuiz,
    dinner,
    hostLedSocial,
    algorithmicMixer,
  ];

  static Iterable<EventSuccessPlaybook> forActivity(ActivityKind type) =>
      all.where((playbook) => playbook.activityType == type);

  static EventSuccessPlaybook byIdOrDefault(String id) =>
      all.firstWhere((playbook) => playbook.id == id, orElse: () => socialRun);

  static EventSuccessPlaybook recommendedFor({
    required ActivityKind activityType,
    EventSocialIntensity? preferredIntensity,
  }) {
    final matches = forActivity(activityType).toList();
    if (matches.isEmpty) {
      final id = activityType.defaultPlaybookId;
      if (id != null) return byIdOrDefault(id);
      return hostLedSocial;
    }
    if (preferredIntensity == null) return matches.first;
    return matches.firstWhere(
      (playbook) => playbook.socialIntensity == preferredIntensity,
      orElse: () => matches.first,
    );
  }
}
