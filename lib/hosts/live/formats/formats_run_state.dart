import 'package:catch_dating_app/hosts/live/formats/formats_sweep_state.dart';
import 'package:flutter/foundation.dart';

/// Where the run console is: still reading, a night with no plan, running,
/// or unable to read the guest list.
enum HostFormatsRunStatus { loading, noPlan, running, error }

/// One pace pod tonight: its runners checked in and how many are back.
@immutable
class HostFormatsRunPod {
  const HostFormatsRunPod({
    required this.id,
    required this.label,
    required this.back,
    required this.total,
    this.paceSecondsPerKm,
  });

  final String id;
  final String label;

  /// Runners in the pod who are checked in and accounted for.
  final int back;

  /// Runners in the pod who are checked in.
  final int total;

  /// The pod's target pace; null when the route gives none.
  final int? paceSecondsPerKm;
}

/// Everything the run console shows, as plain values.
@immutable
class HostFormatsRunState {
  const HostFormatsRunState({
    required this.status,
    this.stepTitle,
    this.stepIndex = 0,
    this.stepCount = 0,
    this.pods = const <HostFormatsRunPod>[],
    this.sweep = const HostFormatsSweepState.loading(),
    this.checking = false,
    this.error,
  });

  const HostFormatsRunState.loading()
    : this(status: HostFormatsRunStatus.loading);

  final HostFormatsRunStatus status;

  /// The run-of-show step on now; null with no steps.
  final String? stepTitle;

  /// The step on now, from zero.
  final int stepIndex;
  final int stepCount;

  /// The route's pace pods, then "No pod" for runners in none.
  final List<HostFormatsRunPod> pods;

  /// Who is back and who is still out.
  final HostFormatsSweepState sweep;

  /// Some runners' pods are still being read.
  final bool checking;
  final Object? error;

  /// The run is on its last step: the way back.
  bool get onLastStep => stepCount > 0 && stepIndex == stepCount - 1;
}
