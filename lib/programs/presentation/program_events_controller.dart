import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_create_journal.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_inventory_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_create_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_create_state.dart';
import 'package:catch_dating_app/programs/presentation/program_timezone_providers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

typedef ProgramEventsScope = ({String accountId, String organizerId});
typedef ProgramEventsRequest = ({
  ProgramEventsScope scope,
  String? anchorId,
  OrganizerProgramListRow? initialRow,
});
typedef ProgramInventoryRead =
    Future<OrganizerProgramInventoryPage> Function({
      String? cursor,
      String? programId,
    });
typedef ProgramInventoryRowPredicate =
    bool Function(OrganizerProgramListRow program);

/// Caps one tab-aware continuation so a sparse lifecycle never causes an
/// unbounded burst of inventory calls. A later tap may continue from the exact
/// cursor retained after this window.
const programEventsMatchingPageReadLimit = 8;

final programCreateJournalProvider = Provider<ProgramCreateJournal>(
  (ref) => const ProgramCreateJournal(),
);

final programCreateControllerProvider = FutureProvider.autoDispose
    .family<ProgramCreateController, ProgramEventsScope>((ref, scope) async {
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
          ref.invalidate(organizerProgramListProvider(scope.organizerId));
          return page.programs;
        },
      );
      ref.listen(uidProvider, (_, _) {
        if (!isCurrent()) controller.invalidateActor();
      });
      ref.listen(hostOrganizerSelectionProvider(scope.accountId), (_, _) {
        if (!isCurrent()) controller.invalidateActor();
      });
      ref.onDispose(controller.dispose);
      return controller;
    });

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

enum ProgramLifecycleAction { archive, unarchive }

/// Opaque continuation failure retained while already-loaded rows stay usable.
typedef ProgramEventsPageError = Object;

/// Both account and organizer participate in the provider identity. An exact
/// saved-ID anchor survives a route reopen without expanding the page size.
final programEventsControllerProvider = Provider.autoDispose
    .family<ProgramEventsController, ProgramEventsRequest>((ref, request) {
      final scope = request.scope;
      final repository = ref.watch(programSetupRepositoryProvider);
      final inventory = ref.watch(programInventoryRepositoryProvider);
      bool isCurrent() {
        final selected = ref.read(
          hostOrganizerSelectionProvider(scope.accountId),
        );
        return ref.read(uidProvider).value == scope.accountId &&
            (selected == null || selected == scope.organizerId);
      }

      final controller = ProgramEventsController(
        isActorCurrent: isCurrent,
        fetchPage: ({cursor, programId}) => inventory.listPage(
          scope.organizerId,
          cursor: cursor,
          programId: programId,
        ),
        anchorId: request.anchorId,
        initialRow: request.initialRow,
        mutate: (program, action) => action == ProgramLifecycleAction.archive
            ? repository.archiveProgram(
                programId: program.programId,
                expectedRevision: program.revision,
              )
            : repository.unarchiveProgram(
                programId: program.programId,
                expectedRevision: program.revision,
              ),
        onMutation: (id) {
          ref.invalidate(organizerProgramListProvider(scope.organizerId));
          ref.invalidate(organizerProgramDetailProvider(id));
        },
      );
      ref.listen(uidProvider, (_, _) {
        if (!isCurrent()) controller.invalidateActor();
      });
      ref.listen(hostOrganizerSelectionProvider(scope.accountId), (_, _) {
        if (!isCurrent()) controller.invalidateActor();
      });
      ref.onDispose(controller.dispose);
      unawaited(controller.refresh());
      return controller;
    });

