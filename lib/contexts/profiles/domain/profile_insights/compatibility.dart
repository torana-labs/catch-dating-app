part of '../profile_insights.dart';

List<CompatibilityReason> compatibilityReasonsForProfile({
  required PublicProfile targetProfile,
  UserProfile? viewerProfile,
  String? sharedRunTitle,
}) {
  final reasons = <CompatibilityReason>[];
  final targetPromptCount = normalizeProfilePromptAnswers(
    targetProfile.profilePrompts,
  ).length;

  void add(CompatibilityReasonKind kind, String label) {
    if (reasons.any((reason) => reason.kind == kind || reason.label == label)) {
      return;
    }
    reasons.add(CompatibilityReason(kind: kind, label: label));
  }

  final eventTitle = _trimToNull(sharedRunTitle);
  if (eventTitle != null) {
    add(CompatibilityReasonKind.sharedRun, 'You met at $eventTitle');
  }

  final viewer = viewerProfile;
  if (viewer == null) {
    if (targetPromptCount >= maxProfilePromptAnswers) {
      add(
        CompatibilityReasonKind.easyOpener,
        'Their prompts give you easy openers',
      );
    }
    return reasons.take(3).toList(growable: false);
  }

  if (viewer.relationshipGoal != null &&
      viewer.relationshipGoal == targetProfile.relationshipGoal) {
    add(
      CompatibilityReasonKind.relationshipGoal,
      _relationshipGoalReason(viewer.relationshipGoal!),
    );
  }

  final canCompareRunPreferences =
      viewer.hasCurrentRunPreferences &&
      targetProfile.activityPreferences.running.hasCurrentRunPreferences;
  if (canCompareRunPreferences) {
    final viewerRunning = viewer.runningPreferences;
    final targetRunning = targetProfile.activityPreferences.running;
    final sharedReasons = _sharedValues(
      viewerRunning.runningReasons,
      targetRunning.runningReasons,
    );
    if (sharedReasons.isNotEmpty) {
      add(
        CompatibilityReasonKind.runningReason,
        _runningReasonCompatibilityLabel(sharedReasons),
      );
    }

    final sharedRunTimes = _sharedRunTimeBuckets(
      viewerRunning.preferredRunTimes,
      targetRunning.preferredRunTimes,
    );
    if (sharedRunTimes.isNotEmpty) {
      add(
        CompatibilityReasonKind.runTime,
        'You both like ${_joinLabels(sharedRunTimes)} events',
      );
    }

    final sharedDistances = _sharedValues(
      viewerRunning.preferredDistances,
      targetRunning.preferredDistances,
    );
    if (sharedDistances.isNotEmpty) {
      add(
        CompatibilityReasonKind.distance,
        'You both like ${_joinLabels(sharedDistances.map((distance) => distance.label))}',
      );
    }

    if (_paceRangesOverlap(
      viewerRunning.paceMinSecsPerKm,
      viewerRunning.paceMaxSecsPerKm,
      targetRunning.paceMinSecsPerKm,
      targetRunning.paceMaxSecsPerKm,
    )) {
      add(CompatibilityReasonKind.pace, 'Your pace ranges overlap');
    }
  }

  final sharedLanguages = _sharedValues(
    viewer.languages,
    targetProfile.languages,
  );
  if (sharedLanguages.isNotEmpty) {
    add(
      CompatibilityReasonKind.language,
      'You both speak ${_joinLabels(sharedLanguages.map((language) => language.label))}',
    );
  }

  if (targetPromptCount >= maxProfilePromptAnswers) {
    add(
      CompatibilityReasonKind.easyOpener,
      'Their prompts give you easy openers',
    );
  }

  return reasons.take(3).toList(growable: false);
}

String _relationshipGoalReason(RelationshipGoal goal) {
  return switch (goal) {
    RelationshipGoal.friendship => 'You both want new friends',
    RelationshipGoal.unsure => 'You are both still figuring it out',
    _ => 'You are both looking for ${goal.label.toLowerCase()}',
  };
}

String _runningReasonCompatibilityLabel(List<RunReason> reasons) {
  if (reasons.length == 1) {
    return switch (reasons.single) {
      RunReason.social => 'You both run to make friends',
      RunReason.fitness => 'You both run to stay fit',
      RunReason.challenge => 'You both run to push limits',
      RunReason.community => 'You both run for community',
      RunReason.mindfulness => 'You both run for headspace',
      RunReason.weightLoss => 'You both run for fitness goals',
      RunReason.raceTraining => 'You both run for race training',
    };
  }

  return 'You both run for ${_joinLabels(reasons.map((reason) => reason.label.toLowerCase()))}';
}
