import 'dart:convert';
import 'dart:math';

import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_storage.dart';
import 'package:crypto/crypto.dart';

enum LocalCommandStatus { pending, needsReview }

/// Domain adapters own command validation and execution. The journal owns only
/// persistence, immutable identity, dependencies and replay/conflict policy.
class LocalCommandCodec<E> {
  const LocalCommandCodec({
    required this.encode,
    required this.decode,
    required this.scope,
    required this.resources,
  });
  final Map<String, Object?> Function(E) encode;
  final E Function(Map<String, Object?>) decode;
  final String Function(E) scope;
  final Set<String> Function(E) resources;
}

class LocalCommandJournal<E> {
  LocalCommandJournal({
    required this.storage,
    required this.namespace,
    required this.codec,
    required this.currentAccountId,
    this.loadLegacy,
    this.clearLegacy,
  });

  static const _version = 2;
  static const maxEntries = 200;
  static const maxBytes = 1024 * 1024;
  static const reviewAfter = Duration(days: 7);
  static const _leaseDuration = Duration(minutes: 2);
  final Future<CommandJournalStorage> Function() storage;
  final String namespace;
  final LocalCommandCodec<E> codec;
  final String? Function() currentAccountId;
  final Future<String?> Function(String accountId)? loadLegacy;
  final Future<void> Function(String accountId)? clearLegacy;

  void _requireAccount(String accountId) {
    if (accountId.isEmpty || currentAccountId() != accountId) {
      throw const SignInRequiredException('replay saved operations');
    }
  }

  String _key(String accountId) => sha256
      .convert(utf8.encode(jsonEncode([namespace, accountId])))
      .toString();

  Future<T> _transaction<T>(
    String accountId,
    T Function(Map<String, Object?> state) change,
  ) async {
    try {
      return await (await storage()).transact(_key(accountId), change);
    } on AppException {
      rethrow;
    } on Object {
      // Never erase a damaged journal or leak command payloads in error logs.
      throw const BackendOperationException(
        code: 'local-journal-unavailable',
        message:
            'Saved operations could not be read or written. Existing '
            'records were preserved. Free device space or contact support.',
        context: BackendErrorContext(
          service: BackendService.local,
          action: 'persist command journal',
        ),
      );
    }
  }

  Future<void> _initialize(String accountId) async {
    final legacy = await loadLegacy?.call(accountId);
    final legacyHash = legacy == null
        ? null
        : sha256.convert(utf8.encode(legacy)).toString();
    final migrated = await _transaction(accountId, (state) {
      if (state['version'] == 1) {
        // Verify every old envelope before upgrading its hash. Preserve its
        // stored time, dependencies, lease and replay state without inferring
        // a new observation time from the migration clock.
        final records = _records(state, version: 1);
        for (final record in records) {
          record['hash'] = _hash(
            (record['command']! as Map).cast<String, Object?>(),
          );
        }
        state['version'] = _version;
      }
      if (state.isNotEmpty &&
          (legacy == null || state['legacyHash'] == legacyHash)) {
        return state['version'] == _version &&
            (state['quarantine'] as List?)?.isEmpty == true;
      }
      final records = state.isEmpty
          ? <Map<String, Object?>>[]
          : _records(state);
      final quarantine = <Object?>[];
      if (legacy != null) {
        try {
          final values = jsonDecode(legacy) as List<Object?>;
          for (final value in values) {
            try {
              final entry = codec.decode(
                (value! as Map).cast<String, Object?>(),
              );
              final record = _record(entry, records);
              final prior = records.where((r) => r['id'] == record['id']);
              if (prior.isEmpty) {
                records.add(record);
              } else if (prior.single['hash'] != record['hash']) {
                quarantine.add(value);
              }
            } on Object {
              quarantine.add(value);
            }
          }
        } on Object {
          quarantine.add(legacy);
        }
      }
      state.addAll({
        'version': _version,
        'legacyHash': legacyHash,
        'records': records,
        'quarantine': quarantine,
      });
      return quarantine.isEmpty;
    });
    // Delete the legacy copy only after a healthy transactional migration.
    // Failed cleanup is harmless; the version marker prevents double replay.
    if (migrated && legacy != null) {
      await clearLegacy?.call(accountId).onError<Object>((_, _) {});
    }
  }

  /// A non-destructive recovery copy of this account's original journal and
  /// legacy value. Do not initialize, migrate, parse, or replay damaged data.
  /// The caller must let the account holder choose where to save the file.
  Future<String> exportRecovery(String accountId) async {
    _requireAccount(accountId);
    try {
      // Read legacy first: a concurrent migration may copy it into the journal
      // and remove it. Reading in the opposite order could miss both copies.
      final legacy = await loadLegacy?.call(accountId);
      _requireAccount(accountId);
      final database = await storage();
      _requireAccount(accountId);
      final raw = await database.readRaw(_key(accountId));
      _requireAccount(accountId);
      return jsonEncode({
        'format': 'catch-command-journal-recovery',
        'version': 1,
        'namespace': namespace,
        'accountId': accountId,
        'exportedAtMillis': DateTime.now().millisecondsSinceEpoch,
        'journalRaw': raw,
        'legacyRaw': legacy,
      });
    } on AppException {
      rethrow;
    } on Object {
      // Database/plugin errors can contain raw payloads. Keep them out of logs.
      throw const BackendOperationException(
        code: 'local-journal-unavailable',
        message:
            'Saved operations could not be exported. Existing records '
            'were preserved. Try again or contact support.',
        context: BackendErrorContext(
          service: BackendService.local,
          action: 'export command journal',
        ),
      );
    }
  }

