// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

import 'dart:convert';

class EventSuccessMomentPhaseDurations {
  const EventSuccessMomentPhaseDurations({
    required this.anticipation,
    required this.climax,
    required this.settle,
  });

  final int anticipation;
  final int climax;
  final int settle;
}

class EventSuccessMomentPresentationContract {
  const EventSuccessMomentPresentationContract({
    required this.momentKind,
    required this.paletteTokenId,
    required this.accentPaletteTokenId,
    required this.accentPalettePolicyId,
    required this.motifId,
    required this.phaseDurationsMs,
    required this.tempoBpm,
    required this.idlePulsePeriodMs,
    required this.particleDensity,
    required this.seedDerivationRuleId,
    required this.clockReferenceId,
    required this.ambientBedId,
    required this.ambientBedWhenEventEndedId,
  });

  final String momentKind;
  final String paletteTokenId;
  final String? accentPaletteTokenId;
  final String accentPalettePolicyId;
  final String motifId;
  final EventSuccessMomentPhaseDurations phaseDurationsMs;
  final double tempoBpm;
  final int idlePulsePeriodMs;
  final int particleDensity;
  final String seedDerivationRuleId;
  final String clockReferenceId;
  final String ambientBedId;
  final String? ambientBedWhenEventEndedId;
}

class EventSuccessSocialMissionPromptContract {
  const EventSuccessSocialMissionPromptContract({
    required this.promptId,
    required this.disclosureLevel,
  });

  final String promptId;
  final String disclosureLevel;
}

class EventSuccessSocialMissionPromptSetContract {
  const EventSuccessSocialMissionPromptSetContract({
    required this.interactionModel,
    required this.prompts,
  });

  final String interactionModel;
  final List<EventSuccessSocialMissionPromptContract> prompts;
}

class EventSuccessCeremonyTimeline {
  const EventSuccessCeremonyTimeline({
    required this.anticipationStartsAtMillis,
    required this.climaxStartsAtMillis,
    required this.settleStartsAtMillis,
    required this.completesAtMillis,
  });

  final int anticipationStartsAtMillis;
  final int climaxStartsAtMillis;
  final int settleStartsAtMillis;
  final int completesAtMillis;

  Map<String, Object?> toJson() => <String, Object?>{
    'anticipationStartsAtMillis': anticipationStartsAtMillis,
    'climaxStartsAtMillis': climaxStartsAtMillis,
    'settleStartsAtMillis': settleStartsAtMillis,
    'completesAtMillis': completesAtMillis,
  };
}

