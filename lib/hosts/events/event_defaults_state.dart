import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:flutter/foundation.dart';

/// Where event defaults are: reading, showing them, not written by the
/// server yet, or unable to read.
enum HostEventDefaultsStatus { loading, ready, missing, error }

/// Everything the event defaults screen shows, as plain values.
@immutable
class HostEventDefaultsState {
  const HostEventDefaultsState({
    required this.status,
    this.preferences,
    this.error,
  });

  const HostEventDefaultsState.loading()
    : this(status: HostEventDefaultsStatus.loading);

  final HostEventDefaultsStatus status;

  /// The organizer's defaults for every new event. The hashes and revision
  /// a save is fenced on stay with the screen, which reads them from the
  /// defaults view when it saves.
  final ManagerEventSetupPreferences? preferences;
  final Object? error;
}
