import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_create_journal.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_inventory_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_create_state.dart';
import 'package:catch_dating_app/programs/presentation/program_timezone_providers.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_create_controller.g.dart';

typedef ProgramCreateCommand =
    Future<ProgramMutationResult> Function(
      ProgramCreateValues values,
      String requestId,
    );

/// Opaque backend or confirmation failure retained for localized rendering.
typedef ProgramCreateError = Object;

@immutable
class ProgramCreateSnapshot {
  const ProgramCreateSnapshot({
    required this.requestId,
    required this.values,
    required this.submittedValues,
    required this.programId,
  });

  final String requestId;
  final ProgramCreateValues values;
  final ProgramCreateValues? submittedValues;
  final String? programId;
}

typedef ProgramCreateSnapshotWriter =
    Future<void> Function(ProgramCreateSnapshot snapshot);

/// One immutable reading of a [ProgramCreateController], published by the
/// generated `programCreateProvider` after every change.
@immutable
class ProgramCreateView {
  const ProgramCreateView({
    required this.requestId,
    required this.values,
    required this.saving,
    required this.showErrors,
    required this.actorChanged,
    required this.confirmed,
    required this.commandPending,
    required this.programId,
    required this.confirmedRow,
    required this.error,
  });

  final String requestId;
  final ProgramCreateValues values;
  final bool saving;
  final bool showErrors;
  final bool actorChanged;
  final bool confirmed;
  final bool commandPending;
  final String? programId;
  final OrganizerProgramListRow? confirmedRow;
  final ProgramCreateError? error;

  bool get fieldsLocked => saving || commandPending || actorChanged;
}

/// Owns the program creation transaction, including confirmation. The form
/// stays mounted after failures, and a receipt retry only reads the saved ID.
/// It reports each change through `onChanged`; the generated provider turns
/// that into a new [ProgramCreateView].
class ProgramCreateController {
  factory ProgramCreateController({
    required String organizerId,
    required String requestId,
    required ProgramCreateCommand create,
    required Future<OrganizerProgramSettings> Function(String) readSaved,
    required Future<List<OrganizerProgramListRow>> Function(String)
    refreshPrograms,
    required bool Function() isActorCurrent,
    ProgramCreateValues initialValues = const ProgramCreateValues(),
    ProgramCreateValues? initialSubmittedValues,
    String? initialProgramId,
    String Function()? newRequestId,
    ProgramCreateSnapshotWriter? persist,
    Future<void> Function(String requestId)? clearPersisted,
    void Function()? onChanged,
  }) => ProgramCreateController._(
    organizerId: organizerId,
    requestId: requestId,
    create: create,
    readSaved: readSaved,
    refreshPrograms: refreshPrograms,
    isActorCurrent: isActorCurrent,
    values: initialValues,
    submittedValues: initialSubmittedValues,
    programId: initialProgramId,
    newRequestId: newRequestId ?? (() => requestId),
    persist: persist ?? _ignoreSnapshot,
    clearPersisted: clearPersisted ?? _ignoreRequestId,
    onChanged: onChanged ?? _ignoreChange,
  );

  ProgramCreateController._({
    required this.organizerId,
    required this.requestId,
    required this._create,
    required this._readSaved,
    required this._refreshPrograms,
    required this._isActorCurrent,
    required this._values,
    required this._submittedValues,
    required this._programId,
    required this._newRequestId,
    required this._persist,
    required this._clearPersisted,
    required this._onChanged,
  });

  final String organizerId;
  String requestId;
  final ProgramCreateCommand _create;
  final Future<OrganizerProgramSettings> Function(String) _readSaved;
  final Future<List<OrganizerProgramListRow>> Function(String) _refreshPrograms;
  final bool Function() _isActorCurrent;
  final String Function() _newRequestId;
  final ProgramCreateSnapshotWriter _persist;
  final Future<void> Function(String requestId) _clearPersisted;
  final void Function() _onChanged;
  ProgramCreateValues _values;
  ProgramCreateValues? _submittedValues;
  Future<void> _persistenceTail = Future<void>.value();
  bool _disposed = false;
  bool _actorChanged = false;
  bool _saving = false;
  bool _showErrors = false;
  bool _confirmed = false;
  String? _programId;
  OrganizerProgramListRow? _confirmedRow;
  ProgramCreateError? _error;

