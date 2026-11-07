import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:flutter/foundation.dart';

/// Where event defaults are: reading, showing them, not written by the
/// server yet, or unable to read.
enum HostEventDefaultsStatus { loading, ready, missing, error }

/// Everything the event defaults screen shows, as plain values.
@immutable
class HostEventDefaultsState {
  const HostEventDefaultsState({
    required this.status,
    this.defaults,
    this.error,
  });

  const HostEventDefaultsState.loading()
    : this(status: HostEventDefaultsStatus.loading);

  final HostEventDefaultsStatus status;

  /// The organizer's defaults with the hashes and revision the next save
  /// is fenced on.
  final ManagerEventSetupDefaults? defaults;
  final Object? error;
}
