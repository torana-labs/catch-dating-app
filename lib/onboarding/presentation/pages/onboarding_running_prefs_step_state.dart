import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/format_utils.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:flutter/material.dart';

class OnboardingRunningPrefsState {
  const OnboardingRunningPrefsState({
    required this.paceRange,
    required this.distances,
    required this.reasons,
    required this.runTimes,
    required this.runPreferencesOnly,
    required this.isCompleting,
    required this.completeErrorMessage,
    required this.footerLabel,
    required this.reasonLabel,
    required this.runTimesLabel,
  });

  factory OnboardingRunningPrefsState.fromDraft({
    required RangeValues paceRange,
    required Iterable<PreferredDistance> distances,
    required Iterable<RunReason> reasons,
    required Iterable<PreferredRunTime> runTimes,
    required AppLocalizations l10n,
    bool runPreferencesOnly = false,
    bool isCompleting = false,
    String? completeErrorMessage,
  }) {
    return OnboardingRunningPrefsState(
      paceRange: paceRange,
      distances: Set<PreferredDistance>.unmodifiable(distances),
      reasons: Set<RunReason>.unmodifiable(reasons),
      runTimes: Set<PreferredRunTime>.unmodifiable(runTimes),
      runPreferencesOnly: runPreferencesOnly,
      isCompleting: isCompleting,
      completeErrorMessage: completeErrorMessage,
      footerLabel: runPreferencesOnly
          ? l10n.onboardingRunningPrefsContinueBooking
          : l10n.onboardingRunningPrefsSave,
      reasonLabel: runPreferencesOnly
          ? l10n.onboardingRunningPrefsBookingReasonLabel
          : l10n.onboardingRunningPrefsReasonLabel,
      runTimesLabel: runPreferencesOnly
          ? l10n.onboardingRunningPrefsRunTimesLabel
          : l10n.onboardingRunningPrefsEventTimesLabel,
    );
  }

  final RangeValues paceRange;
  final Set<PreferredDistance> distances;
  final Set<RunReason> reasons;
  final Set<PreferredRunTime> runTimes;
  final bool runPreferencesOnly;
  final bool isCompleting;
  final String? completeErrorMessage;
  final String footerLabel;
  final String reasonLabel;
  final String runTimesLabel;

  String get minPaceLabel => '${formatPace(paceRange.start)}/km';

  String get maxPaceLabel => '${formatPace(paceRange.end)}/km';

  bool get canSubmit => !isCompleting;

  bool get requestControlsEnabled => !isCompleting;

  bool get hasCompleteError => completeErrorMessage != null;

  OnboardingRunningPrefsSubmitIntent submitIntent() {
    return OnboardingRunningPrefsSubmitIntent(
      paceMinSecsPerKm: paceRange.start.round(),
      paceMaxSecsPerKm: paceRange.end.round(),
      preferredDistances: List<PreferredDistance>.unmodifiable(distances),
      runningReasons: List<RunReason>.unmodifiable(reasons),
      preferredRunTimes: List<PreferredRunTime>.unmodifiable(runTimes),
    );
  }
}

class OnboardingRunningPrefsSubmitIntent {
  const OnboardingRunningPrefsSubmitIntent({
    required this.paceMinSecsPerKm,
    required this.paceMaxSecsPerKm,
    required this.preferredDistances,
    required this.runningReasons,
    required this.preferredRunTimes,
  });

  final int paceMinSecsPerKm;
  final int paceMaxSecsPerKm;
  final List<PreferredDistance> preferredDistances;
  final List<RunReason> runningReasons;
  final List<PreferredRunTime> preferredRunTimes;
}

class OnboardingRunningPrefsCallbacks {
  const OnboardingRunningPrefsCallbacks({
    required this.onPaceChanged,
    required this.onDistancesChanged,
    required this.onReasonsChanged,
    required this.onRunTimesChanged,
    required this.onContinue,
  });

  final ValueChanged<RangeValues> onPaceChanged;
  final void Function(Set<PreferredDistance> next) onDistancesChanged;
  final void Function(Set<RunReason> next) onReasonsChanged;
  final void Function(Set<PreferredRunTime> next) onRunTimesChanged;
  final VoidCallback onContinue;
}