  List<Map<String, Object?>> _records(
    Map<String, Object?> state, {
    int version = _version,
  }) {
    if (state['version'] != version ||
        (state['quarantine']! as List).isNotEmpty) {
      throw const ValidationException(
        'Some saved operations need storage recovery. Their original data '
        'has been preserved; contact support before recording more work.',
        code: 'local-journal-quarantined',
      );
    }
    final records = (state['records']! as List)
        .map((r) => (r as Map).cast<String, Object?>())
        .toList();
    for (final record in records) {
      final command = (record['command']! as Map).cast<String, Object?>();
      final decoded = codec.decode(command);
      if (record['hash'] != _hash(command, version: version) ||
          record['id'] != command['clientOperationId'] ||
          record['scope'] != codec.scope(decoded) ||
          !{
            'pending',
            'needsReview',
            'acknowledged',
            'dismissed',
          }.contains(record['status']) ||
          record['createdAtMillis'] is! int ||
          record['createdAtMillis'] != command['createdAtMillis'] ||
          record['dependencies'] is! List ||
          record['resources'] is! List) {
        throw const FormatException('Invalid command envelope');
      }
    }
    state['records'] = records;
    return records;
  }

  String _hash(Map<String, Object?> command, {int version = _version}) {
    final immutable = Map<String, Object?>.of(command)
      ..remove('status')
      ..remove('lastErrorCode');
    // Program replay sends creation time as an observation/departure fact,
    // and every journal uses it to bound replay age. Version 2 binds it too.
    if (version == 1) immutable.remove('createdAtMillis');
    return sha256
        .convert(utf8.encode(jsonEncode(_canonical(immutable))))
        .toString();
  }

  Map<String, Object?> _record(E entry, List<Map<String, Object?>> records) {
    // JSON round-trip detaches mutable caller lists/maps before any await.
    final command =
        jsonDecode(jsonEncode(codec.encode(entry))) as Map<String, Object?>;
    codec.decode(command);
    final resources = codec.resources(entry);
    final scope = codec.scope(entry);
    final id = command['clientOperationId'];
    if (id is! String ||
        id.isEmpty ||
        scope.isEmpty ||
        command['createdAtMillis'] is! int) {
      throw const ValidationException('The operation is incomplete.');
    }
    return {
      'id': id,
      'scope': scope,
      'command': command,
      'hash': _hash(command),
      'createdAtMillis': command['createdAtMillis'],
      'lastErrorCode': command['lastErrorCode'],
      'status': command['status'] == 'needsReview' ? 'needsReview' : 'pending',
      'resources': resources.toList(),
      'dependencies': [
        for (final prior in records)
          if (prior['scope'] == scope &&
              (prior['status'] == 'pending' ||
                  prior['status'] == 'needsReview') &&
              (prior['resources']! as List).any(resources.contains))
            prior['id'],
      ],
    };
  }

  void _age(List<Map<String, Object?>> records, DateTime now) {
    for (final record in records) {
      if (record['status'] == 'pending' &&
          now.millisecondsSinceEpoch - (record['createdAtMillis']! as int) >
              reviewAfter.inMilliseconds) {
        record['status'] = 'needsReview';
        record['lastErrorCode'] = 'observation-too-old';
      }
    }
    // Only terminal commands can expire. A pending observation or conflict is
    // never pruned, and its predecessor stays available to explain the chain.
    for (final record in records.reversed.toList()) {
      final terminalAt = record['terminalAtMillis'] as int?;
      if ((record['status'] == 'acknowledged' ||
              record['status'] == 'dismissed') &&
          terminalAt != null &&
          now.millisecondsSinceEpoch - terminalAt >
              const Duration(days: 30).inMilliseconds &&
          !records.any(
            (r) => (r['dependencies']! as List).contains(record['id']),
          )) {
        records.remove(record);
      }
    }
  }

  E _decode(Map<String, Object?> record) => codec.decode({
    ...(record['command']! as Map).cast<String, Object?>(),
    'status': record['status'],
    'lastErrorCode': record['lastErrorCode'],
  });

  Future<List<E>> load(String accountId, {String? scope, DateTime? now}) async {
    _requireAccount(accountId);
    await _initialize(accountId);
    final result = await _transaction(accountId, (state) {
      final records = _records(state);
      _age(records, now ?? DateTime.now());
      return [
        for (final r in records)
          if ((scope == null || r['scope'] == scope) &&
              (r['status'] == 'pending' || r['status'] == 'needsReview'))
            _decode(r),
      ];
    });
    _requireAccount(accountId);
    return result;
  }

