part of '../profile_insights.dart';

enum ProfileConfidenceSignalKind { completeProfile, sharedRun, easyOpeners }

enum EmotionalRunTagKind {
  morningRegular,
  eveningRunner,
  middayMiles,
  easyMiles,
  tempoEnergy,
  flexiblePace,
  fiveKRegular,
  tenKReady,
  longRunPerson,
  socialMiles,
  headspaceRunner,
  trainingEnergy,
  feelGoodMiles,
}

enum EmotionalRunTagSource { derived, selected }

enum CompatibilityReasonKind {
  sharedRun,
  relationshipGoal,
  runningReason,
  runTime,
  distance,
  pace,
  language,
  easyOpener,
}

enum ProfileQualitySuggestionKind {
  photos,
  profilePrompts,
  photoPrompts,
  relationshipGoal,
  runningIdentity,
  backgroundDetail,
  lifestyleDetail,
}