const eventSuccessMomentPresentationCatalogJson =
    <String, Object?>{
  'schemaVersion': 1,
  'kind': 'eventSuccessMomentPresentations',
  'moments': <Object?>[
    <String, Object?>{
      'momentKind': 'none',
      'paletteTokenId': 'editorial.dark',
      'accentPaletteTokenId': null,
      'accentPalettePolicyId': 'primary',
      'motifId': 'path',
      'phaseDurationsMs': <String, Object?>{
        'anticipation': 0,
        'climax': 0,
        'settle': 0,
      },
      'tempoBpm': 60,
      'idlePulsePeriodMs': 16000,
      'particleDensity': 0,
      'seedDerivationRuleId': 'fnv1a32-utf8-fields-v1',
      'clockReferenceId': 'none',
      'ambientBedId': 'theatrical',
      'ambientBedWhenEventEndedId': 'sunrise',
    },
    <String, Object?>{
      'momentKind': 'preArrival',
      'paletteTokenId': 'activity.running',
      'accentPaletteTokenId': null,
      'accentPalettePolicyId': 'primary',
      'motifId': 'path',
      'phaseDurationsMs': <String, Object?>{
        'anticipation': 0,
        'climax': 0,
        'settle': 0,
      },
      'tempoBpm': 60,
      'idlePulsePeriodMs': 16000,
      'particleDensity': 0,
      'seedDerivationRuleId': 'fnv1a32-utf8-fields-v1',
      'clockReferenceId': 'none',
      'ambientBedId': 'theatrical',
      'ambientBedWhenEventEndedId': null,
    },
    <String, Object?>{
      'momentKind': 'selfCheckIn',
      'paletteTokenId': 'activity.walking',
      'accentPaletteTokenId': null,
      'accentPalettePolicyId': 'primary',
      'motifId': 'gate',
      'phaseDurationsMs': <String, Object?>{
        'anticipation': 0,
        'climax': 0,
        'settle': 0,
      },
      'tempoBpm': 60,
      'idlePulsePeriodMs': 16000,
      'particleDensity': 0,
      'seedDerivationRuleId': 'fnv1a32-utf8-fields-v1',
      'clockReferenceId': 'none',
      'ambientBedId': 'theatrical',
      'ambientBedWhenEventEndedId': null,
    },
    <String, Object?>{
      'momentKind': 'firstHelloCheckIn',
      'paletteTokenId': 'activity.pickleball',
      'accentPaletteTokenId': null,
      'accentPalettePolicyId': 'primary',
      'motifId': 'signal',
      'phaseDurationsMs': <String, Object?>{
        'anticipation': 0,
        'climax': 0,
        'settle': 0,
      },
      'tempoBpm': 60,
      'idlePulsePeriodMs': 16000,
      'particleDensity': 0,
      'seedDerivationRuleId': 'fnv1a32-utf8-fields-v1',
      'clockReferenceId': 'none',
      'ambientBedId': 'theatrical',
      'ambientBedWhenEventEndedId': null,
    },
    <String, Object?>{
      'momentKind': 'compatibilityQuestionnaire',
      'paletteTokenId': 'activity.padel',
      'accentPaletteTokenId': null,
      'accentPalettePolicyId': 'primary',
      'motifId': 'spark',
      'phaseDurationsMs': <String, Object?>{
        'anticipation': 0,
        'climax': 0,
        'settle': 0,
      },
      'tempoBpm': 60,
      'idlePulsePeriodMs': 16000,
      'particleDensity': 0,
      'seedDerivationRuleId': 'fnv1a32-utf8-fields-v1',
      'clockReferenceId': 'none',
      'ambientBedId': 'theatrical',
      'ambientBedWhenEventEndedId': null,
    },
    <String, Object?>{
      'momentKind': 'liveStepContext',
      'paletteTokenId': 'activity.tennis',
      'accentPaletteTokenId': null,
      'accentPalettePolicyId': 'primary',
      'motifId': 'rhythm',
      'phaseDurationsMs': <String, Object?>{
        'anticipation': 0,
        'climax': 0,
        'settle': 0,
      },
      'tempoBpm': 60,
      'idlePulsePeriodMs': 16000,
      'particleDensity': 0,
      'seedDerivationRuleId': 'fnv1a32-utf8-fields-v1',
      'clockReferenceId': 'none',
      'ambientBedId': 'pulse',
      'ambientBedWhenEventEndedId': null,
    },
    <String, Object?>{
      'momentKind': 'socialPrompt',
      'paletteTokenId': 'activity.badminton',
      'accentPaletteTokenId': null,
      'accentPalettePolicyId': 'primary',
      'motifId': 'rhythm',
      'phaseDurationsMs': <String, Object?>{
        'anticipation': 0,
        'climax': 0,
        'settle': 0,
      },
      'tempoBpm': 60,
      'idlePulsePeriodMs': 16000,
      'particleDensity': 0,
      'seedDerivationRuleId': 'fnv1a32-utf8-fields-v1',
      'clockReferenceId': 'none',
      'ambientBedId': 'pulse',
      'ambientBedWhenEventEndedId': null,
    },
    <String, Object?>{
      'momentKind': 'conversationCues',
      'paletteTokenId': 'activity.cycling',
      'accentPaletteTokenId': null,
      'accentPalettePolicyId': 'primary',
      'motifId': 'rhythm',
      'phaseDurationsMs': <String, Object?>{
        'anticipation': 0,
        'climax': 0,
        'settle': 0,
      },
      'tempoBpm': 60,
      'idlePulsePeriodMs': 16000,
      'particleDensity': 0,
      'seedDerivationRuleId': 'fnv1a32-utf8-fields-v1',
      'clockReferenceId': 'none',
      'ambientBedId': 'pulse',
      'ambientBedWhenEventEndedId': null,
    },
    <String, Object?>{
      'momentKind': 'assignment',
      'paletteTokenId': 'activity.spinClass',
      'accentPaletteTokenId': 'activity.dinner',
      'accentPalettePolicyId': 'secondary',
      'motifId': 'orbit',
      'phaseDurationsMs': <String, Object?>{
        'anticipation': 0,
        'climax': 0,
        'settle': 0,
      },
      'tempoBpm': 60,
      'idlePulsePeriodMs': 16000,
      'particleDensity': 0,
      'seedDerivationRuleId': 'fnv1a32-utf8-fields-v1',
      'clockReferenceId': 'none',
      'ambientBedId': 'pulse',
      'ambientBedWhenEventEndedId': null,
    },
    <String, Object?>{
      'momentKind': 'liveReveal',
      'paletteTokenId': 'activity.yoga',
      'accentPaletteTokenId': 'activity.singlesMixer',
      'accentPalettePolicyId': 'secondaryUntilReveal',
      'motifId': 'reveal',
      'phaseDurationsMs': <String, Object?>{
        'anticipation': 10000,
        'climax': 1500,
        'settle': 700,
      },
      'tempoBpm': 60,
      'idlePulsePeriodMs': 16000,
      'particleDensity': 72,
      'seedDerivationRuleId': 'fnv1a32-utf8-fields-v1',
      'clockReferenceId': 'revealStartedAtPlusStructureRevealCountdown',
      'ambientBedId': 'silent',
      'ambientBedWhenEventEndedId': null,
    },
    <String, Object?>{
      'momentKind': 'wingmanRequest',
      'paletteTokenId': 'activity.strengthTraining',
      'accentPaletteTokenId': null,
      'accentPalettePolicyId': 'primary',
      'motifId': 'signal',
      'phaseDurationsMs': <String, Object?>{
        'anticipation': 0,
        'climax': 0,
        'settle': 0,
      },
      'tempoBpm': 60,
      'idlePulsePeriodMs': 16000,
      'particleDensity': 0,
      'seedDerivationRuleId': 'fnv1a32-utf8-fields-v1',
      'clockReferenceId': 'none',
      'ambientBedId': 'pulse',
      'ambientBedWhenEventEndedId': null,
    },
    <String, Object?>{
      'momentKind': 'postEvent',
      'paletteTokenId': 'activity.pubQuiz',
      'accentPaletteTokenId': null,
      'accentPalettePolicyId': 'primary',
      'motifId': 'afterglow',
      'phaseDurationsMs': <String, Object?>{
        'anticipation': 0,
        'climax': 0,
        'settle': 0,
      },
      'tempoBpm': 60,
      'idlePulsePeriodMs': 16000,
      'particleDensity': 0,
      'seedDerivationRuleId': 'fnv1a32-utf8-fields-v1',
      'clockReferenceId': 'none',
      'ambientBedId': 'sunrise',
      'ambientBedWhenEventEndedId': null,
    },
  ],
  'socialMissionPromptSets': <Object?>[
    <String, Object?>{
      'interactionModel': 'pacePods',
      'prompts': <Object?>[
        <String, Object?>{
          'promptId': 'pacePods.light',
          'disclosureLevel': 'light',
        },
        <String, Object?>{
          'promptId': 'shared.personal',
          'disclosureLevel': 'personal',
        },
        <String, Object?>{
          'promptId': 'shared.reflective',
          'disclosureLevel': 'reflective',
        },
      ],
    },
    <String, Object?>{
      'interactionModel': 'pairedRotations',
      'prompts': <Object?>[
        <String, Object?>{
          'promptId': 'pairedRotations.light',
          'disclosureLevel': 'light',
        },
        <String, Object?>{
          'promptId': 'shared.personal',
          'disclosureLevel': 'personal',
        },
        <String, Object?>{
          'promptId': 'shared.reflective',
          'disclosureLevel': 'reflective',
        },
      ],
    },
    <String, Object?>{
      'interactionModel': 'teamRotations',
      'prompts': <Object?>[
        <String, Object?>{
          'promptId': 'teamRotations.light',
          'disclosureLevel': 'light',
        },
        <String, Object?>{
          'promptId': 'shared.personal',
          'disclosureLevel': 'personal',
        },
        <String, Object?>{
          'promptId': 'shared.reflective',
          'disclosureLevel': 'reflective',
        },
      ],
    },
    <String, Object?>{
      'interactionModel': 'seatedTable',
      'prompts': <Object?>[
        <String, Object?>{
          'promptId': 'seatedTable.light',
          'disclosureLevel': 'light',
        },
        <String, Object?>{
          'promptId': 'shared.personal',
          'disclosureLevel': 'personal',
        },
        <String, Object?>{
          'promptId': 'shared.reflective',
          'disclosureLevel': 'reflective',
        },
      ],
    },
    <String, Object?>{
      'interactionModel': 'freeFormMixer',
      'prompts': <Object?>[
        <String, Object?>{
          'promptId': 'freeFormMixer.light',
          'disclosureLevel': 'light',
        },
        <String, Object?>{
          'promptId': 'shared.personal',
          'disclosureLevel': 'personal',
        },
        <String, Object?>{
          'promptId': 'shared.reflective',
          'disclosureLevel': 'reflective',
        },
      ],
    },
    <String, Object?>{
      'interactionModel': 'hostLedProgram',
      'prompts': <Object?>[
        <String, Object?>{
          'promptId': 'hostLedProgram.light',
          'disclosureLevel': 'light',
        },
        <String, Object?>{
          'promptId': 'shared.personal',
          'disclosureLevel': 'personal',
        },
        <String, Object?>{
          'promptId': 'shared.reflective',
          'disclosureLevel': 'reflective',
        },
      ],
    },
    <String, Object?>{
      'interactionModel': 'openFormat',
      'prompts': <Object?>[
        <String, Object?>{
          'promptId': 'openFormat.light',
          'disclosureLevel': 'light',
        },
        <String, Object?>{
          'promptId': 'shared.personal',
          'disclosureLevel': 'personal',
        },
        <String, Object?>{
          'promptId': 'shared.reflective',
          'disclosureLevel': 'reflective',
        },
      ],
    },
  ],
  'parityFixture': <String, Object?>{
    'eventId': 'event-parity-2026',
    'momentKind': 'liveReveal',
    'activeRevealRoundIndex': 2,
    'serverAnchorMillis': 1786703400000,
    'revealCountdownMs': 10000,
    'expected': <String, Object?>{
      'anticipationStartsAtMillis': 1786703400000,
      'climaxStartsAtMillis': 1786703410000,
      'settleStartsAtMillis': 1786703411500,
      'completesAtMillis': 1786703412200,
      'seed': 2263797243,
    },
  },
};

