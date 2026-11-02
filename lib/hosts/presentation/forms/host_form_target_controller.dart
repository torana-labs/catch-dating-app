part of 'host_forms_controller.dart';

mixin _HostFormEditorTargetMixin on _$HostFormEditorController {
  Timer? _saveTimer;
  bool _saveRunning = false;
  String? _targetMutationAccountId;
  String? _editorAccountId;
  int _reloadSerial = 0;

  int get _generation;
  set _generation(int value);
  List<HostFormDefinition> get _undoStack;
  List<HostFormDefinition> get _redoStack;
  void _mutate(
    HostFormDefinition Function(HostFormDefinition definition) transform,
  );
  Future<void> reload() async {
    if (!ref.mounted) return;
    _saveTimer?.cancel();
    final serial = ++_reloadSerial;
    _generation++;
    _targetMutationAccountId = null;
    _editorAccountId = null;
    _undoStack.clear();
    _redoStack.clear();
    state = const AsyncLoading();
    // The old request now has a superseded serial and cannot update state.
    // Let it finish before reading the authoritative draft revision.
    if (!await _awaitSaveIdle(serial)) return;
    final accountId = _settledAccountId();
    final result = await AsyncValue.guard(() async {
      if (accountId == null) {
        throw StateError('The Host account is not ready.');
      }
      final editor = await ref
          .read(hostFormsRepositoryProvider)
          .getEditor(organizerId: organizerId, formId: formId);
      if (!ref.mounted || _settledAccountId() != accountId) {
        throw StateError('The Host account changed while loading the form.');
      }
      return HostFormEditorState(editor: editor);
    });
    if (!ref.mounted || serial != _reloadSerial) return;
    if (_settledAccountId() != accountId) {
      state = AsyncError<HostFormEditorState>(
        StateError('The Host account changed while loading the form.'),
        StackTrace.current,
      );
      return;
    }
    _editorAccountId = result.hasValue ? accountId : null;
    state = result;
  }

  Future<bool> _awaitSaveIdle(int serial) async {
    while (_saveRunning && ref.mounted && serial == _reloadSerial) {
      await Future<void>.delayed(CatchMotion.fast);
    }
    return ref.mounted && serial == _reloadSerial;
  }

  void _scheduleSave() {
    _saveTimer?.cancel();
    _saveTimer = Timer(CatchMotion.searchDebounce, () => unawaited(saveNow()));
  }

  String? _settledAccountId() {
    if (!ref.mounted) return null;
    final uid = catchAsyncStateFromAsyncValue(ref.read(uidProvider));
    if (!uid.isSettledData || uid.value == null) return null;
    return ref.read(firebaseAuthProvider).currentUser?.uid == uid.value
        ? uid.value
        : null;
  }

  String? _watchedAccountId() {
    final uid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    if (!uid.isSettledData || uid.value == null) return null;
    return ref.read(firebaseAuthProvider).currentUser?.uid == uid.value
        ? uid.value
        : null;
  }

  bool editorBoundTo(String? accountId) =>
      accountId != null &&
      _editorAccountId == accountId &&
      _settledAccountId() == accountId;

  Future<HostOfferEventTargetPage> listTargetEvents({String? cursor}) {
    if (!editorBoundTo(_editorAccountId)) {
      return Future.error(StateError('The form editor account changed.'));
    }
    return CallableHostOfferEventTargetsGateway(
      ref.read(firebaseFunctionsProvider),
    ).list(organizerId: organizerId, cursor: cursor);
  }

  void updateTarget({
    required HostFormTargetKind kind,
    required String accountId,
    String? eventId,
  }) {
    if (!_currentTargetActor(accountId)) return;
    final current = state.asData?.value;
    if (current == null || current.operationInProgress) return;
    final next = current.editor.definition.withTarget(
      kind: kind,
      eventId: eventId,
    );
    if (identical(next, current.editor.definition)) return;
    _targetMutationAccountId = accountId;
    _mutate((_) => next);
  }

  bool _currentTargetActor(String accountId) => editorBoundTo(accountId);

  Future<bool> saveNow() async {
    if (!ref.mounted) return false;
    _saveTimer?.cancel();
    final editorAccountId = _editorAccountId;
    if (!editorBoundTo(editorAccountId)) {
      await reload();
      return false;
    }
    if (_saveRunning) {
      while (_saveRunning && ref.mounted) {
        await Future<void>.delayed(CatchMotion.fast);
      }
      if (!ref.mounted || !editorBoundTo(editorAccountId)) return false;
      if (_targetMutationAccountId case final accountId?) {
        if (!_currentTargetActor(accountId)) {
          await reload();
          return false;
        }
      }
      return state.asData?.value.saveState == HostFormSaveState.saved;
    }
    if (_targetMutationAccountId case final accountId?) {
      if (!_currentTargetActor(accountId)) {
        await reload();
        return false;
      }
    }
    final current = state.asData?.value;
    if (current == null) return false;
    if (current.saveState == HostFormSaveState.saved) return true;
    _saveRunning = true;
    var reloadAfterSave = false;
    final generation = _generation;
    final reloadSerial = _reloadSerial;
    final targetMutationAccountId = _targetMutationAccountId;
    final definition = current.editor.definition;
    final expectedRevision = current.editor.form.draftRevision;
    state = AsyncData(
      current.copyWith(saveState: HostFormSaveState.saving, clearError: true),
    );
    try {
      final saved = await ref
          .read(hostFormsRepositoryProvider)
          .updateDraft(
            organizerId: organizerId,
            formId: formId,
            expectedRevision: expectedRevision,
            definition: definition,
          );
      if (!ref.mounted) return false;
      // A newer reload owns state. Never refresh over edits made since it.
      if (reloadSerial != _reloadSerial) return false;
      if (!editorBoundTo(editorAccountId)) {
        reloadAfterSave = true;
        return false;
      }
      if (targetMutationAccountId != null &&
          !_currentTargetActor(targetMutationAccountId)) {
        reloadAfterSave = true;
        return false;
      }
      final latest = state.asData?.value;
      if (latest == null) return false;
      if (generation == _generation) {
        // Undo and redo remain bound to this editor's account until reload.
        state = AsyncData(
          latest.copyWith(
            editor: saved,
            saveState: HostFormSaveState.saved,
            clearError: true,
          ),
        );
      } else {
        state = AsyncData(
          latest.copyWith(
            editor: latest.editor.copyWith(form: saved.form),
            saveState: HostFormSaveState.dirty,
            clearError: true,
          ),
        );
        _scheduleSave();
      }
      return generation == _generation;
    } on Object catch (error) {
      if (!ref.mounted) return false;
      // A newer reload owns state. Never refresh over edits made since it.
      if (reloadSerial != _reloadSerial) return false;
      if (!editorBoundTo(editorAccountId)) {
        reloadAfterSave = true;
        return false;
      }
      if (targetMutationAccountId != null &&
          !_currentTargetActor(targetMutationAccountId)) {
        reloadAfterSave = true;
        return false;
      }
      final latest = state.asData?.value ?? current;
      final conflict = error is AppException && error.code == 'aborted';
      state = AsyncData(
        latest.copyWith(
          saveState: conflict
              ? HostFormSaveState.conflict
              : HostFormSaveState.failed,
          error: error,
        ),
      );
      return false;
    } finally {
      _saveRunning = false;
      if (reloadAfterSave && ref.mounted && reloadSerial == _reloadSerial) {
        unawaited(reload());
      }
    }
  }
}