  ProgramCreateValues get values => _values;
  bool get saving => _saving;
  bool get showErrors => _showErrors;
  bool get actorChanged => _actorChanged;
  bool get confirmed => _confirmed;
  bool get commandPending => _submittedValues != null || _programId != null;
  bool get fieldsLocked => saving || commandPending || actorChanged;
  String? get programId => _programId;
  OrganizerProgramListRow? get confirmedRow => _confirmedRow;
  ProgramCreateError? get error => _error;

  ProgramCreateView get view => ProgramCreateView(
    requestId: requestId,
    values: _values,
    saving: _saving,
    showErrors: _showErrors,
    actorChanged: _actorChanged,
    confirmed: _confirmed,
    commandPending: commandPending,
    programId: _programId,
    confirmedRow: _confirmedRow,
    error: _error,
  );

  void edit(ProgramCreateValues values) {
    if (fieldsLocked || _disposed) return;
    _values = values;
    _error = null;
    _notify();
    _persistInBackground();
  }

  void invalidateActor() {
    if (_disposed || _actorChanged) return;
    _actorChanged = true;
    _notify();
  }

  bool _checkActor() {
    if (_disposed) return false;
    if (_actorChanged || !_isActorCurrent()) {
      invalidateActor();
      return false;
    }
    return true;
  }

  Future<String?> submit() async {
    if (_saving || _confirmed || !_checkActor()) return null;
    if (_programId == null &&
        _submittedValues == null &&
        _values.errors.isNotEmpty) {
      _showErrors = true;
      _notify();
      return null;
    }
    final wasCommandPending = commandPending;
    var createDispatched = false;
    _saving = true;
    _error = null;
    _notify();
    try {
      if (_programId == null) {
        _submittedValues ??= _values;
        await _persistSnapshot();
        if (!_checkActor()) return null;
        createDispatched = true;
        final receipt = await _create(_submittedValues!, requestId);
        // Retain the receipt even if the actor changed while the request ran.
        _programId = receipt.entityId;
        await _persistSnapshot();
      }
      if (!_checkActor()) return null;
      final saved = await _readSaved(_programId!);
      if (!_checkActor()) return null;
      if (saved.programId != _programId || saved.organizerId != organizerId) {
        throw const FormatException('Program confirmation changed identity');
      }
      final programs = await _refreshPrograms(_programId!);
      if (!_checkActor()) return null;
      if (!programs.any((program) => program.programId == _programId)) {
        throw const ProgramNotVisibleException();
      }
      _confirmedRow = programs.firstWhere(
        (program) => program.programId == _programId,
      );
      _confirmed = true;
      await _clearPersisted(requestId);
      return _programId;
    } catch (error) {
      if (_checkActor()) {
        _error = error;
        final freshCommandNotDispatched =
            !wasCommandPending && !createDispatched;
        if (_programId == null &&
            (freshCommandNotDispatched || _definitiveCreateRejection(error))) {
          _submittedValues = null;
          if (!freshCommandNotDispatched) requestId = _newRequestId();
          try {
            await _persistSnapshot();
          } catch (persistenceError) {
            _error = persistenceError;
          }
        }
      }
      return null;
    } finally {
      _saving = false;
      _notify();
    }
  }

  void _notify() {
    if (!_disposed) _onChanged();
  }

  void _persistInBackground() {
    unawaited(
      _persistSnapshot().onError((error, _) {
        if (!_disposed) {
          _error = error;
          _notify();
        }
      }),
    );
  }

  Future<void> _persistSnapshot() {
    final snapshot = ProgramCreateSnapshot(
      requestId: requestId,
      values: _values,
      submittedValues: _submittedValues,
      programId: _programId,
    );
    final previous = _persistenceTail;
    return _persistenceTail = () async {
      try {
        await previous;
      } catch (_) {
        // A later snapshot supersedes a failed earlier local write.
      }
      await _persist(snapshot);
    }();
  }