const eventSuccessMomentPresentations =
    <EventSuccessMomentPresentationContract>[
  EventSuccessMomentPresentationContract(
    momentKind: 'none',
    paletteTokenId: 'editorial.dark',
    accentPaletteTokenId: null,
    accentPalettePolicyId: 'primary',
    motifId: 'path',
    phaseDurationsMs: EventSuccessMomentPhaseDurations(
      anticipation: 0,
      climax: 0,
      settle: 0,
    ),
    tempoBpm: 60,
    idlePulsePeriodMs: 16000,
    particleDensity: 0,
    seedDerivationRuleId: 'fnv1a32-utf8-fields-v1',
    clockReferenceId: 'none',
    ambientBedId: 'theatrical',
    ambientBedWhenEventEndedId: 'sunrise',
  ),
  EventSuccessMomentPresentationContract(
    momentKind: 'preArrival',
    paletteTokenId: 'activity.running',
    accentPaletteTokenId: null,
    accentPalettePolicyId: 'primary',
    motifId: 'path',
    phaseDurationsMs: EventSuccessMomentPhaseDurations(
      anticipation: 0,
      climax: 0,
      settle: 0,
    ),
    tempoBpm: 60,
    idlePulsePeriodMs: 16000,
    particleDensity: 0,
    seedDerivationRuleId: 'fnv1a32-utf8-fields-v1',
    clockReferenceId: 'none',
    ambientBedId: 'theatrical',
    ambientBedWhenEventEndedId: null,
  ),
  EventSuccessMomentPresentationContract(
    momentKind: 'selfCheckIn',
    paletteTokenId: 'activity.walking',
    accentPaletteTokenId: null,
    accentPalettePolicyId: 'primary',
    motifId: 'gate',
    phaseDurationsMs: EventSuccessMomentPhaseDurations(
      anticipation: 0,
      climax: 0,
      settle: 0,
    ),
    tempoBpm: 60,
    idlePulsePeriodMs: 16000,
    particleDensity: 0,
    seedDerivationRuleId: 'fnv1a32-utf8-fields-v1',
    clockReferenceId: 'none',
    ambientBedId: 'theatrical',
    ambientBedWhenEventEndedId: null,
  ),
  EventSuccessMomentPresentationContract(
    momentKind: 'firstHelloCheckIn',
    paletteTokenId: 'activity.pickleball',
    accentPaletteTokenId: null,
    accentPalettePolicyId: 'primary',
    motifId: 'signal',
    phaseDurationsMs: EventSuccessMomentPhaseDurations(
      anticipation: 0,
      climax: 0,
      settle: 0,
    ),
    tempoBpm: 60,
    idlePulsePeriodMs: 16000,
    particleDensity: 0,
    seedDerivationRuleId: 'fnv1a32-utf8-fields-v1',
    clockReferenceId: 'none',
    ambientBedId: 'theatrical',
    ambientBedWhenEventEndedId: null,
  ),
  EventSuccessMomentPresentationContract(
    momentKind: 'compatibilityQuestionnaire',
    paletteTokenId: 'activity.padel',
    accentPaletteTokenId: null,
    accentPalettePolicyId: 'primary',
    motifId: 'spark',
    phaseDurationsMs: EventSuccessMomentPhaseDurations(
      anticipation: 0,
      climax: 0,
      settle: 0,
    ),
    tempoBpm: 60,
    idlePulsePeriodMs: 16000,
    particleDensity: 0,
    seedDerivationRuleId: 'fnv1a32-utf8-fields-v1',
    clockReferenceId: 'none',
    ambientBedId: 'theatrical',
    ambientBedWhenEventEndedId: null,
  ),
  EventSuccessMomentPresentationContract(
    momentKind: 'liveStepContext',
    paletteTokenId: 'activity.tennis',
    accentPaletteTokenId: null,
    accentPalettePolicyId: 'primary',
    motifId: 'rhythm',
    phaseDurationsMs: EventSuccessMomentPhaseDurations(
      anticipation: 0,
      climax: 0,
      settle: 0,
    ),
    tempoBpm: 60,
    idlePulsePeriodMs: 16000,
    particleDensity: 0,
    seedDerivationRuleId: 'fnv1a32-utf8-fields-v1',
    clockReferenceId: 'none',
    ambientBedId: 'pulse',
    ambientBedWhenEventEndedId: null,
  ),
  EventSuccessMomentPresentationContract(
    momentKind: 'socialPrompt',
    paletteTokenId: 'activity.badminton',
    accentPaletteTokenId: null,
    accentPalettePolicyId: 'primary',
    motifId: 'rhythm',
    phaseDurationsMs: EventSuccessMomentPhaseDurations(
      anticipation: 0,
      climax: 0,
      settle: 0,
    ),
    tempoBpm: 60,
    idlePulsePeriodMs: 16000,
    particleDensity: 0,
    seedDerivationRuleId: 'fnv1a32-utf8-fields-v1',
    clockReferenceId: 'none',
    ambientBedId: 'pulse',
    ambientBedWhenEventEndedId: null,
  ),
  EventSuccessMomentPresentationContract(
    momentKind: 'conversationCues',
    paletteTokenId: 'activity.cycling',
    accentPaletteTokenId: null,
    accentPalettePolicyId: 'primary',
    motifId: 'rhythm',
    phaseDurationsMs: EventSuccessMomentPhaseDurations(
      anticipation: 0,
      climax: 0,
      settle: 0,
    ),
    tempoBpm: 60,
    idlePulsePeriodMs: 16000,
    particleDensity: 0,
    seedDerivationRuleId: 'fnv1a32-utf8-fields-v1',
    clockReferenceId: 'none',
    ambientBedId: 'pulse',
    ambientBedWhenEventEndedId: null,
  ),
  EventSuccessMomentPresentationContract(
    momentKind: 'assignment',
    paletteTokenId: 'activity.spinClass',
    accentPaletteTokenId: 'activity.dinner',
    accentPalettePolicyId: 'secondary',
    motifId: 'orbit',
    phaseDurationsMs: EventSuccessMomentPhaseDurations(
      anticipation: 0,
      climax: 0,
      settle: 0,
    ),
    tempoBpm: 60,
    idlePulsePeriodMs: 16000,
    particleDensity: 0,
    seedDerivationRuleId: 'fnv1a32-utf8-fields-v1',
    clockReferenceId: 'none',
    ambientBedId: 'pulse',
    ambientBedWhenEventEndedId: null,
  ),
  EventSuccessMomentPresentationContract(
    momentKind: 'liveReveal',
    paletteTokenId: 'activity.yoga',
    accentPaletteTokenId: 'activity.singlesMixer',
    accentPalettePolicyId: 'secondaryUntilReveal',
    motifId: 'reveal',
    phaseDurationsMs: EventSuccessMomentPhaseDurations(
      anticipation: 10000,
      climax: 1500,
      settle: 700,
    ),
    tempoBpm: 60,
    idlePulsePeriodMs: 16000,
    particleDensity: 72,
    seedDerivationRuleId: 'fnv1a32-utf8-fields-v1',
    clockReferenceId: 'revealStartedAtPlusStructureRevealCountdown',
    ambientBedId: 'silent',
    ambientBedWhenEventEndedId: null,
  ),
  EventSuccessMomentPresentationContract(
    momentKind: 'wingmanRequest',
    paletteTokenId: 'activity.strengthTraining',
    accentPaletteTokenId: null,
    accentPalettePolicyId: 'primary',
    motifId: 'signal',
    phaseDurationsMs: EventSuccessMomentPhaseDurations(
      anticipation: 0,
      climax: 0,
      settle: 0,
    ),
    tempoBpm: 60,
    idlePulsePeriodMs: 16000,
    particleDensity: 0,
    seedDerivationRuleId: 'fnv1a32-utf8-fields-v1',
    clockReferenceId: 'none',
    ambientBedId: 'pulse',
    ambientBedWhenEventEndedId: null,
  ),
  EventSuccessMomentPresentationContract(
    momentKind: 'postEvent',
    paletteTokenId: 'activity.pubQuiz',
    accentPaletteTokenId: null,
    accentPalettePolicyId: 'primary',
    motifId: 'afterglow',
    phaseDurationsMs: EventSuccessMomentPhaseDurations(
      anticipation: 0,
      climax: 0,
      settle: 0,
    ),
    tempoBpm: 60,
    idlePulsePeriodMs: 16000,
    particleDensity: 0,
    seedDerivationRuleId: 'fnv1a32-utf8-fields-v1',
    clockReferenceId: 'none',
    ambientBedId: 'sunrise',
    ambientBedWhenEventEndedId: null,
  ),
];

