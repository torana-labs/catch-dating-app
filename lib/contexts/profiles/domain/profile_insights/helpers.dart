part of '../profile_insights.dart';

List<ProfileConfidenceSignal> _confidenceSignals({
  required PublicProfile profile,
  required ProfileQualitySummary quality,
  String? sharedRunTitle,
}) {
  final signals = <ProfileConfidenceSignal>[];
  if (quality.isStrong) {
    signals.add(
      const ProfileConfidenceSignal(
        kind: ProfileConfidenceSignalKind.completeProfile,
        label: StructuredDomainCopy.profileInsightComplete,
      ),
    );
  }

  final eventTitle = _trimToNull(sharedRunTitle);
  if (eventTitle != null) {
    signals.add(
      ProfileConfidenceSignal(
        kind: ProfileConfidenceSignalKind.sharedRun,
        label:
            // copy:allow-inline(Composes governed prefix copy with a dynamic event title)
            '${StructuredDomainCopy.profileInsightSharedEventPrefix} $eventTitle',
      ),
    );
  }

  if (normalizeProfilePromptAnswers(profile.profilePrompts).length >=
      maxProfilePromptAnswers) {
    signals.add(
      const ProfileConfidenceSignal(
        kind: ProfileConfidenceSignalKind.easyOpeners,
        label: StructuredDomainCopy.profileInsightEasyOpeners,
      ),
    );
  }

  return signals.take(2).toList(growable: false);
}

bool _paceRangesOverlap(
  int firstMin,
  int firstMax,
  int secondMin,
  int secondMax,
) {
  return firstMin <= secondMax && secondMin <= firstMax;
}

List<T> _sharedValues<T>(Iterable<T> first, Iterable<T> second) {
  final secondSet = second.toSet();
  final values = <T>[];
  for (final value in first) {
    if (secondSet.contains(value) && !values.contains(value)) {
      values.add(value);
    }
  }
  return values;
}

List<String> _sharedRunTimeBuckets(
  Iterable<PreferredRunTime> first,
  Iterable<PreferredRunTime> second,
) {
  final firstBuckets = first.map(_runTimeBucketLabel).toSet();
  final secondBuckets = second.map(_runTimeBucketLabel).toSet();
  final buckets = <String>[];
  for (final bucket in const ['morning', 'afternoon', 'evening']) {
    if (firstBuckets.contains(bucket) && secondBuckets.contains(bucket)) {
      buckets.add(bucket);
    }
  }
  return buckets;
}

String _runTimeBucketLabel(PreferredRunTime time) {
  return switch (time) {
    PreferredRunTime.earlyMorning || PreferredRunTime.morning => 'morning',
    PreferredRunTime.afternoon => 'afternoon',
    PreferredRunTime.evening || PreferredRunTime.night => 'evening',
  };
}

String _joinLabels(Iterable<String> labels) {
  final values = labels
      .where((label) => label.trim().isNotEmpty)
      .take(2)
      .toList();
  if (values.isEmpty) return '';
  if (values.length == 1) return values.single;
  return '${values.first} and ${values.last}';
}

String? _trimToNull(String? value) {
  final trimmed = value?.trim();
  if (trimmed == null || trimmed.isEmpty) return null;
  return trimmed;
}
