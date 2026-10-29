import 'dart:convert';

import 'package:catch_dating_app/contexts/events/domain/event_photo_recovery.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/platform/persistence/local_command_journal.dart';

/// Media checkpoints share the command journal's transactional database. The
/// existing journal remains the replay, lease, age and immutable-ID authority.
/// An unresolved checkpoint is never subject to ordinary draft TTL or eviction.
class EventPhotoRecoveryJournal {
  EventPhotoRecoveryJournal({
    required this.storage,
    required this.currentAccountId,
    required this.currentSession,
  }) : _commands = LocalCommandJournal<EventPhotoRecovery>(
         storage: storage,
         namespace: 'event-photo-recovery-commands',
         currentAccountId: currentAccountId,
         codec: LocalCommandCodec(
           encode: (receipt) => receipt.intentJson,
           decode: EventPhotoRecovery.fromJson,
           scope: (receipt) => receipt.scope.key,
           resources: (receipt) => {'event-media:${receipt.scope.eventId}'},
         ),
       );

  final Future<CommandJournalStorage> Function() storage;
  final String? Function() currentAccountId;
  // Production supplies the existing opaque AuthenticatedSession, not its UID.
  final Object? Function() currentSession;
  final LocalCommandJournal<EventPhotoRecovery> _commands;

  EventPhotoRecoverySession captureSession(EventPhotoRecoveryScope scope) {
    final session = currentSession();
    if (session == null || currentAccountId() != scope.accountId) {
      throw const SignInRequiredException('recover event photos');
    }
    return EventPhotoRecoverySession._(session);
  }

  void requireSession(
    EventPhotoRecoveryScope scope,
    EventPhotoRecoverySession session,
  ) {
    if (currentAccountId() != scope.accountId ||
        !identical(currentSession(), session._token)) {
      throw const SignInRequiredException('recover event photos');
    }
  }

  String _key(String accountId) =>
      eventPhotoRecoveryHash(['event-photo-recovery-checkpoints', accountId]);

  Future<T> _transact<T>(
    EventPhotoRecoveryScope scope,
    T Function(Map<String, Object?> records) change,
  ) async {
    final session = captureSession(scope);
    try {
      final database = await storage();
      requireSession(scope, session);
      final result = await database.transact(_key(scope.accountId), (state) {
        requireSession(scope, session);
        return _changeRecords(state, scope, change);
      });
      requireSession(scope, session);
      return result;
    } on AppException {
      rethrow;
    } on Object {
      // Preserve damaged/uncommitted values and omit raw payloads from errors.
      throw const BackendOperationException(
        code: 'event-photo-journal-unavailable',
        message: 'Saved event photo recovery could not be read or written.',
        context: BackendErrorContext(
          service: BackendService.local,
          action: 'persist event photo recovery',
        ),
      );
    }
  }

  T _changeRecords<T>(
    Map<String, Object?> state,
    EventPhotoRecoveryScope scope,
    T Function(Map<String, Object?> records) change,
  ) {
    if (state.isEmpty) {
      state.addAll({'version': 1, 'records': <String, Object?>{}});
    }
    if (state['version'] != 1 || state['records'] is! Map) {
      throw const FormatException('Invalid event photo checkpoint journal');
    }
    final records = (state['records']! as Map).cast<String, Object?>();
    for (final entry in records.entries) {
      final receipt = _decode(entry.value);
      if (receipt.scope.accountId != scope.accountId ||
          receipt.scope.key != entry.key) {
        throw const FormatException('Event photo checkpoint scope changed');
      }
    }
    final value = change(records);
    state['records'] = records;
    if (utf8.encode(jsonEncode(state)).length > LocalCommandJournal.maxBytes) {
      throw const ValidationException(
        'Saved photo recovery has reached this device’s storage limit.',
        code: 'journal-full',
      );
    }
    return value;
  }

