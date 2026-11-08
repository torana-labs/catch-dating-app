import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_view.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_default_view_reads.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_defaults_controller.g.dart';

/// Event defaults, read through the organizer's defaults view listener.
@riverpod
HostEventDefaultsState hostEventDefaultsController(
  Ref ref,
  String organizerId,
) {
  final viewValue = ref.watch(
    managerEventSetupDefaultsViewProvider(organizerId),
  );
  final view = viewValue.value;
  if (view == null) {
    return switch (viewValue) {
      AsyncValue(:final error?) => HostEventDefaultsState(
        status: HostEventDefaultsStatus.error,
        error: error,
      ),
      _ => const HostEventDefaultsState.loading(),
    };
  }
  if (!view.isComplete) {
    return HostEventDefaultsState(
      status: view.sourceCoverage == ManagerEventSetupDefaultsCoverage.missing
          ? HostEventDefaultsStatus.missing
          : HostEventDefaultsStatus.error,
      error: view.sourceCoverage == ManagerEventSetupDefaultsCoverage.missing
          ? null
          : ManagerEventSetupDefaultsUnavailable(
              view.sourceCoverage,
              source: view.incompleteSource,
            ),
    );
  }
  return HostEventDefaultsState(
    status: HostEventDefaultsStatus.ready,
    preferences: view.defaults?.preferences,
  );
}
