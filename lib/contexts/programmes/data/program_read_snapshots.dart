import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/platform/errors/app_error_context.dart';
import 'package:catch_dating_app/platform/persistence/async_keyed_lock.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'program_read_snapshots.g.dart';

/// A callable response cached for offline cold starts. `data` is the raw
/// response payload, reparsed by the same `fromCallableData` readers the
/// live path uses.
class ProgramReadSnapshot {
  const ProgramReadSnapshot({required this.data, required this.savedAt});

  final Object? data;
  final DateTime savedAt;
}

/// Scoped read cache for the airport surface. Snapshots are keyed by
/// account + scope (work access, roster, transport plan per station) so a
/// greeter who loses connectivity mid-shift still sees the last roster —
/// always rendered with its capture timestamp, never presented as live.
abstract interface class ProgramReadSnapshotStore {
  static const maxAge = Duration(hours: 24);

  /// Returns the accepted authority generation, or null for a stale response.
  /// Persistence failure does not invalidate an otherwise current live read.
  Future<int?> save(
    String accountId,
    String scope,
    Object? data, {
    int? expectedGeneration,
  });
  int generation(String accountId, String programId);

  /// Subscribe to this account/program's authority changes; return unsubscribe.
  void Function() listenToGeneration(
    String accountId,
    String programId,
    void Function() onChange,
  );
  Future<void> clearProgram(String accountId, String programId);
  Future<void> clearAccount(String accountId);
  Future<ProgramReadSnapshot?> load(String accountId, String scope);
}

