// GENERATED CODE - DO NOT EDIT.
// Source: copy/structured_domain_copy_en.json and tool/copy/templates/structured_domain_copy/modules.dart.template

import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';

abstract final class EventSuccessModuleCatalog {
  static const crowdBalance = EventSuccessModule(
    id: 'crowd_balance',
    title: 'Booking balance preview',
    type: EventSuccessModuleType.crowdBalance,
    productLayer: EventSuccessProductLayer.rosterAttendance,
    stage: EventSuccessStage.before,
    hostConfigurable:
        false,
    attendeePromise: 'The room feels intentional instead of random.',
    hostPromise:
        'Shows waitlist, cohort, skill, and pace gaps before the event.',
    setupSteps: [
      'Collect only the fields needed for balance decisions.',
      'Show balance risk before the host confirms additional attendees.',
      'Use waitlist offers instead of silent rejection when possible.',
    ],
    riskControls: [
      'Do not expose private cohort counts to attendees.',
      'Keep non-binary and queer formats explicit instead of forcing binary caps.',
    ],
  );

  static const checkIn = EventSuccessModule(
    id: 'qr_check_in',
    title: 'Attendance and live roster',
    type: EventSuccessModuleType.checkIn,
    productLayer: EventSuccessProductLayer.rosterAttendance,
    stage: EventSuccessStage.arrival,
    hostConfigurable:
        false,
    attendeePromise: 'Arrival is quick and the right people enter the loop.',
    hostPromise: 'Confirms who actually attended before matching and reviews.',
    requiresLivePhoneUse: true,
    setupSteps: [
      'Use the shared event attendance system as the source of truth.',
      'Support QR check-in as one arrival method, not a separate product loop.',
      'Let hosts mark manual arrivals when phones fail.',
      'Use checked-in attendees as the eligible pool for post-event Catches.',
    ],
    riskControls: [
      'Never publish the full roster by default.',
      'Keep host overrides auditable.',
    ],
  );

  static const firstHelloCheckIn = EventSuccessModule(
    id: 'first_hello_check_in',
    title: 'Arrival icebreaker',
    type: EventSuccessModuleType.firstHelloCheckIn,
    productLayer: EventSuccessProductLayer.rosterAttendance,
    stage: EventSuccessStage.arrival,
    attendeePromise:
        'A clear arrival mission gives someone permission to start talking.',
    hostPromise:
        'Turns location-verified arrival into one guided first interaction before the room gets moving.',
    enabledByDefault: false,
    requiresLivePhoneUse: true,
    recommendedFor: {
      ActivityKind.pickleball,
      ActivityKind.pubQuiz,
      ActivityKind.dinner,
      ActivityKind.singlesMixer,
    },
    setupSteps: [
      'Verify the attendee is at the venue before assigning a mission.',
      'Assign one safe target and one short question, then complete check-in.',
      'Always provide reassignment, skip, and host manual check-in fallbacks.',
    ],
    riskControls: [
      'Do not write peer answers into the target attendee questionnaire.',
      'Never assign blocked or reported pairs.',
      'Do not reveal precise live location or individual answers to hosts.',
    ],
  );

  static const hostScript = EventSuccessModule(
    id: 'host_script',
    title: 'Welcome script',
    type: EventSuccessModuleType.formatTemplate,
    productLayer: EventSuccessProductLayer.eventStructure,
    stage: EventSuccessStage.opening,
    attendeePromise: 'The room gets clear social permission to talk.',
    hostPromise: 'Gives non-professional hosts a simple live guide.',
    setupSteps: [
      'Prepare a welcome line, safety note, and first prompt.',
      'Keep the script short enough to use live.',
    ],
  );

  static const microPods = EventSuccessModule(
    id: 'micro_pods',
    title: 'Small starter groups',
    type: EventSuccessModuleType.microPods,
    productLayer: EventSuccessProductLayer.assignments,
    stage: EventSuccessStage.opening,
    attendeePromise: 'Meet a small group before needing to approach strangers.',
    hostPromise: 'Creates mixing without forcing one-to-one pressure.',
    setupSteps: [
      'Group attendees into four to six person pods.',
      'Prefer pace, skill, geography, or interests over hidden romance scoring.',
      'Let hosts reshuffle pods when real arrivals differ from signups.',
    ],
    riskControls: ['Offer an opt-out for attendees who arrive with friends.'],
  );