class ProgramEventsController extends ChangeNotifier {
  factory ProgramEventsController({
    required bool Function() isActorCurrent,
    required ProgramInventoryRead fetchPage,
    required Future<ProgramMutationResult> Function(
      OrganizerProgramListRow,
      ProgramLifecycleAction,
    )
    mutate,
    required void Function(String) onMutation,
    String? anchorId,
    OrganizerProgramListRow? initialRow,
  }) => ProgramEventsController._(
    state: initialRow == null
        ? const CatchAsyncState.loading()
        : CatchAsyncState.data([initialRow]),
    isActorCurrent: isActorCurrent,
    fetchPage: fetchPage,
    mutate: mutate,
    onMutation: onMutation,
    anchorId: anchorId,
  );

  ProgramEventsController._({
    required this._state,
    required this._isActorCurrent,
    required this._fetchPage,
    required this._mutate,
    required this._onMutation,
    this.anchorId,
  });

  final bool Function() _isActorCurrent;
  final ProgramInventoryRead _fetchPage;
  final Future<ProgramMutationResult> Function(
    OrganizerProgramListRow,
    ProgramLifecycleAction,
  )
  _mutate;
  final void Function(String) _onMutation;
  final String? anchorId;
  final Set<String> _pending = {};
  final Set<String> _seenCursors = {};
  CatchAsyncState<List<OrganizerProgramListRow>> _state;
  bool _pageReadFailed = false;
  bool _anchorReadFailed = false;
  String? _nextCursor;
  bool _loadingMore = false;
  ProgramEventsPageError? _loadMoreError;
  int _generation = 0;
  bool _disposed = false;

  CatchAsyncState<List<OrganizerProgramListRow>> get state => _state;
  bool get hasMore => _nextCursor != null;
  bool get loadingMore => _loadingMore;
  ProgramEventsPageError? get loadMoreError => _loadMoreError;
  bool isPending(String id) => _pending.contains(id);
  bool _current(int generation) =>
      !_disposed && generation == _generation && _isActorCurrent();

  void invalidateActor() {
    if (_disposed) return;
    _generation++;
    _nextCursor = null;
    _loadingMore = false;
    _loadMoreError = null;
    _state = const CatchAsyncState.error(ProgramActorChangedException());
    notifyListeners();
  }

  Future<void> refresh() async {
    if (_disposed || !_isActorCurrent()) return;
    final generation = ++_generation;
    final oldRows = _state.value;
    _state = oldRows == null
        ? const CatchAsyncState.loading()
        : CatchAsyncState.refreshing(oldRows);
    _loadingMore = false;
    _loadMoreError = null;
    _notify();
    final rows = <OrganizerProgramListRow>[];
    Object? error;
    var pageReadFailed = false;
    var anchorReadFailed = false;
    String? cursor = _nextCursor;
    try {
      final page = await _fetchPage();
      if (!_current(generation)) return;
      rows.addAll(page.programs);
      cursor = page.nextCursor;
    } catch (failure) {
      if (!_current(generation)) return;
      error = failure;
      pageReadFailed = true;
      if (_terminalInventoryRead(failure)) {
        cursor = null;
      } else {
        rows.addAll(oldRows ?? const []);
      }
    }
    if (anchorId != null &&
        (pageReadFailed || !rows.any((row) => row.programId == anchorId))) {
      try {
        final anchor = await _fetchPage(programId: anchorId);
        if (!_current(generation)) return;
        if (anchor.programs.length != 1 ||
            anchor.programs.single.programId != anchorId) {
          throw const ProgramNotVisibleException();
        }
        rows.removeWhere((row) => row.programId == anchorId);
        rows.insert(0, anchor.programs.single);
      } catch (failure) {
        if (!_current(generation)) return;
        error ??= failure;
        anchorReadFailed = true;
        if (_terminalInventoryRead(failure)) {
          rows.removeWhere((row) => row.programId == anchorId);
        } else {
          final previous = (oldRows ?? const <OrganizerProgramListRow>[])
              .where((row) => row.programId == anchorId)
              .firstOrNull;
          if (previous != null &&
              !rows.any((row) => row.programId == anchorId)) {
            rows.insert(0, previous);
          }
        }
      }
    } else if (anchorId != null) {
      final index = rows.indexWhere((row) => row.programId == anchorId);
      rows.insert(0, rows.removeAt(index));
    }
    if (!_current(generation)) return;
    _pageReadFailed = pageReadFailed;
    _anchorReadFailed = anchorReadFailed;
    _nextCursor = cursor;
    _seenCursors.clear();
    if (cursor != null) _seenCursors.add(cursor);
    final result = List<OrganizerProgramListRow>.unmodifiable(rows);
    _state = error == null
        ? CatchAsyncState.data(result)
        : rows.isEmpty
        ? CatchAsyncState.error(error)
        : CatchAsyncState.staleData(result, error);
    _notify();
  }

