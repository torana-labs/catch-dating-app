import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_journal.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/read_model_follower.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_manager_event_setup_defaults_controller.freezed.dart';
part 'host_manager_event_setup_defaults_controller.g.dart';

typedef WriteManagerEventSetupDefaults =
    Future<ManagerEventSetupDefaultsUpdateReceipt> Function(
      ManagerEventSetupDefaultsUpdateRequest request,
    );

/// A manager session can have only one unresolved defaults update per club.
/// An error after send never rotates its request ID or changes its body. The
/// defaults are read through `managerEventSetupDefaultsViewProvider`.
class HostManagerEventSetupDefaultsDependencies {
  const HostManagerEventSetupDefaultsDependencies({
    required this.write,
    this.currentUserId,
    this.journal = const ManagerEventSetupDefaultsJournal(),
  });
  final WriteManagerEventSetupDefaults write;
  final String? Function()? currentUserId;
  final ManagerEventSetupDefaultsJournal journal;
}

@riverpod
HostManagerEventSetupDefaultsDependencies
hostManagerEventSetupDefaultsDependencies(Ref ref) {
  final functions = ref.watch(firebaseFunctionsProvider);
  return HostManagerEventSetupDefaultsDependencies(
    write: ManagerEventSetupDefaultsRepository(functions).update,
    currentUserId: () => ref.read(uidProvider).asData?.value,
  );
}

@freezed
abstract class HostManagerEventSetupDefaultsState
    with _$HostManagerEventSetupDefaultsState {
  const HostManagerEventSetupDefaultsState._();
  const factory HostManagerEventSetupDefaultsState({
    ManagerEventSetupDefaults? current,
    ManagerEventSetupDefaultsUpdateRequest? pending,
    Object? error,
    @Default(false) bool loading,
    @Default(false) bool saving,
    @Default(true) bool actorAvailable,
  }) = _HostManagerEventSetupDefaultsState;
  bool get canEdit =>
      actorAvailable &&
      current != null &&
      pending == null &&
      !loading &&
      !saving;
}