  /// Stops publishing changes; an in-flight submit finishes silently.
  void dispose() {
    _disposed = true;
  }
}

class ProgramNotVisibleException implements Exception {
  const ProgramNotVisibleException();
}

bool _definitiveCreateRejection(Object error) =>
    error is AppException &&
    !error.retryable &&
    const {
      'invalid-argument',
      'permission-denied',
      'unauthenticated',
      'failed-precondition',
      'already-exists',
      'validation-failed',
      'sign-in-required',
    }.contains(error.code);

Future<void> _ignoreSnapshot(ProgramCreateSnapshot _) async {}

Future<void> _ignoreRequestId(String _) async {}

void _ignoreChange() {}

/// The account and organizer a programme is created for.
typedef ProgramEventsScope = ({String accountId, String organizerId});

// keepalive: a stateless journal facade; its entries are keyed by account.
@Riverpod(keepAlive: true)
ProgramCreateJournal programCreateJournal(Ref ref) =>
    const ProgramCreateJournal();

// provider-graph: cross-feature-presentation:programCreateProvider->hostOrganizerSelectionProvider planned CAT156 -- Program creation currently watches the Host organizer selection to invalidate an in-flight account/organizer command when the actor changes. CAT156 will replace this presentation-to-presentation edge with an injected or feature-neutral actor fence while preserving draft retention, idempotency, and override contracts.
/// The programme create transaction for one account and organizer: the
/// draft, its validation, the request id and the journal that recovers a
/// lost response. Screens read the immutable [ProgramCreateView] and call
/// [edit] and [submit]; the [ProgramCreateController] it holds publishes each
/// change through this notifier.
@riverpod
class ProgramCreate extends _$ProgramCreate {
  ProgramCreateController? _controller;

  @override
  Future<ProgramCreateView> build(ProgramEventsScope scope) async {
    final repository = ref.watch(programSetupRepositoryProvider);
    final inventoryRepository = ref.watch(programInventoryRepositoryProvider);
    final journal = ref.watch(programCreateJournalProvider);
    bool isCurrent() {
      final selected = ref.read(
        hostOrganizerSelectionProvider(scope.accountId),
      );
      return ref.read(uidProvider).value == scope.accountId &&
          (selected == null || selected == scope.organizerId);
    }

    final recovered = await journal.load(
      accountId: scope.accountId,
      organizerId: scope.organizerId,
    );
    if (!ref.mounted || !isCurrent()) {
      throw const ProgramActorChangedException();
    }

    var initialValues = _createValues(recovered?.values);
    if (recovered == null) {
      // Capture the first resolved suggestion. Later preference refreshes
      // must never rebuild the controller or overwrite an in-progress draft.
      final ready = Completer<ProgramTimezoneSuggestion>();
      ref.listen(programTimezoneSuggestionProvider(scope), (_, next) {
        if (ready.isCompleted) return;
        next.when(
          data: ready.complete,
          error: ready.completeError,
          loading: () {},
        );
      }, fireImmediately: true);
      ref.onDispose(() {
        if (!ready.isCompleted) {
          ready.completeError(const ProgramActorChangedException());
        }
      });
      final suggestion = await ready.future;
      if (!ref.mounted || !isCurrent()) {
        throw const ProgramActorChangedException();
      }
      initialValues = initialValues.copyWith(
        timezone: suggestion.value.identifier,
      );
    }
    final controller = ProgramCreateController(
      organizerId: scope.organizerId,
      requestId: recovered?.requestId ?? _newProgramRequestId(),
      initialValues: initialValues,
      initialSubmittedValues: _submittedCreateValues(recovered),
      initialProgramId: recovered?.programId,
      newRequestId: _newProgramRequestId,
      persist: (snapshot) => journal.save(
        ProgramCreateJournalEntry(
          accountId: scope.accountId,
          organizerId: scope.organizerId,
          requestId: snapshot.requestId,
          values: _journalValues(snapshot.values),
          submittedValues: snapshot.submittedValues == null
              ? null
              : _journalValues(snapshot.submittedValues!),
          programId: snapshot.programId,
        ),
      ),
      clearPersisted: (requestId) => journal.clear(
        accountId: scope.accountId,
        organizerId: scope.organizerId,
        requestId: requestId,
      ),
      isActorCurrent: isCurrent,
      onChanged: _publish,
      create: (values, requestId) => inventoryRepository.create(
        organizerId: scope.organizerId,
        requestId: requestId,
        kind: values.kind!.name,
        title: values.title.trim(),
        timezone: values.timezone.trim(),
        startsAt: values.startsAt!,
        endsAt: values.endsAt!,
      ),
      readSaved: (id) async => (await repository.getProgram(id)).program,
      refreshPrograms: (id) async {
        if (!isCurrent()) throw const ProgramActorChangedException();
        // Confirmation is one authoritative inventory row, even when its
        // start precedes every row in the ordinary first page.
        final page = await inventoryRepository.listPage(
          scope.organizerId,
          programId: id,
        );
        if (!isCurrent()) throw const ProgramActorChangedException();
        return page.programs;
      },
    );
    ref.listen(uidProvider, (_, _) {
      if (!isCurrent()) controller.invalidateActor();
    });
    ref.listen(hostOrganizerSelectionProvider(scope.accountId), (_, _) {
      if (!isCurrent()) controller.invalidateActor();
    });
    ref.onDispose(() {
      controller.dispose();
      if (identical(_controller, controller)) _controller = null;
    });
    _controller = controller;
    return controller.view;
  }