  /// Issue before create while this account/session is current. The returned
  /// capability may only retain this exact acknowledged identity, even if the
  /// acknowledgement arrives after sign-out. It cannot read records, register
  /// commands, publish UI state, upload, attach, or delete media.
  Future<Future<void> Function()> prepareCommittedRetention(
    EventPhotoRecovery initial,
  ) async {
    _validateInitial(initial);
    final session = captureSession(initial.scope);
    final database = await storage();
    requireSession(initial.scope, session);
    final key = _key(initial.scope.accountId);
    Future<void>? writing;
    var retained = false;
    return () async {
      if (retained) return;
      if (writing case final pending?) return pending;
      final attempt = database.transact<void>(key, (state) {
        _changeRecords(state, initial.scope, (records) {
          _retainRecord(records, initial);
        });
      });
      writing = attempt;
      try {
        await attempt;
        retained = true;
      } finally {
        writing = null;
      }
    };
  }

  EventPhotoRecovery _decode(Object? value) {
    final envelope = (value! as Map).cast<String, Object?>();
    final json = (envelope['receipt']! as Map).cast<String, Object?>();
    final receipt = EventPhotoRecovery.fromJson(json);
    if (envelope['hash'] != eventPhotoRecoveryHash(receipt.toJson())) {
      throw const FormatException('Event photo checkpoint integrity changed');
    }
    return receipt;
  }

  Map<String, Object?> _encode(EventPhotoRecovery receipt) => {
    'receipt': receipt.toJson(),
    'hash': eventPhotoRecoveryHash(receipt.toJson()),
  };

  Future<EventPhotoRecovery?> load(EventPhotoRecoveryScope scope) => _transact(
    scope,
    (records) =>
        records[scope.key] == null ? null : _decode(records[scope.key]),
  );

  Future<List<EventPhotoRecovery>> pendingForOrganizer({
    required String accountId,
    required String organizerId,
    bool includeResolved = false,
  }) => _transact(
    EventPhotoRecoveryScope(
      accountId: accountId,
      organizerId: organizerId,
      eventId: 'inventory',
    ),
    (records) => [
      for (final value in records.values)
        if (_decode(value) case final receipt
            when receipt.scope.organizerId == organizerId &&
                (includeResolved || !receipt.isResolved))
          receipt,
    ],
  );

  /// Persist committed event identity before any upload. A crash before command
  /// registration still leaves the checkpoint discoverable on reentry.
  Future<EventPhotoRecovery> retain(EventPhotoRecovery initial) async {
    final session = captureSession(initial.scope);
    _validateInitial(initial);
    final receipt = await _transact(
      initial.scope,
      (records) => _retainRecord(records, initial),
    );
    requireSession(initial.scope, session);
    await _commands.append(initial.scope.accountId, initial);
    requireSession(initial.scope, session);
    return receipt;
  }

  void _validateInitial(EventPhotoRecovery initial) {
    if (initial.revision != 0 ||
        initial.uploadAttempt != 0 ||
        initial.phase != EventPhotoRecoveryPhase.uploading ||
        initial.uploads.isNotEmpty ||
        initial.cleanupPaths.isNotEmpty ||
        initial.abandonedUploads.isNotEmpty) {
      throw const ValidationException(
        'Photo recovery must start with its saved event.',
      );
    }
  }

  EventPhotoRecovery _retainRecord(
    Map<String, Object?> records,
    EventPhotoRecovery initial,
  ) {
    final value = records[initial.scope.key];
    if (value != null) {
      final current = _decode(value);
      if (jsonEncode(current.intentJson) != jsonEncode(initial.intentJson)) {
        _conflict();
      }
      return current;
    }
    if (records.length >= LocalCommandJournal.maxEntries) {
      throw const ValidationException(
        'Resolve saved photo recovery before adding more.',
        code: 'journal-full',
      );
    }
    records[initial.scope.key] = _encode(initial);
    return initial;
  }

