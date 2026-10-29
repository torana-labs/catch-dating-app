part of '../profile_insights.dart';

List<EmotionalRunTag> emotionalRunTagsForProfile(PublicProfile profile) {
  final running = profile.activityPreferences.running;
  if (!running.hasCurrentRunPreferences) return const [];

  final tags = <EmotionalRunTag>[];

  void add(
    EmotionalRunTagKind kind,
    String label, {
    EmotionalRunTagSource source = EmotionalRunTagSource.derived,
  }) {
    if (tags.any((tag) => tag.kind == kind || tag.label == label)) return;
    tags.add(EmotionalRunTag(kind: kind, label: label, source: source));
  }

  for (final reason in running.runningReasons) {
    switch (reason) {
      case RunReason.community:
      case RunReason.social:
        add(
          EmotionalRunTagKind.socialMiles,
          'Social miles',
          source: EmotionalRunTagSource.selected,
        );
      case RunReason.mindfulness:
        add(
          EmotionalRunTagKind.headspaceRunner,
          'Runs for headspace',
          source: EmotionalRunTagSource.selected,
        );
      case RunReason.raceTraining:
      case RunReason.challenge:
        add(
          EmotionalRunTagKind.trainingEnergy,
          'Training energy',
          source: EmotionalRunTagSource.selected,
        );
      case RunReason.fitness:
      case RunReason.weightLoss:
        add(
          EmotionalRunTagKind.feelGoodMiles,
          'Feel-good miles',
          source: EmotionalRunTagSource.selected,
        );
    }
  }

  final runTimes = running.preferredRunTimes.toSet();
  if (runTimes.contains(PreferredRunTime.earlyMorning) ||
      runTimes.contains(PreferredRunTime.morning)) {
    add(
      EmotionalRunTagKind.morningRegular,
      'Morning regular',
      source: EmotionalRunTagSource.selected,
    );
  }
  if (runTimes.contains(PreferredRunTime.evening) ||
      runTimes.contains(PreferredRunTime.night)) {
    add(
      EmotionalRunTagKind.eveningRunner,
      'Evening runner',
      source: EmotionalRunTagSource.selected,
    );
  }
  if (runTimes.contains(PreferredRunTime.afternoon)) {
    add(
      EmotionalRunTagKind.middayMiles,
      'Midday miles',
      source: EmotionalRunTagSource.selected,
    );
  }

  final distances = running.preferredDistances.toSet();
  if (distances.contains(PreferredDistance.marathon) ||
      distances.contains(PreferredDistance.halfMarathon)) {
    add(EmotionalRunTagKind.longRunPerson, 'Long-run person');
  } else if (distances.contains(PreferredDistance.tenK)) {
    add(EmotionalRunTagKind.tenKReady, '10K ready');
  } else if (distances.contains(PreferredDistance.fiveK)) {
    add(EmotionalRunTagKind.fiveKRegular, '5K regular');
  }

  final paceMin = running.paceMinSecsPerKm;
  final paceMax = running.paceMaxSecsPerKm;
  if (paceMax <= 360) {
    add(EmotionalRunTagKind.tempoEnergy, 'Tempo energy');
  } else if (paceMin >= 360) {
    add(EmotionalRunTagKind.easyMiles, 'Easy miles');
  } else if (paceMax - paceMin >= 150) {
    add(EmotionalRunTagKind.flexiblePace, 'Flexible pace');
  }

  return tags.take(4).toList(growable: false);
}