  void _publish() {
    final controller = _controller;
    if (controller != null && ref.mounted) {
      state = AsyncData(controller.view);
    }
  }

  /// Replaces the draft unless the fields are locked.
  void edit(ProgramCreateValues values) => _controller?.edit(values);

  /// Creates and confirms the programme; returns its id once confirmed.
  Future<String?> submit() async => _controller?.submit();
}

ProgramCreateValues? _submittedCreateValues(ProgramCreateJournalEntry? entry) {
  final submitted = entry?.submittedValues;
  if (submitted == null) return null;
  // The original provider converted an absent command into exactly this empty
  // body. Its null kind failed before the callable could be invoked. Recover
  // only that known artifact; every other command and every receipt stays
  // locked to its original identity and body.
  if (entry!.programId == null &&
      submitted.title == '' &&
      submitted.kind == null &&
      submitted.timezone == '' &&
      submitted.startsAtMillis == null &&
      submitted.endsAtMillis == null) {
    return null;
  }
  return _createValues(submitted);
}

ProgramCreateValues _createValues(ProgramCreateJournalValues? values) {
  if (values == null) return const ProgramCreateValues();
  final kind = values.kind == null
      ? null
      : ProgramKind.values
            .where((value) => value.name == values.kind)
            .firstOrNull;
  if (values.kind != null && kind == null) {
    throw const FormatException('Invalid saved program kind');
  }
  return ProgramCreateValues(
    title: values.title,
    kind: kind,
    timezone: values.timezone,
    startsAt: _calendarDate(values.startsAtMillis),
    endsAt: _calendarDate(values.endsAtMillis),
  );
}

ProgramCreateJournalValues _journalValues(ProgramCreateValues values) =>
    ProgramCreateJournalValues(
      title: values.title,
      kind: values.kind?.name,
      timezone: values.timezone,
      startsAtMillis: _calendarMillis(values.startsAt),
      endsAtMillis: _calendarMillis(values.endsAt),
    );

int? _calendarMillis(DateTime? value) => value == null
    ? null
    : DateTime.utc(value.year, value.month, value.day).millisecondsSinceEpoch;

DateTime? _calendarDate(int? value) {
  if (value == null) return null;
  final date = DateTime.fromMillisecondsSinceEpoch(value, isUtc: true);
  return DateTime(date.year, date.month, date.day);
}

String _newProgramRequestId() {
  final random = Random.secure();
  return List.generate(
    24,
    (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
  ).join();
}

class ProgramActorChangedException implements Exception {
  const ProgramActorChangedException();
}