  Future<void> append(String accountId, E entry) async {
    _requireAccount(accountId);
    final detached = codec.decode(
      jsonDecode(jsonEncode(codec.encode(entry))) as Map<String, Object?>,
    );
    await _initialize(accountId);
    await _transaction(accountId, (state) {
      _requireAccount(accountId);
      final records = _records(state);
      _age(records, DateTime.now());
      final record = _record(detached, records);
      final prior = records.where((r) => r['id'] == record['id']);
      if (prior.isNotEmpty) {
        if (prior.single['hash'] != record['hash']) {
          throw const ValidationException(
            'This operation ID already identifies '
            'different work. Refresh before trying again.',
            code: 'operation-id-reused',
          );
        }
        return;
      }
      if (records
              .where(
                (r) => r['status'] == 'pending' || r['status'] == 'needsReview',
              )
              .length >=
          maxEntries) {
        throw const ValidationException(
          'Saved operations are full. Sync or '
          'review existing work before recording more.',
          code: 'journal-full',
        );
      }
      records.add(record);
      if (utf8.encode(jsonEncode(state)).length > maxBytes) {
        throw const ValidationException(
          'Saved operations have reached this '
          'device’s storage limit. Contact support to archive completed work.',
          code: 'journal-full',
        );
      }
    });
    _requireAccount(accountId);
  }

  Future<void> flush(
    String accountId,
    String scope,
    Future<void> Function(E) execute,
  ) async {
    _requireAccount(accountId);
    await _initialize(accountId);
    // The durable per-command lease also serializes replay across browser tabs.
    final token = List.generate(
      24,
      (_) => Random.secure().nextInt(256),
    ).join('-');
    for (var count = 0; count < maxEntries; count++) {
      _requireAccount(accountId);
      final command = await _transaction<Map<String, Object?>?>(accountId, (
        state,
      ) {
        _requireAccount(accountId);
        final records = _records(state);
        final now = DateTime.now();
        _age(records, now);
        for (final record in records) {
          if (record['scope'] != scope || record['status'] != 'pending') {
            continue;
          }
          if ((record['leaseUntil'] as int? ?? 0) >
              now.millisecondsSinceEpoch) {
            return null;
          }
          final dependencies = (record['dependencies']! as List).map(
            (id) => records.where((r) => r['id'] == id).single,
          );
          if (dependencies.any((r) => r['status'] != 'acknowledged')) {
            record['status'] = 'needsReview';
            record['lastErrorCode'] = 'dependency-needs-review';
            continue;
          }
          record['leaseToken'] = token;
          record['leaseUntil'] = now.add(_leaseDuration).millisecondsSinceEpoch;
          return Map<String, Object?>.of(record);
        }
        return null;
      });
      if (command == null) return;
      AppException? failure;
      try {
        _requireAccount(accountId);
        await execute(_decode(command));
      } on AppException catch (error) {
        failure = error;
      } on Object {
        // Unknown failures may have reached the server. Preserve the same ID
        // for a later retry; never turn a timeout into a new command.
        await _release(accountId, command['id']! as String, token);
        rethrow;
      }
      await _transaction(accountId, (state) {
        final record = _records(
          state,
        ).singleWhere((r) => r['id'] == command['id']);
        if (record['leaseToken'] != token) return;
        record.remove('leaseToken');
        record.remove('leaseUntil');
        if (failure == null) {
          record['status'] = 'acknowledged';
          record['terminalAtMillis'] = DateTime.now().millisecondsSinceEpoch;
        } else if (!failure.retryable || failure.code == 'aborted') {
          record['status'] = 'needsReview';
          record['lastErrorCode'] = failure.code;
        }
      });
      _requireAccount(accountId);
      if (failure != null && failure.retryable && failure.code != 'aborted') {
        return;
      }
    }
  }

  Future<void> _release(String accountId, String id, String token) =>
      _transaction(accountId, (state) {
        final record = _records(state).singleWhere((r) => r['id'] == id);
        if (record['leaseToken'] == token) {
          record.remove('leaseToken');
          record.remove('leaseUntil');
        }
      });

  /// Explicit operator dismissal retains the original observation for recovery.
  Future<void> dismissReview(
    String accountId,
    String scope, {
    String? commandId,
  }) async {
    _requireAccount(accountId);
    await _initialize(accountId);
    await _transaction(accountId, (state) {
      _requireAccount(accountId);
      for (final record in _records(state)) {
        if (record['scope'] == scope &&
            record['status'] == 'needsReview' &&
            (commandId == null || record['id'] == commandId)) {
          record['status'] = 'dismissed';
          record['terminalAtMillis'] = DateTime.now().millisecondsSinceEpoch;
        }
      }
    });
  }
}

Object? _canonical(Object? value) {
  if (value is Map) return _canonicalMap(value);
  if (value is List) return value.map(_canonical).toList();
  return value;
}

Map<String, Object?> _canonicalMap(Map<Object?, Object?> value) {
  final keys = value.keys.cast<String>().toList()..sort();
  return {for (final key in keys) key: _canonical(value[key])};
}