  static const socialMissions = EventSuccessModule(
    id: 'social_missions',
    title: 'Live prompts',
    type: EventSuccessModuleType.socialMissions,
    productLayer: EventSuccessProductLayer.conversation,
    stage: EventSuccessStage.mixing,
    attendeePromise: 'There is an easy excuse to start one more conversation.',
    hostPromise: 'Improves room energy without heavy facilitation.',
    setupSteps: [
      'Generate three activity-specific prompts.',
      'Keep missions optional and non-performative.',
      'End each mission with a natural transition back to the activity.',
    ],
  );

  static const guidedRotations = EventSuccessModule(
    id: 'guided_rotations',
    title: 'Timed partner rotations',
    type: EventSuccessModuleType.guidedRotations,
    productLayer: EventSuccessProductLayer.assignments,
    stage: EventSuccessStage.activity,
    attendeePromise: 'Everyone meets more people without doing the logistics.',
    hostPromise: 'Creates predictable mixing for games, tables, and teams.',
    setupSteps: [
      'Set round length and rotation count.',
      'Avoid back-to-back repeats.',
      'Show the next partner, table, or team only when needed.',
    ],
    requiresLivePhoneUse: true,
    recommendedFor: {
      ActivityKind.pickleball,
      ActivityKind.pubQuiz,
      ActivityKind.dinner,
      ActivityKind.singlesMixer,
    },
    riskControls: [
      'Do not use timed rotations for movement-heavy events unless there is a pause.',
    ],
  );

  static const liveReveal = EventSuccessModule(
    id: 'live_reveal',
    title: 'Synchronized partner reveal',
    type: EventSuccessModuleType.liveReveal,
    productLayer: EventSuccessProductLayer.liveReveal,
    stage: EventSuccessStage.activity,
    attendeePromise:
        'The next assignment lands as a shared reveal, not a buried schedule.',
    hostPromise:
        'Runs countdowns, clues, and round-by-round reveal control from the live plan.',
    requiresLivePhoneUse: true,
    recommendedFor: {
      ActivityKind.pickleball,
      ActivityKind.pubQuiz,
      ActivityKind.dinner,
      ActivityKind.singlesMixer,
    },
    setupSteps: [
      'Generate or edit assignments before starting the first reveal.',
      'Use the saved countdown to create a synchronized room moment.',
      'Reveal only the current round so the next transition still has tension.',
    ],
    riskControls: [
      'Frame compatibility clues as conversation context, not certainty.',
      'Do not expose normal post-event catch targets to hosts.',
    ],
  );

  static const compatibilityQuestionnaire = EventSuccessModule(
    id: 'compatibility_questionnaire',
    title: 'Match clue questions',
    type: EventSuccessModuleType.compatibilityQuestionnaire,
    productLayer: EventSuccessProductLayer.compatibility,
    stage: EventSuccessStage.before,
    attendeePromise: 'Matching moments have a reason beyond looks.',
    hostPromise:
        'Creates reveal clues and optional pairing context without promising chemistry.',
    enabledByDefault: false,
    setupSteps: [
      'Ask fewer than ten questions in the first version.',
      'Tie questions to the event vibe, not a permanent personality score.',
      'Explain compatibility as conversation context, not destiny.',
    ],
    riskControls: [
      'Avoid implying Catch can predict chemistry.',
      'Do not block organic interaction before the reveal.',
    ],
  );