typedef HostFormTargetPageLoader =
    Future<HostOfferEventTargetPage> Function({
      required String organizerId,
      String? cursor,
    });

// provider-graph: ownership-listenable:HostFormTargetController:reactive-state planned CAT156 -- HostFormTargetController is a verified existing business-state Listenable owner (the EventPreferencesEditorController entry is the shared abstract base). Migrate its manual loaded/operation/error publication to an immutable generated owner in the bounded CAT156 slice, preserving identity, cancellation, in-flight deduplication and any journal/idempotency guarantees.
/// Keeps the event picker bound to one manager and organizer. A late page from
/// a previous account cannot become a selectable target in this controller.
class HostFormTargetController extends ChangeNotifier {
  HostFormTargetController({
    required this.organizerId,
    required this.accountId,
    required this.loadPage,
    required this.currentAccountId,
  });

  final String organizerId;
  final String accountId;
  final HostFormTargetPageLoader loadPage;
  final String? Function() currentAccountId;

  List<HostOfferEventTarget> _events = const [];
  String? _nextCursor;
  Object? _error;
  bool _loaded = false;
  bool _loading = false;
  bool _disposed = false;
  int _generation = 0;
  final Set<String> _seenCursors = {};

  List<HostOfferEventTarget> get events => _events;
  bool get hasLoadFailure => _error != null;
  bool get loaded => _loaded;
  bool get loading => _loading;
  bool get canLoadMore => _nextCursor != null && !_loading;
  bool get isCurrentAccount => !_disposed && currentAccountId() == accountId;

  HostOfferEventTarget? event(String eventId) {
    for (final value in _events) {
      if (value.eventId == eventId) return value;
    }
    return null;
  }

  bool bindingUnavailable(String eventId) =>
      _loaded &&
      !_loading &&
      _error == null &&
      _nextCursor == null &&
      event(eventId) == null;

  Future<void> refresh() => _fetch(cursor: null);

  Future<void> loadMore() async {
    final cursor = _nextCursor;
    if (cursor == null || _loading) return;
    await _fetch(cursor: cursor);
  }

  Future<void> _fetch({required String? cursor}) async {
    if (!isCurrentAccount || _loading) return;
    final generation = ++_generation;
    _loading = true;
    _error = null;
    if (cursor == null) {
      _seenCursors.clear();
      _events = const [];
      _nextCursor = null;
      _loaded = false;
    }
    notifyListeners();
    try {
      final page = await loadPage(organizerId: organizerId, cursor: cursor);
      if (!_accept(generation)) return;
      if (page.nextCursor case final nextCursor?) {
        if (!_seenCursors.add(nextCursor)) {
          _nextCursor = null;
          throw const FormatException('Event target cursor repeated.');
        }
      }
      final byId = <String, HostOfferEventTarget>{
        if (cursor != null)
          for (final event in _events) event.eventId: event,
        for (final event in page.events) event.eventId: event,
      };
      _events = List.unmodifiable(byId.values);
      _nextCursor = page.nextCursor;
      _loaded = true;
    } on Object catch (error) {
      if (!_accept(generation)) return;
      _error = error;
    } finally {
      if (_accept(generation)) {
        _loading = false;
        notifyListeners();
      }
    }
  }

  bool _accept(int generation) =>
      !_disposed && _generation == generation && isCurrentAccount;

  @override
  void dispose() {
    _disposed = true;
    _generation++;
    super.dispose();
  }
}