class SharedPreferencesProgramReadSnapshotStore
    implements ProgramReadSnapshotStore {
  SharedPreferences? _preferences;
  final _lock = AsyncKeyedLock();
  final _generations = <String, int>{};
  final _blockedPrograms = <String>{};
  final _generationListeners = <String, Set<void Function()>>{};

  @override
  int generation(String accountId, String programId) =>
      _generations.putIfAbsent('$accountId:$programId', () => 0);

  @override
  void Function() listenToGeneration(
    String accountId,
    String programId,
    void Function() onChange,
  ) {
    generation(accountId, programId);
    final key = '$accountId:$programId';
    final listeners = _generationListeners.putIfAbsent(key, () => {});
    listeners.add(onChange);
    var cancelled = false;
    return () {
      if (cancelled) return;
      cancelled = true;
      listeners.remove(onChange);
      if (listeners.isEmpty) _generationListeners.remove(key);
    };
  }

  int _advanceGeneration(String key) {
    final next = (_generations[key] ?? 0) + 1;
    _generations[key] = next;
    for (final listener
        in _generationListeners[key]?.toList() ?? <void Function()>[]) {
      listener();
    }
    return next;
  }

  @override
  Future<void> clearAccount(String accountId) {
    for (final key in _generations.keys.toList()) {
      if (key.startsWith('$accountId:')) {
        _blockedPrograms.add(key);
        _advanceGeneration(key);
      }
    }
    return _lock.run(accountId, () async {
      await (await _prefs).remove('$_keyPrefix$accountId');
    });
  }

  @override
  Future<void> clearProgram(String accountId, String programId) {
    final key = '$accountId:$programId';
    _blockedPrograms.add(key);
    _advanceGeneration(key);
    return _lock.run(accountId, () async {
      final prefs = await _prefs;
      final entries = _decode(prefs.getString('$_keyPrefix$accountId'));
      entries.removeWhere((scope, _) => _programId(scope) == programId);
      await prefs.setString('$_keyPrefix$accountId', jsonEncode(entries));
    });
  }

  String _programId(String scope) => scope.split(':').elementAtOrNull(1) ?? '';

  static const _keyPrefix = 'program_read_snapshots_v2_';
  static const _maxScopes = 30;

  Future<SharedPreferences> get _prefs async {
    final cached = _preferences;
    if (cached != null) return cached;
    final loaded = await withAppErrorContext(
      SharedPreferences.getInstance,
      context: const AppErrorContext(
        operation: AppOperation.localPersistence,
        action: 'open program read snapshot cache',
        resource: 'shared_preferences',
      ),
    );
    // Old entries did not preserve independent duty deadlines.
    for (final key in loaded.getKeys()) {
      if (key.startsWith('program_read_snapshots_v1_')) {
        await loaded.remove(key);
      }
    }
    _preferences = loaded;
    return loaded;
  }

  @override
  Future<int?> save(
    String accountId,
    String scope,
    Object? data, {
    int? expectedGeneration,
  }) => _lock.run(accountId, () async {
    if (data == null) return null;
    final prefs = await _prefs;
    final key = '$_keyPrefix$accountId';
    final programId = _programId(scope);
    if (expectedGeneration != null &&
        expectedGeneration != generation(accountId, programId)) {
      return null;
    }
    var acceptedGeneration = generation(accountId, programId);
    if (_blockedPrograms.contains('$accountId:$programId') &&
        scope != programSnapshotScope('work', programId)) {
      return acceptedGeneration;
    }
    final entries = _decode(prefs.getString(key));
    if (scope == programSnapshotScope('work', programId) &&
        _authority(entries[scope]?['data']) != _authority(data)) {
      // A fresh narrower bootstrap must never authorize an older broad roster.
      _blockedPrograms.add('$accountId:$programId');
      entries.removeWhere((key, _) => _programId(key) == programId);
      acceptedGeneration = _advanceGeneration('$accountId:$programId');
    }
    final cutoff = DateTime.now()
        .subtract(ProgramReadSnapshotStore.maxAge)
        .millisecondsSinceEpoch;
    entries.removeWhere(
      (_, entry) =>
          entry['savedAtMillis'] is! int ||
          (entry['savedAtMillis']! as int) < cutoff,
    );
    entries[scope] = {
      'data': data,
      'savedAtMillis': DateTime.now().millisecondsSinceEpoch,
    };
    if (entries.length > _maxScopes) {
      final ordered = entries.entries.toList()
        ..sort(
          (a, b) => (a.value['savedAtMillis']! as int).compareTo(
            b.value['savedAtMillis']! as int,
          ),
        );
      while (ordered.length > _maxScopes) {
        entries.remove(ordered.removeAt(0).key);
      }
    }
    final saved = await prefs
        .setString(key, jsonEncode(entries))
        .onError<Object>((_, _) => false);
    if (saved && acceptedGeneration == generation(accountId, programId)) {
      if (scope == programSnapshotScope('work', programId)) {
        _blockedPrograms.remove('$accountId:$programId');
      }
    }
    return acceptedGeneration;
  });

  @override
  Future<ProgramReadSnapshot?> load(String accountId, String scope) async {
    final prefs = await _prefs;
    if (_blockedPrograms.contains('$accountId:${_programId(scope)}')) {
      return null;
    }
    final entry = _decode(prefs.getString('$_keyPrefix$accountId'))[scope];
    if (entry == null) return null;
    final savedAtMillis = entry['savedAtMillis'];
    if (!entry.containsKey('data') || savedAtMillis is! int) return null;
    final savedAt = DateTime.fromMillisecondsSinceEpoch(savedAtMillis);
    final age = DateTime.now().difference(savedAt);
    if (age.isNegative || age >= ProgramReadSnapshotStore.maxAge) return null;
    return ProgramReadSnapshot(data: entry['data'], savedAt: savedAt);
  }

  String? _authority(Object? data) {
    if (data is! Map) return null;
    return jsonEncode([
      data['organizerId'],
      data['actorRole'],
      data['duties'],
      data['grantExpiresAtMillis'],
    ]);
  }

  Map<String, Map<String, Object?>> _decode(String? raw) {
    if (raw == null) return {};
    try {
      final decoded = jsonDecode(raw) as Map<Object?, Object?>;
      return decoded.map(
        (scope, entry) => MapEntry(
          scope! as String,
          (entry! as Map<Object?, Object?>).cast<String, Object?>(),
        ),
      );
    } on Object {
      return {};
    }
  }
}

/// The Firestore scope a snapshot covers: work access, a station roster or
/// a station transport plan.
String programSnapshotScope(
  String kind,
  String programId, [
  String? stationId,
]) => stationId == null ? '$kind:$programId' : '$kind:$programId:$stationId';

// keepalive: shares the SharedPreferences instance with the outbox store's
// lifecycle so cold-start reads don't race instance creation.
@Riverpod(keepAlive: true)
ProgramReadSnapshotStore programReadSnapshotStore(Ref ref) {
  final store = SharedPreferencesProgramReadSnapshotStore();
  ref.listen(uidProvider, (previous, next) {
    if (next.isLoading) return;
    final previousId = previous?.asData?.value;
    if (previousId != null && previousId != next.asData?.value) {
      unawaited(store.clearAccount(previousId).onError<Object>((_, _) {}));
    }
  });
  return store;
}

/// A modal can pin its opening generation and hide captured data on change.
@riverpod
int programAuthorityGeneration(Ref ref, String accountId, String programId) {
  final store = ref.watch(programReadSnapshotStoreProvider);
  final cancel = store.listenToGeneration(accountId, programId, () {
    if (ref.mounted) ref.invalidateSelf(asReload: true);
  });
  ref.onDispose(cancel);
  return store.generation(accountId, programId);
}