  static const wingmanRequests = EventSuccessModule(
    id: 'wingman_requests',
    title: '"Help me say hi" requests',
    type: EventSuccessModuleType.wingmanRequests,
    productLayer: EventSuccessProductLayer.hostFacilitation,
    stage: EventSuccessStage.mixing,
    hostConfigurable:
        false,
    attendeePromise:
        'Ask the host for help with a specific introduction while the event is still live.',
    hostPromise:
        'Shows only explicit, consented requests so the host can create natural introductions.',
    setupSteps: [
      'Open host-assisted requests after check-in or attendance confirmation.',
      'Limit candidates to compatible checked-in attendees.',
      'Use requests while the room is still active.',
    ],
    riskControls: [
      'Show hosts only requests where the attendee explicitly opted in.',
      'Do not notify the requested attendee automatically.',
      'Respect blocks, reports, and profile visibility settings.',
    ],
  );

  static const contextualOpeners = EventSuccessModule(
    id: 'contextual_openers',
    title: 'Suggested first-message openers',
    type: EventSuccessModuleType.contextualOpeners,
    productLayer: EventSuccessProductLayer.conversation,
    stage: EventSuccessStage.after,
    hostConfigurable:
        false,
    attendeePromise: 'A match starts with shared context instead of a cold hi.',
    hostPromise: 'Improves downstream chat starts without host involvement.',
    setupSteps: [
      'Use event, team, route, prompt, or table context.',
      'Let either person ignore the suggested opener.',
    ],
    riskControls: [
      'Do not reveal private questionnaire answers unless both people consented.',
    ],
  );

  static const decomposedFeedback = EventSuccessModule(
    id: 'decomposed_feedback',
    title: 'Attendee feedback',
    type: EventSuccessModuleType.decomposedFeedback,
    productLayer: EventSuccessProductLayer.hostCoach,
    stage: EventSuccessStage.after,
    hostConfigurable:
        false,
    attendeePromise: 'Feedback is specific and private.',
    hostPromise:
        'Separates welcome, balance, structure, safety, and chemistry.',
    setupSteps: [
      'Ask short dimension-level questions after the event.',
      'Use private summaries before drawing public conclusions.',
    ],
  );

  static const hostAnalytics = EventSuccessModule(
    id: 'host_analytics',
    title: 'Host recap',
    type: EventSuccessModuleType.hostAnalytics,
    productLayer: EventSuccessProductLayer.hostCoach,
    stage: EventSuccessStage.hostDebrief,
    hostConfigurable:
        false,
    attendeePromise:
        'The next event should feel better because this one taught us something.',
    hostPromise:
        'Turns check-in, mixing, crushes, reviews, and repeats into advice.',
    setupSteps: [
      'Show a short post-event brief.',
      'Recommend one or two changes, not a dashboard wall.',
      'Track improvement over repeated events by the same host.',
    ],
  );

  static const safetyControls = EventSuccessModule(
    id: 'safety_controls',
    title: 'Safety layer',
    type: EventSuccessModuleType.safetyControls,
    productLayer: EventSuccessProductLayer.safety,
    stage: EventSuccessStage.before,
    hostConfigurable:
        false,
    attendeePromise: 'Attendees can participate without losing control.',
    hostPromise: 'Gives hosts escalation and boundary tools.',
    setupSteps: [
      'Respect block and report state everywhere.',
      'Let attendees opt out of live intros or visibility modules.',
      'Expose host help and report affordances without drama.',
    ],
    riskControls: [
      'Treat safety as a launch prerequisite for live event features.',
    ],
  );

  static const all = <EventSuccessModule>[
    crowdBalance,
    checkIn,
    firstHelloCheckIn,
    hostScript,
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
  ];

  static Map<EventSuccessProductLayer, List<EventSuccessModule>>
  get allByProductLayer {
    final grouped = <EventSuccessProductLayer, List<EventSuccessModule>>{};
    for (final layer in EventSuccessProductLayer.values) {
      final modules = all
          .where((module) => module.productLayer == layer)
          .toList(growable: false);
      if (modules.isNotEmpty) grouped[layer] = modules;
    }
    return grouped;
  }

  static EventSuccessModule byId(String id) => all.firstWhere(
    (module) => module.id == id,
    orElse: () => throw ArgumentError.value(id, 'id', 'Unknown module id'),
  );
}
