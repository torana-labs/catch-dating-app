// GENERATED FROM copy/event_success_questionnaires_en.json. DO NOT EDIT.
// Run: node tool/copy/sync_event_success_questionnaires.mjs --write

part of '../event_success_compatibility_response.dart';

abstract final class EventSuccessQuestionnairePackLibrary {
  static const fallbackQuestion = 'Question';
  static const fallbackOption = 'Option';
  static const fallbackOption1 = 'Option 1';
  static const fallbackOption2 = 'Option 2';

  static const balancedId = 'balanced';
  static const flirtyId = 'flirty';
  static const earnestId = 'earnest';
  static const intentionalId = 'intentional';
  static const customId = 'custom';

  static const balanced = EventSuccessQuestionnairePack(
    id: balancedId,
    title: 'Balanced',
    subtitle: 'Light social signal for most event formats.',
    questions: <EventSuccessCompatibilityQuestion>[
      EventSuccessCompatibilityQuestion(
        id: 'event_energy',
        prompt: 'Tonight I\'m most up for',
        options: <EventSuccessCompatibilityOption>[
          EventSuccessCompatibilityOption(
            id: 'event_energy_easy_conversation',
            label: 'Easy conversation',
          ),
          EventSuccessCompatibilityOption(
            id: 'event_energy_playful_competition',
            label: 'Playful competition',
          ),
          EventSuccessCompatibilityOption(
            id: 'event_energy_quiet_chemistry',
            label: 'Quiet chemistry',
          ),
          EventSuccessCompatibilityOption(
            id: 'event_energy_new_people',
            label: 'Meeting a few new people',
          ),
        ],
      ),
      EventSuccessCompatibilityQuestion(
        id: 'first_conversation',
        prompt: 'My best first conversation starts with',
        options: <EventSuccessCompatibilityOption>[
          EventSuccessCompatibilityOption(
            id: 'first_conversation_activity',
            label: 'A shared activity',
          ),
          EventSuccessCompatibilityOption(
            id: 'first_conversation_question',
            label: 'A thoughtful question',
          ),
          EventSuccessCompatibilityOption(
            id: 'first_conversation_joke',
            label: 'A joke',
          ),
          EventSuccessCompatibilityOption(
            id: 'first_conversation_recommendation',
            label: 'A practical recommendation',
          ),
        ],
      ),
      EventSuccessCompatibilityQuestion(
        id: 'shared_connection',
        prompt: 'I usually connect over',
        options: <EventSuccessCompatibilityOption>[
          EventSuccessCompatibilityOption(
            id: 'shared_connection_movement',
            label: 'Movement',
          ),
          EventSuccessCompatibilityOption(
            id: 'shared_connection_places',
            label: 'Food and places',
          ),
          EventSuccessCompatibilityOption(
            id: 'shared_connection_ideas',
            label: 'Ideas and trivia',
          ),
          EventSuccessCompatibilityOption(
            id: 'shared_connection_future_plans',
            label: 'Future plans',
          ),
        ],
      ),
      EventSuccessCompatibilityQuestion(
        id: 'after_event',
        prompt: 'After a good event I\'d rather',
        options: <EventSuccessCompatibilityOption>[
          EventSuccessCompatibilityOption(
            id: 'after_event_coffee',
            label: 'Grab coffee',
          ),
          EventSuccessCompatibilityOption(
            id: 'after_event_activity',
            label: 'Plan another activity',
          ),
          EventSuccessCompatibilityOption(
            id: 'after_event_text_first',
            label: 'Text first',
          ),
          EventSuccessCompatibilityOption(
            id: 'after_event_keep_casual',
            label: 'Keep it casual',
          ),
        ],
      ),
    ],
  );

  static const flirty = EventSuccessQuestionnairePack(
    id: flirtyId,
    title: 'Flirty',
    subtitle: 'More playful prompts for explicitly dating-forward events.',
    questions: <EventSuccessCompatibilityQuestion>[
      EventSuccessCompatibilityQuestion(
        id: 'flirty_energy',
        prompt: 'The kind of spark I enjoy is',
        options: <EventSuccessCompatibilityOption>[
          EventSuccessCompatibilityOption(
            id: 'flirty_energy_banter',
            label: 'Quick banter',
          ),
          EventSuccessCompatibilityOption(
            id: 'flirty_energy_slow_burn',
            label: 'A slow burn',
          ),
          EventSuccessCompatibilityOption(
            id: 'flirty_energy_playful_challenge',
            label: 'A playful challenge',
          ),
        ],
      ),
      EventSuccessCompatibilityQuestion(
        id: 'flirty_first_move',
        prompt: 'I respond best when someone',
        options: <EventSuccessCompatibilityOption>[
          EventSuccessCompatibilityOption(
            id: 'flirty_first_move_direct',
            label: 'Is direct',
          ),
          EventSuccessCompatibilityOption(
            id: 'flirty_first_move_witty',
            label: 'Makes me laugh',
          ),
          EventSuccessCompatibilityOption(
            id: 'flirty_first_move_curious',
            label: 'Asks something real',
          ),
        ],
      ),
    ],
  );