@riverpod
class HostManagerEventSetupDefaultsController
    extends _$HostManagerEventSetupDefaultsController {
  late ReadModelFollower<ManagerEventSetupDefaultsView> _defaultsView;
  bool _journalLoaded = false;

  @override
  HostManagerEventSetupDefaultsState build(
    ({String userId, String organizerId}) scope,
  ) {
    ref.watch(hostManagerEventSetupDefaultsDependenciesProvider);
    _defaultsView = ReadModelFollower(
      onValue: _onDefaultsView,
      onError: _onListenerError,
      reject: (view) => defaultsViewMismatch(view, scope.organizerId),
    );
    ref.onDispose(() => _defaultsView.close());
    ref.listen(uidProvider, (_, next) {
      if (next.asData?.value != scope.userId) invalidateActor();
    });
    return const HostManagerEventSetupDefaultsState();
  }

  HostManagerEventSetupDefaultsDependencies get _dependencies =>
      ref.read(hostManagerEventSetupDefaultsDependenciesProvider);
  String get _userId => scope.userId;
  String get _organizerId => scope.organizerId;

  WriteManagerEventSetupDefaults get _write => _dependencies.write;
  ManagerEventSetupDefaultsJournal get _journal => _dependencies.journal;
  bool get _actorAvailable {
    if (!ref.mounted || !state.actorAvailable) return false;
    final actor = _dependencies.currentUserId;
    if (actor != null && actor() != _userId) {
      invalidateActor();
      return false;
    }
    return true;
  }

  void invalidateActor() {
    _defaultsView.close();
    if (ref.mounted) {
      state = state.copyWith(actorAvailable: false, current: null);
    }
  }

  void _update(
    HostManagerEventSetupDefaultsState Function(
      HostManagerEventSetupDefaultsState,
    )
    update,
  ) {
    if (_actorAvailable) state = update(state);
  }

  ManagerEventSetupDefaults? get _current => state.current;
  set _current(ManagerEventSetupDefaults? value) =>
      _update((s) => s.copyWith(current: value));
  ManagerEventSetupDefaultsUpdateRequest? get _pending => state.pending;
  set _pending(ManagerEventSetupDefaultsUpdateRequest? value) =>
      _update((s) => s.copyWith(pending: value));
  set _error(Object? value) => _update((s) => s.copyWith(error: value));
  bool get _loading => state.loading;
  set _loading(bool value) => _update((s) => s.copyWith(loading: value));
  bool get _saving => state.saving;
  set _saving(bool value) => _update((s) => s.copyWith(saving: value));
  bool get _canEdit => _actorAvailable && state.canEdit;

  /// Listens to the organizer defaults (before the journal read) and stays
  /// loading until they arrive. A missing view keeps loading; an invalid one
  /// is a typed error, and nothing is editable from it.
  Future<void> load() async {
    if (!_actorAvailable || _loading || _saving) return;
    _journalLoaded = false;
    _loading = true;
    _error = null;
    _current = null;
    _followDefaults();
    try {
      // Restore the frozen command before allowing any fresh edit.
      _pending = await _journal.load(
        userId: _userId,
        organizerId: _organizerId,
      );
    } catch (cause) {
      _error = cause;
    } finally {
      _journalLoaded = true;
      if (ref.mounted && (_current != null || state.error != null)) {
        _loading = false;
      }
    }
    // Returns once every listener has answered, loaded or not.
    await _defaultsView.firstDelivery;
  }

  void _followDefaults() => _defaultsView.follow(
    ref,
    managerEventSetupDefaultsViewProvider(_organizerId),
  );

  void _onDefaultsView(ManagerEventSetupDefaultsView view) {
    if (!_actorAvailable) return;
    if (view.sourceCoverage ==
        ManagerEventSetupDefaultsCoverage.invalidSource) {
      _onListenerError(
        ManagerEventSetupDefaultsUnavailable(
          view.sourceCoverage,
          source: view.incompleteSource,
        ),
      );
      return;
    }
    if (!view.isComplete) return;
    _current = view.defaults;
    if (_journalLoaded) _loading = false;
  }

  void _onListenerError(Object error) {
    if (!_actorAvailable) return;
    _current = null;
    _error = error;
    if (_journalLoaded) _loading = false;
  }

  Future<void> save(ManagerEventSetupPreferences next) async {
    if (!_canEdit) {
      return;
    }
    late final ManagerEventSetupDefaultsUpdateRequest request;
    try {
      request = ManagerEventSetupDefaultsUpdateRequest.forChange(
        current: _current!,
        requestId: _newRequestId(),
        next: next,
      );
    } catch (cause) {
      _error = cause;
      return;
    }
    if (request.changes.isEmpty) return;
    if (!request.isValid) {
      _error = ArgumentError.value(next, 'next');
      return;
    }
    _saving = true;
    _error = null;
    try {
      // Persist before invoking the callable, including the exact revision
      // and hash. A lost response can then be replayed after app restart.
      await _journal.save(userId: _userId, request: request);
      if (!_actorAvailable) return;
      _pending = request;
      await _sendPending(request);
      if (!_actorAvailable) return;
    } catch (cause) {
      _error = cause;
    } finally {
      _saving = false;
    }
  }

  Future<void> retryPending() async {
    if (!_actorAvailable || _saving || _loading || _pending == null) return;
    _saving = true;
    _error = null;
    try {
      await _sendPending(_pending!);
      if (!_actorAvailable) return;
    } catch (cause) {
      // Permission and precondition errors do not prove the first call did
      // not commit. Keep the identical request for a later replay.
      _error = cause;
    } finally {
      _saving = false;
    }
  }

  Future<void> _sendPending(
    ManagerEventSetupDefaultsUpdateRequest request,
  ) async {
    if (!_actorAvailable) return;
    final receipt = await _write(request);
    if (!_actorAvailable) return;
    if (receipt.current.organizerId != _organizerId ||
        receipt.appliedRevision <= request.expectedRevision) {
      throw const FormatException('Invalid manager defaults receipt');
    }
    await _journal.clear(userId: _userId, request: request);
    if (!_actorAvailable) return;
    _pending = null;
    // No reread: the command settles when the listener delivers its revision.
    final applied = receipt.appliedRevision;
    if (!_defaultsView.following) _followDefaults();
    await _defaultsView.until(
      (view) =>
          view.sourceCoverage ==
              ManagerEventSetupDefaultsCoverage.invalidSource ||
          (view.isComplete && view.defaults!.preferencesRevision >= applied),
    );
    if (!_actorAvailable) return;
    _defaultsView.latest?.requireDefaults();
    _error = null;
  }
}

String _newRequestId() {
  final random = Random.secure();
  return List<int>.generate(
    24,
    (_) => random.nextInt(256),
  ).map((value) => value.toRadixString(16).padLeft(2, '0')).join();
}
