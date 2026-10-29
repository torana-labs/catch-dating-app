import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_journal.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_manager_event_setup_defaults_controller.freezed.dart';
part 'host_manager_event_setup_defaults_controller.g.dart';

typedef ReadManagerEventSetupDefaults =
    Future<ManagerEventSetupDefaults> Function(String organizerId);
typedef WriteManagerEventSetupDefaults =
    Future<ManagerEventSetupDefaultsUpdateReceipt> Function(
      ManagerEventSetupDefaultsUpdateRequest request,
    );

/// A manager session can have only one unresolved defaults update per club.
/// An error after send never rotates its request ID or changes its body.
class HostManagerEventSetupDefaultsDependencies {
  const HostManagerEventSetupDefaultsDependencies({
    required this.read,
    required this.write,
    this.currentUserId,
    this.journal = const ManagerEventSetupDefaultsJournal(),
  });
  final ReadManagerEventSetupDefaults read;
  final WriteManagerEventSetupDefaults write;
  final String? Function()? currentUserId;
  final ManagerEventSetupDefaultsJournal journal;
}

@riverpod
HostManagerEventSetupDefaultsDependencies
hostManagerEventSetupDefaultsDependencies(Ref ref) {
  final functions = ref.watch(firebaseFunctionsProvider);
  return HostManagerEventSetupDefaultsDependencies(
    read: ManagerEventSetupDefaultsRepository(functions).get,
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
  @override
  HostManagerEventSetupDefaultsState build(
    ({String userId, String organizerId}) scope,
  ) {
    ref.watch(hostManagerEventSetupDefaultsDependenciesProvider);
    ref.listen(uidProvider, (_, next) {
      if (next.asData?.value != scope.userId) invalidateActor();
    });
    return const HostManagerEventSetupDefaultsState();
  }

  HostManagerEventSetupDefaultsDependencies get _dependencies =>
      ref.read(hostManagerEventSetupDefaultsDependenciesProvider);
  String get _userId => scope.userId;
  String get _organizerId => scope.organizerId;

  ReadManagerEventSetupDefaults get _read => _dependencies.read;
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
  Future<void> load() async {
    if (!_actorAvailable || _loading || _saving) return;
    _loading = true;
    _error = null;
    // A failed fresh authority read must not leave the prior snapshot editable.
    _current = null;
    try {
      // Restore the frozen command before allowing any fresh edit.
      _pending = await _journal.load(
        userId: _userId,
        organizerId: _organizerId,
      );
      if (!_actorAvailable) return;
      _current = await _read(_organizerId);
      if (!_actorAvailable) return;
      if (_current!.organizerId != _organizerId) {
        throw const FormatException('Manager defaults identity changed');
      }
    } catch (cause) {
      _error = cause;
    } finally {
      _loading = false;
    }
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
    _current = receipt.current;
    _pending = null;
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