  static const earnest = EventSuccessQuestionnairePack(
    id: earnestId,
    title: 'Earnest',
    subtitle: 'Warmer questions for people seeking intentional connection.',
    questions: <EventSuccessCompatibilityQuestion>[
      EventSuccessCompatibilityQuestion(
        id: 'earnest_connection',
        prompt: 'I feel most connected when conversation is about',
        options: <EventSuccessCompatibilityOption>[
          EventSuccessCompatibilityOption(
            id: 'earnest_connection_values',
            label: 'Values',
          ),
          EventSuccessCompatibilityOption(
            id: 'earnest_connection_family',
            label: 'Family and community',
          ),
          EventSuccessCompatibilityOption(
            id: 'earnest_connection_growth',
            label: 'Growth and goals',
          ),
        ],
      ),
      EventSuccessCompatibilityQuestion(
        id: 'earnest_date_energy',
        prompt: 'A good first follow-up would feel',
        options: <EventSuccessCompatibilityOption>[
          EventSuccessCompatibilityOption(
            id: 'earnest_date_energy_calm',
            label: 'Calm and thoughtful',
          ),
          EventSuccessCompatibilityOption(
            id: 'earnest_date_energy_active',
            label: 'Active and easygoing',
          ),
          EventSuccessCompatibilityOption(
            id: 'earnest_date_energy_deep',
            label: 'Unhurried and deep',
          ),
        ],
      ),
    ],
  );

  static const intentional = EventSuccessQuestionnairePack(
    id: intentionalId,
    title: 'Intentional',
    subtitle: 'Lower-pressure prompts for older or more deliberate groups.',
    questions: <EventSuccessCompatibilityQuestion>[
      EventSuccessCompatibilityQuestion(
        id: 'intentional_pace',
        prompt: 'I prefer new connections to move',
        options: <EventSuccessCompatibilityOption>[
          EventSuccessCompatibilityOption(
            id: 'intentional_pace_slow',
            label: 'Slowly',
          ),
          EventSuccessCompatibilityOption(
            id: 'intentional_pace_natural',
            label: 'Naturally',
          ),
          EventSuccessCompatibilityOption(
            id: 'intentional_pace_clear',
            label: 'With clear intent',
          ),
        ],
      ),
      EventSuccessCompatibilityQuestion(
        id: 'intentional_life_fit',
        prompt: 'Compatibility means sharing',
        options: <EventSuccessCompatibilityOption>[
          EventSuccessCompatibilityOption(
            id: 'intentional_life_fit_rhythm',
            label: 'A similar life rhythm',
          ),
          EventSuccessCompatibilityOption(
            id: 'intentional_life_fit_values',
            label: 'Core values',
          ),
          EventSuccessCompatibilityOption(
            id: 'intentional_life_fit_curiosity',
            label: 'Curiosity and respect',
          ),
        ],
      ),
    ],
  );

  static const customStarterQuestions = <EventSuccessCompatibilityQuestion>[
    EventSuccessCompatibilityQuestion(
      id: 'custom_question_1',
      prompt: 'I usually connect with someone through',
      options: <EventSuccessCompatibilityOption>[
        EventSuccessCompatibilityOption(
          id: 'custom_question_1_option_1',
          label: 'Conversation',
        ),
        EventSuccessCompatibilityOption(
          id: 'custom_question_1_option_2',
          label: 'Shared activities',
        ),
        EventSuccessCompatibilityOption(
          id: 'custom_question_1_option_3',
          label: 'Humor',
        ),
      ],
    ),
    EventSuccessCompatibilityQuestion(
      id: 'custom_question_2',
      prompt: 'The best energy for this event is',
      options: <EventSuccessCompatibilityOption>[
        EventSuccessCompatibilityOption(
          id: 'custom_question_2_option_1',
          label: 'Relaxed',
        ),
        EventSuccessCompatibilityOption(
          id: 'custom_question_2_option_2',
          label: 'Playful',
        ),
        EventSuccessCompatibilityOption(
          id: 'custom_question_2_option_3',
          label: 'Intentional',
        ),
      ],
    ),
  ];

  static const allTemplates = <EventSuccessQuestionnairePack>[
    balanced,
    flirty,
    earnest,
    intentional,
  ];

  static EventSuccessQuestionnairePack byIdOrDefault(String id) {
    return allTemplates.firstWhere(
      (pack) => pack.id == id,
      orElse: () => balanced,
    );
  }

  static EventSuccessQuestionnairePack resolve(
    EventSuccessQuestionnaireConfig config,
  ) {
    if (config.usesCustom && config.customQuestions.isNotEmpty) {
      return EventSuccessQuestionnairePack(
        id: customId,
        title: config.customTitle?.trim().isNotEmpty == true
            ? config.customTitle!.trim()
            : 'Custom',
        subtitle: 'Custom questions for this event.',
        questions: config.customQuestions,
        custom: true,
      );
    }
    return byIdOrDefault(config.templateId);
  }
}
