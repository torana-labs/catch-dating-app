import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/hosts/events/parts/host_event_step_row.dart';
import 'package:flutter/foundation.dart';

/// Where the rehearsal screen is: reading, practising, ended, or unable to
/// read the rehearsal.
enum HostRehearsalStatus { loading, running, ended, error }

/// One step of the rehearsed plan and where it stands.
@immutable
class HostRehearsalStep {
  const HostRehearsalStep({required this.step, required this.progress});

  final EventRunOfShowStep step;
  final HostEventStepProgress progress;
}

/// Everything the rehearsal screen shows, as plain values.
@immutable
class HostRehearsalState {
  const HostRehearsalState({
    required this.status,
    this.title,
    this.guests = 0,
    this.steps = const <HostRehearsalStep>[],
    this.error,
  });

  const HostRehearsalState.loading()
    : this(status: HostRehearsalStatus.loading);

  final HostRehearsalStatus status;

  /// The rehearsed event's name.
  final String? title;

  /// The made-up guests in this rehearsal.
  final int guests;
  final List<HostRehearsalStep> steps;
  final Object? error;
}
