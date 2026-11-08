import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_provider.dart';
import 'package:flutter/foundation.dart';

/// Where pace pods are: still reading, a run with no pods on its route,
/// ready, or unable to read the guest list.
enum HostFormatsPodsStatus { loading, noPods, ready, error }

/// One pace pod and the runners in it.
@immutable
class HostFormatsPod {
  const HostFormatsPod({
    required this.id,
    required this.label,
    required this.runners,
    this.paceSecondsPerKm,
  });

  final String id;
  final String label;
  final List<String> runners;

  /// The pod's target pace; null when the route gives none.
  final int? paceSecondsPerKm;
}

/// A runner booked with no pod yet, and the membership review a move
/// needs.
@immutable
class HostFormatsUnplaced {
  const HostFormatsUnplaced({
    required this.attendeeId,
    required this.name,
    this.movable = false,
    this.review,
  });

  final String attendeeId;
  final String name;

  /// The runner's membership allows a placement now.
  final bool movable;

  /// The runner's membership as last read, which a move submits against;
  /// null only in previews.
  final EventAssistanceMembershipSession? review;
}

/// Everything pace pods show, as plain values.
@immutable
class HostFormatsPodsState {
  const HostFormatsPodsState({
    required this.status,
    this.pods = const <HostFormatsPod>[],
    this.unplaced = const <HostFormatsUnplaced>[],
    this.runners = 0,
    this.checking = false,
    this.error,
  });

  const HostFormatsPodsState.loading()
    : this(status: HostFormatsPodsStatus.loading);

  final HostFormatsPodsStatus status;
  final List<HostFormatsPod> pods;
  final List<HostFormatsUnplaced> unplaced;

  /// Everyone booked to run.
  final int runners;

  /// Some runners' pods are still being read, so the lists may grow.
  final bool checking;
  final Object? error;

  /// The pod with the fewest runners: where someone with no pace goes.
  HostFormatsPod? get smallest {
    HostFormatsPod? best;
    for (final pod in pods) {
      if (best == null || pod.runners.length < best.runners.length) best = pod;
    }
    return best;
  }
}