final eventSuccessMomentPresentationsByKind =
    <String, EventSuccessMomentPresentationContract>{
  'none': eventSuccessMomentPresentations[0],
  'preArrival': eventSuccessMomentPresentations[1],
  'selfCheckIn': eventSuccessMomentPresentations[2],
  'firstHelloCheckIn': eventSuccessMomentPresentations[3],
  'compatibilityQuestionnaire': eventSuccessMomentPresentations[4],
  'liveStepContext': eventSuccessMomentPresentations[5],
  'socialPrompt': eventSuccessMomentPresentations[6],
  'conversationCues': eventSuccessMomentPresentations[7],
  'assignment': eventSuccessMomentPresentations[8],
  'liveReveal': eventSuccessMomentPresentations[9],
  'wingmanRequest': eventSuccessMomentPresentations[10],
  'postEvent': eventSuccessMomentPresentations[11],
};

const eventSuccessSocialMissionPromptSets =
    <EventSuccessSocialMissionPromptSetContract>[
  EventSuccessSocialMissionPromptSetContract(
    interactionModel: 'pacePods',
    prompts: <EventSuccessSocialMissionPromptContract>[
      EventSuccessSocialMissionPromptContract(promptId: 'pacePods.light', disclosureLevel: 'light'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.personal', disclosureLevel: 'personal'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.reflective', disclosureLevel: 'reflective'),
    ],
  ),
  EventSuccessSocialMissionPromptSetContract(
    interactionModel: 'pairedRotations',
    prompts: <EventSuccessSocialMissionPromptContract>[
      EventSuccessSocialMissionPromptContract(promptId: 'pairedRotations.light', disclosureLevel: 'light'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.personal', disclosureLevel: 'personal'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.reflective', disclosureLevel: 'reflective'),
    ],
  ),
  EventSuccessSocialMissionPromptSetContract(
    interactionModel: 'teamRotations',
    prompts: <EventSuccessSocialMissionPromptContract>[
      EventSuccessSocialMissionPromptContract(promptId: 'teamRotations.light', disclosureLevel: 'light'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.personal', disclosureLevel: 'personal'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.reflective', disclosureLevel: 'reflective'),
    ],
  ),
  EventSuccessSocialMissionPromptSetContract(
    interactionModel: 'seatedTable',
    prompts: <EventSuccessSocialMissionPromptContract>[
      EventSuccessSocialMissionPromptContract(promptId: 'seatedTable.light', disclosureLevel: 'light'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.personal', disclosureLevel: 'personal'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.reflective', disclosureLevel: 'reflective'),
    ],
  ),
  EventSuccessSocialMissionPromptSetContract(
    interactionModel: 'freeFormMixer',
    prompts: <EventSuccessSocialMissionPromptContract>[
      EventSuccessSocialMissionPromptContract(promptId: 'freeFormMixer.light', disclosureLevel: 'light'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.personal', disclosureLevel: 'personal'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.reflective', disclosureLevel: 'reflective'),
    ],
  ),
  EventSuccessSocialMissionPromptSetContract(
    interactionModel: 'hostLedProgram',
    prompts: <EventSuccessSocialMissionPromptContract>[
      EventSuccessSocialMissionPromptContract(promptId: 'hostLedProgram.light', disclosureLevel: 'light'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.personal', disclosureLevel: 'personal'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.reflective', disclosureLevel: 'reflective'),
    ],
  ),
  EventSuccessSocialMissionPromptSetContract(
    interactionModel: 'openFormat',
    prompts: <EventSuccessSocialMissionPromptContract>[
      EventSuccessSocialMissionPromptContract(promptId: 'openFormat.light', disclosureLevel: 'light'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.personal', disclosureLevel: 'personal'),
      EventSuccessSocialMissionPromptContract(promptId: 'shared.reflective', disclosureLevel: 'reflective'),
    ],
  ),
];

final eventSuccessSocialMissionPromptsByInteractionModel =
    <String, EventSuccessSocialMissionPromptSetContract>{
  'pacePods': eventSuccessSocialMissionPromptSets[0],
  'pairedRotations': eventSuccessSocialMissionPromptSets[1],
  'teamRotations': eventSuccessSocialMissionPromptSets[2],
  'seatedTable': eventSuccessSocialMissionPromptSets[3],
  'freeFormMixer': eventSuccessSocialMissionPromptSets[4],
  'hostLedProgram': eventSuccessSocialMissionPromptSets[5],
  'openFormat': eventSuccessSocialMissionPromptSets[6],
};

EventSuccessMomentPresentationContract eventSuccessMomentPresentationFor(
  String momentKind,
) {
  final presentation = eventSuccessMomentPresentationsByKind[momentKind];
  if (presentation == null) {
    throw StateError('Missing Event Success moment presentation: $momentKind');
  }
  return presentation;
}

EventSuccessSocialMissionPromptContract eventSuccessSocialMissionPromptFor({
  required String interactionModel,
  required int activeStepIndex,
}) {
  final promptSet =
      eventSuccessSocialMissionPromptsByInteractionModel[interactionModel];
  if (promptSet == null || promptSet.prompts.length != 3) {
    throw StateError(
      'Missing Event Success social missions: $interactionModel',
    );
  }
  final disclosureIndex = activeStepIndex < 0
      ? 0
      : activeStepIndex > 2
      ? 2
      : activeStepIndex;
  return promptSet.prompts[disclosureIndex];
}

EventSuccessCeremonyTimeline resolveEventSuccessCeremonyTimeline({
  required EventSuccessMomentPresentationContract presentation,
  required int serverAnchorMillis,
  int? revealCountdownMs,
}) {
  final configuredAnticipationMs = presentation.phaseDurationsMs.anticipation;
  final anticipationDurationMs = presentation.clockReferenceId ==
          'revealStartedAtPlusStructureRevealCountdown'
      ? revealCountdownMs ?? configuredAnticipationMs
      : configuredAnticipationMs;
  if (anticipationDurationMs < 0) {
    throw ArgumentError.value(
      anticipationDurationMs,
      'revealCountdownMs',
      'must not be negative',
    );
  }
  final climaxStartsAtMillis = serverAnchorMillis + anticipationDurationMs;
  final settleStartsAtMillis =
      climaxStartsAtMillis + presentation.phaseDurationsMs.climax;
  return EventSuccessCeremonyTimeline(
    anticipationStartsAtMillis: serverAnchorMillis,
    climaxStartsAtMillis: climaxStartsAtMillis,
    settleStartsAtMillis: settleStartsAtMillis,
    completesAtMillis:
        settleStartsAtMillis + presentation.phaseDurationsMs.settle,
  );
}

int deriveEventSuccessMomentSeed({
  required EventSuccessMomentPresentationContract presentation,
  required String eventId,
  required int activeRevealRoundIndex,
  required int serverAnchorMillis,
}) {
  if (presentation.seedDerivationRuleId != 'fnv1a32-utf8-fields-v1') {
    throw UnsupportedError(
      'Unsupported Event Success seed rule: '
      '${presentation.seedDerivationRuleId}',
    );
  }
  var hash = 0x811c9dc5;
  final fields = <String>[
    eventId,
    presentation.momentKind,
    activeRevealRoundIndex.toString(),
    serverAnchorMillis.toString(),
  ];
  for (final field in fields) {
    for (final byte in utf8.encode(field)) {
      hash = ((hash ^ byte) * 0x01000193) & 0xffffffff;
    }
    hash = ((hash ^ 0xff) * 0x01000193) & 0xffffffff;
  }
  return hash;
}