  /// Compare the complete prior receipt as well as its local revision. A late
  /// upload/cleanup acknowledgement can never replace a newer recovery result.
  Future<EventPhotoRecovery> checkpoint(
    EventPhotoRecovery expected,
    EventPhotoRecovery next,
  ) => _transact(expected.scope, (records) {
    final current = records[expected.scope.key];
    if (current == null ||
        jsonEncode(_decode(current).toJson()) !=
            jsonEncode(expected.toJson())) {
      _staleProgress();
    }
    expected.validateSuccessor(next);
    records[expected.scope.key] = _encode(next);
    return next;
  });

  /// A different selection gets a new immutable request only after the old
  /// request is proven unsent and every owned object is settled and cleaned.
  /// Acknowledge its shared command first, then atomically replace the local
  /// receipt: a crash at either boundary always retains the committed event.
  Future<EventPhotoRecovery> replaceUnsent(
    EventPhotoRecovery expected,
    EventPhotoRecovery replacement,
  ) async {
    final session = captureSession(expected.scope);
    _validateInitial(replacement);
    if (expected.phase != EventPhotoRecoveryPhase.uploadFailed ||
        expected.uploads.isNotEmpty ||
        expected.cleanupPaths.isNotEmpty ||
        expected.abandonedUploads.isNotEmpty ||
        expected.scope != replacement.scope ||
        expected.requestId == replacement.requestId ||
        expected.expectedMediaHash != replacement.expectedMediaHash ||
        expected.sourceDraftId != replacement.sourceDraftId) {
      _conflict();
    }
    try {
      await _commands.flush(expected.scope.accountId, expected.scope.key, (
        command,
      ) async {
        try {
          requireSession(expected.scope, session);
          final current = await load(expected.scope);
          requireSession(expected.scope, session);
          if (command.requestId != expected.requestId ||
              jsonEncode(current?.toJson()) != jsonEncode(expected.toJson())) {
            _staleProgress();
          }
        } on SignInRequiredException {
          throw const _PhotoRecoverySessionChanged();
        }
      });
    } on _PhotoRecoverySessionChanged {
      throw const SignInRequiredException('recover event photos');
    }
    requireSession(expected.scope, session);
    final pending = await _commands.load(
      expected.scope.accountId,
      scope: expected.scope.key,
    );
    requireSession(expected.scope, session);
    if (pending.isNotEmpty) _staleProgress();
    await _transact(expected.scope, (records) {
      if (jsonEncode(_decode(records[expected.scope.key]).toJson()) !=
          jsonEncode(expected.toJson())) {
        _staleProgress();
      }
      records[expected.scope.key] = _encode(replacement);
    });
    requireSession(expected.scope, session);
    return retain(replacement);
  }

  /// A terminal uploader may settle only its own abandoned object. Merge this
  /// fact against the latest snapshot without reviving its stale progress.
  /// A terminal result and active progress commit together, so another late
  /// settlement cannot make this upload's acknowledgement stale. Null means
  /// another replay abandoned the upload and only its cleanup fact was merged.
  Future<EventPhotoRecovery?> settleUpload(
    EventPhotoRecovery uploading,
    EventPhotoRecoveryUpload? uploaded,
  ) => _transact(uploading.scope, (records) {
    final current = _decode(records[uploading.scope.key]);
    if (current.requestId != uploading.requestId ||
        uploading.uploadingMediaId == null) {
      _conflict();
    }
    final path = uploading.pathFor(uploading.uploadingMediaId!);
    if (current.abandonedUploads.containsKey(path)) {
      final next = current.next(
        abandonedUploads: {...current.abandonedUploads, path: true},
        uploadingMediaId: current.uploadingMediaId,
      );
      current.validateSuccessor(next);
      records[uploading.scope.key] = _encode(next);
      return null;
    }
    if (current.phase != EventPhotoRecoveryPhase.uploading ||
        current.uploadAttempt != uploading.uploadAttempt ||
        current.uploadingMediaId != uploading.uploadingMediaId ||
        jsonEncode(current.intentJson) != jsonEncode(uploading.intentJson)) {
      _staleProgress();
    }
    final next = uploaded == null
        ? current.next(
            phase: EventPhotoRecoveryPhase.cleanupPending,
            cleanupPaths: [
              for (final photo in current.uploads) photo.storagePath,
              path,
            ],
          )
        : current.next(uploads: [...current.uploads, uploaded]);
    current.validateSuccessor(next);
    records[uploading.scope.key] = _encode(next);
    return next;
  });