  Future<void> loadMore() => _loadMore(maxPages: 1);

  Future<void> loadMoreMatching(ProgramInventoryRowPredicate matches) =>
      _loadMore(matches: matches, maxPages: programEventsMatchingPageReadLimit);

  Future<void> _loadMore({
    ProgramInventoryRowPredicate? matches,
    required int maxPages,
  }) async {
    final cursor = _nextCursor;
    if (_disposed ||
        !_isActorCurrent() ||
        _loadingMore ||
        cursor == null ||
        !_state.hasData ||
        _state.isRefreshing) {
      return;
    }
    final generation = _generation;
    _loadingMore = true;
    _loadMoreError = null;
    _notify();
    try {
      String? currentCursor = cursor;
      for (var pageIndex = 0; pageIndex < maxPages; pageIndex++) {
        final page = await _fetchPage(cursor: currentCursor);
        if (!_current(generation)) return;
        final next = page.nextCursor;
        if (next != null && !_seenCursors.add(next)) {
          throw const FormatException(
            'Program inventory cursor did not advance',
          );
        }
        // Merge repeated canonical IDs (including an anchored row later paged)
        // without merging distinct programs that happen to share a title.
        final rows = {for (final row in _state.value!) row.programId: row};
        final addedMatchingRow =
            matches != null &&
            page.programs.any(
              (row) => matches(row) && !rows.containsKey(row.programId),
            );
        for (final row in page.programs) {
          rows[row.programId] = row;
        }
        final anchorRecovered =
            _anchorReadFailed &&
            page.programs.any((row) => row.programId == anchorId);
        if (anchorRecovered) {
          _anchorReadFailed = false;
        }
        final error = _state.error;
        _state = error != null && (_pageReadFailed || _anchorReadFailed)
            ? CatchAsyncState.staleData(List.unmodifiable(rows.values), error)
            : CatchAsyncState.data(List.unmodifiable(rows.values));
        _nextCursor = next;
        currentCursor = next;
        if (matches == null || addedMatchingRow || next == null) break;
      }
    } catch (error) {
      if (_current(generation)) {
        _loadMoreError = error;
      }
    } finally {
      if (_current(generation)) {
        _loadingMore = false;
        _notify();
      }
    }
  }

  Future<bool> changeLifecycle(
    OrganizerProgramListRow program,
    ProgramLifecycleAction action,
    DateTime now,
  ) async {
    if (_disposed || !_isActorCurrent() || isPending(program.programId)) {
      return false;
    }
    if (action == ProgramLifecycleAction.unarchive &&
        !program.canUnarchiveAt(now)) {
      return false;
    }
    _pending.add(program.programId);
    _notify();
    try {
      await _mutate(program, action);
      if (_disposed || !_isActorCurrent()) return false;
      _onMutation(program.programId);
      await refresh();
      return !_disposed && _isActorCurrent();
    } finally {
      _pending.remove(program.programId);
      _notify();
    }
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _generation++;
    super.dispose();
  }
}

bool _terminalInventoryRead(Object error) => const {
  'permission-denied',
  'unauthenticated',
  'not-found',
}.contains(backendCallableErrorIdentity(error)?.code);

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