  /// Reuse durable replay leases across controllers/tabs. Returning without a
  /// completed receipt retains the original command for an explicit retry.
  Future<void> replay(
    EventPhotoRecoveryScope scope,
    Future<void> Function(EventPhotoRecovery receipt) execute,
  ) async {
    final session = captureSession(scope);
    final saved = await load(scope);
    requireSession(scope, session);
    if (saved == null) return;
    await _commands.append(scope.accountId, saved);
    requireSession(scope, session);
    final commands = await _commands.load(scope.accountId, scope: scope.key);
    requireSession(scope, session);
    if (commands.any((command) => command.requiresReview)) {
      throw const ValidationException(
        'Saved event photos need review before retrying.',
        code: 'event-photo-review-required',
      );
    }
    try {
      await _commands.flush(scope.accountId, scope.key, (command) async {
        try {
          requireSession(scope, session);
          final current = await load(scope);
          requireSession(scope, session);
          if (current == null || current.requestId != command.requestId) {
            _conflict();
          }
          if (!current.isResolved) {
            await execute(current);
          }
          requireSession(scope, session);
          final resolved = await load(scope);
          requireSession(scope, session);
          if (resolved?.isResolved != true) {
            throw const BackendOperationException(
              code: 'event-photo-recovery-pending',
              message:
                  'The event is saved. Its photo recovery is still pending.',
              context: BackendErrorContext(
                service: BackendService.local,
                action: 'recover event photos',
              ),
              retryable: true,
            );
          }
        } on SignInRequiredException {
          // A replaced session interrupts replay without turning recoverable
          // work into a permanent domain conflict. The shared journal releases
          // its lease on this non-AppException, preserving the original ID.
          throw const _PhotoRecoverySessionChanged();
        }
      });
    } on _PhotoRecoverySessionChanged {
      throw const SignInRequiredException('recover event photos');
    }
    requireSession(scope, session);
  }

  /// Explicit acknowledgement after replay completed. Unresolved commands and
  /// late acknowledgements cannot erase a newer request on the same event.
  Future<void> forgetCompleted(EventPhotoRecovery expected) async {
    final session = captureSession(expected.scope);
    final pending = await _commands.load(
      expected.scope.accountId,
      scope: expected.scope.key,
    );
    requireSession(expected.scope, session);
    if (!expected.isResolved || pending.isNotEmpty) {
      throw const ValidationException(
        'Resolve the saved photo command before dismissing it.',
      );
    }
    await _transact(expected.scope, (records) {
      final current = records[expected.scope.key];
      if (current == null ||
          jsonEncode(_decode(current).toJson()) !=
              jsonEncode(expected.toJson())) {
        _conflict();
      }
      records.remove(expected.scope.key);
    });
    requireSession(expected.scope, session);
  }

  Never _conflict() => throw const ValidationException(
    'Saved event photo recovery changed. Reopen it before retrying.',
    code: 'event-photo-recovery-conflict',
  );

  Never _staleProgress() => throw const BackendOperationException(
    code: 'event-photo-progress-changed',
    message: 'Saved photo recovery changed. Retry its latest progress.',
    context: BackendErrorContext(
      service: BackendService.local,
      action: 'recover event photos',
    ),
    retryable: true,
  );
}

class _PhotoRecoverySessionChanged implements Exception {
  const _PhotoRecoverySessionChanged();
}

/// Captures one opaque session without admitting arbitrary objects as tokens.
class EventPhotoRecoverySession {
  const EventPhotoRecoverySession._(this._token);
  final Object _token;
}
